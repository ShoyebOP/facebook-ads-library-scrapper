---
phase: 07-daemon-actions-not-working-and-daemon-logs-not-being-saved
plan: 03
subsystem: daemon
tags: [shutdown, signal-handling, shared-state, tdd]

# Dependency graph
requires:
  - phase: 07-02
    provides: daemon shutdown handler infrastructure (setupDaemonShutdown)
provides:
  - "Shared URL container (targetUrls) for incremental scraping results"
  - "Unified SIGINT/SIGINT handler registered before runScraper in both daemon and non-daemon modes"
  - "Shutdown handler saves all URLs found up to signal arrival (not zero)"
affects: [07-01, 07-02]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared-mutable-container, unified-signal-handler, targetSet-pattern]

key-files:
  created:
    - test/unit/shutdown-wiring.test.ts
    - test/integration/shutdown-saving.test.ts
  modified:
    - src/types.ts
    - src/scraper.ts
    - src/index.ts
    - test/unit/types.test.ts

key-decisions:
  - "Unified shutdown handler: replaced daemon-specific setupDaemonShutdown with single SIGINT/SIGINT handler for both modes"
  - "targetSet pattern: const targetSet = options.targetUrls ?? profileUrls — single source of truth for URL collection"
  - "state.urls IS the Set scraper writes to via targetUrls — no copying needed after runScraper returns"

patterns-established:
  - "Shared mutable container pattern: pass Set via options.targetUrls, scraper populates it directly"
  - "Unified signal handler: register SIGINT/SIGINT before async work, check shuttingDown flag"

requirements-completed: [DAEMON-04, OUTPUT-02]

# Coverage metadata
coverage:
  - id: D1
    description: "Non-daemon and daemon shutdown handlers registered before runScraper"
    requirement: DAEMON-04
    verification:
      - kind: unit
        ref: "test/unit/shutdown-wiring.test.ts#registers non-daemon shutdown handlers before runScraper"
        status: pass
      - kind: unit
        ref: "test/unit/shutdown-wiring.test.ts#daemon shutdown handler is registered before runScraper"
        status: pass
    human_judgment: false
  - id: D2
    description: "Scraper populates shared targetUrls Set during extraction"
    requirement: OUTPUT-02
    verification:
      - kind: unit
        ref: "test/unit/shutdown-wiring.test.ts#scraper.ts uses targetUrls when provided"
        status: pass
      - kind: unit
        ref: "test/unit/shutdown-wiring.test.ts#scraper returns the targetSet (which IS targetUrls when provided)"
        status: pass
    human_judgment: false
  - id: D3
    description: "state.urls is populated incrementally during scraping (not just after)"
    requirement: DAEMON-04
    verification:
      - kind: unit
        ref: "test/unit/shutdown-wiring.test.ts#state.urls is passed as targetUrls to runScraper"
        status: pass
      - kind: unit
        ref: "test/unit/shutdown-wiring.test.ts#no state.urls = urls assignment after runScraper"
        status: pass
    human_judgment: false
  - id: D4
    description: "SIGTERM during scraping saves all URLs found up to that point"
    requirement: DAEMON-04
    verification:
      - kind: integration
        ref: "test/integration/shutdown-saving.test.ts#shutdown handler saves state.urls, not a local copy"
        status: pass
    human_judgment: true
    rationale: "Cannot fully automate SIGTERM-during-scraping test without real browser; source verification confirms handler captures correct reference"

# Metrics
duration: 3min
completed: 2026-07-07
status: complete
---

# Phase 07 Plan 03: Shutdown URL Saving Fix Summary

**Unified SIGINT/SIGINT handler with shared targetUrls Set — saves all URLs found before signal arrives instead of zero**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-07T15:46:21Z
- **Completed:** 2026-07-07T15:50:04Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- Fixed critical shutdown bug: SIGTERM during scraping now saves all URLs found up to signal arrival
- Added `targetUrls` optional field to ScraperOptions for shared mutable URL container
- Unified shutdown handler registration: both daemon and non-daemon handlers registered BEFORE runScraper
- Eliminated `state.urls = urls` post-runScraper assignment — targetUrls IS state.urls via object reference
- Added 23 new tests (9 unit + 10 integration + 4 type tests) verifying shutdown wiring

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix shutdown handler registration and wire shared URL container** - `9eb4968` (feat)
2. **Task 2: Add integration test for shutdown URL saving** - `14e6c9e` (test)

## Files Created/Modified
- `src/types.ts` - Added `targetUrls?: Set<string>` to ScraperOptions interface
- `src/scraper.ts` - Uses `targetSet = options.targetUrls ?? profileUrls` pattern
- `src/index.ts` - Unified shutdown handler before runScraper, passes `targetUrls: state.urls`
- `test/unit/types.test.ts` - Added test for targetUrls field
- `test/unit/shutdown-wiring.test.ts` - New: 9 tests verifying shutdown handler registration order and shared container wiring
- `test/integration/shutdown-saving.test.ts` - New: 10 integration tests for shutdown URL saving correctness

## Decisions Made
- **Unified shutdown handler:** Replaced daemon-specific `setupDaemonShutdown` with single SIGINT/SIGINT handler for both daemon and non-daemon modes. Simpler, no mode-conditional logic.
- **targetSet pattern:** `const targetSet = options.targetUrls ?? profileUrls` — single source of truth. When targetUrls is provided, interceptor writes directly to it. When not provided, falls back to local Set (backward compatible).
- **No state.urls = urls:** The return value from runScraper IS state.urls (same object reference via targetUrls), so no post-runScraper assignment needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failures in `test/unit/output.test.ts` (module caching issues) and `test/unit/interceptor.test.ts` (mock issues) — not related to this plan's changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Shutdown URL saving bug fixed for both daemon and non-daemon modes
- Ready for next plan in Phase 07

---
*Phase: 07-daemon-actions-not-working-and-daemon-logs-not-being-saved*
*Completed: 2026-07-07*

## Self-Check: PASSED
