# Requirements: Facebook Ads Library Scraper

**Defined:** 2026-07-03
**Core Value:** Reliably extract Facebook Ads Library profile URLs at scale without detection, delivering results via JSON files and webhook notifications.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Project Setup

- [ ] **SETUP-01**: Project uses Bun-native TypeScript (no Node.js compatibility)
- [ ] **SETUP-02**: TypeScript configured with `moduleResolution: "bun"` and `types: ["bun"]`
- [ ] **SETUP-03**: Biome configured for linting and formatting (replaces ESLint + Prettier)
- [ ] **SETUP-04**: bun:test configured for testing (replaces vitest/jest)
- [ ] **SETUP-05**: Package.json has all dependencies with correct versions
- [ ] **SETUP-06**: src/ directory structure with proper module boundaries

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
- [ ] **SCRAPE-10**: Graceful shutdown on SIGINT/SIGTERM

### Configuration

- [ ] **CONFIG-01**: Preset-based configuration system (single CLI arg → config.json presets)
- [ ] **CONFIG-02**: Config file discovery via cosmiconfig (package.json, .facebook-scraper.json, .config/)
- [ ] **CONFIG-03**: Zod schema validation for config files
- [ ] **CONFIG-04**: Environment variable support with explicit --env-file flag
- [ ] **CONFIG-05**: Example config file tracked in git

### Output

- [ ] **OUTPUT-01**: JSON output to timestamped files (DD-MM-YYYY:HH:MM.query.json)
- [ ] **OUTPUT-02**: Incremental URL saving (every 100 new URLs or on crash)
- [ ] **OUTPUT-03**: Output directory creation if not exists

### Webhook

- [ ] **WEBHOOK-01**: Webhook notification on completion (POST JSON payload)
- [ ] **WEBHOOK-02**: Webhook endpoints configurable via presets
- [ ] **WEBHOOK-03**: Webhook error handling (don't fail scraper if webhook fails)

### Daemon Mode

- [ ] **DAEMON-01**: Daemon mode via child process forking
- [ ] **DAEMON-02**: PID file management with flock-based locking
- [ ] **DAEMON-03**: Proper logging to log file in daemon mode
- [ ] **DAEMON-04**: Graceful shutdown handlers (SIGTERM, SIGINT)
- [ ] **DAEMON-05**: State saving before exit

### Error Handling

- [ ] **ERROR-01**: Structured logging with pino (levels: fatal, error, warn, info, debug)
- [ ] **ERROR-02**: Error classification (transient, permanent, browser, extraction)
- [ ] **ERROR-03**: Exponential backoff retry for transient errors (p-retry)
- [ ] **ERROR-04**: No silent error swallowing (all catch blocks log)
- [ ] **ERROR-05**: Proxy credential sanitization in logs

### Testing

- [ ] **TEST-01**: Unit tests for extraction logic
- [ ] **TEST-02**: Unit tests for configuration parsing
- [ ] **TEST-03**: Integration tests for CLI argument parsing
- [ ] **TEST-04**: Integration tests for webhook notification
- [ ] **TEST-05**: E2E tests for full scrape workflow (mocked browser)

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
| SETUP-01 | Phase 1 | Pending |
| SETUP-02 | Phase 1 | Pending |
| SETUP-03 | Phase 1 | Pending |
| SETUP-04 | Phase 1 | Pending |
| SETUP-05 | Phase 1 | Pending |
| SETUP-06 | Phase 1 | Pending |
| CONFIG-01 | Phase 1 | Pending |
| CONFIG-02 | Phase 1 | Pending |
| CONFIG-03 | Phase 1 | Pending |
| CONFIG-04 | Phase 1 | Pending |
| CONFIG-05 | Phase 1 | Pending |
| SCRAPE-01 | Phase 2 | Pending |
| SCRAPE-02 | Phase 2 | Pending |
| SCRAPE-03 | Phase 2 | Pending |
| SCRAPE-04 | Phase 2 | Pending |
| SCRAPE-05 | Phase 2 | Pending |
| SCRAPE-06 | Phase 2 | Pending |
| SCRAPE-07 | Phase 2 | Pending |
| SCRAPE-08 | Phase 2 | Pending |
| SCRAPE-09 | Phase 2 | Pending |
| SCRAPE-10 | Phase 2 | Pending |
| ERROR-01 | Phase 2 | Pending |
| ERROR-02 | Phase 2 | Pending |
| ERROR-03 | Phase 2 | Pending |
| ERROR-04 | Phase 2 | Pending |
| ERROR-05 | Phase 2 | Pending |
| OUTPUT-01 | Phase 3 | Pending |
| OUTPUT-02 | Phase 3 | Pending |
| OUTPUT-03 | Phase 3 | Pending |
| WEBHOOK-01 | Phase 3 | Pending |
| WEBHOOK-02 | Phase 3 | Pending |
| WEBHOOK-03 | Phase 3 | Pending |
| DAEMON-01 | Phase 4 | Pending |
| DAEMON-02 | Phase 4 | Pending |
| DAEMON-03 | Phase 4 | Pending |
| DAEMON-04 | Phase 4 | Pending |
| DAEMON-05 | Phase 4 | Pending |
| TEST-01 | Phase 4 | Pending |
| TEST-02 | Phase 4 | Pending |
| TEST-03 | Phase 4 | Pending |
| TEST-04 | Phase 4 | Pending |
| TEST-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-03*
*Last updated: 2026-07-03 after roadmap creation*