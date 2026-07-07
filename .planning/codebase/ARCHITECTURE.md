<!-- refreshed: 2026-07-07 -->
# Architecture

**Analysis Date:** 2026-07-07

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                        CLI Entry Point                       │
│                      `src/cli.ts` (162 lines)                │
├─────────────────────────────────────────────────────────────┤
│  yargs arg parsing → validation → daemon actions → main()   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Pipeline Orchestrator                      │
│                     `src/index.ts` (196 lines)               │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Config      │   Logger     │   Output     │   Webhook      │
│  `config.ts`  │  `logger.ts` │  `output.ts` │  `webhook.ts`  │
│  (81 lines)   │  (21 lines)  │  (49 lines)  │  (107 lines)   │
└──────┬───────┴──────────────┴──────┬───────┴────────┬───────┘
       │                             │                │
       ▼                             ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                      Scraper Engine                          │
│                     `src/scraper.ts` (172 lines)             │
├─────────────────────────────────────────────────────────────┤
│  Browser launch → navigation → scroll loop → DOM cleanup     │
└───────────┬────────────────────────────────┬────────────────┘
            │                                │
            ▼                                ▼
┌──────────────────────┐      ┌──────────────────────────────┐
│   Browser Controller  │      │     GraphQL Extractor        │
│    `src/browser.ts`   │      │      `src/extractor.ts`      │
│     (41 lines)        │      │       (65 lines)             │
└──────────────────────┘      └──────────────────────────────┘
            │                                │
            ▼                                ▼
┌──────────────────────┐      ┌──────────────────────────────┐
│  cloakbrowser/        │      │  Playwright Page responses    │
│  playwright-core      │      │  Intercepts GraphQL JSON      │
└──────────────────────┘      └──────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Daemon Manager                            │
│                    `src/daemon.ts` (161 lines)               │
├─────────────────────────────────────────────────────────────┤
│  PID file management, fork(), signal handlers, flock lock    │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| CLI Parser | Parse CLI arguments with yargs, validate inputs, route daemon actions | `src/cli.ts` |
| Pipeline Orchestrator | Wire all modules together, manage shutdown handlers, coordinate lifecycle | `src/index.ts` |
| Configuration | Load config via cosmiconfig, validate with Zod, resolve presets | `src/config.ts` |
| Scraper Engine | Launch browser, navigate to Facebook Ads Library, auto-scroll, coordinate extraction | `src/scraper.ts` |
| Browser Controller | Launch cloakbrowser with stealth config, manage browser lifecycle | `src/browser.ts` |
| GraphQL Extractor | Intercept HTTP responses, recursively extract `page_profile_uri` from JSON | `src/extractor.ts` |
| Output Handler | Generate timestamped output paths, save URLs to JSON, incremental persistence | `src/output.ts` |
| Webhook Notifier | POST completion notifications with retry, error isolation | `src/webhook.ts` |
| Error Handling | Classify errors (transient/permanent/browser/extraction), retry with backoff | `src/errors.ts` |
| Structured Logger | Create pino loggers with credential redaction | `src/logger.ts` |
| Daemon Manager | PID file management, process forking, flock locking, signal handlers | `src/daemon.ts` |
| Shared Types | TypeScript interfaces for all module contracts | `src/types.ts` |

## Pattern Overview

**Overall:** Pipeline / Event-Driven Architecture

**Key Characteristics:**
- Linear pipeline: CLI → Config → Scraper → Output → Webhook
- Network interception for data extraction (not DOM scraping)
- Event-driven GraphQL response interception via Playwright `response` events
- Process-level isolation via `child_process.fork()` for daemon mode
- Graceful shutdown with state preservation on SIGINT/SIGTERM
- Incremental saves during scraping for crash resilience

## Layers

**CLI Layer:**
- Purpose: Parse user input and route to appropriate handler
- Location: `src/cli.ts`
- Contains: yargs argument parsing, input validation, daemon action routing
- Depends on: `src/index.ts`, `src/daemon.ts`
- Used by: User directly (entry point)

**Orchestration Layer:**
- Purpose: Wire all modules together and manage lifecycle
- Location: `src/index.ts`
- Contains: Configuration loading, preset resolution, shutdown handler setup, webhook coordination
- Depends on: `src/config.ts`, `src/logger.ts`, `src/output.ts`, `src/scraper.ts`, `src/webhook.ts`, `src/daemon.ts`
- Used by: `src/cli.ts`

**Engine Layer:**
- Purpose: Execute the core scraping workflow
- Location: `src/scraper.ts`
- Contains: Browser lifecycle, page navigation, scroll loop, DOM cleanup, coordinate extraction
- Depends on: `src/browser.ts`, `src/extractor.ts`, `src/errors.ts`, `src/logger.ts`
- Used by: `src/index.ts`

**Infrastructure Layer:**
- Purpose: Provide cross-cutting utilities
- Location: `src/` (multiple files)
- Contains: Browser launch, error classification, logging, configuration
- Depends on: External packages (`cloakbrowser`, `pino`, `zod`, `cosmiconfig`)
- Used by: Engine Layer, Orchestration Layer

**Data Layer:**
- Purpose: Persist results and notify external systems
- Location: `src/output.ts`, `src/webhook.ts`
- Contains: File I/O, HTTP webhook calls
- Depends on: None (leaf modules)
- Used by: Orchestration Layer

## Data Flow

### Primary Request Path

1. **CLI parsing** — `src/cli.ts:11-65` — yargs parses arguments, validates inputs
2. **Pipeline init** — `src/index.ts:33-131` — Loads config, resolves presets, creates output path
3. **Browser launch** — `src/scraper.ts:59-65` → `src/browser.ts:11-41` — cloakbrowser launches with stealth config
4. **Page navigation** — `src/scraper.ts:77-80` — Navigate to Facebook Ads Library URL
5. **GraphQL interception** — `src/extractor.ts:33-65` — Playwright `response` event intercepts GraphQL API responses
6. **URL extraction** — `src/extractor.ts:10-29` — Recursive JSON traversal extracts `page_profile_uri` fields
7. **Auto-scroll loop** — `src/scraper.ts:88-153` — Scroll, wait, cleanup DOM, repeat until max URLs or no new results
8. **Incremental save** — `src/output.ts:37-48` — Periodically persist URLs during scraping
9. **Final save** — `src/output.ts:30-33` — Write complete URL set to JSON file
10. **Webhook notification** — `src/webhook.ts:25-107` — POST completion payload to external endpoint

### Daemon Mode Flow

1. **Daemon fork** — `src/daemon.ts:59-93` — `child_process.fork()` with `detached: true`
2. **PID management** — `src/daemon.ts:15-42` — Write PID file with flock lock
3. **Child execution** — `src/index.ts:63-70` — Child detects `SCRAPER_DAEMON_CHILD=1`, skips re-fork
4. **Shutdown handler** — `src/daemon.ts:126-161` — SIGTERM/SIGINT → save state → cleanup → exit
5. **Parent exit** — `src/daemon.ts:86-89` — Parent prints PID and exits immediately

### State Management

- **In-memory:** `Set<string>` for collected profile URLs (`src/scraper.ts:49`)
- **File system:** JSON output files in `output/` directory (`src/output.ts`)
- **Process:** PID file `.daemon.pid` for daemon lifecycle (`src/daemon.ts:10`)
- **Environment:** `SCRAPER_DAEMON_CHILD=1` marker to prevent infinite fork (`src/daemon.ts:81`)

## Key Abstractions

**ScraperOptions:**
- Purpose: Central configuration object passed through the pipeline
- Examples: `src/types.ts:18-30`, consumed by `src/scraper.ts:33`
- Pattern: Options object with optional callbacks (`onBrowserReady`, `incrementalSaver`)

**Error Classification:**
- Purpose: Categorize errors to determine retry behavior
- Examples: `src/errors.ts:49-62`
- Pattern: Keyword-based matching against error message strings → `ErrorType` enum (`transient` | `permanent` | `browser` | `extraction`)

**Incremental Saver:**
- Purpose: Periodically persist URLs during scraping for crash resilience
- Examples: `src/output.ts:37-48`
- Pattern: Closure over `lastSaveCount` threshold, triggered by `incrementalSaver?.()` callback

**Daemon Shutdown:**
- Purpose: Graceful process termination with state preservation
- Examples: `src/daemon.ts:126-161`, `src/index.ts:137-174`
- Pattern: Dependency injection (`DaemonShutdownDeps`) → signal handlers → save state → cleanup → exit

**Configuration Presets:**
- Purpose: Named configuration bundles for webhook URLs and ad library URLs
- Examples: `src/config.ts:8-18`, `config.example.json`
- Pattern: cosmiconfig search → Zod validation → `resolvePreset()` lookup

## Entry Points

**CLI Entry Point:**
- Location: `src/cli.ts`
- Triggers: `bun run src/cli.ts "<query>" [options]` or `bun start "<query>"`
- Responsibilities: Parse CLI args, validate, route daemon actions, invoke `main()`

**Library Entry Point:**
- Location: `src/index.ts`
- Triggers: Imported by `src/cli.ts`, exports `main()` and `CliArgs` type
- Responsibilities: Orchestrate the full pipeline, return `Set<string>` of URLs

**Daemon Entry Point:**
- Location: `src/daemon.ts` (functions only)
- Triggers: `startDaemon()`, `stopDaemon()` called from `src/index.ts` and `src/cli.ts`
- Responsibilities: Fork child process, manage PID files, setup shutdown handlers

## Architectural Constraints

- **Threading:** Single-threaded event loop; daemon mode uses `child_process.fork()` for process isolation
- **Global state:** None — all state is passed via function parameters or closures
- **Circular imports:** None — strict one-way dependency chain: `cli.ts` → `index.ts` → `scraper.ts` → `browser.ts`/`extractor.ts`
- **Module system:** ES Modules (`"type": "module"` in `package.json`), imports use `.js` extensions
- **Runtime:** Bun only — uses `Bun.write()` for file I/O in `src/output.ts:32`

## Anti-Patterns

### Duplicated Env File Loading

**What happens:** `src/cli.ts:99-122` and `src/index.ts:38-60` both contain identical env file parsing logic
**Why it's wrong:** Violates DRY; bugs fixed in one location may be missed in the other
**Do this instead:** Extract to a shared utility function, e.g., `loadEnvFile(path: string)` in a `src/env.ts` module

### Source Verification Tests

**What happens:** Some tests in `src/webhook.test.ts` and `src/output.test.ts` read source files and assert on code content (e.g., `expect(src).toContain('pRetry')`)
**Why it's wrong:** Brittle tests that break on refactoring even if behavior is correct; tests should verify behavior, not implementation
**Do this instead:** Replace with behavioral tests that call functions and assert on outputs/side effects

## Error Handling

**Strategy:** Classify-and-retry with graceful degradation

**Patterns:**
- **Error classification:** `src/errors.ts:49-62` — keyword-based categorization into `transient`/`permanent`/`browser`/`extraction`
- **Retry with backoff:** `src/errors.ts:71-108` — `p-retry` with exponential backoff, abort on non-transient errors
- **Timeout wrapper:** `src/errors.ts:38-45` — `Promise.race` for operations that may hang
- **Graceful shutdown:** `src/daemon.ts:126-161` — SIGTERM/SIGINT → save state → cleanup → exit
- **Webhook isolation:** `src/webhook.ts:102-106` — webhook failures never crash the scraper (catch-and-log)
- **Browser cleanup:** `src/scraper.ts:162-170` — `finally` block ensures browser closure

## Cross-Cutting Concerns

**Logging:** Pino structured logging with child loggers per module (`src/logger.ts`), credential redaction for proxy URLs, `[heartbeat]` prefix for periodic status
**Validation:** Zod schemas for config validation (`src/config.ts:8-15`), yargs strict mode for CLI args (`src/cli.ts:63`)
**Configuration:** cosmiconfig with 25+ search places (`src/config.ts:24-53`), preset-based URL resolution
**Locking:** `proper-lockfile` for PID file mutual exclusion during daemon start (`src/daemon.ts:46-55`)

---

*Architecture analysis: 2026-07-07*
