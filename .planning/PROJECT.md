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

### Validated (continued)

- ✓ Rewrite in Bun-native TypeScript — Phase 1
- ✓ Modularize into separate modules — Phase 1
- ✓ Implement preset-based configuration system — Phase 1
- ✓ Add comprehensive cloakbrowser humanization — Phase 2
- ✓ Add structured logging framework — Phase 2
- ✓ Add retry logic with exponential backoff — Phase 2
- ✓ Fix double log file cleanup bug — Phase 2
- ✓ Fix missing proxy argument validation — Phase 5
- ✓ Improve daemon mode reliability — Phase 4, Phase 5
- ✓ Add full test suite — Phase 4
- ✓ Add input validation for all CLI arguments — Phase 2
- ✓ Remove hardcoded configuration — Phase 1
- ✓ Add incremental URL saving — Phase 5
- ✓ Fix daemon infinite fork loop — Phase 5
- ✓ Add graceful shutdown handlers — Phase 5

### Active

- [ ] Fix silent error swallowing
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
*Last updated: 2026-07-06 after Phase 5*