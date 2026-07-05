---
phase: 03-output-delivery
plan: 02
subsystem: webhook
tags: [webhook, http, p-retry, error-isolation, pipeline-wiring]

# Dependency graph
requires:
  - phase: 03-output-delivery
    provides: src/output.ts (generateOutputPath, ensureOutputDir, saveUrlsToFile)
  - phase: 02-core-scraper-engine
    provides: src/types.ts, src/errors.ts, src/logger.ts module patterns
provides:
  - notifyWebhook for POST notifications with retry and error isolation
  - resolveEndpoint for extracting callback URL from preset
  - Pipeline wiring: scrape → save file → send webhook
  - WebhookPayload and WebhookOptions interfaces
affects: [04-integration-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: [p-retry with AbortError for permanent errors, AbortSignal.timeout for request timeout, http/https protocol detection, outer try/catch error isolation]

key-files:
  created:
    - src/webhook.ts
    - src/webhook.test.ts
  modified:
    - src/index.ts
    - src/types.ts
    - tests/index.test.ts
    - tests/setup.test.ts

key-decisions:
  - "p-retry with retries:2 (3 total attempts) matching D-14 spec"
  - "AbortError from p-retry to abort retrying on 4xx client errors (D-15)"
  - "Outer try/catch in notifyWebhook ensures webhook failure never crashes scraper (D-16)"
  - "File saved BEFORE webhook notification for data safety (D-07)"
  - "http/https determined by URL protocol at runtime (matching scraper.js pattern)"

patterns-established:
  - "Webhook module uses p-retry with AbortError for permanent error classification"
  - "Error isolation pattern: outer try/catch logs and returns, never throws"
  - "Pipeline order: generateOutputPath → ensureOutputDir → saveUrlsToFile → notifyWebhook"

requirements-completed: [WEBHOOK-01, WEBHOOK-02, WEBHOOK-03]

# Coverage metadata
coverage:
  - id: D1
    description: "Webhook POST notification with JSON payload {query, outputFile, count}"
    requirement: WEBHOOK-01
    verification:
      - kind: unit
        ref: "src/webhook.test.ts#sends POST with Content-Type application/json"
        status: pass
    human_judgment: false
  - id: D2
    description: "Webhook endpoint resolved from config.json preset via callback name"
    requirement: WEBHOOK-02
    verification:
      - kind: unit
        ref: "src/webhook.test.ts#exports a function that returns preset.callback"
        status: pass
    human_judgment: false
  - id: D3
    description: "Webhook failure does not crash scraper (error isolation)"
    requirement: WEBHOOK-03
    verification:
      - kind: unit
        ref: "src/webhook.test.ts#has outer try/catch that does not re-throw"
        status: pass
    human_judgment: false
  - id: D4
    description: "Webhook retries 3 times with exponential backoff on network/timeout errors"
    requirement: WEBHOOK-03
    verification:
      - kind: unit
        ref: "src/webhook.test.ts#configures retries: 2 (3 total attempts)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Pipeline saves files BEFORE sending webhook notification"
    requirement: WEBHOOK-01
    verification:
      - kind: unit
        ref: "src/webhook.test.ts#file save happens BEFORE webhook call"
        status: pass
    human_judgment: false
  - id: D6
    description: "End-to-end pipeline wiring: scrape → output → webhook"
    requirement: WEBHOOK-01
    verification:
      - kind: unit
        ref: "tests/index.test.ts#saves URLs to file before sending webhook"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-07-05
status: complete
---

# Phase 3 Plan 02: Webhook Module Summary

**Webhook POST notification with p-retry retry logic, HTTP/HTTPS protocol detection, and error isolation wired into pipeline after file save**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-05T10:53:57Z
- **Completed:** 2026-07-05T10:57:49Z
- **Tasks:** 4 (2 TDD phases + 1 wiring + 1 setup update)
- **Files modified:** 5

## Accomplishments
- Implemented notifyWebhook with p-retry (3 attempts), HTTP POST via http/https modules, 10-second AbortSignal.timeout, and error isolation (D-16: never throws on failure)
- Implemented resolveEndpoint to extract callback URL from preset
- Added WebhookPayload and WebhookOptions interfaces to src/types.ts
- Wired output + webhook into src/index.ts pipeline: scrape → generateOutputPath → ensureOutputDir → saveUrlsToFile → notifyWebhook
- Pipeline saves file BEFORE webhook notification (D-07 data safety)
- 19 tests covering webhook module, types, pipeline wiring, and module exports

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement webhook module (TDD RED)** - `1920405` (test)
2. **Task 1: Implement webhook module (TDD GREEN)** - `1f4a88d` (feat)
3. **Task 2: Wire output + webhook into pipeline** - `aae4644` (feat)
4. **Task 2: Add webhook module export checks** - `e936771` (test)

## Files Created/Modified
- `src/webhook.ts` - Core webhook functions: notifyWebhook with p-retry retry logic, resolveEndpoint
- `src/types.ts` - Added WebhookPayload and WebhookOptions interfaces
- `src/index.ts` - Wired output + webhook into pipeline (file save before webhook)
- `src/webhook.test.ts` - 19 test cases covering webhook module, types, and pipeline wiring
- `tests/index.test.ts` - Updated mocks for output/webhook modules, 5 new integration tests
- `tests/setup.test.ts` - Added webhook module export checks

## Decisions Made
- Used p-retry with retries:2 (3 total attempts) per D-14 spec instead of errors.ts withRetry (webhook has different retry semantics)
- AbortError from p-retry aborts retrying on 4xx client errors (D-15)
- Outer try/catch in notifyWebhook ensures webhook failure never crashes scraper (D-16)
- File saved BEFORE webhook notification for data safety (D-07)
- http/https determined by URL protocol at runtime (matching scraper.js:100 pattern)

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0
**Impact on plan:** No scope creep. All tasks completed as specified.

## Issues Encountered
- Pre-existing test failures in scraper.test.ts, errors.test.ts, and output.test.ts (mock leakage from Bun's global mock.module). These are unrelated to this plan's changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Webhook module complete with retry logic, error isolation, and pipeline wiring
- Ready for Phase 04 (integration testing) which will validate end-to-end flow
- TDD gate compliance: RED (1920405) → GREEN (1f4a88d) — both gates present
- All 46 target tests pass (webhook.test.ts, index.test.ts, setup.test.ts)

---
*Phase: 03-output-delivery*
*Completed: 2026-07-05*

## Self-Check: PASSED

- src/webhook.ts: FOUND
- src/webhook.test.ts: FOUND
- src/types.ts: FOUND (WebhookPayload, WebhookOptions added)
- src/index.ts: FOUND (output + webhook wired)
- tests/index.test.ts: FOUND (mocks updated)
- tests/setup.test.ts: FOUND (webhook export checks added)
- Commit 1920405 (RED): FOUND
- Commit 1f4a88d (GREEN): FOUND
- Commit aae4644 (feat): FOUND
- Commit e936771 (test): FOUND
