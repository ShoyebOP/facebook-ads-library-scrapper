# Roadmap: Facebook Ads Library Scraper

## Overview

Rewrite a monolithic 260-line Facebook Ads Library scraper into a modular, production-grade Bun-native TypeScript CLI tool. The journey starts with project foundation (Bun setup, module structure, configuration system), moves through the core scraper engine (anti-detection browser automation, GraphQL interception, error handling), then adds output delivery (timestamped JSON files, webhook notifications), and finishes with daemon mode reliability and comprehensive testing.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Bun-native TypeScript project setup, module structure, and preset-based configuration system (completed 2026-07-04)
- [ ] **Phase 2: Core Scraper Engine** - Anti-detection browser automation, GraphQL interception, profile URL extraction, and error handling
- [ ] **Phase 3: Output & Delivery** - Timestamped JSON file output, incremental saving, and webhook notification system
- [ ] **Phase 4: Daemon & Validation** - Background daemon mode with PID management and comprehensive test suite

## Phase Details

### Phase 1: Foundation

**Goal**: The project is a fully configured Bun-native TypeScript application with modular architecture, CLI argument parsing, and preset-based configuration
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06, CONFIG-01, CONFIG-02, CONFIG-03, CONFIG-04, CONFIG-05
**Success Criteria** (what must be TRUE):

  1. User can run the CLI with a query argument and it parses correctly with validation errors for invalid input
  2. User can run the CLI with a preset name and it loads the corresponding configuration from config.json
  3. TypeScript compiles with Bun-native module resolution (no Node.js compatibility layer)
  4. Biome lints and formats code; bun:test runs and reports results

**Plans:** 2/2 plans complete

Plans:

- [x] 01-01-PLAN.md — Project scaffolding + config system (TypeScript, Biome, cosmiconfig, Zod, preset resolution)
- [x] 01-02-PLAN.md — CLI entry point + working pipeline (yargs, argument parsing, pipeline wiring)

### Phase 2: Core Scraper Engine

**Goal**: The scraper reliably launches a stealth browser, intercepts GraphQL responses, extracts profile URLs, handles errors with retry, and saves results incrementally
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: SCRAPE-01, SCRAPE-02, SCRAPE-03, SCRAPE-04, SCRAPE-05, SCRAPE-06, SCRAPE-07, SCRAPE-08, SCRAPE-09, SCRAPE-10, ERROR-01, ERROR-02, ERROR-03, ERROR-04, ERROR-05
**Success Criteria** (what must be TRUE):

  1. User can run a scrape and profile URLs are extracted from Facebook Ads Library GraphQL responses
  2. User can provide a proxy argument and the scraper routes browser traffic through it
  3. Scraper logs structured messages with appropriate levels (info for progress, error for failures, debug for details)
  4. Scraper recovers from transient errors (network timeouts, browser crashes) via exponential backoff retry
  5. Partial URL results are saved to disk every 100 URLs or on crash (no data loss)

**Plans:** 4 plans

Plans:

- [ ] 02-01-PLAN.md — Browser layer: cloakbrowser stealth integration, pino logging foundation
- [ ] 02-02-PLAN.md — Extraction layer: GraphQL interception, profile URL extraction, deduplication
- [ ] 02-03-PLAN.md — Error handling: error classification, retry engine, graceful shutdown
- [ ] 02-04-PLAN.md — Scroll loop: adaptive timing, DOM cleanup, end-to-end pipeline wiring

### Phase 3: Output & Delivery

**Goal**: Scrape results are written to timestamped JSON files and webhook notifications are sent to automation workflows on completion
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: OUTPUT-01, OUTPUT-02, OUTPUT-03, WEBHOOK-01, WEBHOOK-02, WEBHOOK-03
**Success Criteria** (what must be TRUE):

  1. User finds a timestamped JSON file (DD-MM-YYYY:HH:MM.query.json) in the output directory after each scrape
  2. Output directory is created automatically if it doesn't exist
  3. Webhook POST is sent to configured endpoint with JSON payload on scrape completion
  4. Webhook failure does not crash the scraper or prevent file output

**Plans**: TBD

Plans:

- [ ] 03-01: File output — timestamped JSON writer, output directory creation, incremental saving
- [ ] 03-02: Webhook output — POST notification, endpoint configuration via presets, error isolation

### Phase 4: Daemon & Validation

**Goal**: The scraper runs reliably as a background daemon with proper process management, and the full system is validated by a comprehensive test suite
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: DAEMON-01, DAEMON-02, DAEMON-03, DAEMON-04, DAEMON-05, TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):

  1. User can start the scraper in daemon mode and it runs in the background with PID tracked in a file
  2. Daemon logs to a file and handles SIGTERM/SIGINT for graceful shutdown
  3. Daemon saves state before exit and can be restarted without conflicts (flock-based PID locking)
  4. Unit tests pass for extraction logic and configuration parsing
  5. Integration tests validate CLI argument parsing and webhook notification behavior

**Plans**: TBD

Plans:

- [ ] 04-01: Daemon mode — child process forking, PID management, flock locking, signal handlers
- [ ] 04-02: Test suite — unit tests (extraction, config), integration tests (CLI, webhook), E2E smoke test

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete    | 2026-07-04 |
| 2. Core Scraper Engine | 0/4 | Not started | - |
| 3. Output & Delivery | 0/2 | Not started | - |
| 4. Daemon & Validation | 0/2 | Not started | - |
