# Phase 8: Logs are not terminal friendly and ugly raw logs everywhere - Pattern Map

**Mapped:** 2026-07-07
**Files analyzed:** 4 (all modifications, no new files)
**Analogs found:** 4 / 4

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `src/logger.ts` | utility (logger factory) | transform | `src/logger.ts` (self — modify in place) | exact |
| `src/daemon.ts` | utility (process manager) | file-I/O | `src/daemon.ts` (self — minor update) | exact |
| `src/index.ts` | orchestrator (pipeline) | request-response | `src/index.ts` (self — minor update) | exact |
| `src/daemon-actions.ts` | utility (CLI actions) | file-I/O | `src/daemon-actions.ts` (self — minor update) | exact |

**Note:** This phase modifies existing files only. No new files are created. The primary change is in `src/logger.ts` — all other files receive minor updates to integrate with the new pretty-logging capability.

## Pattern Assignments

### `src/logger.ts` (utility — logger factory, transform)

**Analog:** `src/logger.ts` (self — current implementation)

**Current imports** (lines 3-4):
```typescript
import fs from 'fs';
import pino from 'pino';
```

**Current createLogger pattern** (lines 8-25):
```typescript
export function createLogger(level: string = 'info'): pino.Logger {
    const logLevel = process.env.LOG_LEVEL || level;

    // Child process: write logs directly to file via SCRAPER_LOG_FILE env var
    const logFile = process.env.SCRAPER_LOG_FILE;
    if (logFile) {
        const destination = pino.destination({ dest: logFile, sync: false, append: true, mkdir: true });
        return pino({
            level: logLevel,
            redact: ['proxy', '*.proxy'],
        }, destination);
    }

    return pino({
        level: logLevel,
        redact: ['proxy', '*.proxy'],
    });
}
```

**Current createChildLogger pattern** (lines 29-34):
```typescript
export function createChildLogger(
    parent: pino.Logger,
    module: string,
): pino.Logger {
    return parent.child({ module });
}
```

**Target pattern — pino-pretty as stream (Bun-compatible):**

Modify `src/logger.ts` to:
1. Add `import pinoPretty from 'pino-pretty'` alongside existing imports
2. Replace `pino.destination(...)` with `pinoPretty({ colorize: false, ... })` for daemon mode
3. Add `pinoPretty({ colorize: true, ... })` for CLI mode (stdout)
4. Keep existing `redact` config — pino-pretty respects it
5. Keep existing `createChildLogger` — unchanged (child logger properties are accessible via `messageFormat`)

**Key pino-pretty options to apply:**
```typescript
// CLI mode (to stdout, colorized)
pinoPretty({
    colorize: true,
    levelFirst: true,          // D-02: level before module
    ignore: 'pid,hostname',    // D-03: hide pid/hostname
    translateTime: false,      // D-03: no timestamps
    messageFormat: '{levelLabel} [{module}]: {msg}',  // D-04
})

// Daemon mode (to file, no colors)
pinoPretty({
    colorize: false,           // D-06: no ANSI codes
    levelFirst: true,
    ignore: 'pid,hostname',
    translateTime: false,
    messageFormat: '{levelLabel} [{module}]: {msg}',
    destination: logFile,
    append: true,
    mkdir: true,
})
```

**Critical constraint:** Do NOT use `pino({ transport: { target: 'pino-pretty' } })` — Bun's worker_threads are incompatible. Always use stream API: `pino(pretty(options))`.

---

### `src/daemon.ts` (utility — process manager, file-I/O)

**Analog:** `src/daemon.ts` (self — current implementation)

**Current log piping in startDaemon** (lines 95-103):
```typescript
const child = fork(process.argv[1], argv, {
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    env: {
        ...process.env,
        SCRAPER_DAEMON_CHILD: '1',
        SCRAPER_LOG_FILE: logFile,
    },
});
```

**Current log file clearing** (line 92):
```typescript
fs.writeFileSync(logFile, '');
```

**No changes needed in daemon.ts** — the daemon already passes `SCRAPER_LOG_FILE` env var to child, and `src/logger.ts` (modified) will use pino-pretty with `colorize: false` when that env var is set. The daemon's log file will automatically contain formatted, color-free text.

**Optional improvement:** The log file clearing on line 92 (`fs.writeFileSync(logFile, '')`) can remain as-is — pino-pretty with `append: true` will write formatted text over the cleared file.

---

### `src/index.ts` (orchestrator — pipeline, request-response)

**Analog:** `src/index.ts` (self — current implementation)

**Current logger instantiation** (line 34):
```typescript
const logger = createLogger();
```

**No changes needed in index.ts** — `createLogger()` already detects CLI vs daemon mode via `SCRAPER_LOG_FILE` env var. After modifying `src/logger.ts`, the logger returned by `createLogger()` will automatically use pino-pretty based on whether the env var is set.

**Completion message** (lines 165-167) — D-09 format:
```typescript
// Current:
logger.info(
    `Scraping complete: ${urls.size} unique profile URLs collected`,
);

// Target (D-09):
logger.info(
    `Scrape complete: ${urls.size} URLs in ${elapsed}m ${elapsedSec}s`,
);
```

This is a minor formatting change — add elapsed time tracking around `runScraper()` call.

---

### `src/daemon-actions.ts` (utility — CLI actions, file-I/O)

**Analog:** `src/daemon-actions.ts` (self — current implementation)

**Current handleLogs** (lines 77-91):
```typescript
export function handleLogs(options?: { logFile?: string }): void {
    const logPath = options?.logFile ?? LOG_FILE;

    if (!fs.existsSync(logPath)) {
        console.log('No daemon log file found');
        return;
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    if (content.trim()) {
        console.log(content);
    } else {
        console.log('Daemon log file is empty');
    }
}
```

**No changes needed in daemon-actions.ts** — after this phase, the daemon log file will already contain pino-pretty formatted text (no ANSI colors). `handleLogs` reads the file and dumps to stdout, which will display the clean formatted output.

---

## Shared Patterns

### Proxy Credential Redaction
**Source:** `src/logger.ts:17,24`
**Apply to:** All files (already applied via `redact: ['proxy', '*.proxy']`)
```typescript
pino({
    redact: ['proxy', '*.proxy'],
});
```
**Note:** pino-pretty respects pino's redaction config — no additional work needed.

### Child Logger with Module Context
**Source:** `src/logger.ts:29-33`
**Apply to:** All modules that use logging (scraper.ts, webhook.ts, extractor.ts, etc.)
```typescript
import { createChildLogger } from './logger.js';
const moduleLogger = createChildLogger(logger, 'moduleName');
```
**Note:** The `{ module }` property set by `createChildLogger` is referenced in pino-pretty's `messageFormat: '{levelLabel} [{module}]: {msg}'` — this is what produces the `INFO [scraper]: ...` format.

### Error Logging Pattern
**Source:** `src/daemon.ts:159-162`, `src/index.ts:133-134`
**Apply to:** All error handlers
```typescript
logger.error({ err }, 'Failed to do something');
```
**Note:** pino-pretty serializes the `err` property using pino's built-in error serialization — no changes needed.

### Section Dividers
**Source:** `src/logger.ts:1,6,27`, `src/daemon.ts:1,9,14,26,47,58,71,116,139`
**Apply to:** Modified files — keep existing section dividers
```typescript
// --- Section Name ---
```

## No Analog Found

None — all files are modifications of existing code with direct analogs (themselves).

## Metadata

**Analog search scope:** `src/` directory (16 TypeScript files)
**Files scanned:** 16
**Pattern extraction date:** 2026-07-07
**Key dependency:** `pino-pretty` (must be installed via `bun add pino-pretty`)
