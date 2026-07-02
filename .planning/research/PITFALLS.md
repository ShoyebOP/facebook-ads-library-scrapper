# Pitfalls Research

**Domain:** Stealth web scraper (Facebook Ads Library)
**Researched:** 2026-07-03
**Confidence:** MEDIUM (websearch-based; findings cross-referenced with project CONCERNS.md)

## Critical Pitfalls

### Pitfall 1: Facebook's Graphical Response Structure Changes Monthly

**What goes wrong:**
The GraphQL `doc_id` and response schema Facebook uses rotate roughly every 4-8 weeks. A scraper that extracts `page_profile_uri` from nested JSON responses breaks silently — no error, just zero results. The page loads perfectly, looks normal, but the underlying API request is never called or returns a different structure.

**Why it happens:**
Meta actively reshapes the Ad Library's internal GraphQL queries. The public URL has been stable for 4+ years, but the backend contract is not. Developers write extraction logic against one response shape and never plan for schema drift.

**How to avoid:**
- Implement defensive null checks on every nested field access (`page_profile_uri`, nested objects)
- Log the full GraphQL response structure periodically (not just errors) to detect drift early
- Add fallback extraction patterns — if primary field is missing, search for known field names
- Build a response shape validator that runs on every scrape and alerts on structural changes
- Keep a snapshot of the last known-good response shape for regression testing

**Warning signs:**
- Scraper returns 0 results for a query that previously returned results
- `page_profile_uri` is `undefined` or missing from intercepted responses
- Network interception catches responses but extraction finds nothing
- Heartbeat logs show scroll activity but URL count stays flat

**Phase to address:** Phase 2 (Browser & Scraper Core) — build defensive extraction from day one

---

### Pitfall 2: Stealth Plugin Patches Are Now Detectable Artifacts

**What goes wrong:**
The `playwright-extra` stealth plugin has not had a meaningful update since March 2023. Its patches target Chrome 109-112 era detection. Modern anti-bot systems (Cloudflare Turnstile, DataDome 2024+, Akamai v4) detect the plugin's own monkey-patches as artifacts. Worse, the plugin does nothing about the `Runtime.enable` CDP leak — a detection vector that exists at the protocol layer, below where JavaScript patches can reach.

**Why it happens:**
Developers assume "stealth plugin = invisible." The plugin was revolutionary in 2020 but the detection arms race moved up the stack. Anti-bot systems now inspect TLS fingerprints, HTTP/2 SETTINGS frames, and CDP transport signals — none of which can be patched from JavaScript.

**How to avoid:**
- Use cloakbrowser (which the project already does) — it patches at the browser binary level, not via JS injection
- Do NOT stack `playwright-extra` stealth on top of cloakbrowser — conflicting patches create detectable inconsistencies
- Test against fingerprint detection tools (CreepJS, bot detection APIs) before production
- Accept that no stealth solution is permanent — budget for quarterly detection testing
- Prefer headed mode in Xvfb over headless for hardened targets

**Warning signs:**
- CAPTCHA challenge rate increases over weeks despite no code changes
- Scraper works locally but fails on VPS
- Cloudflare challenge page appears intermittently
- Browser console shows `navigator.webdriver` is `true` despite stealth patches

**Phase to address:** Phase 1 (Bun Migration) — evaluate cloakbrowser compatibility with Bun early

---

### Pitfall 3: Behavioral Signals Matter More Than Property Patches

**What goes wrong:**
Anti-bot systems score behavioral signals: mouse movement curves, scroll timing, click intervals, and typing rhythm. A scraper with perfect stealth properties but robotic behavior (instant clicks, linear scrolls, uniform timing) gets flagged. The page loads but the data doesn't render because Facebook refuses to serve content to detected automation.

**Why it happens:**
Developers focus on property patching (`navigator.webdriver`, canvas fingerprint, WebGL) and ignore behavioral simulation. Real humans exhibit imperfect mouse curves, variable scroll speeds, micro-pauses in typing, and content-dependent interaction patterns.

**How to avoid:**
- Add realistic mouse movement curves with small tremors and speed variations
- Implement variable scroll timing that pauses to "read" content
- Add micro-pauses between actions (not uniform delays — randomize within human ranges)
- Use network idle detection instead of fixed sleep timers
- Warm up sessions: load a Facebook page first, accept cookies, then hit the Library

**Warning signs:**
- Scraper works for the first few runs then starts failing
- Page loads but GraphQL responses are never intercepted
- Facebook serves the page shell but no ad data loads
- Detection rate increases with session count

**Phase to address:** Phase 2 (Browser & Scraper Core) — humanization must be part of the core scraper

---

### Pitfall 4: Static Sleep Timers Are Engineering Time Bombs

**What goes wrong:**
The current scraper uses a hardcoded 2500ms wait between scrolls. If the server responds in 500ms, you waste 2 seconds per scroll. If the server responds in 3 seconds, your script throws an unhandled exception or scrolls before content loads. Static sleep timers assume constant network latency — which never exists in production.

**Why it happens:**
`page.waitForTimeout(5000)` is the easiest way to "wait for the page." It works during development when your local connection is fast. It fails in production when Facebook's servers are under load, when the proxy adds latency, or when the page loads heavier ad content.

**How to avoid:**
- Use `page.waitForLoadState('networkidle')` instead of fixed delays
- Implement adaptive scroll timing: wait for new DOM content to appear, not for a fixed duration
- Add timeout guards that detect when the page is stuck (no new content for N seconds)
- Use Playwright's built-in actionability checks instead of manual waits
- Implement a "network quiet" detector that waits for request rate to drop below a threshold

**Warning signs:**
- Scraper works fast on good connections but times out on slow ones
- Scroll completes before GraphQL responses arrive
- Inconsistent URL counts across runs with the same query
- DOM cleanup runs on pages that haven't finished loading new content

**Phase to address:** Phase 2 (Browser & Scraper Core) — adaptive timing is core reliability

---

### Pitfall 5: Bun's .env Auto-Loading Creates Silent Configuration Drift

**What goes wrong:**
Bun automatically loads `.env` files without any explicit import. If you build config loading to be explicit (reading `.env` with dotenv or manual parsing), Bun's auto-loading silently overrides your intended behavior. A staging environment accidentally uses production DB credentials for days before anyone notices.

**Why it happens:**
Developers migrating from Node.js expect `dotenv` to be required for env loading. Bun's convenience feature is a footgun when combined with explicit config loading, environment-specific `.env` files, or CI/CD pipelines that set env vars.

**How to avoid:**
- Pass `--env-file=.env` explicitly to `bun run` instead of relying on auto-loading
- Disable auto-loading if you have explicit config management
- Audit all `.env` files in the project and understand the loading order
- Test environment variable behavior in CI before deploying
- Document which env vars are required vs optional

**Warning signs:**
- Tests pass locally but fail in CI (or vice versa)
- Unexpected credentials appearing in error logs
- Configuration values change between runs without code changes
- `.env` file changes take effect without restart

**Phase to address:** Phase 1 (Bun Migration) — audit env loading before any migration

---

### Pitfall 6: Daemon Mode PID Files Create Ghost Processes

**What goes wrong:**
A daemon crashes or is killed with `SIGKILL` (which can't be trapped), leaving a stale PID file. The next `start` command reads the stale PID, checks if a process exists at that PID (OS may have reused it), and either refuses to start (thinking daemon is running) or sends a signal to the wrong process.

**Why it happens:**
PID files are a Unix convention but they're fundamentally racy. The OS can reuse PIDs. `kill -9` and OOM kills don't run cleanup handlers. Hard crashes leave files behind. Without flock-based locking, two start attempts can race.

**How to avoid:**
- Use `flock` on the PID file (or a `.lock` sibling) for atomic exclusive access
- Always verify PID liveness with `process.kill(pid, 0)` wrapped in try/catch
- Store metadata with the PID: start timestamp, command fingerprint
- Check `EPERM` vs `ESRCH` — EPERM means process exists but you lack permission
- Implement a health check endpoint for daemon status verification
- Clean up PID files in SIGTERM/SIGINT handlers AND rely on kernel flock release

**Warning signs:**
- `start` command refuses to run even though no daemon is active
- Stale PID file exists after `kill -9` or system reboot
- Multiple daemon instances running simultaneously
- `status` shows "running" but health check fails

**Phase to address:** Phase 5 (Daemon & Reliability) — PID management must be robust from the start

---

### Pitfall 7: In-Memory URL Storage Loses Everything on Crash

**What goes wrong:**
All collected URLs are stored in a JavaScript `Set` in memory. If the browser crashes, the process is OOM-killed, or an unhandled exception occurs, hours of scraping work are lost. The current scraper only writes to disk at completion — no incremental persistence.

**Why it happens:**
In-memory storage is the simplest implementation. Developers optimize for the happy path and don't account for crash recovery. The scraper works fine in development but production workloads (long scroll sessions, large result sets) increase crash probability.

**How to avoid:**
- Write URLs to disk periodically (e.g., every 100 new URLs or every 30 seconds)
- Use append-only file writes to avoid corruption on crash
- Implement a checkpoint system that records the last successful scroll position
- On restart, load existing URLs from disk and resume from checkpoint
- Consider SQLite (Bun has built-in `bun:sqlite`) for atomic writes and deduplication

**Warning signs:**
- Scraper runs for hours but output file is empty or partial
- Process exits with code 137 (OOM killed)
- Browser console shows memory pressure warnings
- Scroll loop completes but URL count is unexpectedly low

**Phase to address:** Phase 2 (Browser & Scraper Core) — incremental saving is a reliability requirement

---

### Pitfall 8: Facebook Geo-Routes Ads by Source IP Location

**What goes wrong:**
Facebook serves different ad content based on the requesting IP's geographic location. A US-based Lambda returns US-targeted ads even when querying for EU-specific campaigns. The scraper "works" but returns incomplete or wrong data. Debugging is maddening because the code is correct — the data just isn't there for that geography.

**Why it happens:**
Developers test locally (where the IP matches the target geography) and don't realize Facebook geo-routes content. When deployed to cloud infrastructure in a different region, the same code returns different results. Residential proxies help but must be geo-matched to the target country.

**How to avoid:**
- Test with known ad sets from different geographies to verify geo-routing behavior
- Use residential proxies matched to the target country (not just any proxy)
- Log the apparent source IP and compare results across geographies
- Don't assume "works locally" means "works everywhere"
- Add a pre-scrape validation that checks if the expected geography's content is visible

**Warning signs:**
- Scraper returns fewer results than expected for a known active advertiser
- Results differ between local runs and cloud deployment
- Ads from specific countries are consistently missing
- GraphQL responses contain data but not for the expected geography

**Phase to address:** Phase 3 (Configuration & Presets) — country/proxy configuration must be explicit

---

### Pitfall 9: Webhook Signature Verification Fails on Re-Serialized Body

**What goes wrong:**
When adding HMAC webhook authentication, developers verify the signature against the JSON-parsed-and-re-serialized body. JSON serialization isn't deterministic — key ordering, whitespace, and Unicode escaping differ between sender and receiver. The signature never matches, so developers disable verification "to make it work."

**Why it happens:**
Most web frameworks auto-parse JSON bodies before handlers run. By the time you compute HMAC, the raw bytes are gone. The re-serialized JSON differs from the original bytes by even one whitespace character, producing a completely different HMAC.

**How to avoid:**
- Always verify against the raw request body (Buffer/bytes), never re-serialized JSON
- Use `express.raw({ type: 'application/json' })` middleware for webhook routes
- Use `crypto.timingSafeEqual()` — never `===` for signature comparison
- Include timestamp in signed content to prevent replay attacks (5-minute tolerance)
- Store webhook secrets in environment variables, never source code
- Use one secret per environment per endpoint

**Warning signs:**
- "Signature mismatch" error despite copying the secret correctly
- Verification works in testing but fails in production
- Intermittent failures (some events pass, some fail)
- Logs show the secret is being used but HMAC still doesn't match

**Phase to address:** Phase 4 (Webhook & Output) — implement correctly from day one

---

### Pitfall 10: Modularization Creates Circular Dependencies

**What goes wrong:**
When splitting the monolithic `scraper.js` into modules (CLI, browser, scraper, webhook, storage), developers create circular import chains. Module A imports B, B imports C, C imports A. This causes runtime errors, undefined values, or subtle bugs where modules aren't fully initialized when imported.

**Why it happens:**
The single-file architecture has implicit dependencies everywhere. When you extract modules, you discover that the "browser" module needs the "config" module, which needs the "CLI" module, which needs the "storage" module. Without careful dependency direction, cycles form naturally.

**How to avoid:**
- Establish a strict dependency direction: CLI → Config → Browser → Scraper → Output
- Never let lower-level modules import higher-level ones
- Use dependency injection: pass config into browser module, don't import it
- Create a types/interfaces layer that all modules depend on (no runtime deps)
- Draw the dependency graph before writing code
- Use TypeScript interfaces to enforce module boundaries at compile time

**Warning signs:**
- `undefined` values at runtime despite correct initialization order
- Circular dependency warnings from bundler/linter
- Modules fail when imported in different orders
- Test setup requires complex import ordering

**Phase to address:** Phase 1 (Bun Migration) — establish module boundaries before refactoring

---

### Pitfall 11: Testing Scraper Projects Requires Stubbing External Services

**What goes wrong:**
Developers write tests that hit real Facebook endpoints, which are flaky, rate-limited, and change frequently. Tests break not because of code bugs but because Facebook changed something. The test suite becomes a source of noise rather than signal.

**Why it happens:**
Scraper projects have deep external dependencies (browser automation, network interception, third-party APIs). Unit testing the extraction logic requires mocking the entire browser/network stack. Developers skip this because it's complex, then have no test coverage.

**How to avoid:**
- Separate extraction logic (pure functions) from browser automation (side effects)
- Unit test extraction with captured GraphQL response fixtures
- Integration test browser automation with local HTML fixtures, not live Facebook
- E2E test sparingly, with known-good query fixtures that rarely change
- Use Playwright's route interception to mock responses in tests
- Store response snapshots for regression testing

**Warning signs:**
- Tests pass locally but fail in CI (network flakiness)
- Test suite takes 10+ minutes due to real browser/network usage
- Tests break without any code changes (Facebook response drift)
- 0% test coverage because "it's too hard to test scrapers"

**Phase to address:** Phase 6 (Testing) — establish testing patterns early in modularization

---

### Pitfall 12: Hardcoded Webhook URLs in Source Code Expose Automation Endpoints

**What goes wrong:**
Webhook URLs (`automation.zaktomate.com`) are hardcoded in `scraper.js` lines 8-11. If the repository is ever made public (or a contributor gains access), the automation endpoints are exposed. An attacker could send spoofed webhook payloads to trigger unintended actions.

**Why it happens:**
Hardcoding is faster during development. The repo is "private" so it feels safe. But repositories get transferred, contributors join, companies get acquired, and access controls change. Hardcoded secrets in source code are a ticking time bomb.

**How to avoid:**
- Move all webhook URLs to environment variables or config.json
- Add `.env` to `.gitignore` and never commit secrets
- Implement HMAC signature verification on webhook endpoints
- Use a secrets manager for production deployments
- Add a pre-commit hook that scans for hardcoded URLs
- Rotate webhook secrets periodically

**Warning signs:**
- Webhook URLs appear in git history after refactoring
- `.env` file is not in `.gitignore`
- No authentication on webhook endpoints
- Webhook URLs in error messages or logs

**Phase to address:** Phase 3 (Configuration & Presets) — externalize all configuration

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded scroll delay (2500ms) | Simple, predictable timing | Breaks under variable network conditions; causes data loss | Never in production |
| Single-file architecture | Fast to develop, no import complexity | Impossible to test, maintain, or debug independently | MVP only, with explicit plan to refactor |
| In-memory URL Set | Zero config, fast | Hours of work lost on crash | Never for long-running scrapers |
| Silent `catch {}` blocks | No noisy error output | Silent failures impossible to debug | Never — always log at minimum |
| `waitForTimeout(N)` | Easy to reason about | Race conditions, wasted time, fragile tests | Never — use `waitForLoadState` or content detection |
| No input validation | Faster development | Cryptic errors, NaN comparisons, security holes | Never — validate early with clear messages |
| Hardcoded config values | No config file to manage | Requires code changes for new environments | Never — externalize from day one |
| Stealth plugin stacking | "More stealth = safer" | Conflicting patches create detectable artifacts | Never — pick one stealth solution |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Facebook Ads Library | Assuming response structure is stable | Validate response shape on every scrape; alert on drift |
| Facebook Ads Library | Scraping while logged in | Stay logged out — logged-in scraping violates ToS |
| Facebook Ads Library | Using datacenter proxies | Use residential proxies matched to target geography |
| Facebook Ads Library | Ignoring session warmup | Load Facebook homepage first, accept cookies, then scrape |
| cloakbrowser | Stacking with playwright-extra | Never combine — conflicting patches are detectable |
| cloakbrowser | Running headless on hardened targets | Use headed mode in Xvfb for production |
| Webhooks | Verifying parsed JSON body | Verify raw bytes, never re-serialized JSON |
| Webhooks | Using `===` for signature comparison | Always use `crypto.timingSafeEqual()` |
| Webhooks | Hardcoded secrets in source | Environment variables only; rotate on leak |
| Bun | Auto-loading .env files | Pass `--env-file` explicitly; audit env loading order |
| Bun | Using `@types/node` | Remove and use `bun/types` instead |
| Playwright | `page.waitForTimeout(N)` | Use `waitForLoadState('networkidle')` or content detection |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| In-memory URL Set | OOM crash on large result sets | Append to file periodically; use SQLite | >10K URLs per scrape |
| Fixed scroll timing | Data loss on slow connections; wasted time on fast ones | Adaptive timing with network idle detection | Any non-trivial network variability |
| Aggressive DOM cleanup every scroll | CPU waste; cleanup on pages that haven't loaded | Only cleanup when new URLs found; increase threshold | >100 scroll iterations |
| No connection pooling for webhooks | HTTP connection overhead per webhook call | Use shared agent with keep-alive | >10 webhook calls per scrape |
| Single-threaded scraping | Cannot parallelize; throughput limited by single browser | Worker threads for independent queries | Need to scale beyond one query at a time |
| No incremental persistence | Complete data loss on any crash | Write to disk every N URLs or T seconds | Any production workload |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Hardcoded webhook URLs in source | Automation endpoints exposed if repo goes public | Move to environment variables; add pre-commit scanning |
| No webhook authentication | Spoofed payloads trigger unintended actions | HMAC-SHA256 signature verification with timestamp validation |
| Proxy credentials in logs/error messages | Credential leakage in debug output | Sanitize proxy URL before logging; mask credentials |
| Shared webhook secret across environments | Test secret leak compromises production | One secret per environment per endpoint |
| `===` for signature comparison | Timing attack allows signature reconstruction | Always use `crypto.timingSafeEqual()` |
| No HTTPS verification for webhooks | MITM attacks on webhook traffic | Explicitly verify TLS certificates |
| Scraping while logged in | ToS violation; risk of account action | Stay logged out; public Ads Library doesn't require auth |
| No rate limiting on scrape runs | IP bans; CAPTCHA escalation | Implement backoff with jitter; respect 429 responses |

## UX Pitfalls

Common user experience mistakes in this domain (CLI tool for automation).

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Cryptic error messages on invalid input | User has no idea what went wrong | Validate all CLI args with clear, actionable error messages |
| No progress indication during long scrapes | User thinks scraper is frozen | Heartbeat logs with URL count, scroll count, elapsed time |
| Silent failure modes | Scraper "completes" with empty output | Always log exit reason; exit non-zero on failure |
| No output on what was scraped | User doesn't know if results are complete | Summary: query, URL count, duration, file path |
| Daemon mode with no status command | User can't tell if daemon is running | `status` command with PID check and health endpoint |
| Hardcoded country/callback | User must edit source for different configs | Preset-based configuration via config.json |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Stealth browser automation:** Works locally but may fail on VPS — verify with fingerprint detection tools (CreepJS)
- [ ] **Webhook notification:** Sends POST but has no authentication — verify HMAC is implemented before production
- [ ] **Daemon mode:** Forks child process but PID management is fragile — verify stale PID handling after `kill -9`
- [ ] **GraphQL interception:** Captures responses but assumes fixed schema — verify defensive null checks exist
- [ ] **Input validation:** Parses CLI args but doesn't validate — verify all args have type/range checks
- [ ] **Error handling:** Has try/catch blocks but catches nothing — verify all catch blocks log the error
- [ ] **Scroll loop:** Scrolls and waits but timing is fixed — verify adaptive timing is implemented
- [ ] **URL deduplication:** Uses Set but no persistence — verify incremental saves exist
- [ ] **Configuration:** Reads from CLI args but has hardcoded values — verify all config is externalized
- [ ] **Logging:** Uses console.log but no structured logging — verify log levels and structured output

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Facebook schema change | HIGH | Capture new response shape, update extraction logic, test with fixtures |
| Stealth detection increase | MEDIUM | Test fingerprint with CreepJS, evaluate cloakbrowser config, consider headed mode |
| Daemon PID corruption | LOW | Delete stale PID file, verify no orphan processes, restart |
| Webhook signature failure | LOW | Check raw body handling, verify secret in env vars, test with captured payload |
| Crash data loss | HIGH | Implement incremental saves, add crash recovery on restart |
| Module circular dependency | MEDIUM | Draw dependency graph, inject dependencies, enforce direction |
| Test suite breakage | MEDIUM | Mock external services, use response fixtures, separate unit from E2E |
| Config drift between environments | LOW | Audit .env files, add env validation on startup, use config schema |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Facebook schema drift | Phase 2 (Browser & Scraper Core) | Response shape validator runs on every scrape; alerts on structural changes |
| Stealth plugin stacking | Phase 1 (Bun Migration) | Audit dependency tree; verify no stealth plugins beyond cloakbrowser |
| Behavioral signals ignored | Phase 2 (Browser & Scraper Core) | Humanization checklist: mouse curves, variable scroll, micro-pauses |
| Static sleep timers | Phase 2 (Browser & Scraper Core) | No `waitForTimeout` calls; all waits use `waitForLoadState` or content detection |
| Bun .env auto-loading | Phase 1 (Bun Migration) | CI tests verify env loading behavior; `--env-file` used explicitly |
| Daemon PID corruption | Phase 5 (Daemon & Reliability) | Stale PID handling test: create PID file, kill process, verify restart works |
| In-memory data loss | Phase 2 (Browser & Scraper Core) | Crash recovery test: kill process mid-scrape, verify output file has partial data |
| Geo-routing surprises | Phase 3 (Configuration & Presets) | Cross-geography test with known ad sets |
| Webhook signature failure | Phase 4 (Webhook & Output) | HMAC test with captured raw payload; timing-safe comparison verified |
| Circular module dependencies | Phase 1 (Bun Migration) | Dependency graph review; no cycles in import tree |
| Testing anti-patterns | Phase 6 (Testing) | Unit tests use fixtures; integration tests mock browser; E2E is minimal |
| Hardcoded secrets | Phase 3 (Configuration & Presets) | Pre-commit hook scans for hardcoded URLs; env vars required for all config |

## Sources

- "Building a Facebook Ad Library Scraper: API Limits and the Real Approach" — DEV Community (2026-06-13)
- "Meta Ad Library API and Scraping: A Developer's Guide for 2026" — Hyper AI (2026-04-25)
- "Meta Ad Scraper: How to Pull Every Ad from the Facebook Ad Library" — AdScrape (2026-04-12)
- "Scraping Facebook Is Hard. But Not Impossible." — Prashant B. (2026-05-07)
- "Why Every Facebook Ad Library Scraper Breaks" — AdMakeAI (2025-12-13)
- "Stop Building Fragile Bots: Engineering Reliable Browser Automations" — Nova Pixel (2026-06-11)
- "Why Playwright Gets Blocked on VPS" — VoyraCloud (2026-06-17)
- "Playwright Stealth: What Works in 2026 and Where It Falls Short" — Cloak (2026-03-26)
- "Stealth Playwright Puppeteer 2026" — JustBrowser (2026-05-30)
- "puppeteer-extra-plugin-stealth" — GitHub (berstend)
- "Does puppeteer-extra Stealth Still Work in 2026?" — APISerpent (2026-06-16)
- "Best Playwright Stealth 2026: Patchright vs Camoufox vs noDriver" — Scrapewise (2026-04-20)
- "Bun 1.2 in Production: What Actually Broke When We Migrated from Node" — DEV Community (2026-04-21)
- "Bun Compatibility in 2026: What Actually Works" — DEV Community (2026-03-11)
- "Running a Node.js Daemon with Fastify" — DEV Community (2026-03-19)
- "PID Files" — Digital Garden (Bhekani)
- "Webhook Security: Verifying Signatures and Preventing Replay Attacks" — WebhookStream (2026-03-24)
- "Webhook Security: HMAC Verification Guide" — HookSense (2026-03-08)
- Project CONCERNS.md — 2026-06-29
- Project ARCHITECTURE.md — 2026-06-29

---
*Pitfalls research for: Facebook Ads Library Scraper*
*Researched: 2026-07-03*
