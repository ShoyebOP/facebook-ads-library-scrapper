# Phase 7: Daemon actions not working, daemon logs not being saved, tests polluting output - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix three concrete bugs: daemon management commands (stop/status/logs) fail because `--query` is required by yargs, daemon logs are not written to a file (logger goes to stdout only), and tests/manual runs leave artifacts in the project root without cleanup.

</domain>

<decisions>
## Implementation Decisions

### Daemon Actions — Separate Script
- **D-01:** Create `src/daemon-actions.ts` as a standalone script for daemon management
- **D-02:** Add npm script in `package.json`: `"daemon-actions": "bun run src/daemon-actions.ts"` so user runs `bun daemon-actions <action>`
- **D-03:** Support same 3 actions: `stop`, `status`, `logs`
- **D-04:** Remove `--daemon-action` flag from `src/cli.ts` entirely (replaced by separate script)
- **D-05:** Script handles its own argument parsing (simple process.argv check, no yargs needed)
- **D-06:** When action is found in process.argv, handle it immediately and `process.exit()` — never reaches the main pipeline

### Daemon Actions — Stop Behavior
- **D-07:** `stop` action sends SIGTERM to daemon process
- **D-08:** Relies on existing `setupDaemonShutdown()` handler in daemon.ts for save + cleanup
- **D-09:** After sending SIGTERM, wait briefly (e.g., 2s) then verify PID file is deleted
- **D-10:** If PID file still exists after timeout, warn user but don't force-kill

### Daemon Log File Wiring
- **D-11:** Rename log file from `daemon.log` to `.daemon.log` (dot-prefixed, hidden)
- **D-12:** In `startDaemon()`, pipe `child.stdout` and `child.stderr` to `fs.createWriteStream('.daemon.log')`
- **D-13:** Use same pino logger format as CLI — no duplication, captures all output including non-pino logs
- **D-14:** Clear `.daemon.log` at the start of `startDaemon()` before forking child (matches D-12 from Phase 4)
- **D-15:** Update `logs` action to read from `.daemon.log` instead of `daemon.log`

### Test Output Isolation
- **D-16:** Use shared temp dir `/tmp/facebook-scraper-test/` for all test file I/O
- **D-17:** Clean up shared temp dir in `afterEach` blocks (standard pattern, already used in output.test.ts)
- **D-18:** Daemon tests should write PID/log files to the temp dir, not CWD
- **D-19:** Fix `PID_FILE` and `LOG_FILE` constants in daemon.ts to accept path override (or use temp dir in tests)

### Gitignore & Artifact Cleanup
- **D-20:** Add `.daemon.pid`, `daemon.log`, `.daemon.log`, `output/` to `.gitignore`
- **D-21:** PID file is deleted on clean shutdown (already implemented in `removePidFile()` call in `setupDaemonShutdown()`)
- **D-22:** Log file content is cleared on each new daemon start (D-14 above)

### the agent's Discretion
- Exact argument parsing approach for daemon-actions.ts (process.argv scan vs simple check)
- Whether to add a `start` action wrapper or keep `start` via `--daemon` flag on main CLI
- Timeout duration for stop action verification
- Whether to add a `--force` flag to stop action for stale PIDs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — DAEMON-01 through DAEMON-05, TEST-01 through TEST-05
- `.planning/ROADMAP.md` — Phase 7 definition and goal

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/STATE.md` — Current project state and accumulated context

### Codebase Analysis
- `.planning/codebase/ARCHITECTURE.md` — Current architecture, component responsibilities, daemon mode flow
- `.planning/codebase/CONCERNS.md` — Known bugs (daemon tests write to project root, --callback type mismatch)
- `.planning/codebase/CONVENTIONS.md` — Code style, naming patterns, error handling patterns

### Phase 4 Context
- `.planning/phases/04-daemon-validation/04-CONTEXT.md` — Daemon implementation decisions (D-01 through D-20)

### Phase 5 Context
- `.planning/phases/05-fix-milestone-gaps-daemon-infinite-fork-shutdown-handlers-in/05-CONTEXT.md` — Daemon fork prevention, shutdown handler wiring

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/daemon.ts:59-93` — `startDaemon()` function: child_process.fork with detached mode, PID management
- `src/daemon.ts:97-116` — `stopDaemon()`: reads PID, sends SIGTERM, cleans up PID file
- `src/daemon.ts:126-161` — `setupDaemonShutdown()`: signal handlers with saveState/cleanup callbacks
- `src/cli.ts:126-153` — Current daemon action handler (to be removed and replaced by daemon-actions.ts)
- `src/logger.ts:7-12` — `createLogger()`: pino with credential redaction

### Established Patterns
- Environment variables for daemon mode communication (SCRAPER_DAEMON_CHILD, etc.)
- Functions directly exported (not classes)
- Section dividers using `// --- Name ---` pattern
- camelCase for functions, UPPER_SNAKE_CASE for constants

### Integration Points
- `src/cli.ts:126-153` — Remove daemon action handling (replaced by daemon-actions.ts)
- `src/daemon.ts:59-93` — `startDaemon()`: add stdio piping to .daemon.log
- `src/daemon.ts:10-11` — Update PID_FILE and LOG_FILE constants
- `package.json` — Add `daemon-actions` npm script

</code_context>

<specifics>
## Specific Ideas

- Daemon actions script: `bun daemon-actions stop` / `bun daemon-actions status` / `bun daemon-actions logs`
- Log file: `.daemon.log` (dot-prefixed, hidden from ls)
- Log format: same pino output as CLI terminal, no duplication
- Stop behavior: SIGTERM → existing handler saves + cleans up → verify PID deleted
- Test cleanup: shared `/tmp/facebook-scraper-test/` dir, afterEach cleanup

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 7-Daemon actions not working, daemon logs not being saved, tests polluting output*
*Context gathered: 2026-07-07*
