# Stack Research

**Domain:** Stealth web scraper CLI tool (Bun-native TypeScript rewrite)
**Researched:** 2026-07-03
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Bun | ≥1.2 | Runtime, package manager, test runner, bundler | Native TypeScript support, faster than Node.js, built-in test runner. This is a Bun-native rewrite — no Node.js compatibility needed. |
| TypeScript | 5.x | Type safety, IDE support, maintainability | Required for modular architecture. Bun compiles TS natively — no build step needed. |
| `@types/bun` | ^1.3.14 | Bun API type definitions | TypeScript type definitions for `Bun.*` globals, `bun:test`, etc. Required for type checking. |
| `cloakbrowser` | ^0.4.6 | Stealth browser automation | Drop-in Playwright replacement with source-level C++ patches. Passes Cloudflare Turnstile, FingerprintJS, reCAPTCHA v3 (0.9 score). Free tier available. |
| `playwright-core` | ^1.61.1 | Browser automation engine (peer dep of cloakbrowser) | Peer dependency. cloakbrowser wraps Playwright — same API, same code, just swap the import. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pino` | ^10.3.1 | Structured JSON logging with levels | Always — replaces console.log with production-grade structured logging. Supports child loggers, transports, pretty-print for dev. |
| `pino-pretty` | ^13.0.0 | Human-readable log formatting for development | Dev dependency — pretty-prints pino output in terminal during development. |
| `yargs` | ^18.0.0 | CLI argument parsing with validation | Always — define options, positionals, custom validation, auto-generated help. Battle-tested, 450+ code snippets on Context7. |
| `p-retry` | ^8.0.0 | Retry with exponential backoff | Always — wraps async functions with configurable retries, jitter, timeout budgets. Critical for transient network failures and browser crashes. |
| `zod` | ^4.4.3 | Schema validation and type inference | Always — validate config objects, CLI args, and external data. TypeScript-first, infers types from schemas. v4 has major perf improvements. |
| `cosmiconfig` | ^9.0.2 | Configuration file discovery and loading | Always — search for config in package.json, `.facebook-scraper.json`, `.config/`, etc. Standard pattern for CLI tools. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Biome | Linting + formatting (all-in-one) | **Use instead of ESLint + Prettier.** Rust-powered, 20-100x faster, single config file (`biome.json`), zero-config defaults. 280+ rules covering eslint:recommended + typescript-eslint. |
| `bun:test` | Unit and integration testing | **Use instead of vitest.** Built into Bun, Jest-compatible API (`describe`, `it`, `expect`, `mock`), no extra dependencies. Global functions available without imports. |
| `@biomejs/biome` | ^2.5.2 | Linter + formatter binary | Install as dev dependency. `biome check` for lint+format, `biome format` for formatting only. |

## Installation

```bash
# Core dependencies
bun add cloakbrowser playwright-core

# Supporting libraries
bun add pino yargs p-retry zod cosmiconfig

# Dev dependencies
bun add -d @types/bun pino-pretty @biomejs/biome
```

## Configuration Files

### tsconfig.json (Bun-native)

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "moduleResolution": "bundler",
    "types": ["bun"],
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### biome.json

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedImports": "warn",
        "noUnusedVariables": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      },
      "style": {
        "noNonNullAssertion": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded"
    }
  }
}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **bun:test** | vitest | If you need browser testing (vitest has browser mode) or mocking ESM modules more granularly. For this project, bun:test is sufficient — no browser testing needed. |
| **Biome** | ESLint + Prettier | If you need niche ESLint plugins (jsx-a11y, framework-specific rules). This project doesn't — Biome covers all needs. |
| **pino** | consola | If you want a simpler logger without JSON output. pino is better for production scrapers where structured logs feed into monitoring. |
| **pino** | bunyan | pino is the spiritual successor to bunyan — faster, maintained, same API shape. |
| **yargs** | commander | commander is lighter but less feature-rich. yargs has better validation (.check()), auto-generated help, and type definitions. |
| **yargs** | Bun.argv parsing | Manual parsing is fine for 2-3 args. With 8+ options, positionals, and validation, yargs saves significant code. |
| **zod** | valibot | valibot is smaller (~1KB) but less ecosystem support. zod has better DX, more examples, and v4 solved the size issue. |
| **cosmiconfig** | JSON.parse + Bun.file | Fine for single-file config. cosmiconfig adds search strategy (package.json, rc files, .config/), error handling, and caching. |
| **p-retry** | Hand-rolled retry | Fine for simple cases. p-retry adds shouldConsumeRetry, onFailedAttempt callbacks, abort signals, and proper backoff math. |
| **cloakbrowser** | playwright-extra + stealth plugin | cloakbrowser is a real Chromium binary with C++ source patches. playwright-extra injects JS — less reliable against modern detection. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Node.js built-ins** (`node:fs`, `node:http`, `child_process`) | Bun has native APIs that are faster and simpler. `Bun.file()`, `Bun.write()`, `Bun.serve()`, `fetch()` are all native. | Bun native APIs |
| **`tsx` or `ts-node`** | Bun runs TypeScript natively — no transpiler needed. Adding one is unnecessary complexity. | `bun run src/index.ts` directly |
| **ESLint + Prettier** | Two tools, two configs, potential conflicts. Biome does both in one Rust binary, 20-100x faster. | Biome |
| **winston** | Slower than pino, more complex configuration, less structured output. pino is the standard for structured logging. | pino |
| **dotenv** | Bun has native `.env` support via `Bun.env`. No library needed. | `Bun.env.VARIABLE_NAME` |
| **jest** | Requires Node.js compatibility layer in Bun. bun:test is built-in and faster. | bun:test |
| **chalk / picocolors** | For a CLI scraper, colored output isn't critical. If needed, Bun supports ANSI natively. Don't add deps for cosmetic features. | `console.log` with ANSI escapes if absolutely needed |

## Stack Patterns by Variant

**If building a daemon/service (not just CLI):**
- Add `pino` transport for file rotation
- Use `Bun.serve()` for health check endpoint
- Consider `cronstrue` for cron scheduling if needed

**If adding webhook HMAC authentication:**
- Use `crypto.createHmac()` from `node:crypto` (Bun-compatible)
- No extra library needed — Bun's crypto is native

**If proxy rotation becomes complex:**
- Keep cloakbrowser's `proxy` option for single proxy
- Add `proxy-chain` if you need upstream proxy authentication
- External rotation (Bright Data, Webshare) is out of scope — keep it simple

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `cloakbrowser@^0.4.6` | `playwright-core@^1.61.1` | Peer dependency. cloakbrowser v0.4.x requires playwright-core ≥1.53.0. |
| `pino@^10.3.1` | `pino-pretty@^13.0.0` | pino-pretty is a transport — install separately. |
| `yargs@^18.0.0` | `@types/yargs@^17` | Types may lag behind — check DefinitelyTyped for latest. |
| `zod@^4.4.3` | TypeScript 5.x | Zod 4 requires TypeScript ≥5.0 for full type inference. |
| `biome@^2.5.2` | Bun ≥1.0 | Biome is a standalone binary — no runtime dependency. |

## Sources

- **Bun docs** (Context7: `/oven-sh/bun`) — TypeScript config, bun:test API, native file I/O, HTTP server
- **cloakbrowser GitHub** (npm, GitHub) — v0.4.6, 58 C++ patches, Playwright/Puppeteer API, `humanize=True` flag
- **pino docs** (Context7: `/pinojs/pino`) — Transport configuration, multistream, child loggers
- **yargs docs** (Context7: `/yargs/yargs`) — Option definition, `.check()` validation, positional arguments
- **p-retry docs** (Context7: `/sindresorhus/p-retry`) — Exponential backoff, `shouldConsumeRetry`, abort signals
- **cosmiconfig docs** (Context7: `/cosmiconfig/cosmiconfig`) — Search strategy, package.json loading
- **zod docs** (Context7: `/websites/zod_dev`) — Schema definition, type inference, v4 improvements
- **Biome vs ESLint** (multiple 2026 articles) — Performance benchmarks, rule coverage, migration guides

---
*Stack research for: Facebook Ads Library Scraper (Bun-native TypeScript rewrite)*
*Researched: 2026-07-03*
