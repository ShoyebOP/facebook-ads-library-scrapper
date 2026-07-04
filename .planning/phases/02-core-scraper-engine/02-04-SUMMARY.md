---
phase: 02-core-scraper-engine
plan: 04
subsystem: scraping
tags: [playwright, scroll, dom-cleanup, pipeline]

# Dependency graph
requires:
  - phase: 02-core-scraper-engine/02-01
    provides: Browser launch with cloakbrowser stealth
  - phase: 02-core-scraper-engine/02-02
    provides: GraphQL interceptor and profile URL extraction
  - phase: 02-core-scraper-engine/02-03
    provides: Error classification, retry wrapper, and shutdown handler
provides:
  - Complete scraper pipeline: CLI → Browser → Extraction → Scroll → URLs
  - Scroll loop with DOM cleanup for memory management
  - Stop criteria (10 no-new-URL scrolls or maxUrls reached)
affects: [03-output-delivery]

# Tech tracking
tech-stack:
  added: []
  patterns: [scroll-loop, dom-cleanup, pipeline-orchestration]

key-files:
  created: []
  modified:
    - src/scraper.ts
    - src/index.ts
    - tests/scraper.test.ts
    - tests/index.test.ts

key-decisions:
  - "Used fixed 2500ms scroll interval (D-14) matching original scraper.js behavior"
  - "DOM cleanup uses [role='row'] selector with 500px buffer below viewport (D-15)"
  - "Hardcoded 10 no-new-URL scroll threshold (D-16) per plan spec"
  - "Scroll retry uses 1s delay (D-17) matching original scraper.js"

patterns-established:
  - "Pipeline orchestrator: main() wires Config → Logger → Scraper → URLs"
  - "ScraperOptions passed through from CLI args to scraper engine"

requirements-completed: [SCRAPE-07, SCRAPE-08, SCRAPE-10]

coverage:
  - id: D1
    description: "Scroll loop navigates Facebook Ads Library and collects URLs via GraphQL interceptor"
    requirement: SCRAPE-07
    verification:
      - kind: unit
        ref: "tests/scraper.test.ts#launches browser and navigates to Facebook Ads Library"
        status: pass
      - kind: unit
        ref: "tests/scraper.test.ts#scrolls page to bottom"
        status: pass
      - kind: unit
        ref: "tests/scraper.test.ts#sets up GraphQL interceptor on page"
        status: pass
    human_judgment: false
  - id: D2
    description: "DOM cleanup removes processed ad cards above viewport to prevent memory leaks"
    requirement: SCRAPE-08
    verification:
      - kind: unit
        ref: "tests/scraper.test.ts#cleans up DOM by removing rows above viewport (D-15)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Stop criteria: 10 consecutive scrolls with no new URLs or maxUrls reached"
    requirement: SCRAPE-10
    verification:
      - kind: unit
        ref: "tests/scraper.test.ts#stops after 10 consecutive scrolls with no new URLs (D-16)"
        status: pass
      - kind: unit
        ref: "tests/scraper.test.ts#stops when maxUrls reached"
        status: pass
    human_judgment: false
  - id: D4
    description: "End-to-end pipeline wires CLI args through config, logger, and scraper to produce URL set"
    requirement: SCRAPE-07
    verification:
      - kind: unit
        ref: "tests/index.test.ts#calls runScraper with ScraperOptions"
        status: pass
      - kind: unit
        ref: "tests/index.test.ts#returns Set of URLs"
        status: pass
    human_judgment: false

duration: 1min
completed: 2026-07-04
status: complete
---

# Phase 2 Plan 4: Scroll Loop and Pipeline Integration Summary

**Scroll loop with 2500ms interval, DOM cleanup removing rows above viewport, 10-no-new-URL stop criteria, and full pipeline wiring from CLI to URL output**

## Performance

- **Duration:** 1 min
- **Started:** 2026-07-04T17:00:00Z
- **Completed:** 2026-07-04T17:00:29Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Scroll loop navigates Facebook Ads Library and collects profile URLs via GraphQL interceptor
- DOM cleanup removes processed ad cards above viewport after each scroll (D-15)
- Stop criteria halt scraping after 10 consecutive scrolls with no new URLs (D-16)
- Full pipeline wired: CLI args → Config → Logger → Scraper → URL Set output
- All 16 tests pass across scraper and index test suites

## Task Commits

Each task was committed atomically following TDD discipline:

1. **Task 1: Implement scroll loop with DOM cleanup** - `6d6ee48` (test: RED), `ad92677` (feat: GREEN)
2. **Task 2: Wire end-to-end pipeline in index.ts** - `636bdc3` (test: RED), `d836e0c` (feat: GREEN)

## Files Created/Modified
- `src/scraper.ts` - Scroll loop with DOM cleanup, stop criteria, retry on failure, browser lifecycle
- `src/index.ts` - Pipeline orchestrator wiring CLI → Config → Logger → Scraper → URLs
- `tests/scraper.test.ts` - 10 tests for scroll loop, DOM cleanup, stop criteria, retry, browser close
- `tests/index.test.ts` - 6 tests for pipeline wiring: logger, config, preset, scraper options, URL output

## Decisions Made
- Used fixed 2500ms scroll interval (D-14) matching original scraper.js behavior
- DOM cleanup uses `[role="row"]` selector with 500px buffer below viewport (D-15)
- Hardcoded 10 no-new-URL scroll threshold (D-16) per plan spec, no CLI flag
- Scroll retry uses 1s delay (D-17) matching original scraper.js
- Pipeline orchestrator pattern: main() wires Config → Logger → Scraper → URLs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused Logger import from scraper.ts**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** `import type { Logger } from 'pino'` was unused after types were handled via ScraperOptions
- **Fix:** Removed the unused import, organized remaining imports with biome
- **Files modified:** src/scraper.ts
- **Verification:** biome check passes, all tests pass
- **Committed in:** d836e0c (Task 2 GREEN commit)

**2. [Rule 2 - Missing Critical] Applied biome formatting to src/ files**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** Multiple src/ files had formatting inconsistencies (long lines, import order)
- **Fix:** Ran `bunx biome check --write ./src` to auto-fix formatting
- **Files modified:** src/scraper.ts, src/index.ts, src/browser.ts, src/cli.ts, src/errors.ts
- **Verification:** `bunx biome check ./src/scraper.ts ./src/index.ts` passes cleanly
- **Committed in:** d836e0c (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 unused import, 1 formatting)
**Impact on plan:** Both fixes necessary for code quality and lint compliance. No scope creep.

## Issues Encountered
- TypeScript errors in `cli.ts` (missing @types/yargs) and `tests/cli.test.ts` (type mismatch) are pre-existing and out of scope for this plan
- Biome lint warnings in `cli.ts` (isNaN → Number.isNaN) and `errors.ts` (unused param) are pre-existing

## TDD Gate Compliance

| Plan | RED | GREEN | REFACTOR | Status |
|------|-----|-------|----------|--------|
| 02-04 Task 1 | ✓ `6d6ee48` | ✓ `ad92677` | — | Pass |
| 02-04 Task 2 | ✓ `636bdc3` | ✓ `d836e0c` | — | Pass |

All TDD gates pass. RED commits exist before GREEN commits for both tasks.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Core scraper engine complete: browser launch, GraphQL extraction, error handling, scroll loop, pipeline wiring
- Ready for Phase 3: Output delivery (JSON file writing, webhook notifications)
- All components tested and integrated

## Self-Check: PASSED

- All key files exist on disk (src/scraper.ts, src/index.ts, tests/scraper.test.ts, tests/index.test.ts)
- All 4 TDD commits verified in git log (6d6ee48, ad92677, 636bdc3, d836e0c)
- 16/16 tests pass
- biome check clean for target files (src/scraper.ts, src/index.ts)

---
*Phase: 02-core-scraper-engine*
*Completed: 2026-07-04*
