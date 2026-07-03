# Phase 1: Foundation - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The project is a fully configured Bun-native TypeScript application with modular architecture, CLI argument parsing, and preset-based configuration system.

</domain>

<decisions>
## Implementation Decisions

### Module Organization
- **D-01:** Pipeline per concern — `src/cli.ts`, `src/config.ts`, `src/browser.ts`, `src/scraper.ts`, `src/output.ts`
- **D-02:** File naming: kebab-case (e.g., `url-extractor.ts`)
- **D-03:** Export style: functions directly (not classes)
- **D-04:** Type location: co-located — each module exports its own types

### Config Schema
- **D-05:** Preset fields: callback URL only for now (other fields can be added later)
- **D-06:** Config structure: presets object — `{ "presets": { "leadgen": { "callback": "https://..." } } }`
- **D-07:** Config location: project root — `.facebook-scraper.json` or `config.json`
- **D-08:** Example config: yes — `config.example.json` tracked in git

### CLI Interaction
- **D-09:** Query arg: `--query` flag (not positional)
- **D-10:** Preset/CLI interaction: no conflict — presets only control callback URL for daemon, CLI controls everything else
- **D-11:** Error style: terse — `"Error: query required"`

### TypeScript Strictness
- **D-12:** Strict mode: enabled (`strict: true`)
- **D-13:** Path aliases: bare imports (no aliases) — Bun supports natively
- **D-14:** Config typing: Zod inference — single source of truth for type + validation

### Agent's Discretion
- Module boundaries and export shapes: planner decides based on implementation needs
- Biome configuration details: planner picks rules/formatting settings
- Package.json structure: planner handles dependencies and scripts

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — Full v1 requirements with SETUP-01 through SETUP-06, CONFIG-01 through CONFIG-05
- `.planning/ROADMAP.md` — Phase 1 definition, success criteria, and plan stubs

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, key decisions, and technical environment
- `.planning/STATE.md` — Current project state and accumulated context

### Codebase Analysis
- `.planning/codebase/STACK.md` — Current technology stack (Bun, cloakbrowser, playwright-core)
- `.planning/codebase/ARCHITECTURE.md` — Current single-file architecture and anti-patterns
- `.planning/codebase/CONVENTIONS.md` — Existing code style and patterns to preserve

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scraper.js` (260 lines) — Complete working scraper to be modularized (functions: `extractProfileUrls`, `withTimeout`, `saveUrls`, `notifyWebhook`)
- `package.json` — Existing dependencies (cloakbrowser ^0.3.28, playwright-core ^1.53.0)
- `bun.lock` — Existing lockfile to preserve

### Established Patterns
- ES Modules with `"type": "module"` — preserve in TypeScript migration
- camelCase functions, UPPER_SNAKE_CASE constants — carry forward
- Section dividers using `// --- Name ---` pattern

### Integration Points
- CLI entry point: `scraper.js:257-259` → becomes `src/cli.ts`
- Config/args parsing: `scraper.js:19-35` → becomes `src/config.ts`
- Browser launch: `scraper.js:124-134` → becomes `src/browser.ts`
- Output: `scraper.js:87-94` → becomes `src/output.ts`

</code_context>

<specifics>
## Specific Ideas

- Config presets object for daemon callback URLs
- Biome for linting + formatting (replaces ESLint + Prettier)
- bun:test for testing (replaces vitest/jest)
- cosmiconfig for config file discovery
- Zod for config schema validation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-07-04*
