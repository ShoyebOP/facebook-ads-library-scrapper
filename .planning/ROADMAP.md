# Roadmap: Facebook Ads Library Scraper

## Overview

Rewrite a monolithic 260-line Facebook Ads Library scraper into a modular, production-grade Bun-native TypeScript CLI tool. The journey starts with project foundation (Bun setup, module structure, configuration system), moves through the core scraper engine (anti-detection browser automation, GraphQL interception, error handling), then adds output delivery (timestamped JSON files, webhook notifications), and finishes with daemon mode reliability and comprehensive testing.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Bun-native TypeScript project setup, module structure, and preset-based configuration system (completed 2026-07-04)
- [x] **Phase 2: Core Scraper Engine** - Anti-detection browser automation, GraphQL interception, profile URL extraction, and error handling (completed 2026-07-05)
- [x] **Phase 3: Output & Delivery** - Timestamped JSON file output, incremental saving, and webhook notification system (completed 2026-07-05)
- [x] **Phase 4: Daemon & Validation** - Background daemon mode with PID management and comprehensive test suite (completed 2026-07-05)

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

### Phase 01.1: Entry Point & Cleanup (INSERTED)

**Goal:** CLI usability improvement — make the scraper runnable from project root, add custom ad library URL per preset, clean up legacy files, and create comprehensive documentation
**Requirements**: SETUP-01, CONFIG-01, CONFIG-05
**Depends on:** Phase 1
**Plans:** 1/1 plans complete

Plans:

- [ ] 01.1-PLAN.md

- [x] 01.1-01-PLAN.md — Entry point setup, config schema extension, pipeline wiring, legacy cleanup, and README

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

**Plans:** 4/4 plans complete

Plans:

- [x] 02-01-PLAN.md — Browser layer: cloakbrowser stealth integration, pino logging foundation
- [x] 02-02-PLAN.md — Extraction layer: GraphQL interception, profile URL extraction, deduplication
- [x] 02-03-PLAN.md — Error handling: error classification, retry engine, graceful shutdown
- [x] 02-04-PLAN.md — Scroll loop: adaptive timing, DOM cleanup, end-to-end pipeline wiring

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

**Plans:** 2/2 plans complete

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Output module: types, timestamped JSON writer, directory creation, incremental saving, tests

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-02-PLAN.md — Webhook module: HTTP POST with retry, pipeline wiring, integration tests

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

**Plans:** 3/3 plans complete

Plans:

- [x] 04-PLAN.md

- [x] 04-01-PLAN.md — Daemon mode: child process forking, PID management, flock locking, signal handlers, CLI integration
- [x] 04-02-PLAN.md — Comprehensive test suite: unit/integration/E2E tests with 70% coverage, test fixtures, bunfig.toml

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete    | 2026-07-04 |
| 1.1. Entry Point & Cleanup | 1/1 | Complete   | 2026-07-05 |
| 2. Core Scraper Engine | 4/4 | Complete   | 2026-07-05 |
| 3. Output & Delivery | 2/2 | Complete   | 2026-07-05 |
| 4. Daemon & Validation | 3/3 | Complete    | 2026-07-05 |
| 5. Fix milestone gaps | 2/2 | Complete    | 2026-07-05 |

### Phase 5: Fix milestone gaps: daemon infinite fork, shutdown handlers, incremental saver

**Goal:** Fix critical bugs that prevent daemon mode from working: infinite fork loop, unhandled shutdown signals, and unused incremental saver that causes data loss on crashes
**Requirements:** DAEMON-01, DAEMON-04, SCRAPE-10, OUTPUT-02
**Depends on:** Phase 4
**Plans:** 2/2 plans complete

Plans:

- [x] 05-01-PLAN.md — Daemon fork prevention (env var), CLI proxy validation, type prep
- [x] 05-02-PLAN.md — Shutdown handler wiring, incremental saver integration

### Phase 6: Milestone v1.0 — Gaps Found. Score: 32/42 requirements satisfied. Unsatisfied: SETUP-05, SETUP-06, CONFIG-05, SCRAPE-01, SCRAPE-02, OUTPUT-01, OUTPUT-03, WEBHOOK-01, WEBHOOK-02, WEBHOOK-03. Cross-Phase Issues: setupShutdownHandler-orphaned, dependency-placement, module-resolution-mismatch, test-duplication. Broken Flows: non-daemon-shutdown.

**Goal:** Fix all v1.0 milestone gaps — resolve 4 integration warnings, wire non-daemon shutdown, consolidate tests, clean dead code, implement --env-file, and create retroactive verification for 10 orphaned requirements
**Requirements**: SETUP-02, SETUP-05, SETUP-06, CONFIG-05, SCRAPE-01, SCRAPE-02, OUTPUT-01, OUTPUT-03, WEBHOOK-01, WEBHOOK-02, WEBHOOK-03, DAEMON-04, SCRAPE-10
**Depends on:** Phase 5
**Plans:** 2/2 plans complete

Plans:

- [x] 06-01-PLAN.md — Fix integration warnings (dependency placement, module resolution, shutdown wiring, dead code, --callback override)
- [x] 06-02-PLAN.md — Test consolidation, dead types cleanup, --env-file implementation, retroactive verification documentation

### Phase 7: Daemon actions not working and daemon logs not being saved and tests still saving files in output folder and not cleaned

**Goal:** Fix three daemon-mode bugs: daemon management commands (stop/status/logs) fail because yargs requires --query, daemon logs are not written to a file, and tests leave artifacts in project root
**Requirements**: DAEMON-01, DAEMON-02, DAEMON-03, DAEMON-04, DAEMON-05, TEST-01, TEST-02
**Depends on:** Phase 6
**Plans:** 3/3 plans complete

Plans:

- [x] 07-01-PLAN.md — Standalone daemon-actions script, log file piping, test isolation fix
- [x] 07-02-PLAN.md — Gap closure: polling stop loop, child-process log writing, file path threading, test isolation
- [x] 07-03-PLAN.md — Gap closure: fix shutdown URL saving (non-daemon handler registration, shared URL container wiring)

### Phase 8: Logs are not terminal friendly and ugly raw logs everywhere

**Goal:** Transform raw pino JSON log output into polished, human-readable formatted text using pino-pretty stream API for both CLI and daemon mode
**Requirements**: ERROR-01, ERROR-05
**Depends on:** Phase 7
**Plans:** 1/1 plans complete

Plans:

- [x] 08-01-PLAN.md — Install pino-pretty, rewrite logger.ts with stream API, update completion message format

### Phase 08.1: Add verbose logging for scroll metrics, URL filtering counts, and stopping reason diagnostics (INSERTED)

**Goal:** Add detailed diagnostic logging to help debug scraper behavior — per-scroll metrics (scroll height, URLs found, filtered count, running total), URL filtering breakdown, and a full stopping reason diagnostic snapshot
**Requirements**: ERROR-01
**Depends on:** Phase 8
**Plans:** 3/3 plans complete

Plans:

- [x] 08.1-01-PLAN.md — Per-scroll metrics, filtered URL counts, stopping reason diagnostic
- [x] 08.1-02-PLAN.md — Gap closure: fix scrollHeight, found, unique metric calculations
- [x] 08.1-03-PLAN.md — Gap closure: heartbeat per-beat detail, final summary on all exit paths
