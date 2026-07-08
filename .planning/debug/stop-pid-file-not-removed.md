---
status: diagnosed
trigger: "Investigate why `bun run src/daemon-actions.ts stop` sends the stop signal but does not remove the PID file after the process terminates. The user sees 'Warning: PID file still exists after stop signal'."
created: 2025-07-07T05:00:00Z
updated: 2025-07-07T05:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — handleStop() in daemon-actions.ts fires-and-forgets SIGTERM then checks PID file existence after a fixed 2s setTimeout. There is NO polling/await for process termination between signal send and PID file check. The daemon's shutdown handler (setupDaemonShutdown in daemon.ts:132) does call removePidFile(), but handleStop() has no mechanism to wait for that to happen.

test: Trace the exact execution flow and document the race condition.

expecting: Root cause is the fire-and-forget pattern — handleStop() should wait for process exit, not use a fixed timeout.

next_action: Document evidence and return root cause.

## Symptoms

expected: `bun run src/daemon-actions.ts stop` sends SIGTERM, waits for daemon to terminate, removes PID file, prints "Daemon stopped"
actual: Sends SIGTERM, prints "Warning: PID file still exists after stop signal" after 2s timeout
errors: "Warning: PID file still exists after stop signal"
reproduction: Start daemon, run stop command
started: always broken — fire-and-forget design

## Eliminated

(none yet)

## Evidence

- timestamp: 2025-07-07T05:00:00Z
  checked: daemon-actions.ts handleStop() lines 14-39
  found: After process.kill(pid, 'SIGTERM') on line 29, the ONLY follow-up is setTimeout on line 32-38 that checks fs.existsSync(PID_FILE) after 2000ms. No polling, no await, no process exit wait.
  implication: handleStop() is fire-and-forget — it does not wait for the daemon to actually terminate before checking the PID file.

- timestamp: 2025-07-07T05:00:00Z
  checked: daemon.ts setupDaemonShutdown() lines 132-167
  found: The shutdown handler IS correctly implemented — it calls removePidFile() on line 160 and process.exit(0) on line 162. The handler is registered on lines 165-166 for SIGTERM and SIGINT.
  implication: The daemon-side cleanup code is correct. The problem is NOT in the daemon's shutdown handler.

- timestamp: 2025-07-07T05:00:00Z
  checked: index.ts lines 136-149 — when setupDaemonShutdown is called
  found: setupDaemonShutdown is called AFTER runScraper() returns (line 133). If SIGTERM arrives while runScraper() is still executing (browser automation, scrolling), there is NO signal handler registered — default behavior kills the process immediately without cleanup.
  implication: Even if handleStop() waited longer, there's a race: SIGTERM during scraping = no handler = PID file orphaned.

- timestamp: 2025-07-07T05:00:00Z
  checked: daemon.ts stopDaemon() lines 103-122 (the library-level stop function)
  found: stopDaemon() sends SIGTERM on line 119 and IMMEDIATELY calls removePidFile() on line 120 — it does NOT wait for process exit either, but it removes the PID file itself (fire-and-forget + self-cleanup).
  implication: stopDaemon() has the same race (process may not be dead when PID file is removed), but at least the PID file IS removed. handleStop() doesn't even do that.

- timestamp: 2025-07-07T05:00:00Z
  checked: scraper.ts runScraper() — the finally block (lines 162-171)
  found: The finally block closes the browser. If SIGTERM arrives during scraping, the process is killed before the finally block completes (no handler registered yet).
  implication: Browser cleanup also fails on SIGTERM during scraping — same root cause as the PID file issue.

## Resolution

root_cause: handleStop() in daemon-actions.ts is fire-and-forget. It sends SIGTERM via process.kill() on line 29, then uses a fixed 2-second setTimeout (lines 32-38) to check if the PID file was removed. There is NO polling or waiting for the daemon process to actually exit. The daemon's shutdown handler (daemon.ts:132-167) correctly calls removePidFile(), but handleStop() has no mechanism to wait for that to complete before checking. Additionally, if SIGTERM arrives while the scraper is still running (index.ts:133 — setupDaemonShutdown is called AFTER runScraper returns), no signal handler is registered yet, so the process is killed immediately without any cleanup.

fix:
verification:
files_changed: []
