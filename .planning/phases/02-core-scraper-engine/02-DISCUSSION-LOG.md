# Phase 2: Core Scraper Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 2-Core Scraper Engine
**Areas discussed:** Browser launch & stealth config, GraphQL interception pattern, Scroll loop & DOM cleanup, Error handling & retry

---

## Browser launch & stealth config

| Option | Description | Selected |
|--------|-------------|----------|
| Function with options object | export async function launchBrowser(options: BrowserOptions): Promise<Browser> | |
| Class with constructor config | export class BrowserManager { constructor(config) launch() } | |
| Let the planner decide | Agent discretion — planner picks based on implementation needs | ✓ |

**User's choice:** Let the planner decide
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Careful preset, configurable | Keep humanPreset: 'careful' as default, allow override via config | ✓ |
| Full stealth config exposed | Expose all cloakbrowser stealth options in config.json | |
| Let the planner decide | Agent discretion | |

**User's choice:** Careful preset, configurable
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| URL-embedded credentials | Parse user:pass from proxy URL string | ✓ |
| Separate CLI flags | --proxy-user and --proxy-pass flags | |
| Let the planner decide | Agent discretion | |

**User's choice:** URL-embedded credentials
**Notes:** Proxy is optional, not mandatory

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-close | Browser closes automatically after scrape completes | ✓ |
| Keep open option | Browser stays open for debugging/inspection | |
| Let the planner decide | Agent discretion | |

**User's choice:** Auto-close
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Visible by default | Default headless=false, --headless flag overrides | |
| Headless by default | Default headless=true, --no-headless for debugging | ✓ |
| Let the planner decide | Agent discretion | |

**User's choice:** Headless by default
**Notes:** Better for production use

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded | locale: 'en-US', timezone: 'Asia/Dhaka' in browser module | |
| Configurable | Expose locale and timezone in config.json | ✓ |
| Let the planner decide | Agent discretion | |

**User's choice:** Configurable with system fallback
**Notes:** If empty in config, fallback to system values

---

| Option | Description | Selected |
|--------|-------------|----------|
| Log and throw | Log error details and re-throw, caller decides retry | ✓ |
| Internal retry | Browser module handles retries internally | |
| Let the planner decide | Agent discretion | |

**User's choice:** Log and throw
**Notes:** Clean separation of concerns

---

## GraphQL interception pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Response listener | Use page.on('response') to capture GraphQL API responses | |
| Route interception | Use page.route() to intercept and modify requests | |
| Let the planner decide | Agent discretion | ✓ |

**User's choice:** Let the planner decide
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| URL contains 'graphql' | Filter responses containing 'graphql' in URL | |
| Exact endpoint path | Filter by specific Facebook GraphQL endpoint path | |
| Let the planner decide | Agent discretion | ✓ |

**User's choice:** Let the planner decide
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Recursive traversal | Recursively traverse JSON to find page_profile_uri fields | |
| JSONPath query | Use JSONPath or similar query language | |
| Let the planner decide | Agent discretion | ✓ |

**User's choice:** Let the planner decide
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| In-memory Set | Use a Set to track seen URLs, skip duplicates in real-time | ✓ |
| Post-collection dedup | Collect all URLs, deduplicate at save time | |
| Let the planner decide | Agent discretion | |

**User's choice:** In-memory Set
**Notes:** Handles 20,000+ URLs with 16GB RAM easily (~2-4MB memory)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 5s timeout, skip on exceed | Skip responses that take >5 seconds to parse | |
| No timeout | Wait indefinitely for response parsing | |
| Let the planner decide | Agent discretion | |

**User's choice:** 15s timeout, skip on exceed
**Notes:** Increased from 5s default

---

| Option | Description | Selected |
|--------|-------------|----------|
| Log and skip | Log warning and continue to next response | ✓ |
| Throw and stop | Throw error and stop scraping | |
| Let the planner decide | Agent discretion | |

**User's choice:** Log and skip
**Notes:** Scraper stays resilient to malformed data

---

## Scroll loop & DOM cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Network idle | Wait for network idle (no requests for 1-2s) before next scroll | |
| Fixed interval | Fixed delay between scrolls (e.g., 2s) | |
| Let the planner decide | Agent discretion | ✓ |

**User's choice:** Let the planner decide
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| After each scroll | Remove processed ad elements after each scroll | ✓ |
| Periodic cleanup | Clean up every N scrolls (e.g., every 5) | |
| Let the planner decide | Agent discretion | |

**User's choice:** After each scroll
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| No-new-URLs threshold | Stop after N consecutive scrolls with no new URLs | ✓ |
| Fixed scroll count | Stop after total scroll count regardless of new URLs | |
| Let the planner decide | Agent discretion | |

**User's choice:** Hardcoded threshold of 10, no flag
**Notes:** Known bug: scraper was retrying indefinitely before changes — investigate during planning

---

| Option | Description | Selected |
|--------|-------------|----------|
| Retry with delay | Log error and attempt next scroll after 1s delay | ✓ |
| Continue immediately | Log error and continue immediately | |
| Let the planner decide | Agent discretion | |

**User's choice:** Retry with delay
**Notes:** None

---

## Error handling & retry

| Option | Description | Selected |
|--------|-------------|----------|
| p-retry | Use p-retry package for exponential backoff | |
| Custom implementation | Custom retry logic with setTimeout | |
| Let the planner decide | Agent discretion | ✓ |

**User's choice:** Let the planner decide
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 4-type classification | transient, permanent, browser, extraction | ✓ |
| 2-type classification | retryable vs non-retryable | |
| Let the planner decide | Agent discretion | |

**User's choice:** 4-type classification
**Notes:** Matches requirements

---

| Option | Description | Selected |
|--------|-------------|----------|
| pino | Use pino for structured JSON logging | |
| consola | Use consola for colorful console output | |
| Let the planner decide | Agent discretion | |

**User's choice:** Console output only (info/error/debug)
**Notes:** No structured logging needed, just temporary terminal logs

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sanitize in logs | Replace credentials with *** in all log output | ✓ |
| Don't log proxy | Don't log proxy URLs at all | |
| Let the planner decide | Agent discretion | |

**User's choice:** Sanitize in logs
**Notes:** Prevents accidental exposure

---

## the agent's Discretion

- Browser module API shape (D-01)
- Interception method (D-08)
- URL filter pattern (D-09)
- Extraction method (D-10)
- Scroll timing strategy (D-14)
- Retry library choice (D-18)

## Deferred Ideas

None — discussion stayed within phase scope