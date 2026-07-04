# Phase 1: Foundation - Research

**Researched:** 2026-07-04
**Domain:** Bun-native TypeScript project setup, CLI parsing, configuration system
**Confidence:** MEDIUM

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Pipeline per concern — `src/cli.ts`, `src/config.ts`, `src/browser.ts`, `src/scraper.ts`, `src/output.ts`
- **D-02:** File naming: kebab-case (e.g., `url-extractor.ts`)
- **D-03:** Export style: functions directly (not classes)
- **D-04:** Type location: co-located — each module exports its own types
- **D-05:** Preset fields: callback URL only for now (other fields can be added later)
- **D-06:** Config structure: presets object — `{ "presets": { "leadgen": { "callback": "https://..." } } }`
- **D-07:** Config location: project root — `.facebook-scraper.json` or `config.json`
- **D-08:** Example config: yes — `config.example.json` tracked in git
- **D-09:** Query arg: `--query` flag (not positional)
- **D-10:** Preset/CLI interaction: no conflict — presets only control callback URL for daemon, CLI controls everything else
- **D-11:** Error style: terse — `"Error: query required"`
- **D-12:** Strict mode: enabled (`strict: true`)
- **D-13:** Path aliases: bare imports (no aliases) — Bun supports natively
- **D-14:** Config typing: Zod inference — single source of truth for type + validation

### Agent's Discretion

- Module boundaries and export shapes: planner decides based on implementation needs
- Biome configuration details: planner picks rules/formatting settings
- Package.json structure: planner handles dependencies and scripts

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | Project uses Bun-native TypeScript (no Node.js compatibility) | Bun TypeScript config with `moduleResolution: "bundler"`, `types: ["bun"]` |
| SETUP-02 | TypeScript configured with `moduleResolution: "bun"` and `types: ["bun"]` | Official Bun docs: tsconfig.json with `moduleResolution: "bundler"`, `types: ["bun"]` |
| SETUP-03 | Biome configured for linting and formatting (replaces ESLint + Prettier) | Biome docs: `@biomejs/biome` with `biome.json` config |
| SETUP-04 | bun:test configured for testing (replaces vitest/jest) | Bun docs: `bun:test` import, `bun test` command |
| SETUP-05 | Package.json has all dependencies with correct versions | Verify each package exists on npm (see Package Legitimacy Audit) |
| SETUP-06 | src/ directory structure with proper module boundaries | Web search: modular architecture patterns for Bun |
| CONFIG-01 | Preset-based configuration system (single CLI arg → config.json presets) | Cosmiconfig docs: config file discovery, preset resolution |
| CONFIG-02 | Config file discovery via cosmiconfig (package.json, .facebook-scraper.json, .config/) | Cosmiconfig docs: searchStrategy, packageProp |
| CONFIG-03 | Zod schema validation for config files | Zod docs: schema definition, type inference |
| CONFIG-04 | Environment variable support with explicit --env-file flag | Yargs docs: option parsing, env var support |
| CONFIG-05 | Example config file tracked in git | No research needed — just create `config.example.json` |

## Summary

Phase 1 establishes the foundational toolchain for a Bun-native TypeScript application. The project will use Bun's native TypeScript support with `moduleResolution: "bundler"`, Biome for linting/formatting, and `bun:test` for testing. The configuration system uses cosmiconfig for file discovery, Zod for schema validation and type inference, and yargs for CLI argument parsing. The architecture follows a pipeline pattern with separate modules for CLI, config, browser, scraper, and output.

**Primary recommendation:** Use the official Bun TypeScript configuration, install cosmiconfig, zod, yargs, @biomejs/biome, and @types/bun as dev dependencies, and follow the locked decisions for module organization and config structure.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CLI argument parsing | CLI Entry Point | — | User interaction layer |
| Config file discovery | Configuration | CLI Entry Point | Loads config before CLI execution |
| Config validation | Configuration | — | Ensures config integrity |
| TypeScript compilation | Build System | — | Development tooling |
| Linting/formatting | Code Quality | — | Development tooling |
| Testing | Quality Assurance | — | Development tooling |
| Module boundaries | Architecture | — | Code organization |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun | 1.3.12 | Runtime, test runner, package manager | Official Bun runtime, fast native TS support |
| TypeScript | ^5.x | Type checking | Official TypeScript compiler |
| cosmiconfig | ^9.x | Config file discovery | Industry standard for config loading |
| Zod | ^3.x | Schema validation + type inference | TypeScript-first, single source of truth |
| yargs | ^17.x | CLI argument parsing | Mature, feature-rich CLI parser |
| @biomejs/biome | ^2.x | Linting + formatting | Fast all-in-one toolchain |
| @types/bun | ^1.x | Bun type definitions | Official DefinitelyTyped types |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bun:test | built-in | Testing framework | Unit tests, integration tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cosmiconfig | env-cmd, dotenv | Less flexible file discovery |
| Zod | Yup, Joi | Less TypeScript-first, no inference |
| yargs | commander, meow | More features but larger bundle |
| Biome | ESLint + Prettier | Biome faster but less ecosystem |

**Installation:**
```bash
bun add -d @types/bun @biomejs/biome cosmiconfig zod yargs
```

**Version verification:** Before writing the Standard Stack table, verify each recommended package exists and is current using the ecosystem-appropriate command:
```bash
npm view [package] version          # Node.js phases
```
Document the verified version and publish date. Training data versions may be months stale — always confirm against the correct ecosystem registry.

## Package Legitimacy Audit

> **Required** whenever this phase installs external packages. Run the Package Legitimacy Gate protocol before completing this section.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| cosmiconfig | npm | 2026-06-07 | 114M/wk | github.com/cosmiconfig/cosmiconfig | [SUS] | Flagged — planner must add checkpoint:human-verify |
| zod | npm | 2026-05-04 | 213M/wk | github.com/colinhacks/zod | [OK] | Approved |
| yargs | npm | 2025-05-27 | 212M/wk | github.com/yargs/yargs | [OK] | Approved |
| @biomejs/biome | npm | 2026-07-01 | 9.8M/wk | github.com/biomejs/biome | [SUS] | Flagged — planner must add checkpoint:human-verify |
| @types/bun | npm | 2026-05-13 | 7.7M/wk | DefinitelyTyped | [OK] | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** cosmiconfig, @biomejs/biome — planner inserts checkpoint:human-verify before each install

*Packages discovered via WebSearch or training data that have not been verified against an authoritative source are tagged `[ASSUMED]` and the planner must gate each install behind a `checkpoint:human-verify` task.*

## Architecture Patterns

### System Architecture Diagram

```
User Input (CLI args)
    ↓
CLI Entry Point (src/cli.ts)
    ↓
Configuration Loader (src/config.ts)
    ↓ cosmiconfig discovery
    ↓ Zod validation
    ↓
Browser Controller (src/browser.ts)
    ↓
Scraper Engine (src/scraper.ts)
    ↓
Output Handler (src/output.ts)
    ↓
Results (JSON files, webhooks)
```

### Recommended Project Structure
```
src/
├── cli.ts          # CLI entry point, yargs parsing
├── config.ts       # Config loading, Zod schema, preset resolution
├── browser.ts      # Cloakbrowser integration
├── scraper.ts      # Core scraping logic
├── output.ts       # File output, webhook notifications
└── index.ts        # Main entry, orchestrates pipeline
```

### Pattern 1: Pipeline Architecture
**What:** Sequential processing stages with clear boundaries
**When to use:** When each stage has distinct responsibility and data flows linearly
**Example:**
```typescript
// Source: Research findings
// cli.ts parses args, passes to config.ts which loads presets,
// then browser.ts launches, scraper.ts runs, output.ts saves
```

### Anti-Patterns to Avoid
- **God module:** Don't put all logic in one file (current state)
- **Circular dependencies:** Keep pipeline unidirectional
- **Shared mutable state:** Pass data through function parameters

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config file discovery | Custom file search | cosmiconfig | Handles multiple formats, search strategies |
| Schema validation | Manual type checks | Zod | Type inference, validation, error messages |
| CLI argument parsing | process.argv parsing | yargs | Type coercion, help generation, validation |
| Linting/formatting | Custom rules | Biome | Performance, ecosystem support |

**Key insight:** These tools solve complex, well-understood problems with years of edge case handling.

## Common Pitfalls

### Pitfall 1: ESM Import Extensions
**What goes wrong:** Bun requires `.js` extensions for local imports in ESM mode
**Why it happens:** TypeScript source files are `.ts` but runtime expects `.js`
**How to avoid:** Always use `.js` extensions in imports: `import { foo } from './bar.js'`
**Warning signs:** "Cannot find module" errors at runtime

### Pitfall 2: Path Aliases at Runtime
**What goes wrong:** TypeScript path aliases (`@/`) don't work in Bun runtime
**Why it happens:** Bun uses native module resolution, not TypeScript's
**How to avoid:** Use relative imports only; keep aliases for editor only
**Warning signs:** Module not found errors when running with `bun run`

### Pitfall 3: Config Validation Timing
**What goes wrong:** Config loaded after CLI parsing fails
**Why it happens:** Preset name needed before full config load
**How to avoid:** Two-stage config: first discover preset name, then load full config
**Warning signs:** "Preset not found" errors

## Code Examples

Verified patterns from official sources:

### Bun TypeScript Configuration
```json
// Source: official Bun documentation
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "types": ["bun"]
  }
}
```

### Cosmiconfig Usage
```javascript
// Source: official cosmiconfig documentation
import { cosmiconfig } from 'cosmiconfig';

const explorer = cosmiconfig('facebook-scraper', {
  searchStrategy: 'project'
});

const result = await explorer.search();
```

### Zod Schema with Type Inference
```typescript
// Source: official Zod documentation
import { z } from 'zod';

const ConfigSchema = z.object({
  presets: z.record(z.object({
    callback: z.string().url()
  }))
});

type Config = z.infer<typeof ConfigSchema>;
```

### Yargs CLI Parsing
```javascript
// Source: official yargs documentation
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('query', { type: 'string', demandOption: true })
  .option('preset', { type: 'string' })
  .parse();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ESLint + Prettier | Biome | 2024-2025 | Faster, all-in-one |
| Jest/Vitest | bun:test | 2023-2024 | Native Bun integration |
| CommonJS | ESM | 2022-2023 | Module system standard |
| Manual config loading | cosmiconfig | 2018-present | Standardized discovery |

**Deprecated/outdated:**
- ESLint + Prettier: replaced by Biome for new projects
- Jest/Vitest: replaced by bun:test for Bun projects
- CommonJS: use ESM for new Bun projects

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this
> section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | cosmiconfig version is ^9.x (latest as of research) | Standard Stack | Might need different version |
| A2 | @biomejs/biome version is ^2.x (latest as of research) | Standard Stack | Might need different version |
| A3 | Bun 1.3.12 is current version on target machine | Environment Availability | Different version might have different features |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Which preset fields beyond callback URL?**
   - What we know: Only callback URL for now (D-05)
   - What's unclear: Future fields, schema extensibility
   - Recommendation: Design Zod schema to allow additional fields via `.passthrough()` or optional properties

2. **How to handle config file location priority?**
   - What we know: `.facebook-scraper.json` or `config.json` (D-07)
   - What's unclear: If both exist, which takes precedence?
   - Recommendation: Document priority in README, cosmiconfig search order handles this

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Runtime, test runner | ✓ | 1.3.12 | — |
| npm | Package installation | ✓ | — | bun install (preferred) |
| node | Not required | ✗ | — | Not needed (Bun native) |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test |
| Config file | None — see Wave 0 |
| Quick run command | `bun test` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETUP-01 | Bun-native TypeScript | unit | `bun run tsc --noEmit` | ❌ Wave 0 |
| SETUP-02 | TypeScript config | unit | `bun run tsc --noEmit` | ❌ Wave 0 |
| SETUP-03 | Biome linting | unit | `bunx biome check ./src` | ❌ Wave 0 |
| SETUP-04 | bun:test running | unit | `bun test` | ❌ Wave 0 |
| SETUP-05 | Dependencies installed | unit | `bun install` | ❌ Wave 0 |
| SETUP-06 | Module boundaries | unit | `bun run tsc --noEmit` | ❌ Wave 0 |
| CONFIG-01 | Preset loading | integration | `bun test config.test.ts` | ❌ Wave 0 |
| CONFIG-02 | Config discovery | integration | `bun test config.test.ts` | ❌ Wave 0 |
| CONFIG-03 | Zod validation | unit | `bun test config.test.ts` | ❌ Wave 0 |
| CONFIG-04 | Env var support | integration | `bun test config.test.ts` | ❌ Wave 0 |
| CONFIG-05 | Example config | unit | `ls config.example.json` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/config.test.ts` — covers CONFIG-01, CONFIG-02, CONFIG-03, CONFIG-04
- [ ] `tests/setup.test.ts` — covers SETUP-01 through SETUP-06
- [ ] Framework install: `bun add -d @types/bun @biomejs/biome` — if not present
- [ ] `config.example.json` — example config file
- [ ] `tsconfig.json` — TypeScript configuration
- [ ] `biome.json` — Biome configuration

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

## Security Domain

> Required when `security_enforcement` is enabled (absent = enabled). Omit only if explicitly `false` in config.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Zod schema validation |
| V6 Cryptography | no | — |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious config injection | Tampering | Zod validation, schema enforcement |
| CLI argument injection | Tampering | Yargs type validation |
| Dependency confusion | Spoofing | Package legitimacy audit |

## Sources

### Primary (HIGH confidence)
- [Context7 /oven-sh/bun] - Bun TypeScript configuration, bun:test usage
- [Context7 /cosmiconfig/cosmiconfig] - Config file discovery patterns
- [Context7 /colinhacks/zod] - Schema validation and type inference
- [Context7 /yargs/yargs] - CLI argument parsing
- [Context7 /websites/v1_biomejs_dev] - Biome configuration

### Secondary (MEDIUM confidence)
- [Web search] - Modular project structure patterns
- [Web search] - Migration pitfalls

### Tertiary (LOW confidence)
- [Web search only, marked for validation]

## Metadata

**Confidence breakdown:**
- Standard Stack: MEDIUM - Official docs for core tools, web search for patterns
- Architecture: MEDIUM - Based on research findings and project constraints
- Pitfalls: MEDIUM - Based on web search and known Bun/TypeScript issues

**Research date:** 2026-07-04
**Valid until:** 2026-08-03 (30 days for stable tools)