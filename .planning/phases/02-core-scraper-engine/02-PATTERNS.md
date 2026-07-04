# Phase 2: Core Scraper Engine - Pattern Map

**Mapped:** 2026-07-04
**Files analyzed:** 11 (6 modified/created source files + 5 test files)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/browser.ts` | service | request-response | `scraper.js:124-134` (browser launch) | exact |
| `src/scraper.ts` | service | event-driven | `scraper.js:118-239` (main function) | exact |
| `src/extractor.ts` | utility | transform | `scraper.js:60-76` (extractProfileUrls) | exact |
| `src/logger.ts` | utility | cross-cutting | none (new pattern) | no-analog |
| `src/errors.ts` | utility | cross-cutting | `scraper.js:79-84` (withTimeout) | role-match |
| `src/types.ts` | config | none | `src/index.ts:10-20` (CliArgs type) | exact |
| `tests/browser.test.ts` | test | none | `tests/setup.test.ts` | exact |
| `tests/interceptor.test.ts` | test | none | `tests/cli.test.ts` | role-match |
| `tests/extractor.test.ts` | test | none | `tests/config.test.ts` | role-match |
| `tests/logger.test.ts` | test | none | `tests/setup.test.ts` | role-match |
| `tests/errors.test.ts` | test | none | `tests/cli.test.ts` | role-match |

## Pattern Assignments

### `src/browser.ts` (service, request-response)

**Analog:** `scraper.js:124-134` (browser launch configuration)

**Imports pattern** (from existing stub + research):
```typescript
// --- Browser controller ---
import { launch, type Browser } from 'cloakbrowser';
import type { Logger } from 'pino';
```

**Core pattern** (lines 124-134):
```typescript
// Browser launch with stealth configuration
const launchOpts = {
    headless,
    humanize: true,
    human_preset: 'careful',
    stealth_args: true,
    locale: 'en-US',
    timezone: 'Asia/Dhaka',
};
if (proxy) launchOpts.proxy = proxy;

const browser = await launch(launchOpts);
```

**Export pattern** (per Phase 1 D-03: functions directly, not classes):
```typescript
export interface BrowserOptions {
    headless: boolean;
    proxy?: string;
    locale?: string;
    timezone?: string;
    logger: Logger;
}

export async function launchBrowser(options: BrowserOptions): Promise<Browser> {
    // Implementation
}
```

**Error handling pattern** (D-07: log error details and re-throw):
```typescript
try {
    const browser = await launch(launchOpts);
    return browser;
} catch (error) {
    options.logger.error({ err: error }, 'Browser launch failed');
    throw error;
}
```

---

### `src/scraper.ts` (service, event-driven)

**Analog:** `scraper.js:118-239` (main function with scroll loop)

**Imports pattern**:
```typescript
// --- Scraper engine ---
import type { Browser, Page } from 'playwright-core';
import type { Logger } from 'pino';
import { launchBrowser, type BrowserOptions } from './browser.js';
import { extractProfileUrls, setupGraphQLInterceptor } from './extractor.js';
import { withTimeout } from './errors.js';
import { saveOutput } from './output.js';
```

**Core scroll loop pattern** (lines 185-228):
```typescript
// Auto-scroll loop with DOM cleanup
while (noNewUrlsCount < maxNoNewScrolls && profileUrls.size < maxUrls) {
    const before = profileUrls.size;

    try {
        await withTimeout(page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)), 10000);
    } catch (e) {
        logger.error(`Scroll failed: ${(e as Error).message}. Retrying...`);
        await page.waitForTimeout(1000);
        continue;
    }
    await page.waitForTimeout(2500);

    // Remove already-processed ad cards above viewport
    try {
        await withTimeout(page.evaluate(() => {
            const rows = document.querySelectorAll('[role="row"]');
            const viewportTop = window.scrollY;
            for (const row of rows) {
                const rect = row.getBoundingClientRect();
                if (rect.bottom < viewportTop - 500) {
                    row.remove();
                }
            }
        }), 10000);
    } catch (e) {
        logger.error(`DOM cleanup failed: ${(e as Error).message}. Continuing...`);
    }

    scrollCount++;
    // ... tracking logic
}
```

**Graceful shutdown pattern** (lines 162-174):
```typescript
let shuttingDown = false;
const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('Shutting down gracefully...');
    saveUrls(profileUrls);
    try { await browser.close(); } catch { }
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

**Export pattern**:
```typescript
export interface ScraperOptions {
    query: string;
    maxUrls?: number;
    maxNoNewScrolls: number;
    headless: boolean;
    proxy?: string;
    locale?: string;
    timezone?: string;
    logger: Logger;
}

export async function runScraper(options: ScraperOptions): Promise<Set<string>> {
    // Implementation
}
```

---

### `src/extractor.ts` (utility, transform)

**Analog:** `scraper.js:60-76` (extractProfileUrls function)

**Imports pattern**:
```typescript
// --- GraphQL response extraction ---
import type { Page, Response } from 'playwright-core';
import type { Logger } from 'pino';
import { withTimeout } from './errors.js';
```

**Core extraction pattern** (lines 60-76):
```typescript
// Extract page_profile_uri from nested GraphQL response
export function extractProfileUrls(obj: unknown, urls: Set<string>): void {
    if (!obj || typeof obj !== 'object') return;

    if ('page_profile_uri' in obj && typeof (obj as Record<string, unknown>).page_profile_uri === 'string') {
        urls.add((obj as Record<string, unknown>).page_profile_uri as string);
    }

    if (Array.isArray(obj)) {
        for (const item of obj) {
            extractProfileUrls(item, urls);
        }
    } else {
        for (const key of Object.keys(obj as Record<string, unknown>)) {
            extractProfileUrls((obj as Record<string, unknown>)[key], urls);
        }
    }
}
```

**GraphQL interceptor pattern** (lines 148-160):
```typescript
// Intercept network responses
export function setupGraphQLInterceptor(
    page: Page,
    profileUrls: Set<string>,
    logger: Logger
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

**Export pattern**:
```typescript
export { extractProfileUrls, setupGraphQLInterceptor };
```

---

### `src/logger.ts` (utility, cross-cutting)

**Analog:** No existing analog (new pattern from research)

**Imports pattern** (from research):
```typescript
// --- Structured logging ---
import pino from 'pino';
```

**Core pattern** (from research Pattern 5):
```typescript
// Create base logger with redaction for proxy credentials
export function createLogger(level: string = 'info'): pino.Logger {
    return pino({
        level: process.env.LOG_LEVEL || level,
        redact: ['proxy', '*.proxy'],  // Sanitize proxy credentials (D-21)
    });
}

// Child loggers for subsystems
export function createChildLogger(parent: pino.Logger, module: string): pino.Logger {
    return parent.child({ module });
}
```

**Export pattern**:
```typescript
export { createLogger, createChildLogger };
```

---

### `src/errors.ts` (utility, cross-cutting)

**Analog:** `scraper.js:79-84` (withTimeout function)

**Imports pattern**:
```typescript
// --- Error handling and retry ---
import pRetry from 'p-retry';
```

**Core withTimeout pattern** (lines 79-84):
```typescript
// Helper: run a promise with a timeout
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)),
    ]);
}
```

**Error classification pattern** (from research):
```typescript
// Error classification system (D-19)
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

**Retry wrapper pattern** (from research Pattern 4):
```typescript
// Retry wrapper with exponential backoff (ERROR-03)
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: { retries?: number; logger?: pino.Logger } = {}
): Promise<T> {
    const { retries = 3, logger } = options;

    return pRetry(
        async (attemptNumber) => {
            if (logger) logger.debug(`Attempt ${attemptNumber}`);
            return await fn();
        },
        {
            retries,
            factor: 2,
            minTimeout: 1000,
            maxTimeout: 10000,
            randomize: true,
            onFailedAttempt: (error) => {
                if (logger) {
                    logger.warn(
                        `Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
                    );
                }
            },
        }
    );
}
```

**Export pattern**:
```typescript
export { withTimeout, classifyError, ErrorType, withRetry };
```

---

### `src/types.ts` (config, none)

**Analog:** `src/index.ts:10-20` (CliArgs type)

**Type definition pattern**:
```typescript
// --- Shared types and interfaces ---

import type { Logger } from 'pino';

// Browser options
export interface BrowserOptions {
    headless: boolean;
    proxy?: string;
    locale?: string;
    timezone?: string;
    logger: Logger;
}

// Scraper options
export interface ScraperOptions {
    query: string;
    maxUrls?: number;
    maxNoNewScrolls: number;
    headless: boolean;
    proxy?: string;
    locale?: string;
    timezone?: string;
    logger: Logger;
}

// Config preset (from Zod schema)
export interface Preset {
    callback: string;
}

// Error types
export type ErrorCategory = 'transient' | 'permanent' | 'browser' | 'extraction';
```

**Export pattern**:
```typescript
export type { BrowserOptions, ScraperOptions, Preset, ErrorCategory };
```

---

## Shared Patterns

### Authentication
**Source:** None (no auth in this project)
**Apply to:** N/A
```typescript
// No authentication required - scraping public Facebook Ads Library
```

### Error Handling
**Source:** `scraper.js:79-84` (withTimeout) + research
**Apply to:** All service and utility files
```typescript
// Centralized error handling with classification
try {
    // Operation
} catch (error) {
    const err = error as Error;
    const errorType = classifyError(err);
    logger.error({ err, errorType }, 'Operation failed');
    
    if (errorType === ErrorType.Transient) {
        throw err; // Let retry wrapper handle
    }
    throw err; // Permanent errors bubble up
}
```

### Logging
**Source:** research Pattern 5
**Apply to:** All files
```typescript
// Structured logging with child loggers
const logger = createLogger('info');
const browserLogger = createChildLogger(logger, 'browser');
const extractorLogger = createChildLogger(logger, 'extractor');
const scrollLogger = createChildLogger(logger, 'scroll');
```

### Validation
**Source:** `src/config.ts:6-17` (Zod schemas)
**Apply to:** All config/options
```typescript
// Zod schema validation for options
import { z } from 'zod';

const BrowserOptionsSchema = z.object({
    headless: z.boolean(),
    proxy: z.string().url().optional(),
    locale: z.string().optional(),
    timezone: z.string().optional(),
});
```

### Testing
**Source:** `tests/cli.test.ts`, `tests/config.test.ts`
**Apply to:** All test files
```typescript
import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock modules
const mockFunction = mock(() => {});
mock.module('../src/module.js', () => ({
    functionName: mockFunction,
}));

// Test structure
describe('Feature', () => {
    beforeEach(() => {
        mockFunction.mockClear();
    });

    it('should do something', async () => {
        // Arrange
        const input = {};

        // Act
        const result = await functionUnderTest(input);

        // Assert
        expect(result).toBe(expected);
    });
});
```

---

## Test File Patterns

### `tests/browser.test.ts` (test, none)

**Analog:** `tests/setup.test.ts`

**Pattern**:
```typescript
import { describe, it, expect, mock } from 'bun:test';

// Mock cloakbrowser
const mockLaunch = mock(() => Promise.resolve({
    newPage: mock(() => Promise.resolve({})),
    close: mock(() => Promise.resolve()),
}));

mock.module('cloakbrowser', () => ({
    launch: mockLaunch,
}));

describe('Browser controller', () => {
    it('launchBrowser calls cloakbrowser launch with correct options', async () => {
        const { launchBrowser } = await import('../src/browser');
        const logger = { info: mock(), error: mock(), debug: mock(), warn: mock() };
        
        await launchBrowser({
            headless: true,
            logger: logger as any,
        });

        expect(mockLaunch).toHaveBeenCalledWith(
            expect.objectContaining({
                headless: true,
                humanize: true,
                human_preset: 'careful',
            })
        );
    });
});
```

### `tests/extractor.test.ts` (test, none)

**Analog:** `tests/config.test.ts`

**Pattern**:
```typescript
import { describe, it, expect } from 'bun:test';
import { extractProfileUrls } from '../src/extractor';

describe('extractProfileUrls', () => {
    it('extracts page_profile_uri from nested object', () => {
        const urls = new Set<string>();
        const data = {
            page_profile_uri: 'https://facebook.com/profile/123',
        };

        extractProfileUrls(data, urls);

        expect(urls.has('https://facebook.com/profile/123')).toBe(true);
    });

    it('extracts URLs from nested arrays', () => {
        const urls = new Set<string>();
        const data = {
            edges: [
                { node: { page_profile_uri: 'https://facebook.com/profile/1' } },
                { node: { page_profile_uri: 'https://facebook.com/profile/2' } },
            ],
        };

        extractProfileUrls(data, urls);

        expect(urls.size).toBe(2);
    });

    it('deduplicates URLs', () => {
        const urls = new Set<string>();
        const data = {
            page_profile_uri: 'https://facebook.com/profile/123',
        };

        extractProfileUrls(data, urls);
        extractProfileUrls(data, urls);

        expect(urls.size).toBe(1);
    });

    it('handles null/undefined gracefully', () => {
        const urls = new Set<string>();
        extractProfileUrls(null, urls);
        extractProfileUrls(undefined, urls);
        expect(urls.size).toBe(0);
    });
});
```

### `tests/errors.test.ts` (test, none)

**Analog:** `tests/cli.test.ts`

**Pattern**:
```typescript
import { describe, it, expect } from 'bun:test';
import { withTimeout, classifyError, ErrorType } from '../src/errors';

describe('withTimeout', () => {
    it('resolves if promise completes before timeout', async () => {
        const result = await withTimeout(Promise.resolve('done'), 1000);
        expect(result).toBe('done');
    });

    it('rejects if promise exceeds timeout', async () => {
        const slowPromise = new Promise((resolve) => setTimeout(resolve, 2000));
        await expect(withTimeout(slowPromise, 100)).rejects.toThrow('Timed out after 100ms');
    });
});

describe('classifyError', () => {
    it('classifies timeout errors as transient', () => {
        const error = new Error('Request timed out');
        expect(classifyError(error)).toBe(ErrorType.Transient);
    });

    it('classifies browser errors as browser', () => {
        const error = new Error('Browser crashed');
        expect(classifyError(error)).toBe(ErrorType.Browser);
    });

    it('classifies JSON errors as extraction', () => {
        const error = new Error('JSON parse error');
        expect(classifyError(error)).toBe(ErrorType.Extraction);
    });

    it('classifies other errors as permanent', () => {
        const error = new Error('Invalid argument');
        expect(classifyError(error)).toBe(ErrorType.Permanent);
    });
});
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/logger.ts` | utility | cross-cutting | No logging infrastructure exists yet; use pino patterns from research |
| `tests/logger.test.ts` | test | none | New module, no existing test pattern for logging |

---

## Metadata

**Analog search scope:** `src/`, `tests/`, `scraper.js`
**Files scanned:** 11 (6 source + 5 test)
**Pattern extraction date:** 2026-07-04

---

## Implementation Notes

### Key Decisions from Research
1. **Browser API shape (D-01):** Function with options object (not class) — matches existing pattern
2. **Interception method (D-08):** `page.on('response')` — simpler for data extraction
3. **URL filter (D-09):** URL contains 'graphql' — broad filter catches all GraphQL endpoints
4. **Extraction method (D-10):** Recursive traversal — already proven in scraper.js
5. **Scroll timing (D-14):** Fixed interval (2500ms) — simple and reliable
6. **Retry library (D-18):** p-retry — handles edge cases better than custom

### Dependencies to Install
```bash
bun add pino@^10.3.1 p-retry@^8.0.0
bun add -d @types/pino
```

### Export Style
Per Phase 1 D-03: Functions directly (not classes). All modules export functions, not classes.

### Error Handling
Per D-19: 4-type error classification system. Only transient errors get retry.

### Logging
Per D-20: Console output only (pino provides structured JSON). Per D-21: Proxy credentials redacted in all logs.
