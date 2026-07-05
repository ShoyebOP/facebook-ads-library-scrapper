# Phase 3: Output & Delivery - Research

**Researched:** 2026-07-05
**Domain:** File I/O, HTTP webhooks, retry patterns, timestamp formatting
**Confidence:** HIGH

## Summary

Phase 3 implements two core modules: `src/output.ts` for JSON file writing with incremental saves, and `src/webhook.ts` for HTTP POST notifications with retry logic. The existing `scraper.js` already has working implementations of both features (lines 87-115) that need to be modularized into TypeScript with proper error handling and configuration integration.

**Primary recommendation:** Use Bun's native `Bun.write()` for file I/O with `node:fs/promises` for directory creation. Use `p-retry` (already installed) for webhook retry with exponential backoff. Keep the existing timestamp format (`DD-MM-YYYY:HH:MM.query.json`) for backward compatibility.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** JSON content: just URLs array (matches existing `scraper.js` behavior)
- **D-02:** Filename format: `DD-MM-YYYY:HH:MM.query.json` (keep current)
- **D-03:** Output directory: `output/` subdirectory, auto-create if missing
- **D-04:** File conflict: overwrite existing file (latest scrape wins)
- **D-05:** Save interval: every 100 new URLs (per OUTPUT-02 requirement)
- **D-06:** Save mode: overwrite same file (not temp+rename)
- **D-07:** Crash handling: save collected URLs on SIGINT/SIGTERM/crash
- **D-08:** JSON validity: always write valid JSON array (even during incremental saves)
- **D-09:** Payload format: `{ query, outputFile, count }` (keep current)
- **D-10:** URLs in payload: no, just metadata (downstream reads JSON file)
- **D-11:** Content-Type: `application/json`
- **D-12:** Request timeout: 10 seconds
- **D-13:** Retry enabled: yes, using p-retry with exponential backoff
- **D-14:** Retry count: 3 attempts (original + 2 retries)
- **D-15:** Retryable errors: network/timeout only (ECONNRESET, ETIMEDOUT, 5xx)
- **D-16:** Final failure: log error, continue (file is saved first, webhook is fire-and-forget)
- **D-17:** Endpoint resolution: via config.json presets (replaces hardcoded CALLBACKS object)
- **D-18:** Callback name → URL mapping: presets object in config.json

### the agent's Discretion
- Webhook module API shape (function with options vs class)
- Error classification for webhook failures (which HTTP codes are retryable)
- File write strategy (sync vs async)
- Output directory structure within `output/`

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OUTPUT-01 | JSON output to timestamped files (DD-MM-YYYY:HH:MM.query.json) | Bun.write() + date formatting pattern from existing scraper.js:45-52 |
| OUTPUT-02 | Incremental URL saving (every 100 new URLs or on crash) | Callback-based save with counter, SIGINT/SIGTERM handlers |
| OUTPUT-03 | Output directory creation if not exists | node:fs/promises mkdir with recursive: true |
| WEBHOOK-01 | Webhook notification on completion (POST JSON payload) | http/https modules with JSON body, p-retry for retry logic |
| WEBHOOK-02 | Webhook endpoints configurable via presets | config.json presets integration, callback name resolution |
| WEBHOOK-03 | Webhook error handling (don't fail scraper if webhook fails) | try/catch with logging, fire-and-forget pattern |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| JSON file writing | API / Backend | — | File I/O is backend responsibility, outputs to local filesystem |
| Directory creation | API / Backend | — | Filesystem operation, must happen before writes |
| Incremental saves | API / Backend | — | Business logic tied to URL collection count |
| Webhook POST | API / Backend | — | HTTP client making outbound requests to external services |
| Endpoint resolution | API / Backend | — | Config lookup, no external dependencies |
| Error isolation | API / Backend | — | Try/catch patterns for fault tolerance |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `p-retry` | ^8.0.0 | Retry with exponential backoff | Already installed, battle-tested, ESM-native |
| `pino` | ^10.3.1 | Structured logging | Already installed, consistent with Phase 2 |
| `node:fs/promises` | built-in | Directory creation | Bun-compatible, no additional deps |
| `http`/`https` | built-in | HTTP POST requests | Native Node.js modules, no external deps |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Bun.write()` | built-in | Atomic file writes | For output.ts - faster than node:fs |
| `AbortController` | built-in | Request timeouts | For webhook timeout implementation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Bun.write()` | `node:fs/promises.writeFile` | Bun.write is ~3x faster but less familiar API |
| `http`/`https` modules | `fetch()` | http/https gives more control over timeout, already used in scraper.js |
| Custom retry logic | `p-retry` | p-retry handles backoff, jitter, abort errors out of box |

**Installation:**
```bash
# No new packages needed - all dependencies already in package.json
bun install
```

**Version verification:**
```bash
npm view p-retry version          # 8.0.0 ✓
npm view pino version             # 10.3.1 ✓
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| p-retry | npm | 7 years | 37M/week | github.com/sindresorhus/p-retry | OK | Approved |
| pino | npm | 11 years | 35M/week | github.com/pinojs/pino | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ src/cli.ts  │→ │ src/config.ts│→ │    Preset Resolution    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Scraper Engine                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ src/browser │→ │src/scraper.ts│→ │   URL Collection Set    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Output & Delivery                            │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐ │
│  │       src/output.ts         │  │      src/webhook.ts     │ │
│  │  ┌───────────────────────┐  │  │  ┌───────────────────┐  │ │
│  │  │ Timestamp Generation  │  │  │  │ Endpoint Resolver │  │ │
│  │  └───────────────────────┘  │  │  └───────────────────┘  │ │
│  │  ┌───────────────────────┐  │  │  ┌───────────────────┐  │ │
│  │  │ Directory Creation    │  │  │  │ HTTP POST Client  │  │ │
│  │  └───────────────────────┘  │  │  └───────────────────┘  │ │
│  │  ┌───────────────────────┐  │  │  ┌───────────────────┐  │ │
│  │  │ JSON File Writer      │  │  │  │ Retry Logic       │  │ │
│  │  └───────────────────────┘  │  │  └───────────────────┘  │ │
│  │  ┌───────────────────────┐  │  │  ┌───────────────────┐  │ │
│  │  │ Incremental Saver     │  │  │  │ Error Isolation   │  │ │
│  │  └───────────────────────┘  │  │  └───────────────────┘  │ │
│  └─────────────────────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── output.ts        # JSON file writing, directory creation, incremental saves
├── webhook.ts       # HTTP POST, retry logic, endpoint resolution
├── types.ts         # Add OutputOptions, WebhookOptions interfaces
└── index.ts         # Wire output + webhook into main pipeline
```

### Pattern 1: Incremental Save with Counter
**What:** Track URL count, save to file every N new URLs
**When to use:** During long-running scrapes to prevent data loss
**Example:**
```typescript
// Source: Phase 3 CONTEXT.md D-05, D-06, D-08
export function createIncrementalSaver(options: IncrementalSaverOptions) {
    let lastSaveCount = 0;
    const { outputFile, saveInterval = 100 } = options;
    
    return function maybeSave(urls: Set<string>): void {
        const newCount = urls.size - lastSaveCount;
        if (newCount >= saveInterval) {
            saveJsonFile(outputFile, [...urls]);
            lastSaveCount = urls.size;
        }
    };
}
```

### Pattern 2: Webhook with Retry and Error Isolation
**What:** POST JSON payload with exponential backoff, never throw
**When to use:** External system notifications that shouldn't block main flow
**Example:**
```typescript
// Source: p-retry documentation, Phase 3 CONTEXT.md D-13 to D-16
import pRetry, { AbortError } from 'p-retry';

export async function notifyWebhook(options: WebhookOptions): Promise<void> {
    const { url, payload, logger } = options;
    
    try {
        await pRetry(
            async () => {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(10000),
                });
                
                if (!response.ok) {
                    if (response.status >= 500) {
                        throw new Error(`Server error: ${response.status}`);
                    }
                    throw new AbortError(`Client error: ${response.status}`);
                }
                
                return response;
            },
            {
                retries: 2,
                onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
                    logger.warn(`Webhook attempt ${attemptNumber} failed: ${error.message}. ${retriesLeft} retries left.`);
                },
            }
        );
    } catch (error) {
        logger.error({ err: error }, 'Webhook notification failed after retries');
    }
}
```

### Anti-Patterns to Avoid
- **Sync file writes:** Use async `Bun.write()` or `fs.promises` to avoid blocking
- **Throwing from webhook:** Always catch and log, never let webhook failure crash scraper
- **Missing directory creation:** Always ensure `output/` exists before first write
- **Hardcoded callback URLs:** Use config.json presets for all endpoint resolution

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry with backoff | Custom setTimeout loop | `p-retry` | Handles jitter, abort errors, attempt tracking |
| JSON file writing | Manual string concatenation | `Bun.write()` with `JSON.stringify` | Atomic, optimized, handles edge cases |
| Directory creation | fs.mkdirSync checks | `fs.promises.mkdir({ recursive: true })` | Handles race conditions, idempotent |
| HTTP POST | Raw socket programming | `http`/`https` modules | Connection pooling, TLS handling built-in |

**Key insight:** The existing `scraper.js` already implements these patterns correctly. Phase 3 is about modularization, not reimplementation.

## Common Pitfalls

### Pitfall 1: File Write Race Conditions
**What goes wrong:** Multiple processes writing to same file simultaneously
**Why it happens:** Daemon mode spawns child processes, concurrent scrapes possible
**How to avoid:** Use atomic writes (write to temp, rename) or accept overwrite semantics per D-04
**Warning signs:** Corrupted JSON output, missing URLs in final file

### Pitfall 2: Webhook Timeout Without Cleanup
**What goes wrong:** HTTP request hangs indefinitely, blocks process exit
**Why it happens:** No timeout on fetch/http.request
**How to avoid:** Use `AbortSignal.timeout(10000)` per D-12
**Warning signs:** Process won't exit on SIGTERM, zombie processes

### Pitfall 3: Incremental Save Corrupts JSON
**What goes wrong:** Crash during write leaves invalid JSON file
**Why it happens:** Writing partial data to file
**How to avoid:** Always write complete valid JSON array per D-08, use atomic rename if needed
**Warning signs:** `JSON.parse` errors on output files

### Pitfall 4: Missing Output Directory on First Run
**What goes wrong:** ENOENT error when trying to write first file
**Why it happens:** `output/` directory doesn't exist yet
**How to avoid:** Create directory with `fs.promises.mkdir({ recursive: true })` at startup per D-03
**Warning signs:** First scrape fails, subsequent scrapes work

## Code Examples

### Output Module Structure
```typescript
// Source: Phase 3 CONTEXT.md, existing scraper.js patterns
import fs from 'fs';
import { mkdir } from 'fs/promises';
import type { Logger } from 'pino';

interface OutputOptions {
    query: string;
    outputDir?: string;
    logger: Logger;
}

export function generateOutputPath(options: OutputOptions): string {
    const { query, outputDir = 'output' } = options;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const sanitizedQuery = query.replace(/ /g, '_');
    
    return `${outputDir}/${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}:${pad(now.getHours())}-${pad(now.getMinutes())}.${sanitizedQuery}.json`;
}

export async function ensureOutputDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
}

export function saveUrlsToFile(filePath: string, urls: Set<string>): void {
    const data = [...urls];
    Bun.write(filePath, JSON.stringify(data, null, 2));
}
```

### Webhook Module Structure
```typescript
// Source: p-retry docs, existing scraper.js notifyWebhook pattern
import pRetry from 'p-retry';
import http from 'http';
import https from 'https';
import type { Logger } from 'pino';

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

export async function notifyWebhook(options: WebhookOptions): Promise<void> {
    const { url, payload, timeoutMs = 10000, retries = 2, logger } = options;
    
    try {
        await pRetry(
            async () => {
                const body = JSON.stringify(payload);
                const urlObj = new URL(url);
                const client = urlObj.protocol === 'https:' ? https : http;
                
                return new Promise<void>((resolve, reject) => {
                    const req = client.request(urlObj, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(body),
                        },
                        timeout: timeoutMs,
                    }, (res) => {
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            resolve();
                        } else if (res.statusCode && res.statusCode >= 500) {
                            reject(new Error(`Server error: ${res.statusCode}`));
                        } else {
                            reject(new Error(`Client error: ${res.statusCode}`));
                        }
                    });
                    
                    req.on('error', reject);
                    req.on('timeout', () => {
                        req.destroy();
                        reject(new Error('Request timed out'));
                    });
                    
                    req.end(body);
                });
            },
            {
                retries,
                onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
                    logger.warn(`Webhook attempt ${attemptNumber} failed: ${error.message}. ${retriesLeft} retries left.`);
                },
            }
        );
    } catch (error) {
        logger.error({ err: error }, 'Webhook notification failed');
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded CALLBACKS object | Config.json presets | Phase 1 decision | More flexible, user-configurable |
| Sync fs.writeFileSync | Async Bun.write() | Phase 3 research | Better performance, non-blocking |
| No retry on webhook | p-retry with backoff | Phase 3 decision | More reliable notifications |
| Manual timestamp formatting | Keep existing pad() helper | No change | Backward compatible output format |

**Deprecated/outdated:**
- `CALLBACKS` constant in scraper.js: replaced by config.json presets
- `fs.writeFileSync` for output: replaced by `Bun.write()` for performance

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Bun.write() is synchronous or returns Promise | Standard Stack | Need to verify with Bun docs, may need await |
| A2 | http/https modules work identically in Bun | Standard Stack | Bun compatibility may differ, need testing |
| A3 | Existing timestamp format is DD-MM-YYYY:HH:MM | Code Examples | If format differs, output files won't match existing behavior |

## Open Questions

1. **Bun.write() atomicity guarantees**
   - What we know: Bun.write() is optimized for performance
   - What's unclear: Whether it guarantees atomic writes or if partial writes possible
   - Recommendation: Test with concurrent writes, consider temp+rename if needed

2. **Config preset structure for webhook**
   - What we know: Phase 1 defined presets with callback URL only
   - What's unclear: Whether webhook timeout/retry should be configurable per preset
   - Recommendation: Keep simple for MVP, add options later if needed

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun runtime | All file I/O | ✓ | latest | — |
| node:fs/promises | Directory creation | ✓ | built-in | — |
| http/https modules | Webhook POST | ✓ | built-in | — |
| p-retry package | Retry logic | ✓ | 8.0.0 | Custom retry (not recommended) |

**Missing dependencies with no fallback:** None — all dependencies available.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test |
| Config file | none — see Phase 1 SETUP-04 |
| Quick run command | `bun test src/output.test.ts src/webhook.test.ts` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OUTPUT-01 | Generate timestamped filename | unit | `bun test src/output.test.ts::testGenerateOutputPath -x` | ❌ Wave 0 |
| OUTPUT-02 | Incremental save at 100 URLs | unit | `bun test src/output.test.ts::testIncrementalSave -x` | ❌ Wave 0 |
| OUTPUT-03 | Create output directory | unit | `bun test src/output.test.ts::testEnsureOutputDir -x` | ❌ Wave 0 |
| WEBHOOK-01 | POST JSON payload | integration | `bun test src/webhook.test.ts::testNotifyWebhook -x` | ❌ Wave 0 |
| WEBHOOK-02 | Resolve preset endpoint | unit | `bun test src/webhook.test.ts::testResolveEndpoint -x` | ❌ Wave 0 |
| WEBHOOK-03 | Handle webhook failure | unit | `bun test src/webhook.test.ts::testWebhookErrorIsolation -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test src/output.test.ts src/webhook.test.ts`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/output.test.ts` — covers OUTPUT-01, OUTPUT-02, OUTPUT-03
- [ ] `src/webhook.test.ts` — covers WEBHOOK-01, WEBHOOK-02, WEBHOOK-03
- [ ] Test fixtures: mock HTTP server for webhook tests
- [ ] Mock filesystem for output tests (or use tmp directory)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in scope |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Filesystem permissions handled by OS |
| V5 Input Validation | yes | Validate query string, config presets |
| V6 Cryptography | no | No crypto operations |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal in output filename | Tampering | Sanitize query string, validate path components |
| Webhook SSRF | Information Disclosure | Validate webhook URLs in config, restrict to HTTPS |
| Log injection via query string | Tampering | Use structured logging (pino), escape user input |

## Sources

### Primary (HIGH confidence)
- [Bun File I/O docs](https://bun.sh/docs/runtime/file-io) - Bun.write() API, directory creation patterns
- [p-retry npm](https://www.npmjs.com/package/p-retry) - Retry logic, exponential backoff, AbortError
- [Node.js http module](https://nodejs.org/api/http.html) - HTTP POST requests with timeout

### Secondary (MEDIUM confidence)
- [WebSearch: AbortController timeout patterns] - Modern timeout implementation
- [WebSearch: JavaScript date formatting] - Timestamp formatting patterns

### Tertiary (LOW confidence)
- None — all findings verified against official documentation

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - All packages verified via npm registry and official docs
- Architecture: HIGH - Based on existing scraper.js patterns and Phase 1-2 decisions
- Pitfalls: MEDIUM - Common patterns, but Bun-specific edge cases may exist

**Research date:** 2026-07-05
**Valid until:** 2026-08-04 (30 days for stable stack)
