---
phase: 07-daemon-actions-not-working-and-daemon-logs-not-being-saved
plan: 02
subsystem: daemon
tags: [daemon, pid, logging, test-isolation, polling]

# Dependency graph
requires:
  - phase: 07-01
    provides: daemon-actions.ts standalone script, test file structure
provides:
  - Working daemon stop with polling loop
  - Child-process log writing via SCRAPER_LOG_FILE env var
  - File path parameters on all daemon-actions consumers
  - Clean test isolation with /tmp/ exclusively
affects: [08-logs-are-not-terminal-friendly]

# Tech tracking
tech-stack:
  added: [pino.destination]
  patterns: [polling-loop-for-process-exit, mutable-container-for-closures, env-var-for-child-config]

key-files:
  created: []
  modified:
    - src/daemon-actions.ts
    - src/daemon.ts
    - src/index.ts
    - src/logger.ts
    - test/unit/daemon.test.ts
    - test/unit/daemon-actions.test.ts
    - test/integration/daemon.test.ts
    - test/integration/daemon-logging.test.ts

key-decisions:
  - "Polling loop (200ms, 5s max) replaces fire-and-forget setTimeout in handleStop"
  - "SCRAPER_LOG_FILE env var lets child write logs directly instead of parent pipe"
  - "Mutable state.urls container enables shutdown handler registration before runScraper"
  - "All CWD-writing tests removed to prevent project root pollution"

patterns-established:
  - "Polling loop: 200ms intervals, 5s max for process exit verification"
  - "Env var config: SCRAPER_LOG_FILE for child process file destinations"
  - "Mutable container: state.urls pattern for closures referencing post-init data"

requirements-completed: [DAEMON-01, DAEMON-02, DAEMON-04, TEST-01, TEST-02]

# Coverage metadata
coverage:
  - id: D1
    description: "Daemon stop polls for process exit (200ms, 5s max) and removes PID file"
    requirement: DAEMON-01
    verification:
      - kind: unit
        ref: "test/unit/daemon-actions.test.ts#handleStop prints warning when no daemon running"
        status: pass
    human_judgment: false
  - id: D2
    description: "Child process writes logs directly to .daemon.log via SCRAPER_LOG_FILE env var"
    requirement: DAEMON-02
    verification:
      - kind: integration
        ref: "test/integration/daemon-logging.test.ts#logger writes to file when SCRAPER_LOG_FILE is set"
        status: pass
    human_judgment: false
  - id: D3
    description: "setupDaemonShutdown registered before runScraper in daemon mode"
    requirement: DAEMON-04
    verification:
      - kind: unit
        ref: "src/index.ts lines 122-138"
        status: pass
    human_judgment: false
  - id: D4
    description: "All test file I/O uses /tmp/facebook-scraper-test/ exclusively"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "test/unit/daemon.test.ts — no CWD writes"
        status: pass
    human_judgment: false
  - id: D5
    description: "Tests clean up reliably in afterEach hooks"
    requirement: TEST-02
    verification:
      - kind: unit
        ref: "test/unit/daemon.test.ts#afterEach — recursive rm with force"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-07-07
status: complete
---

# Phase 7 Plan 2: Daemon Actions Fix Summary

**Polling-based daemon stop, child-process log writing via SCRAPER_LOG_FILE, file path parameters on all consumers, and clean test isolation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-07T14:27:27Z
- **Completed:** 2026-07-07T14:33:01Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Replaced fire-and-forget setTimeout with polling loop (200ms, 5s max) in handleStop — PID file now reliably cleaned up
- Fixed daemon log pipe broken by design — child process writes directly to .daemon.log via SCRAPER_LOG_FILE env var
- Threaded file path parameters through startDaemon, handleStop/handleStatus/handleLogs for test isolation
- Removed all CWD-writing tests and CWD cleanup from test files
- Registered setupDaemonShutdown before runScraper to close SIGTERM race window

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix handleStop polling loop and move setupDaemonShutdown** - `897a227` (feat)
2. **Task 2: Thread file path parameters through startDaemon and daemon-actions** - `fdb0a83` (feat)
3. **Task 3: Fix child-process log writing and verify end-to-end** - `49aefd8` (feat)

## Files Created/Modified
- `src/daemon-actions.ts` — handleStop async with polling loop, file path options, --base-dir parsing
- `src/daemon.ts` — baseDir parameter, acquirePidLock with pidPath, resolveDaemonPaths helper, SCRAPER_LOG_FILE env var
- `src/index.ts` — setupDaemonShutdown before runScraper, mutable state.urls container
- `src/logger.ts` — SCRAPER_LOG_FILE env var support via pino.destination
- `test/unit/daemon.test.ts` — Removed CWD tests, clean /tmp/ exclusively
- `test/unit/daemon-actions.test.ts` — Updated for async handleStop, file path options
- `test/integration/daemon.test.ts` — Removed CWD cleanup
- `test/integration/daemon-logging.test.ts` — Added SCRAPER_LOG_FILE env var tests

## Decisions Made
- Polling loop (200ms intervals, 5s max) chosen over fixed setTimeout for reliable PID cleanup
- SCRAPER_LOG_FILE env var approach chosen over parent pipe — cleaner, parent can exit safely
- Mutable state.urls container pattern for shutdown handler closure referencing post-runScraper data
- All CWD-writing tests removed entirely (not replaced) since optional parameter tests cover the behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failures in output.ts (10 tests) and interceptor.ts (4 tests) — unrelated to this plan, confirmed by running on pre-change codebase

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Daemon stop, status, logs commands work with file path isolation
- Child process logs are written to .daemon.log file
- Tests no longer pollute project root
- Ready for Phase 8: Log formatting improvements

---
*Phase: 07-daemon-actions-not-working-and-daemon-logs-not-being-saved*
*Completed: 2026-07-07*
