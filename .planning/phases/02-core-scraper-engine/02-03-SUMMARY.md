---
phase: 02-core-scraper-engine
plan: 03
subsystem: errors
tags: [p-retry, error-classification, graceful-shutdown, exponential-backoff]

# Dependency graph
requires:
  - phase: 02-core-scraper-engine
    provides: [browser-launch, graphql-interceptor, logger-with-redaction]
provides:
  - Error classification (transient/browser/extraction/permanent)
  - Retry wrapper with exponential backoff via p-retry
  - Graceful shutdown handler with SIGINT/SIGTERM
  - withTimeout promise race helper
affects: [02-core-scraper-engine, 03-output-delivery]

# Tech tracking
tech-stack:
  added: [p-retry]
  patterns: [error-classification, exponential-backoff, graceful-shutdown]

key-files:
  created: [src/errors.ts, tests/errors.test.ts]
  modified: [src/browser.ts]

key-decisions:
  - "p-retry v8 AbortError imported separately (named export, not pRetry.AbortError)"
  - "Permanent/browser/extraction errors abort retry budget immediately via AbortError"
  - "setupShutdownHandler takes dependency-injected saveUrls, browser, logger for testability"

patterns-established:
  - "Error classification: keyword-based message matching to ErrorType categories"
  - "Retry pattern: withRetry wraps p-retry with classifyError gating retry decisions"
  - "Shutdown pattern: shuttingDown flag prevents double-exit, cleanup runs before process.exit(0)"

requirements-completed: [ERROR-01, ERROR-02, ERROR-03, ERROR-04, ERROR-05, SCRAPE-10]

coverage:
  - id: D1
    description: "Error classification distinguishes transient, permanent, browser, and extraction errors"
    requirement: ERROR-01
    verification:
      - kind: unit
        ref: "tests/errors.test.ts#classifyError"
        status: pass
    human_judgment: false
  - id: D2
    description: "Exponential backoff retry via p-retry wraps transient errors"
    requirement: ERROR-03
    verification:
      - kind: unit
        ref: "tests/errors.test.ts#withRetry"
        status: pass
    human_judgment: false
  - id: D3
    description: "All catch blocks log errors (no silent error swallowing)"
    requirement: ERROR-04
    verification:
      - kind: unit
        ref: "tests/errors.test.ts#browser.ts error handling"
        status: pass
    human_judgment: false
  - id: D4
    description: "Graceful shutdown handlers save data and close browser on SIGINT/SIGTERM"
    requirement: SCRAPE-10
    verification:
      - kind: unit
        ref: "tests/errors.test.ts#setupShutdownHandler"
        status: pass
    human_judgment: false
  - id: D5
    description: "Browser launch uses withRetry for transient error recovery"
    requirement: ERROR-05
    verification:
      - kind: unit
        ref: "tests/errors.test.ts#launchBrowser uses withRetry"
        status: pass
    human_judgment: false

# Metrics
duration: 3min
completed: 2026-07-04
status: complete
---

# Phase 2 Plan 3: Error Handling Foundation Summary

**Error classification (transient/browser/extraction/permanent), p-retry exponential backoff wrapper, and graceful shutdown handler with SIGINT/SIGTERM**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-04T16:42:54Z
- **Completed:** 2026-07-04T16:46:50Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Error classification categorizes errors into transient, browser, extraction, and permanent types via keyword matching
- withRetry wraps p-retry with exponential backoff, aborting retry budget for non-transient errors
- setupShutdownHandler registers SIGINT/SIGTERM, saves partial data, closes browser, prevents double-execution
- browser.ts launch wrapped with withRetry for transient error recovery (D-07)

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement error classification and retry wrapper** - `86b7522` (test), `3f25d91` (feat)
2. **Task 2: Implement graceful shutdown and wire error handling** - `93ab629` (test), `b0ed00a` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/errors.ts` - Error handling foundation: withTimeout, classifyError, withRetry, setupShutdownHandler
- `src/browser.ts` - Browser launch wrapped with withRetry for transient errors
- `tests/errors.test.ts` - 25 tests covering all error handling functions

## Decisions Made
- p-retry v8 AbortError imported as named export (not pRetry.AbortError which doesn't exist in v8)
- Permanent, browser, and extraction errors abort retry budget immediately via AbortError (only transient errors consume retries)
- setupShutdownHandler takes dependency-injected saveUrls, browser, logger for testability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Error handling foundation complete, ready for output delivery phase
- withRetry can be used in any future component that needs transient error recovery

---
*Phase: 02-core-scraper-engine*
*Completed: 2026-07-04*

## Self-Check: PASSED
- src/errors.ts: FOUND
- tests/errors.test.ts: FOUND
- 02-03-SUMMARY.md: FOUND
- All 5 commits verified
