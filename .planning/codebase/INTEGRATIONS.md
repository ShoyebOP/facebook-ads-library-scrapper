# External Integrations

**Analysis Date:** 2026-07-07

## APIs & External Services

**Facebook Ads Library:**
- Primary data source for scraping profile URLs
- Accessed via stealth browser automation (not direct API)
- URL pattern: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q={query}` (`src/scraper.ts:12-13`)
- GraphQL responses intercepted via Playwright response listener (`src/extractor.ts:33-64`)
- Data extracted: `page_profile_uri` fields from nested GraphQL JSON responses (`src/extractor.ts:10-17`)

**Webhook Endpoints (Outgoing):**
- HTTP/HTTPS POST notifications sent after scraping completes
- Client selection based on URL protocol: `http` or `https` module (`src/webhook.ts:41`)
- JSON payload: `{ query: string, outputFile: string, count: number }` (`src/types.ts:49-53`)
- Default timeout: 10 seconds (`src/webhook.ts:17`)
- Retry policy: 2 retries (3 total attempts) via p-retry (`src/webhook.ts:21`)
- 5xx responses trigger retry; 4xx responses abort immediately (`src/webhook.ts:57-75`)
- Configured via preset callback URLs in `config.json` (`src/config.ts:72-81`)
- Example endpoints from `config.json`:
  - `https://example.com/webhook/leadgen` (leadgen preset)
  - `https://automation.zaktomate.com/webhook/leadgen-zaktomate` (zaktomate preset)

## Data Storage

**Databases:**
- None — No database used

**File Storage:**
- Local filesystem only
- Output directory: `output/` (gitignored, created at runtime)
- Output format: JSON files with timestamped names
  - Pattern: `output/DD-MM-YYYY:HH:MM.{query}.json` (`src/output.ts:14-19`)
  - Content: Array of unique profile URL strings
- Incremental saves: Every 100 URLs by default during scraping (`src/output.ts:40`)
- Final save: Overwrites file with complete URL set after scraping (`src/output.ts:30-33`)

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None — Facebook Ads Library is a public page. No authentication required.
- Stealth browser handles session/cookie management via cloakbrowser's anti-detection features

## Monitoring & Observability

**Error Tracking:**
- None — No external error tracking service (Sentry, etc.)

**Logs:**
- Structured JSON logging via pino (`src/logger.ts`)
- Log level: Configurable via `LOG_LEVEL` env var, defaults to `info` (`src/logger.ts:9`)
- Child loggers with module context: `browser`, `scroll`, `extractor`, `webhook` (`src/browser.ts:12`, `src/scraper.ts:48`, `src/extractor.ts:38`, `src/webhook.ts:34`)
- Credential redaction: `proxy` and `*.proxy` fields automatically redacted (`src/logger.ts:10`)
- Heartbeat logging: Status updates every 30 seconds during scroll loop even with no new data (`src/scraper.ts:136-141`)
- Daemon mode: Logs written to `daemon.log` file (`src/daemon.ts:75`)

## CI/CD & Deployment

**Hosting:**
- Not configured — Designed for local/CLI execution

**CI Pipeline:**
- None configured in repository

## Environment Configuration

**Required env vars:**
- None strictly required
- `LOG_LEVEL` — Optional, defaults to `info`

**Optional env vars:**
- `SCRAPER_DAEMON_CHILD` — Internal marker for forked daemon processes, set automatically (`src/daemon.ts:81`)

**Secrets location:**
- No secrets required
- Proxy credentials can be embedded in proxy URL or passed via CLI flag
- Webhook URLs stored in `config.json` (gitignored) — contains callback endpoints

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- POST notification to webhook URL after scraping completes
- Triggered in `src/index.ts:187-193` after file save
- Payload structure (`src/types.ts:49-53`):
  ```json
  {
    "query": "search term",
    "outputFile": "output/DD-MM-YYYY:HH:MM.query.json",
    "count": 1234
  }
  ```
- Fire-and-forget pattern: Webhook failure never crashes the scraper (`src/webhook.ts:102-106`)
- Endpoint resolution: Preset callback URL > CLI `--callback` flag override (`src/index.ts:76-89`)

## Daemon Mode Integration

**Process Management:**
- PID file: `.daemon.pid` (gitignored) (`src/daemon.ts:10`)
- Log file: `daemon.log` (gitignored) (`src/daemon.ts:11`)
- File locking: `proper-lockfile` prevents concurrent daemon starts (`src/daemon.ts:46-55`)
- Process detection: `process.kill(pid, 0)` checks if daemon is alive (`src/daemon.ts:36-42`)
- Signal handling: SIGTERM/SIGINT trigger graceful shutdown with state save and browser cleanup (`src/daemon.ts:126-161`)

**Env Var Pass-through:**
- Daemon child receives parent environment plus `SCRAPER_DAEMON_CHILD=1` marker (`src/daemon.ts:81`)
- Custom env file loaded via `--env-file` flag for passing credentials to daemon mode (`src/cli.ts:97-122`)

## Configuration System (cosmiconfig)

**Integration Points:**
- Cosmiconfig searches for configuration in multiple locations (`src/config.ts:22-54`)
- Supports JSON, YAML, JS, TS, CJS, MJS config formats
- Config module name: `facebook-scraper`
- Zod validation ensures all preset callback URLs are valid URLs (`src/config.ts:9`)
- Config loading throws if no config file found (`src/config.ts:62-66`)

---

*Integration audit: 2026-07-07*
