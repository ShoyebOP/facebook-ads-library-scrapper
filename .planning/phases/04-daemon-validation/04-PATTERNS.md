# Phase 4: Daemon & Validation - Pattern Map

**Mapped:** 2026-07-05
**Files analyzed:** 15
**Analogs found:** 12 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/daemon.ts` | service | file-I/O + process-management | `scraper.js:242-255` (daemon fork) | exact |
| `src/cli.ts` (modify) | controller | request-response (CLI) | `src/cli.ts` (self, add flag) | exact |
| `src/index.ts` (modify) | service | pipeline orchestration | `src/index.ts` (self, add daemon branch) | exact |
| `test/unit/extractor.test.ts` | test | unit | `tests/extractor.test.ts` | exact |
| `test/unit/config.test.ts` | test | unit | `tests/config.test.ts` | exact |
| `test/unit/output.test.ts` | test | unit | `src/output.test.ts` | exact |
| `test/unit/webhook.test.ts` | test | unit | `src/webhook.test.ts` | exact |
| `test/unit/daemon.test.ts` | test | unit | `src/errors.ts:118-150` (shutdown handler) | role-match |
| `test/integration/cli.test.ts` | test | integration | `tests/cli.test.ts` | exact |
| `test/integration/daemon.test.ts` | test | integration | `tests/scraper.test.ts` (mock.module pattern) | role-match |
| `test/integration/webhook.test.ts` | test | integration | `tests/index.test.ts` (mock.module pattern) | role-match |
| `test/e2e/scraper.test.ts` | test | e2e | `tests/scraper.test.ts` (mock.module + real assertions) | role-match |
| `test/fixtures/graphql-response.json` | fixture | file-I/O | `src/extractor.ts:10-29` (data shape) | partial |
| `test/fixtures/facebook-page.html` | fixture | file-I/O | None | no analog |
| `bunfig.toml` | config | config | None | no analog |

## Pattern Assignments

### `src/daemon.ts` (service, file-I/O + process-management)

**Analog:** `scraper.js` lines 242-255 (daemon fork pattern) + `src/errors.ts` lines 118-150 (shutdown handler)

**Imports pattern** (follow `src/webhook.ts` lines 1-7):
```typescript
// --- Daemon manager — process forking, PID file, signal handling ---

import { fork } from 'child_process';
import fs from 'fs';
import lockfile from 'proper-lockfile';
import type { Logger } from 'pino';
import { createChildLogger } from './logger.js';
```

**Constants pattern** (follow `src/scraper.ts` lines 12-29):
```typescript
// --- PID file path ---
const PID_FILE = '.daemon.pid';

// --- Log file path ---
const LOG_FILE = 'daemon.log';
```

**PID file management** (from RESEARCH.md Pattern 2):
```typescript
export function writePid(pid: number): void {
    fs.writeFileSync(PID_FILE, String(pid));
}

export function readPid(): number | null {
    if (!fs.existsSync(PID_FILE)) return null;
    const content = fs.readFileSync(PID_FILE, 'utf-8').trim();
    return content ? parseInt(content, 10) : null;
}

export function removePidFile(): void {
    try { fs.unlinkSync(PID_FILE); } catch {}
}
```

**Process check** (for D-06 stale PID detection):
```typescript
function isProcessRunning(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}
```

**Daemon start with lock** (from RESEARCH.md Pattern 1 + Pattern 2):
```typescript
export async function startDaemon(
    query: string,
    argv: string[],
    logger: Logger,
): Promise<number> {
    const daemonLogger = createChildLogger(logger, 'daemon');

    // Create PID file if it doesn't exist
    if (!fs.existsSync(PID_FILE)) {
        fs.writeFileSync(PID_FILE, '');
    }

    const release = await lockfile.lock(PID_FILE, {
        retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 },
    });

    try {
        // Check if daemon already running (D-06)
        const existingPid = readPid();
        if (existingPid && isProcessRunning(existingPid)) {
            throw new Error(`Daemon already running (PID: ${existingPid})`);
        }

        // Clear log file on start (D-12)
        fs.writeFileSync(LOG_FILE, '');

        const logStream = fs.openSync(LOG_FILE, 'w');
        const child = fork(process.argv[1], argv, {
            detached: true,
            stdio: ['ignore', logStream, logStream, 'ipc'],
            env: { ...process.env, SCRAPER_LOG_FILE: LOG_FILE },
        });

        writePid(child.pid!);
        child.unref();
        fs.closeSync(logStream);

        daemonLogger.info(`Daemon started (PID: ${child.pid})`);
        return child.pid!;
    } finally {
        await release();
    }
}
```

**Graceful shutdown** (from `src/errors.ts` lines 118-150):
```typescript
export function setupDaemonShutdown(deps: {
    saveState: () => void;
    cleanup: () => Promise<void>;
    logger: Logger;
}): void {
    let shuttingDown = false;

    const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;

        deps.logger.info(`Received ${signal}, shutting down...`);

        try { deps.saveState(); } catch (err) {
            deps.logger.error({ err }, 'Failed to save state');
        }

        try { await deps.cleanup(); } catch (err) {
            deps.logger.error({ err }, 'Failed to cleanup');
        }

        removePidFile(); // D-10
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
```

**Stop daemon** (D-05):
```typescript
export async function stopDaemon(logger: Logger): Promise<void> {
    const pid = readPid();
    if (!pid) {
        logger.info('No daemon running (no PID file)');
        return;
    }

    if (!isProcessRunning(pid)) {
        logger.info(`Daemon not running (stale PID ${pid}), cleaning up`);
        removePidFile();
        return;
    }

    process.kill(pid, 'SIGTERM');
    logger.info(`Sent SIGTERM to daemon (PID: ${pid})`);
    removePidFile();
}
```

**Error handling pattern** (follow `src/webhook.ts` lines 102-106):
```typescript
// Errors are caught and logged, never re-thrown for daemon operations
try {
    await startDaemon(query, argv, logger);
} catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Daemon failed: ${err.message}`);
    process.exit(1);
}
```

---

### `src/cli.ts` (modify — add --daemon-action flag)

**Analog:** `src/cli.ts` (self — already has `--daemon` boolean flag at line 40-44)

**Add new option** (insert after line 44):
```typescript
        'daemon-action': {
            type: 'string',
            choices: ['stop', 'status', 'logs'],
            describe: 'Manage running daemon (stop, status, logs)',
        },
```

**Add daemon-action handling** (after line 79, before line 81):
```typescript
// --- Handle daemon management actions ---
if (argv.daemonAction) {
    const { stopDaemon } = await import('./daemon.js');
    const logger = createLogger();

    if (argv.daemonAction === 'stop') {
        await stopDaemon(logger);
    }
    // status and logs can be added here
    process.exit(0);
}
```

---

### `src/index.ts` (modify — add daemon fork branch)

**Analog:** `src/index.ts` (self — already has `daemon: boolean` in CliArgs at line 23)

**Add daemon branch** at the top of `main()` (after line 32):
```typescript
    // D-01: if --daemon flag, fork and exit parent
    if (argv.daemon) {
        const { startDaemon } = await import('./daemon.js');
        const pid = await startDaemon(argv.query, process.argv.slice(2), logger);
        console.log(pid);
        console.error(`Daemon started (PID: ${pid})`);
        process.exit(0);
    }
```

---

### `test/unit/extractor.test.ts`

**Analog:** `tests/extractor.test.ts` (exact match — same file, new location)

**Imports pattern** (line 1):
```typescript
import { describe, it, expect } from 'bun:test';
```

**Import path pattern** (line 2):
```typescript
import { extractProfileUrls } from '../../src/extractor.js';
```

**Test structure** (from `tests/extractor.test.ts` lines 4-111):
```typescript
describe('extractProfileUrls', () => {
    it('extracts page_profile_uri from flat object', () => {
        const urls = new Set<string>();
        const data = { page_profile_uri: 'https://facebook.com/profile/123' };
        extractProfileUrls(data, urls);
        expect(urls.has('https://facebook.com/profile/123')).toBe(true);
    });

    it('handles null input gracefully', () => {
        const urls = new Set<string>();
        extractProfileUrls(null, urls);
        expect(urls.size).toBe(0);
    });
    // ... more test cases from tests/extractor.test.ts
});
```

---

### `test/unit/config.test.ts`

**Analog:** `tests/config.test.ts` (exact match)

**Imports pattern** (lines 1-3):
```typescript
import { describe, it, expect } from 'bun:test';
import { loadConfig, resolvePreset } from '../../src/config.js';
import { z } from 'zod';
```

**Test structure** (from `tests/config.test.ts`):
```typescript
describe('resolvePreset', () => {
    const testConfig = {
        presets: {
            leadgen: { callback: 'https://example.com/webhook/leadgen' },
        },
    };

    it('returns correct preset for valid name', () => {
        const preset = resolvePreset(testConfig, 'leadgen');
        expect(preset.callback).toBe('https://example.com/webhook/leadgen');
    });

    it('throws for nonexistent preset name', () => {
        expect(() => resolvePreset(testConfig, 'nonexistent')).toThrow(
            'Preset "nonexistent" not found'
        );
    });
});
```

---

### `test/unit/output.test.ts`

**Analog:** `src/output.test.ts` (exact match — move to new location)

**Imports pattern** (from `src/output.test.ts` lines 1-8):
```typescript
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import pino from 'pino';
```

**Test isolation pattern** (lines 10-17):
```typescript
const logger = pino({ level: 'silent' });
const tmpDir = '/tmp/output-test';

describe('output.ts', () => {
    beforeEach(async () => {
        await mkdir(tmpDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(tmpDir, { recursive: true, force: true });
    });
    // ... tests
});
```

**Import path adjustment** (change `./output` to `../../src/output.js`):
```typescript
const mod = await import('../../src/output.js');
```

---

### `test/unit/webhook.test.ts`

**Analog:** `src/webhook.test.ts` (exact match — move to new location)

**Imports pattern** (from `src/webhook.test.ts` lines 1-4):
```typescript
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import pino from 'pino';
```

**Source verification pattern** (lines 8-16):
```typescript
describe('resolveEndpoint', () => {
    it('exports a function that returns preset.callback', async () => {
        const src = require('node:fs').readFileSync(
            new URL('../../src/webhook.ts', import.meta.url),
            'utf-8',
        );
        expect(src).toMatch(/export\s+function\s+resolveEndpoint/);
    });
});
```

**Import path adjustment** (change `./webhook.ts` to `../../src/webhook.ts`):
```typescript
new URL('../../src/webhook.ts', import.meta.url)
```

---

### `test/unit/daemon.test.ts`

**Analog:** `src/errors.ts` lines 118-150 (shutdown handler) + RESEARCH.md Pattern 2 (PID management)

**Imports pattern** (follow `src/output.test.ts`):
```typescript
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
```

**Test for PID file operations** (pure functions):
```typescript
describe('PID file management', () => {
    const tmpDir = '/tmp/daemon-test';
    const PID_FILE = join(tmpDir, '.daemon.pid');

    beforeEach(async () => {
        await mkdir(tmpDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(tmpDir, { recursive: true, force: true });
    });

    it('writes PID to file', async () => {
        // Test writePid function
        await writeFile(PID_FILE, '12345');
        const content = await readFile(PID_FILE, 'utf-8');
        expect(content).toBe('12345');
    });

    it('reads PID from file', async () => {
        await writeFile(PID_FILE, '12345');
        // Test readPid function
    });

    it('returns null when PID file does not exist', async () => {
        // Test readPid with missing file
    });

    it('removes PID file on cleanup', async () => {
        await writeFile(PID_FILE, '12345');
        // Test removePidFile
        expect(existsSync(PID_FILE)).toBe(false);
    });
});
```

**Test for shutdown handler** (from `src/errors.ts` lines 118-150):
```typescript
describe('setupDaemonShutdown', () => {
    it('registers SIGTERM and SIGINT handlers', () => {
        const onSpy = mock(() => {});
        const originalOn = process.on;
        process.on = onSpy as any;

        // Call setupDaemonShutdown
        // Verify onSpy called with 'SIGTERM' and 'SIGINT'

        process.on = originalOn;
    });

    it('prevents double shutdown via shuttingDown flag', async () => {
        // Test that shutdown function is idempotent
    });
});
```

---

### `test/integration/cli.test.ts`

**Analog:** `tests/cli.test.ts` (exact match — add daemon-action tests)

**Imports pattern** (from `tests/cli.test.ts` lines 1-3):
```typescript
import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { main } from '../../src/index.js';
import type { CliArgs } from '../../src/index.js';
```

**Mock module pattern** (from `tests/cli.test.ts` lines 7-45):
```typescript
const mockLoadConfig = mock(() => Promise.resolve({
    presets: {
        leadgen: { callback: 'https://example.com/webhook/leadgen' },
    },
}));

mock.module('../../src/config.js', () => ({
    loadConfig: mockLoadConfig,
    resolvePreset: mockResolvePreset,
}));
```

**Add daemon-action test cases** (new tests):
```typescript
describe('CLI daemon-action', () => {
    it('should parse --daemon-action stop', async () => {
        // Mock daemon stopModule
        const mockStopDaemon = mock(() => Promise.resolve());
        mock.module('../../src/daemon.js', () => ({
            stopDaemon: mockStopDaemon,
        }));

        // Test that --daemon-action stop triggers stopDaemon
    });
});
```

---

### `test/integration/daemon.test.ts`

**Analog:** `tests/scraper.test.ts` (mock.module pattern for mocking child_process)

**Imports pattern** (from `tests/scraper.test.ts` lines 1-2):
```typescript
import { describe, it, expect, mock, beforeEach } from 'bun:test';
```

**Mock child_process pattern**:
```typescript
const mockFork = mock(() => ({
    pid: 12345,
    unref: mock(() => {}),
}));
const mockCloseSync = mock(() => {});
mock.module('child_process', () => ({
    fork: mockFork,
}));

const mockWriteFileSync = mock(() => {});
const mockReadFileSync = mock(() => '12345');
const mockExistsSync = mock(() => true);
const mockUnlinkSync = mock(() => {});
const mockOpenSync = mock(() => 1);
mock.module('fs', () => ({
    default: {
        writeFileSync: mockWriteFileSync,
        readFileSync: mockReadFileSync,
        existsSync: mockExistsSync,
        unlinkSync: mockUnlinkSync,
        openSync: mockOpenSync,
        closeSync: mockCloseSync,
    },
}));
```

**Test for startDaemon**:
```typescript
describe('startDaemon', () => {
    beforeEach(() => {
        mockFork.mockClear();
        mockWriteFileSync.mockClear();
    });

    it('forks child process with detached option', async () => {
        const { startDaemon } = await import('../../src/daemon.js');
        const logger = mockLogger as any;

        await startDaemon('test query', ['test', 'query'], logger);

        expect(mockFork).toHaveBeenCalledWith(
            expect.any(String),
            expect.arrayContaining(['test', 'query']),
            expect.objectContaining({ detached: true }),
        );
    });

    it('writes PID to file after fork', async () => {
        const { startDaemon } = await import('../../src/daemon.js');
        const logger = mockLogger as any;

        await startDaemon('test query', ['test'], logger);

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            expect.stringContaining('.daemon.pid'),
            '12345',
        );
    });
});
```

---

### `test/integration/webhook.test.ts`

**Analog:** `tests/index.test.ts` (mock.module pattern)

**Imports pattern** (from `tests/index.test.ts` lines 1-2):
```typescript
import { describe, it, expect, mock, beforeEach } from 'bun:test';
```

**Mock http/https pattern** (for testing notifyWebhook integration):
```typescript
const mockRequest = mock(() => ({
    on: mock(() => {}),
    end: mock(() => {}),
}));

mock.module('http', () => ({
    default: { request: mockRequest },
}));

mock.module('https', () => ({
    default: { request: mockRequest },
}));
```

**Test for webhook notification flow**:
```typescript
describe('Webhook notification', () => {
    it('sends POST with correct Content-Type', async () => {
        const { notifyWebhook } = await import('../../src/webhook.js');

        await notifyWebhook({
            url: 'http://example.com/webhook',
            payload: { query: 'test', outputFile: 'test.json', count: 10 },
            logger: mockLogger as any,
        });

        expect(mockRequest).toHaveBeenCalled();
        const callArgs = mockRequest.mock.calls[0];
        expect(callArgs[1].headers['Content-Type']).toBe('application/json');
    });
});
```

---

### `test/e2e/scraper.test.ts`

**Analog:** `tests/scraper.test.ts` (mock.module + real assertion pattern)

**Imports pattern** (from `tests/scraper.test.ts` lines 1-2):
```typescript
import { describe, it, expect, mock, beforeEach } from 'bun:test';
```

**Mock browser module pattern** (from `tests/scraper.test.ts` lines 37-42):
```typescript
const mockClose = mock(() => Promise.resolve());
const mockNewPage = mock(() => Promise.resolve(createMockPage()));
const mockLaunchBrowser = mock(() => Promise.resolve({
    close: mockClose,
    newPage: mockNewPage,
}));
mock.module('../../src/browser.js', () => ({
    launchBrowser: mockLaunchBrowser,
}));
```

**Mock page with fixture data injection**:
```typescript
function createMockPageWithFixture(fixtureData: any) {
    return {
        goto: mock(() => Promise.resolve()),
        evaluate: mock(() => Promise.resolve()),
        waitForTimeout: mock(() => Promise.resolve()),
        route: mock(() => Promise.resolve()),
        on: mock((event: string, handler: Function) => {
            // Simulate GraphQL response from fixture
            if (event === 'response') {
                handler({
                    status: () => 200,
                    url: () => 'https://www.facebook.com/ads/library/api/graphql',
                    json: () => Promise.resolve(fixtureData),
                });
            }
            return createMockPageWithFixture(fixtureData);
        }),
    };
}
```

**E2E test with fixture**:
```typescript
describe('Full scrape workflow (E2E)', () => {
    it('extracts URLs from GraphQL fixture through full pipeline', async () => {
        // Load fixture
        const fixture = JSON.parse(
            await readFile(new URL('../fixtures/graphql-response.json', import.meta.url), 'utf-8')
        );

        const mockPage = createMockPageWithFixture(fixture);
        mockNewPage.mockResolvedValueOnce(mockPage);

        const { runScraper } = await import('../../src/scraper.js');
        const logger = mockLogger as any;

        const result = await runScraper({
            query: 'test',
            maxNoNewScrolls: 1,
            headless: true,
            logger,
        });

        expect(result).toBeInstanceOf(Set);
        expect(result.size).toBeGreaterThan(0);
    });
});
```

---

### `test/fixtures/graphql-response.json`

**Analog:** `src/extractor.ts` lines 10-29 (data shape from `extractProfileUrls`)

**Fixture structure** (matching the GraphQL response shape the extractor expects):
```json
{
  "data": {
    "ad_results": {
      "edges": [
        {
          "node": {
            "sponsored_item": {
              "page_profile_uri": "https://www.facebook.com/advertiser1"
            }
          }
        },
        {
          "node": {
            "sponsored_item": {
              "page_profile_uri": "https://www.facebook.com/advertiser2"
            }
          }
        }
      ]
    }
  }
}
```

---

### `test/fixtures/facebook-page.html`

**No analog.** Create a minimal HTML fixture for E2E browser tests with mock ad card elements.

---

### `bunfig.toml`

**No analog.** Create from RESEARCH.md Coverage Configuration (line 489-494):

```toml
[test]
coverageThreshold = { line = 0.7, function = 0.7, statement = 0.7 }
```

---

## Shared Patterns

### Test Imports and Mock Setup
**Source:** `tests/scraper.test.ts` lines 1-27
**Apply to:** All test files
```typescript
import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock logger (reusable across all tests)
const mockLogger = {
    info: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
    warn: mock(() => {}),
    child: mock(() => mockLogger),
};
```

### Module Mocking Pattern
**Source:** `tests/scraper.test.ts` lines 8-42
**Apply to:** All integration and E2E test files
```typescript
mock.module('../src/module.js', () => ({
    exportedFunction: mockFunction,
}));
```

### Test Isolation (beforeEach/afterEach)
**Source:** `src/output.test.ts` lines 10-17
**Apply to:** All test files that create temp files
```typescript
beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
});
```

### Error Handling (never re-throw for daemon)
**Source:** `src/webhook.ts` lines 102-106
**Apply to:** `src/daemon.ts`
```typescript
} catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Operation failed: ${err.message}`);
}
```

### Logger Creation
**Source:** `src/logger.ts` lines 7-12
**Apply to:** All new modules
```typescript
import { createLogger, createChildLogger } from './logger.js';
const logger = createLogger();
const moduleLogger = createChildLogger(logger, 'module-name');
```

### Function Export Pattern (no classes)
**Source:** `src/extractor.ts`, `src/output.ts`, `src/webhook.ts`
**Apply to:** `src/daemon.ts`
```typescript
export function functionName(options: Options): ReturnType { ... }
export async function asyncFunctionName(options: Options): Promise<ReturnType> { ... }
```

### Section Divider Comments
**Source:** All `src/*.ts` files
**Apply to:** `src/daemon.ts`
```typescript
// --- Section Name ---
```

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `test/fixtures/facebook-page.html` | fixture | file-I/O | No HTML fixtures exist yet; create minimal mock page |
| `bunfig.toml` | config | config | No bun config file exists; create from RESEARCH.md coverage spec |

## Metadata

**Analog search scope:** `src/`, `tests/`, `scraper.js`
**Files scanned:** 15 source/test files
**Pattern extraction date:** 2026-07-05
