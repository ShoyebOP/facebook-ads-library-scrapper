# Facebook Ads Library Scraper

## What This Is

A stealth web scraper that extracts advertiser profile URLs from Facebook Ads Library. Built with Bun, Playwright, and cloakbrowser for anti-detection. Designed for lead generation workflows with webhook integration to external automation systems.

## Core Value

Reliably extract Facebook Ads Library profile URLs at scale without detection, delivering results via JSON files and webhook notifications.

## Requirements

### Validated

- ✓ Single-query scraping via CLI — existing
- ✓ Stealth browser automation with anti-detection — existing
- ✓ GraphQL response interception for data extraction — existing
- ✓ JSON output to timestamped files — existing
- ✓ Webhook notification on completion — existing
- ✓ Daemon mode for background execution — existing

### Active

- [ ] Rewrite in Bun-native TypeScript (remove Node.js compatibility)
- [ ] Modularize into separate modules (CLI, browser, scraper, webhook, storage)
- [ ] Implement preset-based configuration system (single arg → config.json presets)
- [ ] Add comprehensive cloakbrowser humanization (mouse movements, scrolling, typing)
- [ ] Add structured logging framework with levels
- [ ] Add retry logic with exponential backoff for transient errors
- [ ] Fix double log file cleanup bug
- [ ] Fix missing proxy argument validation
- [ ] Fix silent error swallowing
- [ ] Improve daemon mode reliability (proper logging, PID management, restart)
- [ ] Add full test suite (unit, integration, E2E)
- [ ] Add input validation for all CLI arguments
- [ ] Remove hardcoded configuration (webhook URLs, country code, callbacks)
- [ ] Add incremental URL saving (periodic writes)
- [ ] Add adaptive scroll timing (wait for network idle)
- [ ] Add configurable DOM selectors with fallbacks
- [ ] Add webhook authentication via HMAC signatures
- [ ] Add proxy credential sanitization in logs

### Out of Scope

- Multiple concurrent queries — single-threaded by design
- Database storage — JSON output sufficient for lead generation
- Real-time streaming output — batch processing fits use case
- OAuth/social login — public Ads Library doesn't require auth
- Mobile app — CLI tool for automation workflows
- cloakbrowser replacement — keep existing anti-detection package

## Context

**Technical Environment:**
- Bun runtime (not Node.js) — use Bun-native APIs
- Playwright for browser automation
- cloakbrowser for stealth/anti-detection features
- ES Modules with TypeScript
- Single-file architecture being modularized

**Prior Work:**
- Working scraper in `scraper.js` (260 lines)
- Webhook integration with `automation.zaktomate.com`
- Daemon mode via child process forking
- Output format: `DD-MM-YYYY:HH:MM.query.json`

**Known Issues:**
- All logic in single file — testing and maintenance difficult
- No input validation — invalid args cause cryptic errors
- No retry logic — transient failures crash scraper
- Hardcoded configuration — requires code changes for new callbacks
- Silent error swallowing — debugging production issues difficult
- Fixed scroll timing — not adaptive to page load speed

## Constraints

- **Runtime**: Bun only — no Node.js compatibility required
- **Anti-detection**: Must use cloakbrowser for Facebook bypass
- **Output**: JSON format only (per user preference)
- **Webhooks**: Keep simple POST approach (no auth complexity)
- **Configuration**: Preset-based system via config.json

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Bun-native TypeScript | Modern runtime, better performance, native TypeScript support | — Pending |
| Preset-based config | Simplifies CLI usage, easy to add new configurations | — Pending |
| Keep cloakbrowser | Proven anti-detection, user wants to preserve | — Pending |
| Modular architecture | Separate concerns for testability and maintenance | — Pending |
| Full test suite | Enable confident refactoring and future changes | — Pending |
| JSON-only output | Sufficient for lead generation use case | — Pending |
| Improve daemon mode | Background execution needs reliability improvements | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-03 after initialization*