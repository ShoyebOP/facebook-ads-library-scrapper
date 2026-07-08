---
status: investigating
trigger: "Investigate why `bun run src/daemon-actions.ts logs` shows 'Daemon log file is empty' even when a daemon has been running and should have produced logs."
created: 2025-07-07T04:30:00Z
updated: 2025-07-07T04:35:00Z
---

## Current Focus

hypothesis: CONFIRMED — Parent process exit destroys the log pipe. The child process's pino logger writes to process.stdout (pipe), but the parent that owns the logStream and reads the pipe is already dead. No log data reaches .daemon.log.
test: N/A — root cause confirmed via code trace
expecting: Fix requires the child process to write logs directly to the file, bypassing the parent's pipe
next_action: Document root cause and fix direction

## Symptoms

expected: The logs command should display the contents of the daemon log file when a daemon is running
actual: Shows "Daemon log file is empty" even when daemon is running
errors: none reported
started: unknown
reproduction: 1. Start daemon 2. Wait for logs to be produced 3. Run `bun run src/daemon-actions.ts logs`

## Eliminated

- hypothesis: LOG_FILE path mismatch between daemon-actions.ts and daemon.ts
  evidence: Both files define LOG_FILE = '.daemon.log' identically. File exists on disk at /home/shoyeb/projects/facebook-ads-library-scrapper/.daemon.log (0 bytes). Path is not the issue.
  timestamp: 2025-07-07T04:32:00Z

- hypothesis: Log file doesn't exist or is in wrong directory
  evidence: .daemon.log exists, confirmed via ls -la. Same CWD for both scripts (project root). Not the issue.
  timestamp: 2025-07-07T04:32:30Z

## Evidence

- timestamp: 2025-07-07T04:31:00Z
  checked: daemon.ts startDaemon (lines 60-98) fork/pipe setup
  found: logStream is a LOCAL variable inside startDaemon(). Created with fs.createWriteStream(LOG_FILE, { flags: 'a' }). child.stdout and child.stderr piped to it. After startDaemon returns, logStream reference exists only in parent's scope.
  implication: logStream lifetime is bound to the parent process

- timestamp: 2025-07-07T04:31:30Z
  checked: index.ts daemon branch (lines 62-68)
  found: After startDaemon returns, parent calls process.exit(0) on line 68. This kills the parent process immediately.
  implication: Parent death destroys logStream and closes the pipe read end

- timestamp: 2025-07-07T04:32:00Z
  checked: daemon.ts fork options (line 79-83)
  found: Child forked with stdio: ['ignore', 'pipe', 'pipe', 'ipc']. Child.stdout and child.stderr are pipes. child.unref() called so parent can exit without waiting.
  implication: Child's stdout/stderr are connected to parent via pipes, not directly to file

- timestamp: 2025-07-07T04:33:00Z
  checked: logger.ts createLogger (line 7-12)
  found: Pino logger created with default destination (process.stdout). No file transport configured.
  implication: All child process log output goes to process.stdout, which is the pipe write end

- timestamp: 2025-07-07T04:33:30Z
  checked: daemon.ts line 76
  found: fs.writeFileSync(LOG_FILE, '') clears the log file on daemon start. This creates the empty .daemon.log file.
  explanation: The file exists (0 bytes) because startDaemon clears it, but no data ever reaches it through the broken pipe

- timestamp: 2025-07-07T04:34:00Z
  checked: Full data flow trace
  found: Parent creates logStream → pipes child.stdout to logStream → parent exits → logStream destroyed → pipe read end closed → child writes to broken pipe → EPIPE → data lost
  implication: THE ROOT CAUSE: the pipe architecture fundamentally cannot work because the parent (which owns the pipe and the file stream) exits immediately

## Resolution

root_cause: |
  The daemon log pipe is fundamentally broken by design. startDaemon() in daemon.ts (lines 85-88) creates a
  logStream (WriteStream to .daemon.log) in the PARENT process and pipes the child's stdout/stderr to it.
  However, index.ts (line 68) calls process.exit(0) immediately after startDaemon returns, killing the parent.
  This destroys the logStream and closes the pipe read end. The child process (which continues running as a
  detached background process) uses pino which writes to process.stdout — but that stdout is the pipe write
  end whose read end is now dead. All child log output gets EPIPE errors and is silently lost. The
  .daemon.log file is created empty by fs.writeFileSync(LOG_FILE, '') on daemon.ts line 76 and never
  receives any data.

  In short: The parent owns the log file handle and the pipe reader, then exits. The child owns the pipe
  writer but has no file handle. Neither side can complete the data path alone.

fix: |
  The child process must write its own logs directly to .daemon.log instead of relying on the parent's pipe.
  Two changes needed:

  1. In daemon.ts startDaemon(): Remove the logStream creation and pipe setup (lines 85-88). The parent
     should not attempt to pipe child output to the file — it exits too soon.

  2. In index.ts main(): When SCRAPER_DAEMON_CHILD === '1' (child process), configure pino to write
     directly to .daemon.log using a file transport. This can be done by passing a destination to createLogger()
     when running as daemon child:

     ```typescript
     if (process.env.SCRAPER_DAEMON_CHILD === '1') {
         // Child: write logs directly to log file
         const logStream = fs.createWriteStream('.daemon.log', { flags: 'a' });
         logger = createLogger('info', logStream);
     }
     ```

     Or modify createLogger to accept an optional destination:
     ```typescript
     export function createLogger(level: string = 'info', destination?: NodeJS.WritableStream): pino.Logger {
         return pino({
             level: process.env.LOG_LEVEL || level,
             redact: ['proxy', '*.proxy'],
         }, destination);
     }
     ```

verification: |
  After fix: start daemon → check .daemon.log has content → run `bun run src/daemon-actions.ts logs` →
  should display log entries instead of "Daemon log file is empty".

files_changed: [daemon.ts, index.ts, logger.ts]