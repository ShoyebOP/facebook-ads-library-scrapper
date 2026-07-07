# Codebase Structure

**Analysis Date:** 2026-07-07

## Directory Layout

```
facebook-ads-library-scrapper/
├── src/                    # All source code (TypeScript)
│   ├── cli.ts              # CLI entry point with yargs parsing
│   ├── index.ts            # Pipeline orchestrator, main() function
│   ├── config.ts           # Cosmiconfig + Zod config loading
│   ├── scraper.ts          # Core scraping engine (scroll loop)
│   ├── browser.ts          # Cloakbrowser stealth launch wrapper
│   ├── extractor.ts        # GraphQL response interception & URL extraction
│   ├── output.ts           # File I/O, timestamped paths, incremental saves
│   ├── webhook.ts          # HTTP POST webhook with retry
│   ├── errors.ts           # Error classification & retry utilities
│   ├── logger.ts           # Pino structured logging
│   ├── daemon.ts           # PID management, fork(), signal handlers
│   ├── types.ts            # Shared TypeScript interfaces
│   ├── output.test.ts      # Unit tests for output module (co-located)
│   ├── webhook.test.ts     # Unit tests for webhook module (co-located)
│   └── proper-lockfile.d.ts # Type declarations for proper-lockfile
├── test/                   # Test suite (bun:test)
│   ├── unit/               # Unit tests for each module
│   ├── integration/        # Integration tests (CLI, daemon, webhook)
│   ├── e2e/                # End-to-end scraper tests
│   └── fixtures/           # Test data (graphql-response.json)
├── output/                 # Runtime output directory (gitignored)
├── .planning/              # Project planning artifacts
├── config.json             # Runtime config (gitignored, use config.example.json)
├── config.example.json     # Example configuration file
├── package.json            # Package manifest, scripts, dependencies
├── tsconfig.json           # TypeScript configuration (strict, ESNext)
├── biome.json              # Biome linter/formatter config
├── bunfig.toml             # Bun test coverage thresholds
├── bun.lock                # Bun lockfile
├── daemon.log              # Runtime daemon log (gitignored)
├── .daemon.pid             # Runtime PID file (gitignored)
├── .gitignore              # Git ignore rules
├── README.md               # Project documentation
├── LICENSE                 # GNU AGPL v3.0
└── example_page_code.html  # Reference HTML (1.7MB, for development)
```

## Directory Purposes

**`src/`:**
- Purpose: All application source code
- Contains: 13 TypeScript modules + 2 co-located test files + 1 type declaration
- Key files: `cli.ts` (entry), `index.ts` (orchestrator), `scraper.ts` (engine)
- Pattern: Flat structure — no subdirectories, all modules at same level

**`src/` (co-located tests):**
- Purpose: Unit tests placed alongside source for quick discovery
- Contains: `output.test.ts`, `webhook.test.ts`
- Note: Most tests live in `test/unit/` instead; these two are exceptions

**`test/unit/`:**
- Purpose: Unit tests for individual modules
- Contains: 12 test files covering all `src/` modules
- Key files: `extractor.test.ts` (6.9KB), `webhook.test.ts` (7.6KB), `errors.test.ts` (7.3KB)

**`test/integration/`:**
- Purpose: Integration tests that verify module wiring
- Contains: `cli.test.ts`, `daemon.test.ts`, `webhook.test.ts`

**`test/e2e/`:**
- Purpose: End-to-end scraper workflow tests
- Contains: `scraper.test.ts`

**`test/fixtures/`:**
- Purpose: Test data fixtures
- Contains: `graphql-response.json` (sample Facebook GraphQL response)

**`output/`:**
- Purpose: Runtime output directory for scraped URL JSON files
- Contains: Timestamped JSON files (e.g., `07-07-2026:00-16.Digital_Agency.json`)
- Generated: Yes (runtime)
- Committed: No (gitignored)

## Key File Locations

**Entry Points:**
- `src/cli.ts`: CLI entry point — `bun run src/cli.ts` or `bun start`
- `src/index.ts`: Library entry — exports `main()` and `CliArgs` type

**Configuration:**
- `package.json`: Package manifest, npm scripts, dependencies
- `tsconfig.json`: TypeScript config (strict, ESNext, bundler resolution)
- `biome.json`: Biome linter/formatter (4-space indent, single quotes, semicolons)
- `bunfig.toml`: Bun test coverage thresholds (70% line/function/statement)
- `config.example.json`: Example preset configuration
- `config.json`: Runtime config (gitignored)

**Core Logic:**
- `src/scraper.ts`: Core scraping engine — scroll loop, DOM cleanup
- `src/extractor.ts`: GraphQL response interception, recursive URL extraction
- `src/browser.ts`: Cloakbrowser stealth launch with retry
- `src/config.ts`: Cosmiconfig loading + Zod schema validation

**Testing:**
- `test/unit/`: Unit tests (12 files)
- `test/integration/`: Integration tests (3 files)
- `test/e2e/`: End-to-end tests (1 file)
- `test/fixtures/graphql-response.json`: Test fixture data

## Naming Conventions

**Files:**
- Lowercase with no separators: `scraper.ts`, `browser.ts`, `extractor.ts`
- Test files: `<module>.test.ts` (e.g., `output.test.ts`, `webhook.test.ts`)
- Type declarations: `<package>.d.ts` (e.g., `proper-lockfile.d.ts`)
- Config files: lowercase (`config.example.json`, `biome.json`, `bunfig.toml`)

**Directories:**
- Lowercase: `src/`, `test/`, `output/`
- Test subdirectories by type: `unit/`, `integration/`, `e2e/`, `fixtures/`

**Exports:**
- Named exports for functions: `export async function runScraper()`, `export function createLogger()`
- Named exports for types: `export type CliArgs`, `export type ErrorType`
- Named exports for interfaces: `export interface ScraperOptions`, `export interface WebhookPayload`
- Constants: `UPPER_SNAKE_CASE` for module-level config (e.g., `DEFAULT_BASE_URL`, `SCROLL_INTERVAL_MS`)

**Imports:**
- Use `.js` extensions for local imports: `import { launchBrowser } from './browser.js'`
- Named imports for functions/types: `import { launch } from 'cloakbrowser'`
- Default imports for full modules: `import fs from 'fs'`
- `import type` for type-only imports: `import type { Browser } from 'playwright-core'`

## Where to Add New Code

**New Feature Module:**
- Implementation: `src/<feature>.ts`
- Types: Add to `src/types.ts` or create `src/<feature>-types.ts`
- Tests: `test/unit/<feature>.test.ts`
- Integration tests: `test/integration/<feature>.test.ts`

**New CLI Argument:**
- Add to yargs options in `src/cli.ts:11-62`
- Add to `CliArgs` type in `src/index.ts:17-29`
- Wire into `ScraperOptions` in `src/index.ts:121-131` if needed
- Add to `ScraperOptions` interface in `src/types.ts:18-30` if consumed by scraper

**New Config Field:**
- Update Zod schema in `src/config.ts:8-15`
- Update `config.example.json`
- Update README.md configuration docs

**New Webhook Field:**
- Update `WebhookPayload` interface in `src/types.ts:49-53`
- Update `src/index.ts:188-191` to include new field in payload

**New Error Type:**
- Add keyword list in `src/errors.ts:12-34`
- Add case in `classifyError()` in `src/errors.ts:49-62`

**New Daemon Feature:**
- Add to `src/daemon.ts`
- Update shutdown deps interface in `src/daemon.ts:120-124`

## Special Directories

**`output/`:**
- Purpose: Scraped URL JSON files
- Generated: Yes (runtime)
- Committed: No (gitignored)
- Format: `DD-MM-YYYY:HH:MM.<query>.json`

**`.planning/`:**
- Purpose: Project planning artifacts (phases, roadmaps, specs)
- Generated: Yes (by GSD workflow)
- Committed: No (typically gitignored)

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (by `bun install`)
- Committed: No (gitignored)

**`test/fixtures/`:**
- Purpose: Static test data
- Generated: No
- Committed: Yes

## Module Dependency Graph

```
cli.ts
  └─→ index.ts
        ├─→ config.ts (cosmiconfig, zod)
        ├─→ logger.ts (pino)
        ├─→ output.ts (Bun.write, mkdir)
        ├─→ scraper.ts
        │     ├─→ browser.ts (cloakbrowser, withRetry)
        │     ├─→ extractor.ts (withTimeout, createChildLogger)
        │     ├─→ errors.ts (withTimeout)
        │     └─→ logger.ts (createChildLogger)
        ├─→ webhook.ts (http, https, p-retry, createChildLogger)
        └─→ daemon.ts (child_process, proper-lockfile)
```

---

*Structure analysis: 2026-07-07*
