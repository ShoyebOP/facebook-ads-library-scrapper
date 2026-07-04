# Walking Skeleton — Facebook Ads Library Scraper

**Phase:** 1
**Generated:** 2026-07-04

## Capability Proven End-to-End

A user can run the CLI with a `--query` argument, the tool parses arguments correctly, loads configuration from a preset file, and prints the parsed configuration — proving the full CLI → Config pipeline works end-to-end.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Runtime | Bun | Native TypeScript support, fast startup, built-in test runner |
| Language | TypeScript (strict mode) | Type safety, Zod inference, better DX |
| Module system | ES Modules (`"type": "module"`) | Preserved from original scraper.js, Bun-native |
| Module resolution | `"moduleResolution": "bundler"` | Bun-native, no Node.js compatibility layer |
| Pipeline architecture | `cli.ts → config.ts → browser.ts → scraper.ts → output.ts` | Unidirectional data flow, clear boundaries (D-01) |
| Config discovery | cosmiconfig | Industry standard, handles multiple file formats |
| Config validation | Zod | TypeScript-first, single source of truth for types + validation (D-14) |
| CLI parsing | yargs | Mature, feature-rich, type coercion |
| Linting/formatting | Biome | Fast all-in-one toolchain, replaces ESLint + Prettier |
| Testing | bun:test | Native Bun integration, no external deps |
| File naming | kebab-case for files, camelCase for code (D-02, D-03) | Consistent conventions |
| Type location | Co-located per module (D-04) | Each module exports its own types |
| Path aliases | Bare imports, no aliases (D-13) | Bun supports natively |

## Stack Touched in Phase 1

- [x] Project scaffold — Bun init, TypeScript config, Biome config, directory structure
- [x] Configuration system — cosmiconfig discovery, Zod schema validation, preset resolution
- [x] CLI entry point — yargs argument parsing, input validation, error handling
- [x] Pipeline wiring — CLI → Config → stub modules → output (end-to-end proof)
- [x] Testing — bun:test configured, basic setup and config tests

## Out of Scope (Deferred to Later Slices)

- Browser integration (cloakbrowser launch, stealth config) — Phase 2
- GraphQL response interception and profile URL extraction — Phase 2
- Auto-scroll loop and DOM cleanup — Phase 2
- Proxy support and network routing — Phase 2
- Error classification and retry engine — Phase 2
- Structured logging with pino — Phase 2
- JSON file output with timestamps — Phase 3
- Webhook notifications — Phase 3
- Daemon mode with PID management — Phase 4
- Comprehensive test suite — Phase 4

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Core scraper engine — browser launches, intercepts GraphQL, extracts profile URLs
- Phase 3: Output and delivery — timestamped JSON files, webhook notifications
- Phase 4: Daemon and validation — background process management, comprehensive tests
