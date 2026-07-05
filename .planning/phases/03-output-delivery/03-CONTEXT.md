# Phase 3: Output & Delivery - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Scrape results are written to timestamped JSON files and webhook notifications are sent to automation workflows on completion. This phase modularizes the existing output and webhook logic from `scraper.js` into `src/output.ts` and `src/webhook.ts`.

</domain>

<decisions>
## Implementation Decisions

### Output File Structure
- **D-01:** JSON content: just URLs array (matches existing `scraper.js` behavior)
- **D-02:** Filename format: `DD-MM-YYYY:HH:MM.query.json` (keep current)
- **D-03:** Output directory: `output/` subdirectory, auto-create if missing
- **D-04:** File conflict: overwrite existing file (latest scrape wins)

### Incremental Saving
- **D-05:** Save interval: every 100 new URLs (per OUTPUT-02 requirement)
- **D-06:** Save mode: overwrite same file (not temp+rename)
- **D-07:** Crash handling: save collected URLs on SIGINT/SIGTERM/crash
- **D-08:** JSON validity: always write valid JSON array (even during incremental saves)

### Webhook Payload
- **D-09:** Payload format: `{ query, outputFile, count }` (keep current)
- **D-10:** URLs in payload: no, just metadata (downstream reads JSON file)
- **D-11:** Content-Type: `application/json`
- **D-12:** Request timeout: 10 seconds

### Webhook Retry Policy
- **D-13:** Retry enabled: yes, using p-retry with exponential backoff
- **D-14:** Retry count: 3 attempts (original + 2 retries)
- **D-15:** Retryable errors: network/timeout only (ECONNRESET, ETIMEDOUT, 5xx)
- **D-16:** Final failure: log error, continue (file is saved first, webhook is fire-and-forget)

### Webhook Configuration
- **D-17:** Endpoint resolution: via config.json presets (replaces hardcoded CALLBACKS object)
- **D-18:** Callback name → URL mapping: presets object in config.json

### the agent's Discretion
- Webhook module API shape (function with options vs class)
- Error classification for webhook failures (which HTTP codes are retryable)
- File write strategy (sync vs async)
- Output directory structure within `output/`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — OUTPUT-01, OUTPUT-02, OUTPUT-03, WEBHOOK-01, WEBHOOK-02, WEBHOOK-03
- `.planning/ROADMAP.md` — Phase 3 definition, success criteria, and plan stubs

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, key decisions, and technical environment
- `.planning/STATE.md` — Current project state and accumulated context

### Codebase Analysis
- `.planning/codebase/STACK.md` — Technology stack (Bun, cloakbrowser, playwright-core)
- `.planning/codebase/ARCHITECTURE.md` — Current single-file architecture and anti-patterns
- `.planning/codebase/INTEGRATIONS.md` — Facebook Ads Library integration, GraphQL interception pattern, webhook endpoints
- `.planning/codebase/CONVENTIONS.md` — Code style and patterns to preserve

### Phase 1 Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Module organization, config schema, TypeScript settings

### Phase 2 Context
- `.planning/phases/02-core-scraper-engine/02-CONTEXT.md` — Browser module, extraction logic, error handling patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scraper.js:87-94` — `saveUrls` function: JSON file output with timestamp formatting
- `scraper.js:97-115` — `notifyWebhook` function: HTTP POST with error handling
- `scraper.js:8-12` — `CALLBACKS` object: webhook endpoint registry (to be replaced by config presets)
- `scraper.js:45-47` — `pad` function: zero-padding helper for timestamps

### Established Patterns
- ES Modules with `"type": "module"` — preserve in TypeScript migration
- camelCase functions, UPPER_SNAKE_CASE constants — carry forward
- Section dividers using `// --- Name ---` pattern
- Functions directly exported (not classes) — per Phase 1 decision

### Integration Points
- File output: `scraper.js:87-94` → becomes `src/output.ts`
- Webhook notification: `scraper.js:97-115` → becomes `src/webhook.ts`
- Config presets: `.facebook-scraper.json` → callback URL resolution
- Pipeline wiring: `src/cli.ts` → `src/config.ts` → `src/browser.ts` → `src/scraper.ts` → `src/output.ts` + `src/webhook.ts`

</code_context>

<specifics>
## Specific Ideas

- Output format: `DD-MM-YYYY:HH:MM.query.json` — matches existing behavior
- Webhook payload: `{ query, outputFile, count }` — simple, sufficient for lead gen workflows
- File saving happens before webhook notification — data is safe regardless of webhook success
- Incremental saves at 100 URLs — balance between safety and I/O overhead
- Webhook retries: 3 attempts with exponential backoff — network/timeout errors only

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 3-Output & Delivery*
*Context gathered: 2026-07-05*