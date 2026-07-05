# Phase 5: Fix milestone gaps (daemon infinite fork, shutdown handlers, incremental saver) - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase fixes critical bugs and gaps in the milestone implementation: daemon infinite fork prevention, proper shutdown handlers for graceful exit, incremental URL saving during scraping, dead code cleanup, and non-functional CLI flag fixes.

</domain>

<decisions>
## Implementation Decisions

### Daemon Fork Prevention
- **D-01:** Use environment variable `SCRAPER_DAEMON_CHILD=1` to prevent infinite fork loops
- **D-02:** Set this env var when forking child process in `startDaemon()` (src/daemon.ts)
- **D-03:** Child checks this env var in `main()` at index.ts, before the --daemon block
- **D-04:** If `SCRAPER_DAEMON_CHILD=1` is set, skip the fork and run the scraper directly

### Shutdown Handler Wiring
- **D-05:** Call `setupDaemonShutdown()` in `main()` after scraper starts
- **D-06:** Pass `saveState` callback that writes collected URLs to output file
- **D-07:** Pass `cleanup` callback that closes the browser
- **D-08:** Only wire shutdown handlers when running as daemon (check `SCRAPER_DAEMON_CHILD`)

### Incremental Saver Integration
- **D-09:** Accept `incrementalSaver` as optional property in `ScraperOptions`
- **D-10:** Call the saver function after each successful scroll in the scroll loop
- **D-11:** Create the saver in `main()` using `createIncrementalSaver()` from output.ts
- **D-12:** Pass output file path to saver for periodic writes

### Dead Code & CLI Fixes
- **D-13:** Remove old `scraper.js` file (replaced by src/ modules)
- **D-14:** Fix `--proxy` validation: error if flag present but no value provided
- **D-15:** Fix silent error swallowing: add logging to catch blocks in daemon.ts
- **D-16:** Remove double log file cleanup bug (if present in new code)

### the agent's Discretion
- Exact validation approach for --proxy flag (yargs impliees vs custom check)
- Whether to add proxy URL format validation (HTTP/SOCKS5 scheme check)
- Order of operations for the fixes
- Test coverage for the bug fixes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — DAEMON-01 through DAEMON-05, SCRAPE-09, SCRAPE-10
- `.planning/ROADMAP.md` — Phase 5 definition and success criteria

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/STATE.md` — Current project state and accumulated context

### Codebase Analysis
- `.planning/codebase/ARCHITECTURE.md` — Current architecture and anti-patterns
- `.planning/codebase/CONCERNS.md` — Known bugs and tech debt
- `.planning/codebase/CONVENTIONS.md` — Code style and patterns

### Phase 4 Context
- `.planning/phases/04-daemon-validation/04-CONTEXT.md` — Daemon implementation decisions (D-01 through D-20)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/daemon.ts:59-92` — `startDaemon()` function: child_process.fork with detached mode, PID management
- `src/daemon.ts:125-159` — `setupDaemonShutdown()`: signal handlers with saveState/cleanup callbacks
- `src/output.ts:37-48` — `createIncrementalSaver()`: periodic save at threshold (exists but unused)
- `src/cli.ts:67-88` — CLI validation block: pattern for adding proxy validation

### Established Patterns
- Environment variables for daemon mode communication (SCRAPER_OUTPUT_FILE, etc.)
- Structured logging with pino throughout
- Error handling with try/catch and logger.error()
- Functions directly exported (not classes)

### Integration Points
- `src/index.ts:36-44` — --daemon block in main(): add env var check before fork
- `src/index.ts:89-101` — After runScraper: wire shutdown handlers
- `src/scraper.ts:79-146` — Scroll loop: add incremental saver call after each scroll
- `src/cli.ts:67-88` — Validation block: add proxy value check

</code_context>

<specifics>
## Specific Ideas

- Daemon child env var: `SCRAPER_DAEMON_CHILD=1` — matches existing pattern of SCRAPER_* env vars
- Shutdown wiring: only when `process.env.SCRAPER_DAEMON_CHILD` is set (daemon mode)
- Incremental saver: pass as optional callback, call after each scroll iteration
- Proxy validation: check `argv.proxy !== undefined && argv.proxy === ''` or similar

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 5-Fix milestone gaps (daemon infinite fork, shutdown handlers, incremental saver)*
*Context gathered: 2026-07-06*
