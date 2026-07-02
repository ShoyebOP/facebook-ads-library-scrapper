# Project Research Summary

**Project:** Facebook Ads Library Scraper
**Domain:** Stealth web scraper CLI tool (Bun-native TypeScript rewrite)
**Researched:** 2026-07-03
**Confidence:** HIGH

## Executive Summary

This is a stealth web scraper CLI tool that extracts Facebook Ads Library data via GraphQL response interception, rewriting an existing 260-line monolithic `scraper.js` into a modular, production-grade Bun-native TypeScript application. Experts in this domain build scrapers by combining anti-detection browser automation (cloakbrowser with binary-level patches) with network-level data extraction (GraphQL interception), avoiding fragile DOM scraping. The architecture follows a pipeline pattern with clearly separated layers: CLI → Orchestration → Browser → Extraction → Output, each with single responsibilities and typed interfaces.

The recommended approach is to build incrementally across 6 phases, starting with the Bun migration and module scaffolding (establishing dependency boundaries), then the browser/scraper core (the highest-risk and highest-value component), followed by configuration, webhook output, daemon mode, and testing. The stack is deliberately minimal: Bun for runtime, cloakbrowser for stealth, pino for logging, yargs for CLI, zod for validation, and Biome for linting/formatting — all choices that minimize dependencies while maximizing reliability.

Key risks are well-documented and addressable: Facebook's GraphQL response schema drifts monthly (mitigate with defensive null checks and response shape validation), behavioral signals matter more than property patches (mitigate with cloakbrowser's `humanize: true` and adaptive scroll timing), and in-memory URL storage causes data loss on crash (mitigate with incremental file writes). The project should avoid anti-patterns like stealth plugin stacking, hardcoded configuration, and `waitForTimeout` calls, all of which are common failure modes in production scrapers.

## Key Findings

### Recommended Stack

The stack is optimized for a Bun-native CLI tool with no Node.js compatibility layer. All choices were validated against 2026 documentation and community consensus.

**Core technologies:**
- **Bun ≥1.2**: Runtime, package manager, test runner, bundler — native TypeScript support, faster than Node.js
- **TypeScript 5.x**: Type safety and maintainability — Bun compiles TS natively, no build step needed
- **cloakbrowser ^0.4.6**: Stealth browser automation — source-level C++ patches that pass Cloudflare Turnstile, FingerprintJS, reCAPTCHA v3 (0.9 score)
- **playwright-core ^1.61.1**: Browser automation engine — peer dependency of cloakbrowser, same Playwright API

**Supporting libraries:**
- **pino + pino-pretty**: Structured JSON logging with dev-friendly pretty printing
- **yargs**: CLI argument parsing with validation and auto-generated help
- **p-retry**: Exponential backoff retry for transient network failures
- **zod**: Schema validation and TypeScript type inference for config/CLI args
- **cosmiconfig**: Config file discovery (package.json, `.facebook-scraper.json`, `.config/`)

**Dev tools:**
- **Biome**: Replaces ESLint + Prettier — single Rust binary, 20-100x faster
- **bun:test**: Replaces vitest — built-in, Jest-compatible API, no extra dependencies

**Avoid:** Node.js built-ins, `tsx`/`ts-node`, ESLint, winston, dotenv, jest, chalk

### Expected Features

**Must have (table stakes) — v1 MVP:**
- Anti-detection browser automation (cloakbrowser with humanization)
- GraphQL response interception (network-level, not DOM scraping)
- JSON output to timestamped files
- CLI argument parsing with validation
- Proxy support (HTTP/SOCKS5 with authentication)
- Structured logging (pino with levels)
- Error handling with classification and retry
- Input validation (Zod schemas)

**Should have (competitive) — v1.x:**
- Webhook notification (POST to automation workflows)
- Humanization presets (mouse movements, typing, scrolling)
- Preset-based configuration (config.json profiles)
- Daemon mode (background execution, PID management)
- Incremental URL saving (crash recovery)
- Exponential backoff retry (p-retry)
- Adaptive scroll timing (network idle detection)

**Defer (v2+):**
- Metrics collection (Prometheus/structured logs)
- Cost per query tracking
- Configurable DOM selectors
- Webhook HMAC authentication
- Proxy credential sanitization

### Architecture Approach

The architecture follows a **pipeline pattern** with 5 layers: CLI, Orchestration, Browser, Extraction, and Output. Each layer has single responsibility, communicates through typed interfaces, and can be tested independently. The project structure isolates concerns: `src/cli/` for argument parsing, `src/browser/` for Playwright/cloakbrowser, `src/scraper/` for extraction logic, `src/output/` for file/webhook, `src/daemon/` for process management, `src/config/` for configuration, `src/errors/` for error handling, and `src/types/` for shared types.

**Major components:**
1. **CLI Layer** — Parses arguments, validates inputs, resolves presets (yargs + Zod)
2. **Orchestration Layer** — Coordinates browser → extract → output pipeline
3. **Browser Layer** — Launch management, stealth config, network interception, humanize behavior
4. **Extraction Layer** — GraphQL response parsing, profile URL extraction, data transformation
5. **Output Layer** — File writer, webhook notifier, structured logger, daemon manager
6. **Cross-Cutting** — Config manager, error handler, retry engine, health monitor

**Key patterns:**
- Pipeline architecture for sequential data flow
- Strategy pattern for swappable output formats
- Event-driven extraction via browser response events
- Dependency injection to prevent circular imports

**Testing pyramid:** ~70% unit (pure functions, no browser), ~25% integration (mock browser), ~5% E2E (real browser, run sparingly)

### Critical Pitfalls

1. **Facebook GraphQL response structure changes monthly** — The `doc_id` and response schema rotate every 4-8 weeks. Mitigate with defensive null checks on every nested field, periodic response structure logging, fallback extraction patterns, and a response shape validator.

2. **Stealth plugin patches are detectable artifacts** — `playwright-extra` stealth hasn't been updated since 2023; modern anti-bot systems detect its JS-level patches. Mitigate by using cloakbrowser (binary-level patches) and NEVER stacking additional stealth plugins.

3. **Behavioral signals matter more than property patches** — Anti-bot systems score mouse movement curves, scroll timing, and click intervals. Mitigate with cloakbrowser's `humanize: true`, realistic mouse curves, variable scroll timing, and session warmup.

4. **Static sleep timers are engineering time bombs** — Hardcoded `waitForTimeout(2500)` breaks under variable network conditions. Mitigate with `waitForLoadState('networkidle')`, adaptive content detection, and network quiet detectors.

5. **In-memory URL storage loses everything on crash** — A `Set<string>` in memory means hours of work lost on any crash. Mitigate with incremental file writes every 100 URLs or 30 seconds, append-only writes, and checkpoint-based resume.

6. **Bun's .env auto-loading creates silent configuration drift** — Bun loads `.env` files without explicit import, potentially overriding intended config. Mitigate by passing `--env-file` explicitly and auditing env loading order.

7. **Daemon PID files create ghost processes** — Stale PID files after `kill -9` can block restarts or signal wrong processes. Mitigate with `flock`-based locking, PID liveness verification, and metadata storage.

8. **Circular module dependencies during modularization** — Splitting the monolith naturally creates import cycles. Mitigate with strict dependency direction (CLI → Config → Browser → Scraper → Output), dependency injection, and a shared types layer.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Bun Migration & Project Scaffolding
**Rationale:** Must come first — establishes the runtime, module boundaries, and dependency direction before any feature code. Prevents circular dependencies (Pitfall 10) and Bun .env issues (Pitfall 5) from the start.
**Delivers:** Bun project setup, TypeScript config, Biome config, module directory structure, base types/interfaces, config loader with Zod schemas, CLI entry point with yargs.
**Addresses:** CLI argument parsing, input validation, structured logging (pino), configuration management (cosmiconfig).
**Avoids:** Circular module dependencies (Pitfall 10), Bun .env auto-loading drift (Pitfall 5), stealth plugin stacking (Pitfall 2).
**Stack elements:** Bun, TypeScript, Biome, bun:test, pino, yargs, zod, cosmiconfig.

### Phase 2: Browser & Scraper Core
**Rationale:** Highest-risk, highest-value component. Must be built early to validate cloakbrowser integration, GraphQL interception, and stealth effectiveness. This is where the product either works or doesn't.
**Delivers:** cloakbrowser integration with stealth config, network response interception, GraphQL response parsing, profile URL extraction with deduplication, auto-scroll loop with adaptive timing, incremental URL saving to disk, error classification and retry logic.
**Addresses:** Anti-detection browser automation, GraphQL response interception, proxy support, error handling, humanization presets, adaptive scroll timing, incremental URL saving, exponential backoff retry.
**Avoids:** Facebook schema drift (Pitfall 1) via defensive extraction, behavioral signals (Pitfall 3) via humanization, static sleep timers (Pitfall 4) via adaptive timing, in-memory data loss (Pitfall 7) via incremental saves.
**Architecture components:** Browser Layer (launcher, stealth, intercept, humanize), Extraction Layer (parser, extractor, transformer), Cross-cutting (error handler, retry engine).
**Research flag:** NEEDS RESEARCH — cloakbrowser compatibility with Bun needs validation; Facebook GraphQL response structure needs current schema capture.

### Phase 3: Configuration & Presets
**Rationale:** Externalizes all hardcoded values before they become technical debt. Preset system enables non-developer usage and multiple scrape targets without code changes.
**Delivers:** config.json with preset system, environment variable overrides, country/proxy configuration, webhook URL configuration, preset resolution from CLI args.
**Addresses:** Preset-based configuration, configurable DOM selectors (foundation), proxy credential sanitization.
**Avoids:** Geo-routing surprises (Pitfall 8) via explicit country config, hardcoded webhook URLs (Pitfall 12) via externalized config.
**Stack elements:** cosmiconfig, zod schemas.
**Research flag:** STANDARD PATTERN — config file loading is well-documented.

### Phase 4: Webhook & Output
**Rationale:** Output layer depends on extraction working correctly. Webhook is the primary integration point for automation workflows (n8n, Zapier).
**Delivers:** Webhook notification with HMAC authentication, file output formatting, composite writer for multiple outputs.
**Addresses:** Webhook notification, webhook HMAC authentication.
**Avoids:** Webhook signature verification failure (Pitfall 9) via raw body verification, timing-safe comparison.
**Architecture components:** Output Layer (file writer, webhook notifier).
**Research flag:** STANDARD PATTERN — webhook HMAC is well-documented; verify raw body handling.

### Phase 5: Daemon & Reliability
**Rationale:** Daemon mode is orthogonal to scraping logic — it wraps the pipeline in process management. Should come after core pipeline is stable.
**Delivers:** Daemon mode with process forking, PID management with flock, graceful shutdown (SIGTERM/SIGINT), health check endpoint, restart capability.
**Addresses:** Daemon mode.
**Avoids:** Daemon PID corruption (Pitfall 6) via flock-based locking and liveness checks.
**Architecture components:** Daemon Layer (manager, signals, pid), Cross-cutting (health monitor).
**Research flag:** STANDARD PATTERN — PID management and signal handling are well-documented.

### Phase 6: Testing & Validation
**Rationale:** Testing should be added after the architecture is stable, not before — otherwise tests break during refactoring. Establish patterns early but comprehensive coverage comes last.
**Delivers:** Unit test suite (extraction logic, CLI parsing, config loading), integration tests (mock browser pipeline), E2E smoke test (real browser), test fixtures for GraphQL responses.
**Addresses:** All features via verification.
**Avoids:** Testing anti-patterns (Pitfall 11) via fixture-based testing, response snapshots.
**Architecture components:** All layers verified.
**Research flag:** STANDARD PATTERN — bun:test and Playwright mocking are well-documented.

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** Module boundaries must exist before complex browser code. Prevents circular dependencies.
- **Phase 2 before Phase 3-5:** Core scraping must work before adding configuration, output, or daemon features. The scraper is the product.
- **Phase 3 before Phase 4:** Configuration must exist for webhook URLs and output paths.
- **Phase 4 before Phase 5:** Webhook output must work before wrapping in daemon mode.
- **Phase 6 last:** Testing patterns depend on stable architecture. Premature testing causes rework.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Browser & Scraper Core):** cloakbrowser + Bun compatibility validation; current Facebook GraphQL response schema capture; stealth effectiveness testing against CreepJS
- **Phase 4 (Webhook & Output):** HMAC implementation details for Bun's crypto API

Phases with standard patterns (skip research-phase):
- **Phase 1 (Bun Migration):** Bun project setup is well-documented
- **Phase 3 (Configuration):** cosmiconfig + Zod is established pattern
- **Phase 5 (Daemon):** PID management and signal handling are standard Unix patterns
- **Phase 6 (Testing):** bun:test and Playwright mocking are documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified against 2026 documentation; cloakbrowser validated for anti-detection effectiveness |
| Features | HIGH | Feature landscape derived from competitor analysis and domain expertise; priorities validated against MVP definition |
| Architecture | HIGH | Pipeline pattern validated against production scrapers; module structure prevents known anti-patterns |
| Pitfalls | MEDIUM | Findings from web research and project CONCERNS.md; Facebook schema drift frequency needs ongoing validation |

**Overall confidence:** HIGH

### Gaps to Address

- **cloakbrowser + Bun compatibility:** Needs validation during Phase 1/2 — cloakbrowser's Playwright wrapper may have Node.js assumptions. Test early with a minimal browser launch.
- **Current Facebook GraphQL response schema:** Must capture a real response snapshot during Phase 2 planning to build extraction logic against actual data, not assumptions.
- **Stealth effectiveness in production:** Local testing passes but VPS/cloud deployment may behave differently. Budget for CreepJS fingerprint testing in Phase 2.
- **Adaptive scroll timing thresholds:** Network idle detection parameters need tuning against real Facebook pages. Empirical testing required.
- **Webhook HMAC for Bun:** Bun's `node:crypto` compatibility needs verification for `createHmac` and `timingSafeEqual`. Test during Phase 4.

## Sources

### Primary (HIGH confidence)
- **Bun docs** (`oven-sh/bun` via Context7) — TypeScript config, bun:test API, native file I/O, HTTP server
- **cloakbrowser GitHub** — v0.4.6, 58 C++ patches, Playwright/Puppeteer API, humanization
- **pino docs** (`pinojs/pino` via Context7) — Transport configuration, multistream, child loggers
- **yargs docs** (`yargs/yargs` via Context7) — Option definition, validation, positional arguments
- **p-retry docs** (`sindresorhus/p-retry` via Context7) — Exponential backoff, abort signals
- **cosmiconfig docs** (`cosmiconfig/cosmiconfig` via Context7) — Search strategy, package.json loading
- **zod docs** (`websites/zod_dev` via Context7) — Schema definition, type inference, v4 improvements
- **Apify Facebook Ads Scraper** — Competitor analysis, 57 fields per ad
- **Anansi GitHub** — Self-healing scraper with TLS fingerprinting
- **Browserless Anti-Detection 2026** — Stealth techniques reference
- **HyperFX Meta Ad Library Guide** — Facebook Ads Library scraping approach

### Secondary (MEDIUM confidence)
- **scrapinghub/stealth-scraper-playwright** — Modular TypeScript scraper patterns
- **universal-playwright-leads-scraper** — Config-driven lead scraper architecture
- **Playwright Network Interception docs** — Response interception API
- **Node.js Graceful Shutdown patterns** — SIGTERM handling
- **Bright Data Docs** — Delivery options for web scrapers
- **ScrapeTL/ScrapeGoat GitHub** — Scraper orchestration platforms
- **Webhook Security guides** (WebhookStream, HookSense) — HMAC verification patterns
- **Bun 1.2 Production Migration reports** — Known compatibility issues

### Tertiary (LOW confidence)
- **Project CONCERNS.md** (2026-06-29) — Internal project concerns, needs validation against implementation

---
*Research completed: 2026-07-03*
*Ready for roadmap: yes*
