# Phase 5: Fix milestone gaps (daemon infinite fork, shutdown handlers, incremental saver) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 05-fix-milestone-gaps-daemon-infinite-fork-shutdown-handlers-in
**Areas discussed:** Daemon fork prevention, Shutdown handler wiring, Incremental saver integration, Dead code & CLI fixes

---

## Daemon fork prevention

| Option | Description | Selected |
|--------|-------------|----------|
| Environment variable flag | Set SCRAPER_DAEMON_CHILD=1 in child env. Child checks this and skips fork. | ✓ |
| Strip --daemon from argv | Remove --daemon from the argv passed to child. Simpler but fragile. | |
| Check PID file existence | If PID file exists and process is running, skip fork. Relies on lock timing. | |

**User's choice:** Environment variable flag (Recommended)
**Notes:** Clean separation between parent/child processes

| Option | Description | Selected |
|--------|-------------|----------|
| In main() at index.ts | Check before the --daemon block in main(). Keeps fork logic centralized. | ✓ |
| In cli.ts before calling main() | Check in CLI entry point. Earlier detection but splits daemon logic. | |
| In daemon.ts startDaemon() | Check inside startDaemon itself. Self-contained but less visible. | |

**User's choice:** In main() at index.ts (Recommended)
**Notes:** Keeps daemon fork logic in the pipeline orchestrator

---

## Shutdown handler wiring

| Option | Description | Selected |
|--------|-------------|----------|
| In main() after scraper starts | Call setupDaemonShutdown() in index.ts after runScraper begins. | ✓ |
| In runScraper() itself | Wire handlers inside scraper.ts. Keeps browser lifecycle close to owner. | |
| New orchestrator function | Create a runWithShutdown() wrapper. Clean separation but adds layer. | |

**User's choice:** In main() after scraper starts (Recommended)
**Notes:** User initially confused about purpose — clarified that shutdown handlers are for the child process (daemon itself), not the parent. When --daemon-action stop sends SIGTERM, child's handler runs to save state and exit cleanly.

---

## Incremental saver integration

| Option | Description | Selected |
|--------|-------------|----------|
| Pass saver to runScraper | Accept incrementalSaver as an option in ScraperOptions. | ✓ |
| Create saver inside runScraper | Create the saver inside scraper.ts using output file path. | |
| Event emitter pattern | Emit 'url-found' events from scraper, subscriber calls saver. | |

**User's choice:** Pass saver to runScraper (Recommended)
**Notes:** Clean dependency injection, keeps scraper module decoupled from output module

---

## Dead code & CLI fixes

| Option | Description | Selected |
|--------|-------------|----------|
| Full cleanup | Remove old scraper.js, fix --proxy validation, fix silent errors, remove double log cleanup. | ✓ |
| Critical fixes only | Fix --proxy validation and infinite fork only. Skip dead code removal. | |
| Agent decides | Let the agent determine what needs fixing based on code analysis. | |

**User's choice:** Full cleanup (Recommended)
**Notes:** Complete milestone gap closure

| Option | Description | Selected |
|--------|-------------|----------|
| Error if --proxy empty | In cli.ts validation block, check if argv.proxy is defined but empty string. | |
| Make --proxy require value | Use yargs .implies() or custom check to require a value when flag is present. | |
| Agent decides | Let the agent choose the best validation approach. | |

**User's choice:** Agent decides
**Notes:** Deferred to agent for implementation flexibility

---

## the agent's Discretion

- Proxy validation approach (yargs implies vs custom check)
- Proxy URL format validation (HTTP/SOCKS5 scheme check)
- Order of operations for the fixes
- Test coverage for the bug fixes

## Deferred Ideas

None — discussion stayed within phase scope
