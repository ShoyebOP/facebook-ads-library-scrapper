# External Integrations

**Analysis Date:** 2026-06-29

## APIs & External Services

**Facebook Ads Library:**
- Purpose: Scrape advertiser profile URLs from search results
- Method: Browser automation (Playwright/CloakBrowser) with GraphQL response interception
- Base URL: `https://www.facebook.com/ads/library/`
- Authentication: None (public API, no login required)
- Rate limiting: Handled via stealth browser mode and human-like behavior

## Data Storage

**Databases:**
- None

**File Storage:**
- Local filesystem (`output/` directory)
- Format: JSON (array of Facebook profile URLs)
- Naming: `output/DD-MM-YYYY:HH-MM.QUERY.json`

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None required for Facebook Ads Library (public endpoint)

## Monitoring & Observability

**Error Tracking:**
- Console logging only (no external error tracking)

**Logs:**
- Console output with heartbeat logging every 30 seconds
- Daemon mode: logs written to `output/DD-MM-YYYY:HH-MM.QUERY.log`

## CI/CD & Deployment

**Hosting:**
- Local execution (CLI tool)
- Daemon mode available via `--daemon` flag

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- None required (all configuration via CLI arguments)

**Optional env vars:**
- `SCRAPER_OUTPUT_FILE` - Override output file path
- `SCRAPER_LOG_FILE` - Log file path
- `SCRAPER_CALLBACK_NAME` - Webhook callback name

**Secrets location:**
- None required

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- Webhook POST sent after scraping completes
- Endpoint: `https://automation.zaktomate.com/webhook/leadgen-taqwa` (for 'taqwa' callback)
- Endpoint: `https://automation.zaktomate.com/webhook/leadgen-khanit` (for 'khanit' callback)
- Payload: `{ query, outputFile, count }`
- Trigger: Scraping completion (after `saveUrls()`)

**Callback Configuration:**
- Defined in `CALLBACKS` object in `scraper.js` (lines 8-12)
- Default callback: 'leadgen' (line 13)
- Add new callbacks by adding entries to the `CALLBACKS` object

## Network Interception Pattern

The scraper intercepts Facebook's GraphQL responses:

```javascript
page.on('response', async (response) => {
    if (response.status() === 200 && response.url().includes('graphql')) {
        const json = await response.json();
        extractProfileUrls(json, profileUrls);
    }
});
```

- Filters: Only processes responses containing 'graphql' in URL
- Extraction: Recursively finds `page_profile_uri` in nested JSON
- Timeout: 5 seconds per response (configurable via `withTimeout()`)

## Proxy Support

- Supported via `--proxy` CLI argument
- Passed to CloakBrowser launch options
- Formats: HTTP/HTTPS/SOCKS5

## Browser Configuration

The CloakBrowser is launched with these stealth settings:

```javascript
{
    headless: false,        // Configurable via --headless
    humanize: true,
    human_preset: 'careful',
    stealth_args: true,
    locale: 'en-US',
    timezone: 'Asia/Dhaka'
}
```

## Resource Blocking

Heavy assets are blocked to improve performance:

```javascript
await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        return route.abort();
    }
    return route.continue();
});
```

---

*Integration audit: 2026-06-29*
