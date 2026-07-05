# Requirements: Facebook Ads Library Scraper

**Defined:** 2026-07-03
**Core Value:** Reliably extract Facebook Ads Library profile URLs at scale without detection, delivering results via JSON files and webhook notifications.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Project Setup

- [x] **SETUP-01**: Project uses Bun-native TypeScript (no Node.js compatibility)
- [x] **SETUP-02**: TypeScript configured with `moduleResolution: "bun"` and `types: ["bun"]`
- [x] **SETUP-03**: Biome configured for linting and formatting (replaces ESLint + Prettier)
- [x] **SETUP-04**: bun:test configured for testing (replaces vitest/jest)
- [x] **SETUP-05**: Package.json has all dependencies with correct versions
- [x] **SETUP-06**: src/ directory structure with proper module boundaries

### Core Scraper

- [ ] **SCRAPE-01**: CLI argument parsing with yargs (query, proxy, max-urls, headless, daemon)
- [ ] **SCRAPE-02**: Input validation for all CLI arguments with clear error messages
- [ ] **SCRAPE-03**: cloakbrowser integration with stealth configuration
- [ ] **SCRAPE-04**: Humanization enabled (humanize: true, humanPreset: 'careful')
- [ ] **SCRAPE-05**: GraphQL response interception via page.on('response')
- [ ] **SCRAPE-06**: Profile URL extraction from nested GraphQL JSON
- [ ] **SCRAPE-07**: Auto-scroll with adaptive timing (wait for network idle)
- [ ] **SCRAPE-08**: DOM cleanup to prevent memory leaks
- [ ] **SCRAPE-09**: Proxy support (HTTP/SOCKS5 with authentication)
- [x] **SCRAPE-10**: Graceful shutdown on SIGINT/SIGTERM

### Configuration

- [x] **CONFIG-01**: Preset-based configuration system (single CLI arg → config.json presets)
- [x] **CONFIG-02**: Config file discovery via cosmiconfig (package.json, .facebook-scraper.json, .config/)
- [x] **CONFIG-03**: Zod schema validation for config files
- [x] **CONFIG-04**: Environment variable support with explicit --env-file flag
- [x] **CONFIG-05**: Example config file tracked in git

### Output

- [ ] **OUTPUT-01**: JSON output to timestamped files (DD-MM-YYYY:HH:MM.query.json)
- [ ] **OUTPUT-02**: Incremental URL saving (every 100 new URLs or on crash)
- [ ] **OUTPUT-03**: Output directory creation if not exists

### Webhook

- [x] **WEBHOOK-01**: Webhook notification on completion (POST JSON payload)
- [x] **WEBHOOK-02**: Webhook endpoints configurable via presets
- [x] **WEBHOOK-03**: Webhook error handling (don't fail scraper if webhook fails)

### Daemon Mode

- [x] **DAEMON-01**: Daemon mode via child process forking
- [x] **DAEMON-02**: PID file management with flock-based locking
- [x] **DAEMON-03**: Proper logging to log file in daemon mode
- [x] **DAEMON-04**: Graceful shutdown handlers (SIGTERM, SIGINT)
- [x] **DAEMON-05**: State saving before exit

### Error Handling

- [ ] **ERROR-01**: Structured logging with pino (levels: fatal, error, warn, info, debug)
- [ ] **ERROR-02**: Error classification (transient, permanent, browser, extraction)
- [ ] **ERROR-03**: Exponential backoff retry for transient errors (p-retry)
- [ ] **ERROR-04**: No silent error swallowing (all catch blocks log)
- [ ] **ERROR-05**: Proxy credential sanitization in logs

### Testing

- [x] **TEST-01**: Unit tests for extraction logic
- [x] **TEST-02**: Unit tests for configuration parsing
- [x] **TEST-03**: Integration tests for CLI argument parsing
- [x] **TEST-04**: Integration tests for webhook notification
- [x] **TEST-05**: E2E tests for full scrape workflow (mocked browser)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Monitoring

- **MONIT-01**: Metrics collection (success rates, latency, data volume)
- **MONIT-02**: Cost per query tracking (proxy usage, browser runtime)
- **MONIT-03**: Prometheus metrics endpoint

### Advanced Features

- **ADVFEAT-01**: Configurable DOM selectors with fallbacks
- **ADVFEAT-02**: Webhook HMAC authentication
- **ADVFEAT-03**: Multiple concurrent queries (horizontal scaling)
- **ADVFEAT-04**: Database storage option
- **ADVFEAT-05**: Real-time streaming output

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multiple concurrent queries | Facebook rate limits per IP; parallel queries increase ban risk |
| Database storage | JSON files sufficient for lead generation; adds complexity |
| Real-time streaming | GraphQL responses come in batches; batch processing fits use case |
| OAuth/social login | Public Ads Library doesn't require auth; login increases detection risk |
| Mobile app | CLI tool for automation workflows; mobile adds platform complexity |
| cloakbrowser replacement | Proven anti-detection; replacing adds risk |
| Automatic CAPTCHA solving | Expensive and unreliable; focus on prevention over solving |
| Browser fingerprint rotation | Frequent changes look suspicious; rotate proxies instead |
| AI-powered extraction | Adds latency and cost; GraphQL interception is more reliable |
| Multi-platform support | Each platform has unique anti-bot systems; scope creep |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Complete |
| SETUP-02 | Phase 1 | Complete |
| SETUP-03 | Phase 1 | Complete |
| SETUP-04 | Phase 1 | Complete |
| SETUP-05 | Phase 1 | Complete |
| SETUP-06 | Phase 1 | Complete |
| CONFIG-01 | Phase 1 | Complete |
| CONFIG-02 | Phase 1 | Complete |
| CONFIG-03 | Phase 1 | Complete |
| CONFIG-04 | Phase 1 | Complete |
| CONFIG-05 | Phase 1 | Complete |
| SCRAPE-01 | Phase 2 | Pending |
| SCRAPE-02 | Phase 2 | Pending |
| SCRAPE-03 | Phase 2 | Pending |
| SCRAPE-04 | Phase 2 | Pending |
| SCRAPE-05 | Phase 2 | Pending |
| SCRAPE-06 | Phase 2 | Pending |
| SCRAPE-07 | Phase 2 | Pending |
| SCRAPE-08 | Phase 2 | Pending |
| SCRAPE-09 | Phase 2 | Pending |
| SCRAPE-10 | Phase 2 | Complete |
| ERROR-01 | Phase 2 | Pending |
| ERROR-02 | Phase 2 | Pending |
| ERROR-03 | Phase 2 | Pending |
| ERROR-04 | Phase 2 | Pending |
| ERROR-05 | Phase 2 | Pending |
| OUTPUT-01 | Phase 3 | Pending |
| OUTPUT-02 | Phase 3 | Pending |
| OUTPUT-03 | Phase 3 | Pending |
| WEBHOOK-01 | Phase 3 | Complete |
| WEBHOOK-02 | Phase 3 | Complete |
| WEBHOOK-03 | Phase 3 | Complete |
| DAEMON-01 | Phase 4 | Complete |
| DAEMON-02 | Phase 4 | Complete |
| DAEMON-03 | Phase 4 | Complete |
| DAEMON-04 | Phase 4 | Complete |
| DAEMON-05 | Phase 4 | Complete |
| TEST-01 | Phase 4 | Complete |
| TEST-02 | Phase 4 | Complete |
| TEST-03 | Phase 4 | Complete |
| TEST-04 | Phase 4 | Complete |
| TEST-05 | Phase 4 | Complete |

**Coverage:**

- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-03*
*Last updated: 2026-07-03 after roadmap creation*
