# Facebook Ads Library Scraper

A stealth web scraper that extracts advertiser profile URLs from Facebook Ads Library. Built with Bun, Playwright, and CloakBrowser for anti-detection. Designed for lead generation workflows with webhook integration to external automation systems.

## Installation

```bash
# Install dependencies
bun install

# Or with npm
npm install
```

## Quick Start

```bash
# Run from project root
bun start "search query"

# Or use the CLI directly
bun run src/cli.ts "search query"

# After global install
fb-ad-scraper "search query"
```

## Usage

```bash
bun start "<search query>" [options]
```

### CLI Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `<query>` | string | required | Search keyword for Facebook Ads |
| `--preset` | string | - | Configuration preset name (resolves callback URL) |
| `--url` | string | - | Override ad library URL for this run |
| `--headless` | boolean | false | Run browser in headless mode |
| `--proxy` | string | - | Proxy server URL (HTTP/SOCKS5) |
| `--max-urls` | number | unlimited | Maximum URLs to collect |
| `--max-no-new-scrolls` | number | 10 | Stop after N scrolls with no new results |
| `--daemon` | boolean | false | Run as background process |
| `--daemon-action` | string | - | Manage running daemon (stop, status, logs) |
| `--callback` | string | - | Webhook callback name (overrides preset) |
| `--env-file` | string | - | Path to env file |

## Configuration

The scraper uses a preset-based configuration system via [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig). Configuration can be placed in any of these locations:

- `config.json` (recommended)
- `.facebook-scraper.json`
- `.config/facebook-scraper.json`
- `facebook-scraper.config.js`
- Or any [cosmiconfig-compatible location](https://github.com/cosmiconfig/cosmiconfig#cosmiconfig)

### Config File Format

```json
{
  "presets": {
    "leadgen": {
      "callback": "https://example.com/webhook/leadgen",
      "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q={query}"
    },
    "custom": {
      "callback": "https://example.com/webhook/custom",
      "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q={query}"
    }
  }
}
```

### Preset Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `callback` | string (URL) | yes | Webhook URL to notify when scraping completes |
| `adLibraryUrl` | string (URL) | no | Custom Facebook Ads Library URL with `{query}` placeholder |

### URL Precedence

The ad library URL is resolved in this order:

1. **CLI `--url` flag** (highest priority) — overrides everything
2. **Config preset `adLibraryUrl`** — used when `--url` not provided
3. **Default URL** — built-in Facebook Ads Library URL with Bangladesh filter

The `{query}` placeholder in custom URLs is automatically replaced with the URL-encoded search query.

## Examples

### Basic Usage

```bash
# Search for "digital marketing" ads
bun start "digital marketing"

# Search in headless mode
bun start "digital marketing" --headless

# Use a proxy
bun start "digital marketing" --proxy "http://proxy.example.com:8080"
```

### Using Presets

```bash
# Use the leadgen preset (resolves webhook URL)
bun start "digital marketing" --preset leadgen

# Use custom ad library URL
bun start "digital marketing" --url "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q={query}"
```

### Daemon Mode

```bash
# Run as background process
bun start "digital marketing" --daemon

# Check daemon status
bun start "digital marketing" --daemon-action status

# View daemon logs
bun start "digital marketing" --daemon-action logs

# Stop daemon
bun start "digital marketing" --daemon-action stop
```

### Advanced Options

```bash
# Limit URLs collected
bun start "digital marketing" --max-urls 100

# Stop after 20 scrolls with no new results
bun start "digital marketing" --max-no-new-scrolls 20

# Use environment file
bun start "digital marketing" --env-file .env.production
```

## Output

Results are saved as JSON files in the `output/` directory with the format:

```
output/DD-MM-YYYY:HH:MM.<query>.json
```

Example output file:

```json
[
  "https://www.facebook.com/advertiser-profile/123456789",
  "https://www.facebook.com/advertiser-profile/987654321"
]
```

## Webhooks

When a preset with a `callback` URL is used, the scraper sends a POST notification to the webhook URL when scraping completes:

```json
{
  "query": "digital marketing",
  "outputFile": "output/05-07-2026:18-57.digital_marketing.json",
  "count": 42
}
```

## Architecture

- **Runtime:** Bun (TypeScript)
- **Browser Automation:** CloakBrowser (Playwright-based with anti-detection)
- **Configuration:** Cosmiconfig + Zod validation
- **CLI:** Yargs argument parsing
- **Logging:** Pino structured logging

## Development

```bash
# Run in development mode with auto-reload
bun run dev "search query"

# Run tests
bun test

# Lint code
bun run lint

# Format code
bun run format

# Type check
bun run typecheck
```

## License

GNU Affero General Public License v3.0 - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Disclaimer

This tool is for educational and research purposes only. Users are responsible for complying with Facebook's Terms of Service and applicable laws when using this tool.
