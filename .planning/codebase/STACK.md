# Technology Stack

**Analysis Date:** 2026-06-29

## Languages

**Primary:**
- JavaScript (ES Modules) - Single file `scraper.js` (260 lines)

**Secondary:**
- None

## Runtime

**Environment:**
- Bun (JavaScript runtime)
- Module system: ES Modules (`"type": "module"` in `package.json`)

**Package Manager:**
- Bun
- Lockfile: `bun.lock` (present, lockfileVersion 1)

## Frameworks

**Core:**
- None (vanilla JS, no framework)

**Testing:**
- Not detected - no test framework configured

**Build/Dev:**
- None - runs directly via `bun scraper.js`

## Key Dependencies

**Critical:**
- `cloakbrowser` `^0.3.28` - Stealth browser automation library (anti-detection)
- `playwright-core` `^1.53.0` - Browser automation engine (peer dependency of cloakbrowser)

**Infrastructure:**
- `fs` (Node.js built-in) - File I/O for output
- `child_process` (Node.js built-in) - Daemon mode via `fork()`
- `http`/`https` (Node.js built-in) - Webhook notifications

## Configuration

**Environment:**
- No `.env` file present
- Environment variables used:
  - `SCRAPER_OUTPUT_FILE` - Override output file path
  - `SCRAPER_LOG_FILE` - Log file path (for daemon mode)
  - `SCRAPER_CALLBACK_NAME` - Webhook callback name override

**Build:**
- No build step - runs directly via `bun scraper.js`

## Platform Requirements

**Development:**
- Bun runtime installed
- Network access to Facebook Ads Library
- Optional: proxy server for rate limiting bypass

**Production:**
- Bun runtime
- Network access to:
  - `www.facebook.com` (Ads Library)
  - `automation.zaktomate.com` (webhook callbacks)
- Optional: proxy server (SOCKS5/HTTP)

## NPM Scripts

```json
"start": "bun scraper.js"
```

## CLI Arguments

The scraper accepts these arguments:
- `<search query>` (required) - Search keyword for Facebook Ads
- `--headless` - Run browser in headless mode
- `--proxy "http://..."` - Use proxy server
- `--max-urls N` - Limit number of URLs to collect
- `--max-no-new-scrolls N` - Stop after N scrolls with no new results (default: 10)
- `--daemon` - Run as detached background process
- `--callback name` - Webhook callback name (default: 'leadgen')

---

*Stack analysis: 2026-06-29*
