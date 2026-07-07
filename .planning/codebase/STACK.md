# Technology Stack

**Analysis Date:** 2026-07-07

## Languages

**Primary:**
- TypeScript (ES Modules) — All source code in `src/` directory (15 files), compiled via Bun's native TypeScript support

**Secondary:**
- JSON — Configuration files (`config.json`, `config.example.json`), test fixtures (`test/fixtures/graphql-response.json`)

## Runtime

**Environment:**
- Bun (JavaScript/TypeScript runtime)
- Module system: ES Modules (`"type": "module"` in `package.json`)

**Package Manager:**
- Bun (bun.lock present, lockfileVersion 1)
- Lockfile: `bun.lock` (present)

## Frameworks

**Core:**
- None — Vanilla TypeScript, no web framework. CLI tool that runs directly via `bun run src/cli.ts`

**Testing:**
- Bun test runner (built-in) — Configured in `bunfig.toml` with coverage thresholds: line 0.7, function 0.7, statement 0.7

**Build/Dev:**
- None — No build step. Bun runs TypeScript directly. `tsconfig.json` has `noEmit: true` and `allowImportingTsExtensions: true`
- Biome `^2.5.2` — Linting and formatting (dev dependency)

## Key Dependencies

**Critical:**
- `cloakbrowser` `^0.3.28` — Stealth browser automation library wrapping Playwright with anti-detection features. Core to Facebook bypass functionality
- `playwright-core` `^1.53.0` — Browser automation engine (peer dependency of cloakbrowser). Types used throughout (`Browser`, `Page`, `Response`)
- `cosmiconfig` `^9.0.2` — Configuration loading from multiple file formats. Searches for config in `config.json`, `.facebook-scraper.*`, `.config/facebook-scraper/*`, etc. (`src/config.ts:22-54`)
- `zod` `^4.4.3` — Schema validation for configuration. Validates preset structure with URL constraints (`src/config.ts:8-15`)
- `yargs` `^18.0.0` — CLI argument parsing with typed options, validation, and help generation (`src/cli.ts:11-65`)

**Infrastructure:**
- `pino` `^10.3.1` — Structured JSON logging with child logger support and credential redaction (`src/logger.ts`)
- `p-retry` `^8.0.0` — Retry logic with exponential backoff for webhook calls and browser launches (`src/webhook.ts:38`, `src/errors.ts:77`)
- `proper-lockfile` `^4.1.2` — File-based locking for daemon PID management to prevent concurrent runs (`src/daemon.ts:46-55`)

**Node.js Built-ins (used directly):**
- `http` / `https` — Webhook POST requests (`src/webhook.ts:3-4`)
- `child_process` — Daemon mode via `fork()` with detached processes (`src/daemon.ts:78`)
- `fs` / `node:fs/promises` — File I/O for output, PID files, log files, env file loading

**Type Definitions:**
- `@types/bun` `^1.3.14` — Bun runtime type definitions
- `@types/pino` `^7.0.5` — Pino logger type definitions
- `src/proper-lockfile.d.ts` — Custom type declaration for proper-lockfile (no built-in types)

## Configuration

**Environment:**
- No `.env` file present (`.env` is gitignored)
- Environment variables used at runtime:
  - `LOG_LEVEL` — Pino log level, defaults to `'info'` (`src/logger.ts:9`)
  - `SCRAPER_DAEMON_CHILD` — Set to `'1'` in forked daemon child processes to prevent infinite fork (`src/daemon.ts:81`)
- `--env-file` CLI flag supports loading custom env files (`src/cli.ts:97-122`)

**Application Config (cosmiconfig):**
- Config module name: `facebook-scraper`
- Search places (in order): `package.json`, `.facebook-scraper`, `.facebook-scraper.json`, `.config/facebook-scraper`, `config.json`, `config.yaml`, `config.js`, `config.ts`, and variants (`src/config.ts:22-54`)
- Schema validated with Zod: `{ presets: Record<string, { callback: string (URL), adLibraryUrl?: string (URL) } }>` (`src/config.ts:8-15`)
- Example: `config.example.json` — contains `leadgen` preset with callback URL and ad library URL template

**TypeScript Config:**
- `tsconfig.json` — ESNext target, bundler module resolution, strict mode, DOM lib included for browser API types

**Linting/Formatting:**
- `biome.json` — Biome v2.5.2 config
  - Linter: recommended rules enabled
  - Formatter: 4-space indentation, single quotes, semicolons always
  - Import organization: `organizeImports: "on"`

**Test Config:**
- `bunfig.toml` — Coverage thresholds: line 0.7, function 0.7, statement 0.7

## NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `bun run src/cli.ts` | Run the scraper CLI |
| `dev` | `bun run --watch src/cli.ts` | Watch mode for development |
| `test` | `bun test` | Run all tests |
| `lint` | `bunx biome check ./src` | Lint source files |
| `format` | `bunx biome format --write ./src` | Auto-format source files |
| `typecheck` | `bun run tsc --noEmit` | Type-check without emitting |

## CLI Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `query` | string | required | Search keyword for Facebook Ads |
| `--preset` | string | — | Configuration preset name (resolves callback URL and ad library URL) |
| `--headless` | boolean | false | Run browser in headless mode |
| `--proxy` | string | — | Proxy server URL (HTTP/SOCKS5) |
| `--max-urls` | number | Infinity | Maximum URLs to collect |
| `--max-no-new-scrolls` | number | 10 | Stop after N scrolls with no new results |
| `--daemon` | boolean | false | Run as background process |
| `--daemon-action` | string | — | Manage daemon: `stop`, `status`, `logs` |
| `--callback` | string | — | Webhook callback URL (overrides preset) |
| `--env-file` | string | — | Path to env file |
| `--url` | string | — | Override ad library URL for this run |

## Platform Requirements

**Development:**
- Bun runtime installed
- Network access to Facebook Ads Library (`facebook.com/ads/library/`)

**Production:**
- Bun runtime
- Network access to Facebook Ads Library
- Optional: proxy server (HTTP/SOCKS5) for rate limiting bypass
- File system write access for `output/` directory and daemon PID/log files

---

*Stack analysis: 2026-07-07*
