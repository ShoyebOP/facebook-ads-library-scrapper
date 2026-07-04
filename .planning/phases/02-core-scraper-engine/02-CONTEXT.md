# Phase 2: Core Scraper Engine - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The scraper reliably launches a stealth browser, intercepts GraphQL responses, extracts profile URLs, handles errors with retry, and saves results incrementally. This phase implements the core scraping engine that replaces the monolithic `scraper.js` with modular TypeScript.

</domain>

<decisions>
## Implementation Decisions

### Browser Launch & Stealth Config
- **D-01:** Browser module API shape: planner decides (function with options object vs class)
- **D-02:** Stealth preset: 'careful' as default, configurable via config.json
- **D-03:** Proxy credentials: URL-embedded format (e.g., `http://user:pass@host:port`)
- **D-04:** Browser lifecycle: auto-close after scrape completes or on error
- **D-05:** Default headless mode: headless=true (visible via --no-headless flag)
- **D-06:** Locale/timezone: configurable in config.json, fallback to system values if empty
- **D-07:** Browser launch failures: log error details and re-throw (caller handles retry)

### GraphQL Interception Pattern
- **D-08:** Interception method: planner decides (response listener vs route interception)
- **D-09:** URL filter: planner decides (URL contains 'graphql' vs exact endpoint path)
- **D-10:** Extraction method: planner decides (recursive traversal vs JSONPath query)
- **D-11:** Deduplication: in-memory Set for tracking seen URLs
- **D-12:** Response parsing timeout: 15 seconds, skip on exceed
- **D-13:** Malformed responses: log warning and continue to next response

### Scroll Loop & DOM Cleanup
- **D-14:** Scroll timing: planner decides (network idle vs fixed interval)
- **D-15:** DOM cleanup frequency: after each scroll
- **D-16:** Stop criteria: hardcoded threshold of 10 consecutive scrolls with no new URLs (no CLI flag)
- **D-17:** Scroll failures: retry with 1s delay

### Error Handling & Retry
- **D-18:** Retry library: planner decides (p-retry vs custom implementation)
- **D-19:** Error classification: 4-type system (transient, permanent, browser, extraction)
- **D-20:** Logging: console output only (info for progress, error for failures, debug for details)
- **D-21:** Proxy credential sanitization: replace with *** in all log output

### the agent's Discretion
- Browser module API shape (D-01)
- Interception method (D-08)
- URL filter pattern (D-09)
- Extraction method (D-10)
- Scroll timing strategy (D-14)
- Retry library choice (D-18)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — SCRAPE-01 through SCRAPE-10, ERROR-01 through ERROR-05
- `.planning/ROADMAP.md` — Phase 2 definition, success criteria, and plan stubs

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, key decisions, and technical environment
- `.planning/STATE.md` — Current project state and accumulated context

### Codebase Analysis
- `.planning/codebase/STACK.md` — Technology stack (Bun, cloakbrowser, playwright-core)
- `.planning/codebase/ARCHITECTURE.md` — Current single-file architecture and anti-patterns
- `.planning/codebase/INTEGRATIONS.md` — Facebook Ads Library integration, GraphQL interception pattern
- `.planning/codebase/CONVENTIONS.md` — Code style and patterns to preserve

### Phase 1 Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Module organization, config schema, TypeScript settings

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scraper.js:60-76` — `extractProfileUrls` function: recursive JSON traversal for profile URLs
- `scraper.js:79-84` — `withTimeout` function: Promise.race wrapper for operation timeouts
- `scraper.js:124-134` — Browser launch configuration with cloakbrowser stealth options
- `scraper.js:139-160` — GraphQL response interception via `page.on('response')`
- `scraper.js:185-228` — Auto-scroll loop with DOM cleanup

### Established Patterns
- ES Modules with `"type": "module"` — preserve in TypeScript migration
- camelCase functions, UPPER_SNAKE_CASE constants — carry forward
- Section dividers using `// --- Name ---` pattern
- Functions directly exported (not classes) — per Phase 1 decision

### Integration Points
- CLI entry point: `scraper.js:257-259` → becomes `src/cli.ts`
- Config/args parsing: `scraper.js:19-35` → becomes `src/config.ts`
- Browser launch: `scraper.js:124-134` → becomes `src/browser.ts`
- Scraper logic: `scraper.js:118-239` → becomes `src/scraper.ts`

</code_context>

<specifics>
## Specific Ideas

- Hardcoded scroll threshold of 10 (no CLI flag) — simpler UX
- Known bug: scraper was retrying indefinitely before changes — investigate during planning
- 15s timeout for GraphQL response parsing (increased from 5s default)
- Proxy is optional flag, not mandatory
- Headless by default for production use

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 2-Core Scraper Engine*
*Context gathered: 2026-07-04*