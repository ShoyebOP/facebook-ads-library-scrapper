# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 1-Foundation
**Areas discussed:** Module organization, Config schema, CLI interaction, TypeScript strictness

---

## Module organization

| Option | Description | Selected |
|--------|-------------|----------|
| Pipeline per concern | src/cli.ts, src/config.ts, src/browser.ts, src/scraper.ts, src/output.ts — matches Pipeline pattern from PROJECT.md | ✓ |
| Feature-first | src/scrape/ (browser + extractor), src/config/, src/output/ — group by feature boundary | |
| You decide | Let the planner pick the module layout | |

**User's choice:** Pipeline per concern

| Option | Description | Selected |
|--------|-------------|----------|
| kebab-case (Recommended) | src/cli.ts, src/config.ts, src/browser.ts, src/url-extractor.ts — matches existing convention | ✓ |
| camelCase | src/cli.ts, src/config.ts, src/urlExtractor.ts — JS convention but less common for files | |
| You decide | Let the planner pick | |

**User's choice:** kebab-case

| Option | Description | Selected |
|--------|-------------|----------|
| Functions (Recommended) | export function parseCli() {} — simpler, matches current helper style | ✓ |
| Class instances | export class BrowserController {} — more structure, harder to test | |
| You decide | Let the planner pick | |

**User's choice:** Functions

| Option | Description | Selected |
|--------|-------------|----------|
| Co-located (Recommended) | Each module exports its own types — src/config.ts exports Preset, ScraperConfig | ✓ |
| Central types.ts | src/types.ts with all shared interfaces — single source of truth but couples modules | |
| You decide | Let the planner pick | |

**User's choice:** Co-located

---

## Config schema

| Option | Description | Selected |
|--------|-------------|----------|
| All CLI args | query, proxy, headless, max-urls, max-no-new-scrolls, callback — mirrors existing CLI flags | |
| Core + extensions | CLI args plus: scroll-delay, retry-attempts, output-dir — future-proofing | |
| You decide | Let the planner pick based on REQUIREMENTS.md | |

**User's choice:** callback URL only for now (minimal scope)
**Notes:** User specified presets only need callback URL for daemon mode at this stage.

| Option | Description | Selected |
|--------|-------------|----------|
| Presets object | { "presets": { "leadgen": { "callback": "https://..." } } } — named presets, one is default | ✓ |
| Flat config | { "callback": "https://...", "default": "leadgen" } — simpler, less flexible | |
| You decide | Let the planner pick | |

**User's choice:** Presets object

| Option | Description | Selected |
|--------|-------------|----------|
| Project root (Recommended) | .facebook-scraper.json or config.json in project root — simple, conventional | ✓ |
| XDG-style | ~/.config/facebook-scraper/config.json — system-wide config, shared across projects | |
| Both | Project root overrides system-wide — layered config | |
| You decide | Let the planner pick | |

**User's choice:** Project root

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | config.example.json in repo root — helps new users, shows available fields | ✓ |
| No | Just document in README — less file clutter | |
| You decide | Let the planner pick | |

**User's choice:** Yes

---

## CLI interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Positional (Recommended) | bun scraper.js "facebook ads" — matches current behavior, simplest | |
| --query flag | bun scraper.js --query "facebook ads" — more explicit, harder to forget | ✓ |
| You decide | Let the planner pick | |

**User's choice:** --query flag

| Option | Description | Selected |
|--------|-------------|----------|
| CLI overrides preset (Recommended) | bun scraper.js --preset leadgen --query "other" uses "other" query — CLI always wins | |
| Preset overrides CLI | Preset values take precedence — CLI args are just for preset selection | |
| Merge (CLI wins) | Merge preset + CLI args, CLI values override on conflict | |
| You decide | Let the planner pick | |

**User's choice:** No conflict — presets only control callback URL
**Notes:** User clarified presets only hold callback URL for daemon mode, so no overlap with CLI args.

| Option | Description | Selected |
|--------|-------------|----------|
| Friendly (Recommended) | "Missing required argument: --query" with usage hint — helpful for users | |
| Terse | "Error: query required" — compact, script-friendly | ✓ |
| You decide | Let the planner pick | |

**User's choice:** Terse

---

## TypeScript strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Strict mode (Recommended) | strict: true — catches most bugs at compile time, industry standard | ✓ |
| Relaxed | noImplicitAny: false, strictNullChecks: false — faster to write, less safe | |
| You decide | Let the planner pick | |

**User's choice:** Strict mode

| Option | Description | Selected |
|--------|-------------|----------|
| Bare imports (Recommended) | import { parse } from '../config' — simpler, no tsconfig paths config, Bun supports natively | ✓ |
| Path aliases | import { parse } from '@config' — cleaner imports but requires tsconfig paths + Bun alias config | |
| You decide | Let the planner pick | |

**User's choice:** Bare imports

| Option | Description | Selected |
|--------|-------------|----------|
| Zod inference (Recommended) | const ConfigSchema = z.object({...}); type Config = z.infer<typeof ConfigSchema> — single source of truth | ✓ |
| Manual interface | interface Config { callback: string } — simpler but type and validation can diverge | |
| You decide | Let the planner pick | |

**User's choice:** Zod inference

---

## Agent's Discretion

- Module boundaries and export shapes: planner decides based on implementation needs
- Biome configuration details: planner picks rules/formatting settings
- Package.json structure: planner handles dependencies and scripts

## Deferred Ideas

None — discussion stayed within phase scope
