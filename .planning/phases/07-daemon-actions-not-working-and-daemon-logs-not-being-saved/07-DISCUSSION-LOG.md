# Phase 7: Daemon actions not working, daemon logs not being saved, tests polluting output - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-07
**Phase:** 7-Daemon actions not working, daemon logs not being saved, tests polluting output
**Areas discussed:** Daemon action yargs conflict, Daemon log file wiring, Test output isolation, Daemon artifact cleanup

---

## Daemon action yargs conflict

| Option | Description | Selected |
|--------|-------------|----------|
| Make query optional | Set demandOption: false, add manual check | |
| Move action handling before yargs | Parse process.argv manually for --daemon-action before yargs runs | ✓ |
| Use yargs middleware | Use yargs .middleware() to short-circuit before validation | |

**User's choice:** Move action handling before yargs — but then pivoted to a separate script approach
**Notes:** User realized the actual error was "--query required" not "--daemon-action value rejected". User decided to create a separate `src/daemon-actions.ts` script invoked via `bun daemon-actions <action>` instead of fixing the yargs conflict.

### Follow-up: Implementation approach

| Option | Description | Selected |
|--------|-------------|----------|
| New src/actions.ts | Separate file with its own yargs | |
| Root-level actions.ts | File at project root | |
| package.json script | npm script wrapper | ✓ |

**User's choice:** `src/daemon-actions.ts` with `package.json` script wrapper
**Notes:** User wants `bun daemon-actions status` to work. Actions: stop, status, logs.

### Follow-up: Stop behavior

| Option | Description | Selected |
|--------|-------------|----------|
| SIGTERM + existing handler | Send SIGTERM, let daemon's shutdown handler save + cleanup | ✓ |
| SIGTERM + verify cleanup | Send SIGTERM, then manually verify cleanup happened | |

**User's choice:** SIGTERM + existing handler
**Notes:** Stop should save and cleanup via existing `setupDaemonShutdown()` handler. No new save logic needed.

---

## Daemon log file wiring

| Option | Description | Selected |
|--------|-------------|----------|
| Pino file destination | Configure pino to write to daemon.log when in daemon mode | |
| Redirect child stdio to file | Pipe child.stdout/stderr to fs.createWriteStream | ✓ |
| Both pino + stdio | Belt and suspenders approach | |

**User's choice:** Pipe child stdio to file
**Notes:** User wants same pino format as CLI, no code duplication. Log file renamed to `.daemon.log` (dot-prefixed). Content cleared on each new daemon start.

### Follow-up: Log format

| Option | Description | Selected |
|--------|-------------|----------|
| Structured JSON | Pino writes structured JSON to .daemon.log | |
| Pretty-printed text | Human-readable in terminal | |

**User's choice:** Same format as CLI terminal output (pino default)
**Notes:** No duplication of logging system. Pipe child stdio captures all output.

### Follow-up: Log cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Clear on start | Clear .daemon.log at start of startDaemon() | ✓ |
| Append + rotate | Append to existing, rotate on size | |

**User's choice:** Clear on start
**Notes:** Matches Phase 4 decision D-12 (log file cleared on each daemon start).

---

## Test output isolation

| Option | Description | Selected |
|--------|-------------|----------|
| Gitignore + manual clean | Add entries, clean manually or via script | |
| Pretest cleanup script | Add pretest npm script | |
| Both gitignore + pretest | Belt and suspenders | |
| Fix tests to use temp dirs | Modify tests to use temp dirs for all file I/O | ✓ |

**User's choice:** Fix tests to use temp dirs
**Notes:** Tests already mostly use /tmp/ dirs. Need to ensure daemon tests write PID/log files to temp dir, not CWD.

### Follow-up: Temp dir approach

| Option | Description | Selected |
|--------|-------------|----------|
| Per-test temp dirs | Use Bun.tempdir() in each test | |
| Shared temp dir + cleanup | Shared /tmp dir, afterEach cleanup | ✓ |
| Global test config | bunfig.toml or globalSetup | |

**User's choice:** Shared temp dir + cleanup
**Notes:** Use `/tmp/facebook-scraper-test/` shared dir. Clean up in afterEach blocks.

### Follow-up: Cleanup timing

| Option | Description | Selected |
|--------|-------------|----------|
| afterEach cleanup | Clean after each test | ✓ |
| afterAll cleanup | Clean once after all tests | |
| Both | afterEach + afterAll safety net | |

**User's choice:** afterEach cleanup
**Notes:** Standard pattern, already used in output.test.ts.

---

## Daemon artifact cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Gitignore only | Add entries to .gitignore | ✓ |
| Auto-clean stale PID | Check if PID is running before using it | |
| Both gitignore + auto-clean | Belt and suspenders | |

**User's choice:** Gitignore only
**Notes:** PID deleted on clean shutdown (already in code). Log content cleared on new daemon start. Just need .gitignore entries for .daemon.pid, daemon.log, .daemon.log, output/.

---

## the agent's Discretion

- Exact argument parsing approach for daemon-actions.ts
- Whether to add a `start` action wrapper
- Timeout duration for stop action verification
- Whether to add `--force` flag for stale PIDs

## Deferred Ideas

None — discussion stayed within phase scope
