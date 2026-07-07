# Coding Conventions

**Analysis Date:** 2026-07-07

## Naming Patterns

**Files:**
- Source files: `camelCase.ts` (e.g., `scraper.ts`, `extractor.ts`, `browser.ts`)
- Test files: `camelCase.test.ts` (e.g., `errors.test.ts`, `config.test.ts`)
- Config files: `camelCase.json` (e.g., `config.json`, `config.example.json`)
- Type declarations: `camelCase.d.ts` (e.g., `proper-lockfile.d.ts`)

**Functions:**
- camelCase: `extractProfileUrls`, `withTimeout`, `withRetry`, `createLogger`, `launchBrowser`
- Action verbs for side-effect functions: `saveUrlsToFile`, `notifyWebhook`, `ensureOutputDir`
- Boolean-result functions: use descriptive names without `is` prefix (e.g., `isProcessRunning`)
- Factory functions: `create` prefix (e.g., `createLogger`, `createChildLogger`, `createIncrementalSaver`)

**Variables:**
- camelCase: `profileUrls`, `noNewUrlsCount`, `scrollCount`, `lastLogTime`
- UPPER_SNAKE_CASE for module-level constants: `DEFAULT_BASE_URL`, `SCROLL_INTERVAL_MS`, `PID_FILE`
- Private implementation details: no `_` prefix convention (just use `const`)

**Types:**
- PascalCase interfaces: `BrowserOptions`, `ScraperOptions`, `OutputOptions`, `WebhookPayload`
- PascalCase type aliases: `ErrorType`, `CliArgs`
- Type imports: `import type { Browser } from 'playwright-core'`

## Code Style

**Formatting:**
- Tool: Biome (`biome.json`)
- Indentation: 4 spaces (configured in `biome.json`)
- Quote style: single quotes (configured in `biome.json`)
- Semicolons: always (configured in `biome.json`)

**Linting:**
- Tool: Biome (`biome.json`)
- Rules: recommended preset
- No ESLint or Prettier configured

**TypeScript:**
- Strict mode: enabled (`tsconfig.json`)
- Target: ESNext
- Module: Preserve
- Module resolution: bundler
- `verbatimModuleSyntax: true` (enforces type-only imports)
- `noEmit: true` (type-checking only, no compilation)

## Import Organization

**Order:**
1. External packages (e.g., `cloakbrowser`, `pino`, `p-retry`)
2. Node.js built-ins (e.g., `fs`, `http`, `child_process`)
3. Local modules with `.js` extension (e.g., `./errors.js`, `./logger.js`)

**Path Aliases:**
- None configured. All imports use relative paths with `.js` extension.

**Import Style:**
- Named imports for functions: `import { launch } from 'cloakbrowser'`
- Default imports for full modules: `import fs from 'fs'`
- Type-only imports: `import type { Browser } from 'playwright-core'`
- Dynamic imports for conditional loading: `await import('./daemon.js')`

## Error Handling

**Classification Pattern:**
```typescript
// src/errors.ts
export type ErrorType = 'transient' | 'permanent' | 'browser' | 'extraction';

export function classifyError(error: Error): ErrorType {
    const msg = error.message.toLowerCase();
    if (TRANSIENT_KEYWORDS.some((kw) => msg.includes(kw))) return 'transient';
    // ...
}
```

**Retry Pattern:**
```typescript
// src/errors.ts
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: { retries?: number; logger: Logger }
): Promise<T> {
    return pRetry(
        async (attemptNumber) => {
            try {
                return await fn();
            } catch (error) {
                const category = classifyError(err);
                if (category === 'permanent') throw new AbortError(err.message);
                throw err; // transient: retry
            }
        },
        { retries, onFailedAttempt: ... }
    );
}
```

**Timeout Pattern:**
```typescript
// src/errors.ts
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
        ),
    ]);
}
```

**Graceful Degradation:**
- Webhook failures log but never crash the scraper (`src/webhook.ts:102-106`)
- Browser close errors are silently ignored (`src/scraper.ts:166-169`)
- Scroll failures retry with delay, then continue (`src/scraper.ts:99-105`)
- Non-JSON responses are skipped with debug logging (`src/extractor.ts:52-63`)

## Logging

**Framework:** Pino (`pino`)

**Configuration:**
```typescript
// src/logger.ts
export function createLogger(level: string = 'info'): pino.Logger {
    return pino({
        level: process.env.LOG_LEVEL || level,
        redact: ['proxy', '*.proxy'], // D-21: proxy credential redaction
    });
}
```

**Child Logger Pattern:**
```typescript
// src/browser.ts
const browserLogger = createChildLogger(options.logger, 'browser');
browserLogger.info('Browser launched successfully');
```

**Log Levels:**
- `info`: Progress updates, completion status
- `warn`: Non-fatal issues (scroll failures, webhook retries)
- `error`: Recoverable failures (webhook failed, browser launch failed)
- `debug`: Detailed extraction info (URL counts, response filtering)

## Comments

**Section Dividers:**
```typescript
// --- Section Name ---
```
- Used at the top of every file for module purpose
- Used before each major function or section
- Examples: `// --- Shared types and interfaces ---`, `// --- Launch stealth browser ---`

**Inline Comments:**
- Reference design decisions: `// D-03: proxy URL-embedded format passed directly to launch`
- Explain non-obvious logic: `// DOM cleanup: remove rows above viewport (D-15)`
- Clarify safety measures: `// D-16: webhook failure never crashes scraper — log and return`

**Commented-Out Code:**
- Minimal, only one instance observed (`src/config.ts:12` area)
- No JSDoc or TSDoc (no type system required in JS, but TypeScript files could benefit)

## Function Design

**Size:**
- Small, focused functions: 10-30 lines typical
- One larger orchestrator: `main()` in `src/index.ts` (196 lines)
- Helper functions: 5-15 lines (e.g., `pad()`, `readPid()`, `removePidFile()`)

**Parameters:**
- Options objects for functions with 3+ parameters
- Types defined in `src/types.ts`
- Optional parameters with `?` and sensible defaults

**Return Values:**
- Explicit return types on exported functions
- `void` for side-effect functions
- `Promise<T>` for async functions

**Async Pattern:**
- Always use `async/await`
- No raw `.then()` chains
- `try/catch` for error handling
- `finally` for cleanup (e.g., browser close)

## Module Design

**Exports:**
- Named exports only (no default exports)
- Export functions, not classes
- Export types/interfaces separately

**Barrel Files:**
- None. Each module exports directly.

**Module Structure:**
```typescript
// --- Module purpose ---

// 1. Imports
import { ... } from './local.js';

// 2. Constants
const CONSTANT = value;

// 3. Types (if any)
export interface Options { ... }

// 4. Functions
export function doSomething(options: Options): Result { ... }
```

## Validation

**Schema Validation:**
- Zod for runtime validation (`src/config.ts`)
- Type inference from schemas: `export type Config = z.infer<typeof ConfigSchema>`

**CLI Validation:**
- Yargs for argument parsing (`src/cli.ts`)
- Manual validation for required/numeric args
- `process.exit(1)` with `console.error` for invalid input

## Configuration

**Pattern:**
- Cosmiconfig for flexible config file discovery (`src/config.ts`)
- Preset-based system for reusable configurations
- Environment variables for runtime overrides (`LOG_LEVEL`, `SCRAPER_DAEMON_CHILD`)

**File Locations (in search order):**
- `config.json`, `config.yaml`, `config.yml`
- `.facebook-scraper`, `.facebook-scraper.json`
- `package.json` (under `facebook-scraper` key)

---

*Convention analysis: 2026-07-07*
