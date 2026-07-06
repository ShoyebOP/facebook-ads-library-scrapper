# Phase 3: Output & Delivery - Pattern Map

**Mapped:** 2026-07-05
**Files analyzed:** 6
**Analogs found:** 5 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/output.ts` | service | file-I/O | `scraper.js:87-94` (saveUrls) | exact |
| `src/webhook.ts` | service | request-response | `scraper.js:97-115` (notifyWebhook) | exact |
| `src/types.ts` | types | transform | `src/types.ts` (existing) | self |
| `src/index.ts` | orchestrator | request-response | `src/index.ts` (existing) | self |
| `src/output.test.ts` | test | file-I/O | `tests/browser.test.ts` | role-match |
| `src/webhook.test.ts` | test | request-response | `tests/browser.test.ts` | role-match |

## Pattern Assignments

### `src/output.ts` (service, file-I/O)

**Analog:** `scraper.js:87-94` (saveUrls function)

**Imports pattern** (lines 1-2):
```typescript
import fs from 'fs';
```

**Core pattern** (lines 87-94):
```typescript
// --- Save URLs to JSON file ---
function saveUrls(urls) {
    const data = [...urls];
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
    console.log(`\nSaved ${data.length} unique profile URLs to ${outputFile}`);
    if (CALLBACKS[callbackName]) {
        notifyWebhook(data.length);
    }
}
```

**Directory creation pattern** (lines 55-57):
```typescript
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
```

**Timestamp formatting pattern** (lines 45-52):
```typescript
function pad(n) {
    return String(n).padStart(2, '0');
}

const now = new Date();
const outputDir = 'output';
const sanitizedQuery = query.replace(/ /g, '_');
const outputFile = process.env.SCRAPER_OUTPUT_FILE || `${outputDir}/${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}:${pad(now.getHours())}-${pad(now.getMinutes())}.${sanitizedQuery}.json`;
```

**TypeScript interface** (from RESEARCH.md):
```typescript
interface OutputOptions {
    query: string;
    outputDir?: string;
    logger: Logger;
}

interface IncrementalSaverOptions {
    outputFile: string;
    saveInterval?: number;
}
```

---

### `src/webhook.ts` (service, request-response)

**Analog:** `scraper.js:97-115` (notifyWebhook function)

**Imports pattern** (lines 4-5):
```typescript
import http from 'http';
import https from 'https';
```

**Core pattern** (lines 97-115):
```typescript
// --- Send a POST signal to the webhook ---
function notifyWebhook(count) {
    const callbackUrl = CALLBACKS[callbackName];
    const url = new URL(callbackUrl);
    const client = url.protocol === 'https:' ? https : http;
    const body = JSON.stringify({ query, outputFile, count });

    const req = client.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
        console.log(`Webhook notified (${res.statusCode})`);
    });

    req.on('error', (err) => {
        console.error(`Webhook failed: ${err.message}`);
    });

    req.end(body);
}
```

**Retry pattern** (from errors.ts lines 77-107):
```typescript
import pRetry, { AbortError } from 'p-retry';

// Use withRetry pattern from errors.ts:
return pRetry(
    async (attemptNumber) => {
        try {
            return await fn();
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const category = classifyError(err);

            // Permanent errors: throw immediately
            if (category === 'permanent') {
                throw new AbortError(err.message);
            }

            // Transient errors: allow retry
            throw err;
        }
    },
    {
        retries: 2,
        onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
            logger.warn(`Attempt ${attemptNumber} failed: ${error.message}. ${retriesLeft} retries left.`);
        },
    },
);
```

**TypeScript interface** (from RESEARCH.md):
```typescript
interface WebhookPayload {
    query: string;
    outputFile: string;
    count: number;
}

interface WebhookOptions {
    url: string;
    payload: WebhookPayload;
    timeoutMs?: number;
    retries?: number;
    logger: Logger;
}
```

---

### `src/types.ts` (types, transform)

**Analog:** `src/types.ts` (existing pattern)

**Existing pattern** (lines 1-34):
```typescript
// --- Shared types and interfaces ---

import type { Logger } from 'pino';

// --- Browser options ---

export interface BrowserOptions {
    headless: boolean;
    proxy?: string;
    locale?: string;
    timezone?: string;
    logger: Logger;
}

// --- Scraper options ---

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

// --- Error category (D-19) ---

export type ErrorCategory =
    | 'transient'
    | 'permanent'
    | 'browser'
    | 'extraction';
```

**Add new interfaces:**
```typescript
// --- Output options ---

export interface OutputOptions {
    query: string;
    outputDir?: string;
    logger: Logger;
}

export interface IncrementalSaverOptions {
    outputFile: string;
    saveInterval?: number;
}

// --- Webhook options ---

export interface WebhookPayload {
    query: string;
    outputFile: string;
    count: number;
}

export interface WebhookOptions {
    url: string;
    payload: WebhookPayload;
    timeoutMs?: number;
    retries?: number;
    logger: Logger;
}
```

---

### `src/index.ts` (orchestrator, request-response)

**Analog:** `src/index.ts` (existing pattern)

**Existing imports pattern** (lines 1-6):
```typescript
// --- Main entry — pipeline orchestrator ---

import { loadConfig, resolvePreset } from './config.js';
import { createLogger } from './logger.js';
import { runScraper } from './scraper.js';
import type { ScraperOptions } from './types.js';
```

**Existing pipeline pattern** (lines 24-56):
```typescript
export async function main(argv: CliArgs): Promise<Set<string>> {
    // D-20: create structured logger
    const logger = createLogger();

    // Load configuration
    const config = await loadConfig();

    // Resolve preset if provided
    if (argv.preset) {
        const preset = resolvePreset(config, argv.preset);
        logger.info(`Using preset: ${argv.preset} (${preset.callback})`);
    }

    // Construct ScraperOptions from CliArgs
    const options: ScraperOptions = {
        query: argv.query,
        maxUrls: argv.maxUrls,
        maxNoNewScrolls: argv.maxNoNewScrolls,
        headless: argv.headless,
        proxy: argv.proxy,
        logger,
    };

    // Run scraper pipeline
    const urls = await runScraper(options);

    // Log completion with URL count
    logger.info(
        `Scraping complete: ${urls.size} unique profile URLs collected`,
    );

    return urls;
}
```

**Integration pattern** (add after runScraper):
```typescript
// After runScraper returns urls:
import { generateOutputPath, ensureOutputDir, saveUrlsToFile, createIncrementalSaver } from './output.js';
import { notifyWebhook, resolveEndpoint } from './webhook.js';

// Generate output path
const outputFile = generateOutputPath({ query: argv.query, logger });

// Ensure output directory exists
await ensureOutputDir('output');

// Save URLs
saveUrlsToFile(outputFile, urls);

// Send webhook notification
if (argv.preset) {
    const preset = resolvePreset(config, argv.preset);
    await notifyWebhook({
        url: preset.callback,
        payload: {
            query: argv.query,
            outputFile,
            count: urls.size,
        },
        logger,
    });
}
```

---

### `src/output.test.ts` (test, file-I/O)

**Analog:** `tests/browser.test.ts`

**Imports pattern** (lines 1-2):
```typescript
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import pino from 'pino';
```

**Test structure pattern** (lines 9-71):
```typescript
describe('module.ts', () => {
    it('exports functionName', async () => {
        const mod = await import('../src/module');
        expect(typeof mod.functionName).toBe('function');
    });

    it('functionName accepts options with required fields', async () => {
        const mod = await import('../src/module');
        const logger = pino({ level: 'silent' });

        // Test function signature
        try {
            await mod.functionName({ /* options */ logger });
        } catch {
            // Expected: dependencies not available in test environment
        }
    });
});
```

**Source verification pattern** (lines 73-116):
```typescript
describe('module.ts specific behavior', () => {
    it('functionName includes expected implementation', async () => {
        const fs = await import('fs');
        const source = fs.readFileSync('src/module.ts', 'utf-8');

        expect(source).toContain('expected code');
    });
});
```

---

### `src/webhook.test.ts` (test, request-response)

**Analog:** `tests/browser.test.ts`

Same patterns as output.test.ts above.

---

## Shared Patterns

### Error Handling
**Source:** `src/errors.ts`
**Apply to:** All service files (output.ts, webhook.ts)
```typescript
import pRetry, { AbortError } from 'p-retry';

// Classify error
const category = classifyError(err);

// Permanent errors: throw immediately
if (category === 'permanent') {
    throw new AbortError(err.message);
}

// Transient errors: allow retry
throw err;
```

### Logging
**Source:** `src/logger.ts`
**Apply to:** All service files (output.ts, webhook.ts)
```typescript
import { createChildLogger } from './logger.js';

const moduleLogger = createChildLogger(logger, 'module-name');
moduleLogger.info('Operation completed');
moduleLogger.error({ err: error }, 'Operation failed');
```

### Types
**Source:** `src/types.ts`
**Apply to:** All service files (output.ts, webhook.ts)
```typescript
import type { Logger } from 'pino';
import type { OutputOptions, WebhookOptions } from './types.js';
```

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| None | — | — | All files have existing analogs |

## Metadata

**Analog search scope:** `scraper.js`, `src/`, `tests/`
**Files scanned:** 10
**Pattern extraction date:** 2026-07-05
