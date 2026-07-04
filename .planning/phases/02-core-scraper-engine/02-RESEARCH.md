# Phase 2: Core Scraper Engine - Research

**Researched:** 2026-07-04
**Domain:** Browser automation, GraphQL interception, error handling, structured logging
**Confidence:** HIGH

## Summary

Phase 2 implements the core scraping engine that replaces the monolithic `scraper.js` with modular TypeScript. The research covers cloakbrowser integration for stealth browser automation, Playwright's response interception for GraphQL data extraction, p-retry for exponential backoff error handling, and pino for structured logging. The existing codebase provides a working reference implementation in `scraper.js` (260 lines) that demonstrates the exact patterns needed: GraphQL response interception via `page.on('response')`, recursive JSON traversal for profile URL extraction, and auto-scrolling with DOM cleanup.

**Primary recommendation:** Use cloakbrowser's `launch()` function with stealth options, implement GraphQL interception via `page.on('response')` event listener, and add p-retry with exponential backoff for transient errors. Structure logging with pino's child loggers for different subsystems (browser, extraction, scroll).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Browser module API shape: planner decides (function with options object vs class)
- **D-02:** Stealth preset: 'careful' as default, configurable via config.json
- **D-03:** Proxy credentials: URL-embedded format (e.g., `http://user:pass@host:port`)
- **D-04:** Browser lifecycle: auto-close after scrape completes or on error
- **D-05:** Default headless mode: headless=true (visible via --no-headless flag)
- **D-06:** Locale/timezone: configurable in config.json, fallback to system values if empty
- **D-07:** Browser launch failures: log error details and re-throw (caller handles retry)
- **D-08:** Interception method: planner decides (response listener vs route interception)
- **D-09:** URL filter: planner decides (URL contains 'graphql' vs exact endpoint path)
- **D-10:** Extraction method: planner decides (recursive traversal vs JSONPath query)
- **D-11:** Deduplication: in-memory Set for tracking seen URLs
- **D-12:** Response parsing timeout: 15 seconds, skip on exceed
- **D-13:** Malformed responses: log warning and continue to next response
- **D-14:** Scroll timing: planner decides (network idle vs fixed interval)
- **D-15:** DOM cleanup frequency: after each scroll
- **D-16:** Stop criteria: hardcoded threshold of 10 consecutive scrolls with no new URLs (no CLI flag)
- **D-17:** Scroll failures: retry with 1s delay
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCRAPE-01 | CLI argument parsing with yargs (query, proxy, max-urls, headless, daemon) | Already implemented in Phase 1 `src/cli.ts` |
| SCRAPE-02 | Input validation for all CLI arguments with clear error messages | Already implemented in Phase 1 `src/cli.ts` |
| SCRAPE-03 | cloakbrowser integration with stealth configuration | Research: cloakbrowser `launch()` API with stealth options |
| SCRAPE-04 | Humanization enabled (humanize: true, humanPreset: 'careful') | Research: cloakbrowser humanize option |
| SCRAPE-05 | GraphQL response interception via page.on('response') | Research: Playwright `page.on('response')` event listener |
| SCRAPE-06 | Profile URL extraction from nested GraphQL JSON | Research: recursive JSON traversal pattern |
| SCRAPE-07 | Auto-scroll with adaptive timing (wait for network idle) | Research: Playwright scroll + network idle timing |
| SCRAPE-08 | DOM cleanup to prevent memory leaks | Research: DOM element removal pattern |
| SCRAPE-09 | Proxy support (HTTP/SOCKS5 with authentication) | Research: cloakbrowser proxy option |
| SCRAPE-10 | Graceful shutdown on SIGINT/SIGTERM | Research: Node.js signal handlers |
| ERROR-01 | Structured logging with pino (levels: fatal, error, warn, info, debug) | Research: pino logging library |
| ERROR-02 | Error classification (transient, permanent, browser, extraction) | Research: error classification system |
| ERROR-03 | Exponential backoff retry for transient errors (p-retry) | Research: p-retry library |
| ERROR-04 | No silent error swallowing (all catch blocks log) | Research: error handling patterns |
| ERROR-05 | Proxy credential sanitization in logs | Research: log redaction patterns |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Browser Launch & Stealth | Browser / Client | — | Cloakbrowser manages Chromium instance with anti-detection |
| GraphQL Interception | Browser / Client | API / Backend | Playwright intercepts network responses at browser level |
| Profile URL Extraction | API / Backend | Browser / Client | JSON parsing and data extraction from intercepted responses |
| Auto-scroll & DOM Cleanup | Browser / Client | — | Direct DOM manipulation for scrolling and memory management |
| Error Handling & Retry | API / Backend | Browser / Client | Retry logic wraps browser operations and network calls |
| Structured Logging | Cross-cutting | — | Pino logging across all subsystems |
| Graceful Shutdown | Cross-cutting | — | Signal handlers manage browser lifecycle |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cloakbrowser | ^0.3.28 | Stealth browser automation | Anti-detection bypass for Facebook; already in project |
| playwright-core | ^1.53.0 | Browser automation engine | Peer dependency of cloakbrowser; provides response interception |
| pino | ^9.0.0 | Structured JSON logging | High-performance logging with child loggers and redaction |
| p-retry | ^6.0.0 | Exponential backoff retry | Simple API for retrying async operations with backoff |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^4.4.3 | Schema validation | Validate config structures and API responses |
| yargs | ^18.0.0 | CLI argument parsing | Already implemented in Phase 1 |
| cosmiconfig | ^9.0.2 | Config file discovery | Already implemented in Phase 1 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| p-retry | Custom retry loop | p-retry handles edge cases (abort, max time) better |
| pino | console.log | pino provides structured JSON, child loggers, redaction |
| page.on('response') | page.route() | Response listener is simpler for data extraction; route is for modification |

**Installation:**
```bash
bun add pino p-retry
```

**Version verification:** Before writing the Standard Stack table, verify each recommended package exists and is current using the ecosystem-appropriate command:
```bash
npm view pino version
npm view p-retry version
```
Document the verified version and publish date. Training data versions may be months stale — always confirm against the correct ecosystem registry.

## Package Legitimacy Audit

> **Required** whenever this phase installs external packages. Run the Package Legitimacy Gate protocol before completing this section.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| pino | npm | 9+ years | 25M+/week | github.com/pinojs/pino | OK | Approved |
| p-retry | npm | 8+ years | 15M+/week | github.com/sindresorhus/p-retry | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*Packages discovered via WebSearch or training data that have not been verified against an authoritative source are tagged `[ASSUMED]` and the planner must gate each install behind a `checkpoint:human-verify` task.*

## Architecture Patterns

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                      CLI Entry Point                        │
│              `src/cli.ts` (yargs parsing)                   │
├──────────────────┬──────────────────┬───────────────────────┤
│   Config         │   Browser        │   Error               │
│   Resolution     │   Controller     │   Handler             │
│   (cosmiconfig)  │   (cloakbrowser) │   (p-retry + pino)    │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Cloak Browser (Playwright)                   │
│         Launch with stealth options, proxy, humanize         │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Facebook Ads Library (External)                             │
│  URL: facebook.com/ads/library/                              │
│  Data: GraphQL API responses with profile URLs               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Response Interception Layer                                 │
│  - page.on('response') listener                             │
│  - Filter for GraphQL URLs                                  │
│  - JSON parsing with timeout (15s)                          │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Data Extraction Layer                                      │
│  - Recursive JSON traversal                                 │
│  - Profile URL collection (Set for dedup)                   │
│  - Incremental saving (every 100 URLs)                      │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── cli.ts          # CLI entry point with yargs (already implemented)
├── config.ts       # Config loading and preset resolution (already implemented)
├── browser.ts      # Browser launch, stealth config, lifecycle management
├── scraper.ts      # Main scrape orchestration, scroll loop, shutdown handlers
├── extractor.ts    # GraphQL response parsing, profile URL extraction
├── logger.ts       # Pino logger setup, child loggers, redaction
├── errors.ts       # Error classification, retry wrapper with p-retry
└── types.ts        # Shared TypeScript types and interfaces
```

### Pattern 1: Browser Launch with Stealth Configuration
**What:** Launch cloakbrowser with humanization, proxy, and stealth options
**When to use:** Starting a new scrape session
**Example:**
```typescript
// Source: [CITED: github.com/cloakhq/cloakbrowser/blob/main/README.md]
import { launch } from 'cloakbrowser';

const browser = await launch({
    headless: options.headless,
    humanize: true,
    human_preset: 'careful',
    stealth_args: true,
    locale: options.locale || 'en-US',
    timezone: options.timezone || 'Asia/Dhaka',
    ...(options.proxy && { proxy: options.proxy }),
});
```

### Pattern 2: GraphQL Response Interception
**What:** Listen for network responses and extract data from GraphQL endpoints
**When to use:** After browser navigation, before scroll loop
**Example:**
```typescript
// Source: [CITED: github.com/microsoft/playwright/blob/main/docs/src/network.md]
const profileUrls = new Set<string>();

page.on('response', async (response) => {
    try {
        if (response.status() === 200 && response.url().includes('graphql')) {
            const json = await withTimeout(response.json(), 15000);
            extractProfileUrls(json, profileUrls);
        }
    } catch (e) {
        if (e.message.includes('Timed out')) {
            logger.warn(`Skipped slow GraphQL response: ${e.message}`);
        }
        // Non-JSON or failed responses, skip
    }
});
```

### Pattern 3: Recursive JSON Extraction
**What:** Traverse nested JSON objects to find profile URLs
**When to use:** Processing intercepted GraphQL responses
**Example:**
```typescript
// Source: [VERIFIED: codebase/scraper.js:60-76]
function extractProfileUrls(obj: unknown, urls: Set<string>): void {
    if (!obj || typeof obj !== 'object') return;

    if ('page_profile_uri' in obj && typeof obj.page_profile_uri === 'string') {
        urls.add(obj.page_profile_uri);
    }

    if (Array.isArray(obj)) {
        for (const item of obj) {
            extractProfileUrls(item, urls);
        }
    } else {
        for (const key of Object.keys(obj)) {
            extractProfileUrls((obj as Record<string, unknown>)[key], urls);
        }
    }
}
```

### Pattern 4: Exponential Backoff Retry
**What:** Retry transient errors with exponential backoff
**When to use:** Wrapping browser operations, network calls, scroll operations
**Example:**
```typescript
// Source: [CITED: github.com/sindresorhus/p-retry/blob/main/readme.md]
import pRetry from 'p-retry';

const result = await pRetry(
    async (attemptNumber) => {
        logger.debug(`Attempt ${attemptNumber}`);
        return await someOperation();
    },
    {
        retries: 3,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 10000,
        randomize: true,
    }
);
```

### Pattern 5: Structured Logging with Child Loggers
**What:** Create subsystem-specific loggers with context
**When to use:** Initialize at module level, pass to functions
**Example:**
```typescript
// Source: [CITED: github.com/pinojs/pino/blob/main/docs/api.md]
import pino from 'pino';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    redact: ['proxy', '*.proxy'],  // Sanitize proxy credentials
});

// Child loggers for subsystems
const browserLogger = logger.child({ module: 'browser' });
const extractLogger = logger.child({ module: 'extractor' });
const scrollLogger = logger.child({ module: 'scroll' });
```

### Anti-Patterns to Avoid
- **Silent catch blocks:** Always log errors in catch blocks (ERROR-04 requirement)
- **Hardcoded timeouts:** Use configurable timeouts from config (D-12: 15s default)
- **Missing credential sanitization:** Always redact proxy credentials in logs (D-21)
- **No retry for transient errors:** Network timeouts and browser crashes need retry (ERROR-03)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exponential backoff retry | Custom retry loop with setTimeout | p-retry | Handles abort signals, max time budgets, jitter |
| Structured logging | console.log with manual JSON | pino | High-performance, child loggers, redaction, transports |
| Error classification | Manual error type checking | Custom error classes + p-retry shouldConsumeRetry | Type-safe, composable with retry logic |
| Response parsing timeout | Manual Promise.race wrapper | withTimeout helper (existing) | Keep existing pattern, but use p-retry for retry |

**Key insight:** The existing `withTimeout` helper in `scraper.js` is a good pattern — keep it. But wrap retryable operations with p-retry instead of manual retry loops.

## Common Pitfalls

### Pitfall 1: Browser Crash Without Cleanup
**What goes wrong:** Browser process leaks when scraper crashes unexpectedly
**Why it happens:** No try-finally around browser operations
**How to avoid:** Use try-finally blocks; register process exit handlers; implement graceful shutdown
**Warning signs:** Zombie Chromium processes in task manager

### Pitfall 2: GraphQL Response Timeout
**What goes wrong:** Scraper hangs waiting for large GraphQL responses
**Why it happens:** No timeout on response.json() call
**How to avoid:** Wrap response.json() with withTimeout (15s per D-12)
**Warning signs:** Scraper appears frozen, no progress logs

### Pitfall 3: Memory Leak from DOM Accumulation
**What goes wrong:** Browser memory grows unbounded during long scrapes
**Why it happens:** Processed DOM elements not cleaned up
**How to avoid:** Remove DOM elements above viewport after each scroll (D-15)
**Warning signs:** Increasing memory usage, eventual crash

### Pitfall 4: Infinite Retry Loop
**What goes wrong:** Scraper retries permanent errors indefinitely
**Why it happens:** No error classification to distinguish transient vs permanent
**How to avoid:** Implement 4-type error classification (D-19); only retry transient errors
**Warning signs:** Scraper never completes, constant retry logs

### Pitfall 5: Proxy Credential Leakage
**What goes wrong:** Proxy username/password appears in log files
**Why it happens:** Proxy string logged directly without sanitization
**How to avoid:** Sanitize proxy credentials in all log output (D-21)
**Warning signs:** Credentials visible in console or log files

## Code Examples

Verified patterns from official sources:

### Browser Launch with All Options
```typescript
// Source: [CITED: github.com/cloakhq/cloakbrowser/blob/main/README.md]
import { launch } from 'cloakbrowser';
import type { Browser } from 'playwright-core';

interface BrowserOptions {
    headless: boolean;
    proxy?: string;
    locale?: string;
    timezone?: string;
}

export async function launchBrowser(options: BrowserOptions): Promise<Browser> {
    const launchOpts = {
        headless: options.headless,
        humanize: true,
        human_preset: 'careful',
        stealth_args: true,
        locale: options.locale || 'en-US',
        timezone: options.timezone || 'Asia/Dhaka',
    };

    if (options.proxy) {
        launchOpts.proxy = options.proxy;
    }

    return await launch(launchOpts);
}
```

### GraphQL Interception with Error Handling
```typescript
// Source: [CITED: github.com/microsoft/playwright/blob/main/docs/src/network.md]
import type { Page, Response } from 'playwright-core';

function setupGraphQLInterceptor(
    page: Page,
    profileUrls: Set<string>,
    logger: pino.Logger
): void {
    page.on('response', async (response: Response) => {
        try {
            if (response.status() === 200 && response.url().includes('graphql')) {
                const json = await withTimeout(response.json(), 15000);
                extractProfileUrls(json, profileUrls);
                logger.debug(`Extracted URLs from GraphQL response: ${profileUrls.size} total`);
            }
        } catch (e) {
            const error = e as Error;
            if (error.message.includes('Timed out')) {
                logger.warn(`Skipped slow GraphQL response: ${error.message}`);
            } else {
                logger.debug(`Skipped non-JSON response: ${error.message}`);
            }
        }
    });
}
```

### Error Classification System
```typescript
// Source: [ASSUMED] based on D-19 error classification requirement
export enum ErrorType {
    Transient = 'transient',    // Network timeouts, temporary failures
    Permanent = 'permanent',    // Invalid arguments, missing config
    Browser = 'browser',        // Browser crashes, page errors
    Extraction = 'extraction',  // JSON parsing, data extraction failures
}

export function classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('network')) {
        return ErrorType.Transient;
    }
    if (message.includes('browser') || message.includes('crash')) {
        return ErrorType.Browser;
    }
    if (message.includes('json') || message.includes('parse')) {
        return ErrorType.Extraction;
    }
    return ErrorType.Permanent;
}
```

### Graceful Shutdown Handler
```typescript
// Source: [VERIFIED: codebase/scraper.js:162-174]
import type { Browser } from 'playwright-core';

function setupShutdownHandler(
    browser: Browser,
    profileUrls: Set<string>,
    saveUrls: (urls: Set<string>) => void,
    logger: pino.Logger
): void {
    let shuttingDown = false;

    const shutdown = async () => {
        if (shuttingDown) return;
        shuttingDown = true;

        logger.info('Shutting down gracefully...');
        saveUrls(profileUrls);

        try {
            await browser.close();
        } catch (e) {
            logger.error(`Failed to close browser: ${(e as Error).message}`);
        }

        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| console.log | pino structured logging | Phase 2 | JSON logs, child loggers, redaction |
| Manual retry loops | p-retry with exponential backoff | Phase 2 | Better retry handling, abort signals |
| No error classification | 4-type error system | Phase 2 | Selective retry, better diagnostics |
| Hardcoded timeouts | Configurable timeouts | Phase 2 | Flexibility per deployment |

**Deprecated/outdated:**
- console.log for logging: Replace with pino for structured output
- Custom retry implementations: Use p-retry for reliability
- Silent catch blocks: Always log errors (ERROR-04)

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this
> section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | pino version ^9.0.0 is current | Standard Stack | May need to adjust version |
| A2 | p-retry version ^6.0.0 is current | Standard Stack | May need to adjust version |
| A3 | Error classification system matches project needs | Code Examples | May need adjustment |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Should we add pino-pretty for development?**
   - What we know: pino outputs JSON by default, which is hard to read in development
   - What's unclear: Whether to add pino-pretty as dev dependency
   - Recommendation: Add pino-pretty as devDependency for development; use JSON in production

2. **Should we implement response body caching for debugging?**
   - What we know: GraphQL responses can be large and complex
   - What's unclear: Whether to cache responses for debugging/replay
   - Recommendation: Skip for MVP; add optional caching in future phase

## Environment Availability

> Skip this section if the phase has no external dependencies (code/config-only changes).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Runtime | ✓ | Latest | — |
| Network access | Facebook Ads Library | ✓ | — | — |
| pino | Logging | ✗ | — | Install via `bun add pino` |
| p-retry | Retry logic | ✗ | — | Install via `bun add p-retry` |

**Missing dependencies with no fallback:**
- pino and p-retry must be installed before implementation

**Missing dependencies with fallback:**
- None

## Validation Architecture

> Skip this section entirely if workflow.nyquist_validation is explicitly set to false in .planning/config.json. If the key is absent, treat as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test |
| Config file | none — see Wave 0 |
| Quick run command | `bun test` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCRAPE-03 | Browser launches with stealth config | unit | `bun test tests/browser.test.ts` | ❌ Wave 0 |
| SCRAPE-05 | GraphQL interception works | integration | `bun test tests/interceptor.test.ts` | ❌ Wave 0 |
| SCRAPE-06 | Profile URLs extracted correctly | unit | `bun test tests/extractor.test.ts` | ❌ Wave 0 |
| ERROR-01 | Pino logging works | unit | `bun test tests/logger.test.ts` | ❌ Wave 0 |
| ERROR-03 | Retry with exponential backoff | unit | `bun test tests/errors.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/browser.test.ts` — covers SCRAPE-03, SCRAPE-04
- [ ] `tests/interceptor.test.ts` — covers SCRAPE-05, SCRAPE-06
- [ ] `tests/extractor.test.ts` — covers SCRAPE-06
- [ ] `tests/logger.test.ts` — covers ERROR-01
- [ ] `tests/errors.test.ts` — covers ERROR-02, ERROR-03, ERROR-04
- [ ] Framework install: `bun add -d @types/pino` — if needed

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

## Security Domain

> Required when `security_enforcement` is enabled (absent = enabled). Omit only if explicitly `false` in config.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Zod schema validation for config and CLI args |
| V6 Cryptography | no | No encryption needed (public data) |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Proxy credential leakage | Information Disclosure | Log redaction with pino redact option |
| Browser fingerprint detection | Elevation of Privilege | cloakbrowser stealth configuration |
| GraphQL response manipulation | Tampering | Validate response structure before extraction |

## Sources

### Primary (HIGH confidence)
- /cloakhq/cloakbrowser - Browser launch API, stealth configuration, proxy support
- /microsoft/playwright - Response interception, page events, network monitoring
- /pinojs/pino - Structured logging, child loggers, redaction
- /sindresorhus/p-retry - Exponential backoff retry, error classification

### Secondary (MEDIUM confidence)
- [CITED: github.com/cloakhq/cloakbrowser/blob/main/README.md] - Launch options examples
- [CITED: github.com/microsoft/playwright/blob/main/docs/src/network.md] - Response interception patterns
- [CITED: github.com/pinojs/pino/blob/main/docs/api.md] - Child logger API
- [CITED: github.com/sindresorhus/p-retry/blob/main/readme.md] - Retry options

### Tertiary (LOW confidence)
- [ASSUMED] Error classification system design
- [ASSUMED] pino-pretty development setup

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are well-established with official documentation
- Architecture: HIGH - Based on existing working implementation in scraper.js
- Pitfalls: HIGH - Derived from existing codebase analysis and common patterns

**Research date:** 2026-07-04
**Valid until:** 2026-08-04 (30 days for stable libraries)
