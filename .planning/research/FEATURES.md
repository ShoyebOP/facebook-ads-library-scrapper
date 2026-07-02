# Feature Research

**Domain:** Stealth Web Scraper (Facebook Ads Library)
**Researched:** 2026-07-03
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Anti-detection browser automation** | Core value proposition; without it, scraper fails on Facebook | HIGH | Must include fingerprint spoofing, webdriver flag removal, plugin mocking, canvas/WebGL noise |
| **GraphQL response interception** | Facebook Ads Library uses GraphQL; DOM scraping is fragile | MEDIUM | Intercept `graphql` responses, parse nested JSON, extract `page_profile_uri` field |
| **JSON output to files** | Standard data format for downstream processing | LOW | Timestamped files like `DD-MM-YYYY:HH:MM.query.json` |
| **CLI argument parsing** | Users need to configure queries, proxies, limits | LOW | Use yargs for type-safe parsing with validation |
| **Webhook notification** | Integration with automation workflows (n8n, Zapier, custom) | MEDIUM | POST JSON payload to configured endpoint on completion |
| **Proxy support** | Residential proxies required to avoid IP bans | MEDIUM | HTTP/SOCKS5 proxy with authentication |
| **Input validation** | Prevent cryptic errors from invalid arguments | LOW | Validate proxy URLs, numeric limits, required fields |
| **Structured logging** | Debug production issues, audit trails | LOW | Use pino with levels (fatal, error, warn, info, debug, trace) |
| **Error handling** | Graceful failure instead of silent crashes | MEDIUM | Retry transient errors, fail fast on permanent ones |
| **Daemon mode** | Background execution for scheduled scraping | MEDIUM | PID management, proper logging, restart capability |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Humanization presets** | Mimic real user behavior (mouse movements, typing, scrolling) | HIGH | Use cloakbrowser's `humanize: true` with `humanPreset: 'careful'` |
| **Adaptive scroll timing** | Wait for network idle instead of fixed delays | MEDIUM | Detect new content before scrolling; avoid wasted cycles |
| **Preset-based configuration** | Single CLI arg selects pre-configured profiles | MEDIUM | `config.json` with presets like "quick-scan", "deep-research", "stealth-max" |
| **Incremental URL saving** | Periodic writes prevent data loss on crash | LOW | Write every 100 new URLs or on crash handler |
| **Webhook HMAC authentication** | Verify webhook integrity, prevent spoofing | LOW | Sign payloads with shared secret |
| **Configurable DOM selectors** | Adapt to Facebook layout changes without code edits | MEDIUM | Fallback selectors for `[role="row"]` and other critical elements |
| **Exponential backoff retry** | Handle transient network errors automatically | LOW | Use p-retry with jitter to avoid retry storms |
| **Proxy credential sanitization** | Prevent credentials in logs/error messages | LOW | Mask `user:pass` in proxy URLs before logging |
| **Metrics collection** | Track success rates, latency, data volume | MEDIUM | Expose Prometheus metrics or structured log events |
| **Cost per query tracking** | Know how much each scrape costs (proxy, compute) | MEDIUM | Track proxy usage, browser runtime, API calls |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Multiple concurrent queries** | "Scrape faster" | Facebook rate limits per IP; parallel queries increase ban risk | Single-threaded by design; scale horizontally with separate processes |
| **Database storage** | "Persistent storage" | Adds complexity; JSON files sufficient for lead generation | Keep JSON output; let users implement their own storage |
| **Real-time streaming** | "Instant results" | GraphQL responses come in batches; streaming adds complexity | Batch processing fits use case; webhook on completion |
| **OAuth/social login** | "Access more data" | Public Ads Library doesn't require auth; login increases detection risk | No auth required; public data only |
| **Mobile app** | "Scrape on the go" | CLI tool for automation workflows; mobile adds platform complexity | CLI tool for automation; mobile not needed |
| **cloakbrowser replacement** | "Use Playwright directly" | cloakbrowser provides proven anti-detection; replacing adds risk | Keep existing anti-detection package |
| **Automatic CAPTCHA solving** | "Never get blocked" | CAPTCHA solving services are expensive and unreliable | Focus on prevention (humanization, proxies) over solving |
| **Browser fingerprint rotation** | "Change identity per request" | Frequent fingerprint changes look suspicious | Consistent fingerprint per session; rotate proxies instead |
| **AI-powered extraction** | "Smart parsing" | Adds latency and cost; GraphQL interception is more reliable | Keep GraphQL interception; AI as optional enhancement later |
| **Multi-platform support** | "Scrape LinkedIn, Twitter too" | Each platform has unique anti-bot systems; scope creep | Focus on Facebook Ads Library excellence |

## Feature Dependencies

```
[Anti-detection browser automation]
    └──requires──> [cloakbrowser integration]
                       └──requires──> [Playwright setup]

[GraphQL response interception]
    └──requires──> [Network request interception]
                       └──requires──> [Browser automation]

[Humanization presets]
    └──requires──> [cloakbrowser humanize config]
                       └──requires──> [Anti-detection browser automation]

[Webhook notification]
    └──requires──> [HTTP client]
    └──enhances──> [JSON output]

[Preset-based configuration]
    └──requires──> [Config file loading]
    └──requires──> [CLI argument parsing]

[Structured logging]
    └──requires──> [pino setup]
    └──enhances──> [Error handling]

[Daemon mode]
    └──requires──> [Process management]
    └──requires──> [Structured logging]
    └──requires──> [PID management]

[Incremental URL saving]
    └──requires──> [File I/O]
    └──enhances──> [Error handling] (crash recovery)

[Exponential backoff retry]
    └──requires──> [p-retry library]
    └──enhances──> [Error handling]

[Metrics collection]
    └──requires──> [Structured logging]
    └──requires──> [Performance instrumentation]
```

### Dependency Notes

- **Anti-detection browser automation requires cloakbrowser:** cloakbrowser provides the stealth patches; without it, Facebook detects automation
- **GraphQL response interception requires browser automation:** Must intercept network requests from within the browser context
- **Humanization presets require cloakbrowser humanize config:** cloakbrowser's `humanize: true` with `humanConfig` provides mouse, keyboard, and scroll humanization
- **Webhook notification enhances JSON output:** Webhook delivers results to automation workflows; JSON files serve as backup/archive
- **Preset-based configuration requires CLI parsing:** Presets selected via CLI args; config.json defines preset values
- **Structured logging enhances error handling:** pino provides structured logs for debugging; error handling uses logs for audit trails
- **Daemon mode requires process management:** Must handle PID files, signal handlers, and restart capability
- **Incremental URL saving enhances error handling:** Periodic writes prevent data loss on crash; crash handler writes remaining URLs

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Anti-detection browser automation** — Core value; without it, scraper fails
- [ ] **GraphQL response interception** — Data extraction method for Facebook Ads Library
- [ ] **JSON output to files** — Standard output format for downstream processing
- [ ] **CLI argument parsing** — User configuration interface
- [ ] **Proxy support** — Required to avoid IP bans at scale
- [ ] **Input validation** — Prevent cryptic errors
- [ ] **Error handling** — Graceful failure instead of silent crashes
- [ ] **Structured logging** — Debug production issues

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Webhook notification** — Integration with automation workflows
- [ ] **Humanization presets** — Improve stealth with mouse/typing/scroll humanization
- [ ] **Preset-based configuration** — Simplify CLI usage
- [ ] **Daemon mode** — Background execution for scheduled scraping
- [ ] **Incremental URL saving** — Prevent data loss on crash
- [ ] **Exponential backoff retry** — Handle transient errors automatically
- [ ] **Adaptive scroll timing** — Wait for network idle instead of fixed delays

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Metrics collection** — Track success rates, latency, data volume
- [ ] **Cost per query tracking** — Know how much each scrape costs
- [ ] **Configurable DOM selectors** — Adapt to Facebook layout changes
- [ ] **Webhook HMAC authentication** — Verify webhook integrity
- [ ] **Proxy credential sanitization** — Prevent credentials in logs

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Anti-detection browser automation | HIGH | HIGH | P1 |
| GraphQL response interception | HIGH | MEDIUM | P1 |
| JSON output to files | HIGH | LOW | P1 |
| CLI argument parsing | HIGH | LOW | P1 |
| Proxy support | HIGH | MEDIUM | P1 |
| Input validation | MEDIUM | LOW | P1 |
| Error handling | HIGH | MEDIUM | P1 |
| Structured logging | MEDIUM | LOW | P1 |
| Webhook notification | HIGH | MEDIUM | P2 |
| Humanization presets | HIGH | HIGH | P2 |
| Preset-based configuration | MEDIUM | MEDIUM | P2 |
| Daemon mode | MEDIUM | MEDIUM | P2 |
| Incremental URL saving | MEDIUM | LOW | P2 |
| Exponential backoff retry | MEDIUM | LOW | P2 |
| Adaptive scroll timing | MEDIUM | MEDIUM | P2 |
| Metrics collection | LOW | MEDIUM | P3 |
| Cost per query tracking | LOW | MEDIUM | P3 |
| Configurable DOM selectors | LOW | MEDIUM | P3 |
| Webhook HMAC authentication | LOW | LOW | P3 |
| Proxy credential sanitization | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Apify Facebook Ads Scraper | Anansi (Self-Healing) | Stealth Browser Router | Our Approach |
|---------|---------------------------|----------------------|------------------------|--------------|
| Anti-detection | Built-in residential proxy | TLS fingerprint mimicry, auto browser upgrade | Multi-engine router (nodriver, curl_cffi, camoufox) | cloakbrowser with humanization presets |
| Data extraction | GraphQL API directly | CSS selectors with auto-healing | HTTP fingerprint impersonation | GraphQL interception with fallback selectors |
| Output formats | JSON, CSV, Excel | JSON, JSONL | JSON | JSON only (sufficient for lead generation) |
| Delivery mechanisms | API download, S3, webhooks | MCP server for LLM integration | Webhook callbacks | Webhook notification + JSON files |
| Configuration | Actor input schema | Environment variables | YAML config | Preset-based config.json |
| Monitoring | Built-in dashboard | Anomaly detection | Block detection with vendor hints | Structured logging + metrics (future) |
| Error handling | Automatic retries | Self-healing selectors | Engine fallback on failure | Exponential backoff + retry logic |
| Daemon mode | Managed platform | CLI + scheduled re-crawling | Continuous operation | Daemon mode with PID management |

## Sources

- **Use Apify (2026-03-19):** Web Scraping Anti-Detection Techniques reference - HIGH confidence
- **Anansi GitHub (2026-05-14):** Self-healing web scraper with TLS fingerprinting - HIGH confidence
- **Browserless (2026-03-13):** Anti-Detection Techniques in 2026 guide - HIGH confidence
- **Stealth Scraper Playwright (2026-03-29):** Production-grade stealth scraping pipeline - HIGH confidence
- **HyperFX (2026-04-25):** Meta Ad Library API and Scraping guide - HIGH confidence
- **Apify Facebook Ads Scraper (2026-04-17):** 57 fields per ad scraper - HIGH confidence
- **Bright Data Docs:** Delivery options for web scrapers - MEDIUM confidence
- **ScrapingAnt (2025-12-01):** Web Scraping Observability guide - MEDIUM confidence
- **Webscraper.uk (2026-01-05):** Monitoring & Observability for Web Scrapers - MEDIUM confidence
- **Webscraper.uk (2026-06-10):** Web Scraping Error Handling Checklist - HIGH confidence
- **Rayobyte (2026-04-01):** Web Scraping Error Handling: Retries, Backoff & Best Practices - HIGH confidence
- **ScrapeTL GitHub:** Scraper management & orchestration platform - MEDIUM confidence
- **ScrapeGoat GitHub:** Enterprise-grade web scraping toolkit - MEDIUM confidence

---
*Feature research for: Stealth Web Scraper (Facebook Ads Library)*
*Researched: 2026-07-03*