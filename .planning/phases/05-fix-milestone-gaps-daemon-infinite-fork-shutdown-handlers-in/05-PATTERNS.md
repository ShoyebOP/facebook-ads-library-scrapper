# Phase 5: Fix milestone gaps (daemon infinite fork, shutdown handlers, incremental saver) - Pattern Map

**Mapped:** 2026-07-06
**Files analyzed:** 5 (all modifications to existing files)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/daemon.ts` | daemon-process-manager | event-driven | `src/daemon.ts` (self) | exact |
| `src/index.ts` | orchestrator | request-response | `src/index.ts` (self) | exact |
| `src/scraper.ts` | scraper-engine | streaming/batch | `src/scraper.ts` (self) | exact |
| `src/cli.ts` | cli-entry | request-response | `src/cli.ts` (self) | exact |
| `src/types.ts` | type-definitions | none | `src/types.ts` (self) | exact |

## Pattern Assignments

### `src/daemon.ts` (daemon-process-manager, event-driven)

**Analog:** `src/daemon.ts` (self — modification only)

**Imports pattern** (lines 1-6):
```typescript
import { fork } from 'child_process';
import fs from 'fs';
import lockfile from 'proper-lockfile';
import type { Logger } from 'pino';
```

**Fork pattern to modify** (lines 77-81) — add `SCRAPER_DAEMON_CHILD=1` env var:
```typescript
// Current (line 78-81):
const child = fork(process.argv[1], argv, {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
});

// Target (D-02): Add env var to prevent infinite fork
const child = fork(process.argv[1], argv, {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, SCRAPER_DAEMON_CHILD: '1' },
});
```

**Shutdown handler pattern** (lines 125-160) — already implemented, no changes needed:
```typescript
export function setupDaemonShutdown(deps: DaemonShutdownDeps): void {
    let shuttingDown = false;
    const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        // ... save state, cleanup, remove PID file, exit
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
```

---

### `src/index.ts` (orchestrator, request-response)

**Analog:** `src/index.ts` (self — modification only)

**Imports pattern** (lines 1-12):
```typescript
import { loadConfig, resolvePreset } from './config.js';
import { createLogger } from './logger.js';
import {
    ensureOutputDir,
    generateOutputPath,
    saveUrlsToFile,
} from './output.js';
import { runScraper } from './scraper.js';
import type { ScraperOptions } from './types.js';
import { notifyWebhook, resolveEndpoint } from './webhook.js';
```

**Daemon fork block to modify** (lines 37-44) — add env var check (D-03, D-04):
```typescript
// Current (line 37-44):
if (argv.daemon) {
    const { startDaemon } = await import('./daemon.js');
    const daemonArgv = process.argv.slice(2);
    const pid = await startDaemon(argv.query, daemonArgv, logger);
    console.log(pid);
    logger.info(`Daemon started (PID: ${pid})`);
    process.exit(0);
}

// Target (D-03): Check if already a daemon child
if (argv.daemon && process.env.SCRAPER_DAEMON_CHILD !== '1') {
    const { startDaemon } = await import('./daemon.js');
    const daemonArgv = process.argv.slice(2);
    const pid = await startDaemon(argv.query, daemonArgv, logger);
    console.log(pid);
    logger.info(`Daemon started (PID: ${pid})`);
    process.exit(0);
}
```

**Scraper options construction to modify** (lines 79-87) — add incrementalSaver (D-11):
```typescript
// Current (line 79-87):
const options: ScraperOptions = {
    query: argv.query,
    maxUrls: argv.maxUrls,
    maxNoNewScrolls: argv.maxNoNewScrolls,
    headless: argv.headless,
    proxy: argv.proxy,
    url: resolvedUrl,
    logger,
};

// Target (D-09, D-11): Add incrementalSaver to options
const { createIncrementalSaver } = await import('./output.js');
const outputFile = generateOutputPath({ query: argv.query, logger });
const incrementalSaver = createIncrementalSaver({ outputFile });

const options: ScraperOptions = {
    query: argv.query,
    maxUrls: argv.maxUrls,
    maxNoNewScrolls: argv.maxNoNewScrolls,
    headless: argv.headless,
    proxy: argv.proxy,
    url: resolvedUrl,
    logger,
    incrementalSaver,
};
```

**Shutdown handler wiring to add after runScraper** (after line 90) — D-05, D-06, D-07, D-08:
```typescript
// Target: Wire shutdown handlers only when running as daemon
if (process.env.SCRAPER_DAEMON_CHILD === '1') {
    const { setupDaemonShutdown } = await import('./daemon.js');
    setupDaemonShutdown({
        saveState: () => {
            saveUrlsToFile(outputFile, urls);
            logger.info(`Saved ${urls.size} URLs during shutdown`);
        },
        cleanup: async () => {
            if (browser) {
                await browser.close();
            }
        },
        logger,
    });
}
```

**Note:** The `browser` variable is scoped inside `runScraper()`, so the cleanup callback needs to capture it via closure or be refactored. The simplest approach is to move shutdown wiring inside `runScraper()` or pass browser reference back.

---

### `src/scraper.ts` (scraper-engine, streaming/batch)

**Analog:** `src/scraper.ts` (self — modification only)

**Imports pattern** (lines 1-8):
```typescript
import type { Browser } from 'playwright-core';
import { launchBrowser } from './browser.js';
import { withTimeout } from './errors.js';
import { setupGraphQLInterceptor } from './extractor.js';
import { createChildLogger } from './logger.js';
import type { ScraperOptions } from './types.js';
```

**Options destructuring to modify** (lines 36-45) — add incrementalSaver:
```typescript
// Current (line 36-45):
const {
    query,
    maxUrls = Infinity,
    maxNoNewScrolls,
    headless,
    proxy,
    locale,
    timezone,
    logger,
} = options;

// Target (D-09): Add incrementalSaver to destructuring
const {
    query,
    maxUrls = Infinity,
    maxNoNewScrolls,
    headless,
    proxy,
    locale,
    timezone,
    logger,
    incrementalSaver,
} = options;
```

**Scroll loop to modify** (after line 146, inside while loop) — add saver call (D-10):
```typescript
// Target (D-10): Call incremental saver after each scroll iteration
// Insert after the noNewUrlsCount logic block (after line 145):

// Incremental save
if (incrementalSaver) {
    incrementalSaver(profileUrls);
}
```

---

### `src/cli.ts` (cli-entry, request-response)

**Analog:** `src/cli.ts` (self — modification only)

**Validation pattern to extend** (lines 67-88) — add proxy value check (D-14):
```typescript
// Current validation block (lines 67-88):
if (!argv.query) {
    console.error('Error: query required');
    process.exit(1);
}

if (argv.maxUrls !== undefined) {
    if (Number.isNaN(argv.maxUrls) || argv.maxUrls <= 0) {
        console.error('Error: --max-urls must be a positive integer');
        process.exit(1);
    }
}

if (argv.maxNoNewScrolls !== undefined) {
    if (Number.isNaN(argv.maxNoNewScrolls) || argv.maxNoNewScrolls <= 0) {
        console.error('Error: --max-no-new-scrolls must be a positive integer');
        process.exit(1);
    }
}

// Target (D-14): Add proxy value validation after existing checks
if (argv.proxy !== undefined && argv.proxy === '') {
    console.error('Error: --proxy requires a URL value');
    process.exit(1);
}
```

---

### `src/types.ts` (type-definitions, none)

**Analog:** `src/types.ts` (self — modification only)

**ScraperOptions interface to modify** (lines 17-27) — add incrementalSaver (D-09):
```typescript
// Current (line 17-27):
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
}

// Target (D-09): Add incrementalSaver optional property
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
}
```

---

## Shared Patterns

### Environment Variable Communication
**Source:** `src/daemon.ts` (existing pattern with `SCRAPER_OUTPUT_FILE`, `SCRAPER_LOG_FILE`)
**Apply to:** `src/daemon.ts` (fork), `src/index.ts` (check)
```typescript
// Pattern: SCRAPER_* env vars for daemon mode communication
env: { ...process.env, SCRAPER_DAEMON_CHILD: '1' }  // daemon.ts: fork options
if (process.env.SCRAPER_DAEMON_CHILD === '1') { ... }  // index.ts: conditional check
```

### Structured Logging with Pino
**Source:** `src/logger.ts` (createLogger, createChildLogger)
**Apply to:** All files with logger parameter
```typescript
import { createLogger } from './logger.js';
import { createChildLogger } from './logger.js';
const logger = createLogger();
const childLogger = createChildLogger(logger, 'component');
```

### Error Handling with try/catch
**Source:** `src/daemon.ts` (lines 134-150), `src/scraper.ts` (lines 95-101)
**Apply to:** Shutdown handlers, scraper operations
```typescript
try {
    // operation
} catch (error) {
    logger.error({ err: error }, 'Failed to <operation>');
}
```

### CLI Validation Pattern
**Source:** `src/cli.ts` (lines 67-88)
**Apply to:** `src/cli.ts` (proxy validation)
```typescript
if (condition) {
    console.error('Error: <message>');
    process.exit(1);
}
```

## No Analog Found

None — all files are modifications to existing code with clear analogs (the files themselves).

## Metadata

**Analog search scope:** `src/` directory (all TypeScript modules)
**Files scanned:** 6 (daemon.ts, index.ts, scraper.ts, output.ts, cli.ts, types.ts)
**Pattern extraction date:** 2026-07-06
