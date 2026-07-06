# Phase 6: Milestone v1.0 — Gaps Found (32/42) - Pattern Map

**Mapped:** 2026-07-06
**Files analyzed:** 10
**Analogs found:** 8 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/index.ts` | orchestrator | request-response | `src/daemon.ts` (shutdown wiring) | role-match |
| `src/errors.ts` | utility/error handling | transform | `src/daemon.ts` (shutdown handler) | role-match |
| `src/types.ts` | types/interfaces | N/A | `src/types.ts` (self) | exact |
| `src/cli.ts` | CLI entry point | request-response | `src/cli.ts` (self) | exact |
| `src/config.ts` | configuration service | file-I/O | `src/config.ts` (self) | exact |
| `package.json` | configuration | N/A | `package.json` (self) | exact |
| `tsconfig.json` | configuration | N/A | `tsconfig.json` (self) | exact |
| `tests/` directory | legacy tests | N/A | `test/` directory (structured) | role-match |
| `test/` directory | structured tests | N/A | `tests/` directory (legacy) | role-match |
| `bunfig.toml` | configuration | N/A | `bunfig.toml` (self) | exact |

## Pattern Assignments

### `src/index.ts` (orchestrator, request-response)

**Analog:** `src/daemon.ts` (shutdown wiring pattern)

**Imports pattern** (lines 1-13):
```typescript
import { loadConfig, resolvePreset } from './config.js';
import { createLogger } from './logger.js';
import {
    createIncrementalSaver,
    ensureOutputDir,
    generateOutputPath,
    saveUrlsToFile,
} from './output.js';
import { runScraper } from './scraper.js';
import type { ScraperOptions } from './types.js';
import { notifyWebhook, resolveEndpoint } from './webhook.js';
```

**Shutdown wiring pattern** (lines 105-120):
```typescript
// D-08: Wire shutdown handlers when running as daemon
if (process.env.SCRAPER_DAEMON_CHILD === '1') {
    const { setupDaemonShutdown } = await import('./daemon.js');
    setupDaemonShutdown({
        saveState: () => {
            saveUrlsToFile(outputFile, urls);
            logger.info(`Saved ${urls.size} URLs during shutdown`);
        },
        cleanup: async () => {
            if (browserRef) {
                try { await browserRef.close(); } catch (err) { logger.error({ err }, 'Failed to close browser during shutdown'); }
            }
        },
        logger,
    });
}
```

**Non-daemon shutdown fix location:** Lines 105-120 — extend condition to handle both daemon and non-daemon paths.

---

### `src/errors.ts` (utility/error handling, transform)

**Analog:** `src/daemon.ts` (shutdown handler pattern)

**Dead code to remove** (lines 110-150):
```typescript
// --- Graceful shutdown handler (SCRAPE-10) ---

interface ShutdownDeps {
    saveUrls: (urls: Set<string>) => void;
    browser: { close: () => Promise<void> };
    logger: Logger;
}

export function setupShutdownHandler(deps: ShutdownDeps): void {
    let shuttingDown = false;

    const shutdown = async () => {
        if (shuttingDown) return;
        shuttingDown = true;

        deps.logger.info('Shutting down gracefully...');

        try {
            deps.saveUrls(new Set());
        } catch (error) {
            deps.logger.error(
                { err: error },
                'Failed to save URLs during shutdown',
            );
        }

        try {
            await deps.browser.close();
        } catch (error) {
            deps.logger.error(
                { err: error },
                'Failed to close browser during shutdown',
            );
        }

        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
```

**Active patterns to keep** (lines 38-45, 71-108):
```typescript
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
        ),
    ]);
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions,
): Promise<T> {
    const { retries = 3, logger } = options;

    return pRetry(
        async (attemptNumber) => {
            try {
                return await fn();
            } catch (error) {
                const err =
                    error instanceof Error ? error : new Error(String(error));
                const category = classifyError(err);

                // Permanent errors: throw immediately, don't consume retry budget
                if (
                    category === 'permanent' ||
                    category === 'browser' ||
                    category === 'extraction'
                ) {
                    throw new AbortError(err.message);
                }

                // Transient errors: allow retry
                throw err;
            }
        },
        {
            retries,
            onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
                logger.warn(
                    `Attempt ${attemptNumber} failed: ${error.message}. ${retriesLeft} retries left.`,
                );
            },
        },
    );
}
```

---

### `src/types.ts` (types/interfaces, N/A)

**Analog:** `src/types.ts` (self)

**Dead code to remove** (lines 49-53, 75-79):
```typescript
// --- Error category (D-19) ---

export type ErrorCategory =
    | 'transient'
    | 'permanent'
    | 'browser'
    | 'extraction';

// --- Daemon options (D-01 to D-12) ---

export interface DaemonOptions {
    query: string;
    argv: string[];
    logger: Logger;
}
```

**Active patterns to keep** (lines 1-45):
```typescript
// --- Shared types and interfaces ---

import type { Browser } from 'playwright-core';
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
    url?: string;
    logger: Logger;
    incrementalSaver?: (urls: Set<string>) => void;
    onBrowserReady?: (browser: Browser) => void;
}

// --- Output options (D-01 to D-04) ---

export interface OutputOptions {
    query: string;
    outputDir?: string;
    logger: Logger;
}

// --- Incremental saver options (D-05 to D-06) ---

export interface IncrementalSaverOptions {
    outputFile: string;
    saveInterval?: number;
}
```

---

### `src/cli.ts` (CLI entry point, request-response)

**Analog:** `src/cli.ts` (self)

**Active patterns to keep** (lines 1-65):
```typescript
#!/usr/bin/env bun

// --- CLI entry point with yargs parsing ---

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { type CliArgs, main } from './index.js';

// --- Parse CLI arguments ---

const argv = (await yargs(hideBin(process.argv))
    .options({
        query: {
            type: 'string',
            demandOption: true,
            describe: 'Search keyword for Facebook Ads',
        },
        preset: {
            type: 'string',
            describe: 'Configuration preset name (resolves callback URL)',
        },
        headless: {
            type: 'boolean',
            default: false,
            describe: 'Run browser in headless mode',
        },
        proxy: {
            type: 'string',
            describe: 'Proxy server URL (HTTP/SOCKS5)',
        },
        'max-urls': {
            type: 'number',
            describe: 'Maximum URLs to collect',
        },
        'max-no-new-scrolls': {
            type: 'number',
            default: 10,
            describe: 'Stop after N scrolls with no new results',
        },
        daemon: {
            type: 'boolean',
            default: false,
            describe: 'Run as background process',
        },
        'daemon-action': {
            type: 'string',
            choices: ['stop', 'status', 'logs'],
            describe: 'Manage running daemon (stop, status, logs)',
        },
        callback: {
            type: 'string',
            describe: 'Webhook callback name (overrides preset)',
        },
        'env-file': {
            type: 'string',
            describe: 'Path to env file',
        },
        url: {
            type: 'string',
            describe: 'Override ad library URL for this run',
        },
    })
    .strict()
    .help()
    .parse()) as CliArgs;
```

**Fix locations:**
- Lines 50-53: `--callback` flag — wire to override preset callback URL
- Lines 54-57: `--env-file` flag — implement env file loading before pipeline runs

---

### `src/config.ts` (configuration service, file-I/O)

**Analog:** `src/config.ts` (self)

**Active patterns to keep** (lines 1-81):
```typescript
// --- Configuration system ---

import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';

// --- Zod schema for config validation ---

const PresetSchema = z.object({
    callback: z.string().url(),
    adLibraryUrl: z.string().url().optional(),
});

const ConfigSchema = z.object({
    presets: z.record(z.string(), PresetSchema),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Preset = z.infer<typeof PresetSchema>;

// --- Cosmiconfig explorer ---

const explorer = cosmiconfig('facebook-scraper', {
    searchStrategy: 'project',
    searchPlaces: [
        'package.json',
        '.facebook-scraper',
        '.facebook-scraper.json',
        '.facebook-scraper.yaml',
        '.facebook-scraper.yml',
        '.facebook-scraper.js',
        '.facebook-scraper.ts',
        '.facebook-scraper.cjs',
        '.facebook-scraper.mjs',
        '.config/facebook-scraper',
        '.config/facebook-scraper.json',
        '.config/facebook-scraper.yaml',
        '.config/facebook-scraper.yml',
        '.config/facebook-scraper.js',
        '.config/facebook-scraper.ts',
        '.config/facebook-scraper.cjs',
        '.config/facebook-scraper.mjs',
        'facebook-scraper.config.js',
        'facebook-scraper.config.ts',
        'facebook-scraper.config.cjs',
        'facebook-scraper.config.mjs',
        'config.json',
        'config.yaml',
        'config.yml',
        'config.js',
        'config.ts',
        'config.cjs',
        'config.mjs',
    ],
});

// --- Load config from file system ---

export async function loadConfig(): Promise<Config> {
    const result = await explorer.search();

    if (!result || result.isEmpty) {
        throw new Error(
            'No config file found. Create .facebook-scraper.json or config.json in your project root.',
        );
    }

    return ConfigSchema.parse(result.config);
}

// --- Resolve a preset by name ---

export function resolvePreset(config: Config, presetName: string): Preset {
    const preset = config.presets[presetName];
    if (!preset) {
        const available = Object.keys(config.presets).join(', ');
        throw new Error(
            `Preset "${presetName}" not found. Available presets: ${available || '(none)'}`,
        );
    }
    return preset;
}
```

**Note:** May need to add env file loading support for `--env-file` flag.

---

### `package.json` (configuration, N/A)

**Analog:** `package.json` (self)

**Current state** (lines 18-32):
```json
"dependencies": {
    "cloakbrowser": "^0.3.28",
    "p-retry": "^8.0.0",
    "pino": "^10.3.1",
    "playwright-core": "^1.53.0",
    "proper-lockfile": "^4.1.2"
},
"devDependencies": {
    "@biomejs/biome": "^2.5.2",
    "@types/bun": "^1.3.14",
    "@types/pino": "^7.0.5",
    "cosmiconfig": "^9.0.2",
    "yargs": "^18.0.0",
    "zod": "^4.4.3"
}
```

**Fix:** Move `cosmiconfig`, `yargs`, and `zod` to `dependencies` section.

---

### `tsconfig.json` (configuration, N/A)

**Analog:** `tsconfig.json` (self)

**Current state** (lines 7):
```json
"moduleResolution": "bundler"
```

**Fix:** Change to `"moduleResolution": "bun"`.

---

### `tests/` directory (legacy tests, N/A)

**Analog:** `test/` directory (structured)

**Files to delete:**
```
tests/browser.test.ts
tests/cli.test.ts
tests/config.test.ts
tests/errors.test.ts
tests/extractor.test.ts
tests/index.test.ts
tests/interceptor.test.ts
tests/logger.test.ts
tests/scraper.test.ts
tests/setup.test.ts
tests/types.test.ts
```

**Verification:** Before deletion, confirm `test/` directory covers same test cases.

---

### `test/` directory (structured tests, N/A)

**Analog:** `tests/` directory (legacy)

**Keep as canonical test location:**
```
test/unit/config.test.ts
test/unit/daemon.test.ts
test/unit/extractor.test.ts
test/unit/output.test.ts
test/unit/webhook.test.ts
test/integration/cli.test.ts
test/integration/daemon.test.ts
test/integration/webhook.test.ts
test/e2e/scraper.test.ts
```

---

### `bunfig.toml` (configuration, N/A)

**Analog:** `bunfig.toml` (self)

**Current state** (lines 1-2):
```toml
[test]
coverageThreshold = { line = 0.7, function = 0.7, statement = 0.7 }
```

**Note:** May need to add `root = "./test"` if bunfig requires explicit test root after deleting `tests/`.

## Shared Patterns

### Shutdown Handler Wiring
**Source:** `src/daemon.ts` (lines 126-161)
**Apply to:** `src/index.ts` (non-daemon path)
```typescript
export function setupDaemonShutdown(deps: DaemonShutdownDeps): void {
    let shuttingDown = false;

    const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;

        deps.logger.info(`Received ${signal}, shutting down...`);

        try {
            deps.saveState();
        } catch (error) {
            deps.logger.error(
                { err: error },
                'Failed to save state during shutdown',
            );
        }

        try {
            await deps.cleanup();
        } catch (error) {
            deps.logger.error(
                { err: error },
                'Failed to cleanup during shutdown',
            );
        }

        // D-10: Delete PID file on clean exit
        removePidFile();

        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
```

### Error Classification
**Source:** `src/errors.ts` (lines 49-62)
**Apply to:** Error handling across codebase
```typescript
export function classifyError(error: Error): ErrorType {
    const msg = error.message.toLowerCase();

    if (TRANSIENT_KEYWORDS.some((kw) => msg.includes(kw))) {
        return 'transient';
    }
    if (BROWSER_KEYWORDS.some((kw) => msg.includes(kw))) {
        return 'browser';
    }
    if (EXTRACTION_KEYWORDS.some((kw) => msg.includes(kw))) {
        return 'extraction';
    }
    return 'permanent';
}
```

### Promise Timeout Wrapper
**Source:** `src/errors.ts` (lines 38-45)
**Apply to:** All async operations with potential hangs
```typescript
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
        ),
    ]);
}
```

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| N/A | — | — | All files have analogs in existing codebase |

## Metadata

**Analog search scope:** `src/`, `test/`, `tests/`, project root config files
**Files scanned:** 15 source files, 3 config files, 2 test directories
**Pattern extraction date:** 2026-07-06
