# Phase 6: Milestone v1.0 — Gaps Found (32/42) - Research

**Researched:** 2026-07-06
**Domain:** Milestone gap remediation — retroactive verification, cross-phase fixes, dead code cleanup
**Confidence:** HIGH

## Summary

Phase 6 is a remediation phase triggered by the v1.0 milestone audit (`.planning/v1.0-v1.0-MILESTONE-AUDIT.md`). All 42 v1.0 requirements have implementations with passing tests, but 10 are "orphaned" — claimed by plans and verified in SUMMARY files but never confirmed in any VERIFICATION.md. Additionally, 4 cross-phase integration warnings and 1 broken flow need resolution, plus dead code cleanup.

**Primary recommendation:** This phase is NOT about writing new feature code. It is about (1) retroactive verification of 10 orphaned requirements via code inspection, (2) fixing 4 integration warnings, (3) wiring non-daemon shutdown handlers, (4) cleaning up dead code, and (5) consolidating the test structure.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Retroactive verification | N/A (meta) | — | Audit artifact creation, not runtime behavior |
| Non-daemon shutdown wiring | CLI / Backend | — | SIGINT/SIGTERM handlers belong in `index.ts` main() for non-daemon path |
| Dependency placement fix | Build / Config | — | Moving cosmiconfig/zod from devDeps to deps affects runtime resolution |
| Module resolution fix | Build / Config | — | tsconfig.json `moduleResolution` affects TypeScript compilation |
| Test consolidation | Build / Config | — | Merging `tests/` and `test/` directories |
| Dead code cleanup | Code quality | — | Removing unused exports and duplicate types |

## Standard Stack

### Core (No new packages needed)

All tools already exist in the project. Phase 6 requires no new dependencies.

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| bun:test | built-in | Test framework | Already configured, used throughout |
| Biome | ^2.5.2 | Linting/formatting | Already configured |
| TypeScript | built-in | Type checking | Already configured |

### No Supporting Packages Required

This phase fixes existing code — it does not add features.

## Package Legitimacy Audit

No new packages are installed in this phase. No audit required.

## Architecture Patterns

### Pattern 1: Retroactive Verification via Code Inspection

**What:** For each orphaned requirement, verify the implementation exists and works by inspecting the source code and running existing tests, then document findings in a VERIFICATION.md.

**When to use:** When a requirement was completed but never formally verified in a VERIFICATION.md file.

**Key insight:** The implementations already exist and tests pass. The gap is documentation, not code.

**Orphaned Requirements and Their Implementations:**

| Req ID | Claimed By | Implementation Location | Verification Method |
|--------|-----------|------------------------|-------------------|
| SETUP-05 | 01-01-PLAN.md | `package.json` (dependencies section) | Inspect package.json, run `bun install` |
| SETUP-06 | 01-01-PLAN.md | `src/` directory with 14 TypeScript files | Inspect directory structure |
| CONFIG-05 | 01-01-PLAN.md | `config.example.json` (tracked in git) | Inspect file, check git tracking |
| SCRAPE-01 | 02-01/02-04-PLAN.md | `src/cli.ts` lines 11-65 (yargs parsing) | Inspect cli.ts, run `bun run src/cli.ts --help` |
| SCRAPE-02 | 02-01/02-04-PLAN.md | `src/cli.ts` lines 67-95 (validation) | Inspect validation blocks |
| OUTPUT-01 | 03-01-PLAN.md | `src/output.ts` lines 14-20 (generateOutputPath) | Inspect output.ts |
| OUTPUT-03 | 03-01-PLAN.md | `src/output.ts` lines 24-26 (ensureOutputDir) | Inspect output.ts, verify `mkdir recursive` |
| WEBHOOK-01 | 03-02-PLAN.md | `src/webhook.ts` lines 25-106 (notifyWebhook) | Inspect webhook.ts |
| WEBHOOK-02 | 03-02-PLAN.md | `src/config.ts` lines 8-15 (PresetSchema with callback) | Inspect config.ts schema |
| WEBHOOK-03 | 03-02-PLAN.md | `src/webhook.ts` lines 102-106 (catch block) | Inspect error isolation pattern |

### Pattern 2: Non-Daemon Shutdown Wiring

**What:** Wire SIGINT/SIGTERM handlers for the normal (non-daemon) CLI path.

**When to use:** When the CLI is run without `--daemon` flag, Ctrl+C should still save collected URLs and close the browser gracefully.

**Current state:**
- `src/daemon.ts` exports `setupDaemonShutdown()` — only called when `SCRAPER_DAEMON_CHILD=1` (index.ts:106-120)
- `src/errors.ts` exports `setupShutdownHandler()` — exported but NEVER called anywhere (dead code)
- Non-daemon runs have NO shutdown handlers

**Fix approach:**
1. In `index.ts`, wire shutdown handlers for non-daemon mode too (after `runScraper` starts but before completion)
2. Remove `setupShutdownHandler` from `errors.ts` (dead code — `setupDaemonShutdown` in `daemon.ts` is the real implementation)
3. The non-daemon handler needs access to `browserRef` and `urls` — these are already captured in `index.ts` main()

**Code flow:**
```
main() in index.ts:
  1. If daemon → startDaemon() → process.exit(0) (parent) OR run as child
  2. Run scraper pipeline
  3. If daemon child → setupDaemonShutdown() (already works)
  4. If NOT daemon → ??? (MISSING: no shutdown handler)
```

**Fix location:** `src/index.ts` lines 105-120 — extend the condition to also handle non-daemon mode.

### Pattern 3: Dependency Placement Fix

**What:** Move `cosmiconfig` and `zod` from `devDependencies` to `dependencies` in package.json.

**When to use:** When a package is imported by source code that runs at runtime (not just tests/build tools).

**Current state:**
```json
"dependencies": {
    "cloakbrowser": "^0.3.28",
    "p-retry": "^8.0.0",
    "pino": "^10.3.1",
    "playwright-core": "^1.53.0",
    "proper-lockfile": "^4.1.2"
},
"devDependencies": {
    "@biomejs/biome": "^2.5.2",
    "@types/bun": "^1.3.14",
    "@types/pino": "^7.0.5",
    "cosmiconfig": "^9.0.2",       ← RUNTIME (imported in config.ts)
    "yargs": "^18.0.0",            ← RUNTIME (imported in cli.ts)
    "zod": "^4.4.3"                ← RUNTIME (imported in config.ts)
}
```

**Fix:** Move `cosmiconfig`, `yargs`, and `zod` to `dependencies`. They are imported by `src/config.ts` and `src/cli.ts` which run at runtime.

### Pattern 4: Module Resolution Fix

**What:** Update `tsconfig.json` `moduleResolution` from `"bundler"` to `"bun"` as required by SETUP-02.

**Current state:**
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"  ← WRONG per SETUP-02
  }
}
```

**Fix:** Change to `"moduleResolution": "bun"`. Bun's native TS support uses its own resolver.

**Risk:** Low — `moduleResolution: "bun"` is the correct setting for Bun-native projects. The `"bundler"` setting works but is not what the requirement specifies.

### Pattern 5: Test Consolidation

**What:** Merge `tests/` (Phase 1 legacy) into `test/` (Phase 4 structured) to eliminate duplication.

**Current state:**
```
tests/          ← Phase 1/2 legacy (11 files, 1860 lines)
  browser.test.ts
  cli.test.ts
  config.test.ts
  errors.test.ts
  extractor.test.ts
  index.test.ts
  interceptor.test.ts
  logger.test.ts
  scraper.test.ts
  setup.test.ts
  types.test.ts

test/           ← Phase 4 structured (9 files, 1368 lines)
  unit/
    config.test.ts
    daemon.test.ts
    extractor.test.ts
    output.test.ts
    webhook.test.ts
  integration/
    cli.test.ts
    daemon.test.ts
    webhook.test.ts
  e2e/
    scraper.test.ts

src/            ← Co-located tests (2 files, 358 lines)
  output.test.ts
  webhook.test.ts
```

**Overlap analysis:**
- `tests/config.test.ts` ↔ `test/unit/config.test.ts` — DUPLICATE
- `tests/cli.test.ts` ↔ `test/integration/cli.test.ts` — DUPLICATE
- `tests/extractor.test.ts` ↔ `test/unit/extractor.test.ts` — DUPLICATE
- `tests/scraper.test.ts` ↔ `test/e2e/scraper.test.ts` — OVERLAP
- `tests/index.test.ts` ↔ `test/integration/cli.test.ts` — OVERLAP (both test main())
- `src/output.test.ts` ↔ `test/unit/output.test.ts` — DUPLICATE
- `src/webhook.test.ts` ↔ `test/unit/webhook.test.ts` — DUPLICATE

**Fix approach:** Delete `tests/` directory (the legacy tree). Keep `test/` (structured) and `src/*.test.ts` (co-located). Update bunfig.toml if needed to point to correct test root.

**Note:** Before deleting, verify that `test/` files cover the same cases as `tests/` files. The `test/unit/` and `test/integration/` directories were created in Phase 4 as the canonical test location.

### Pattern 6: Dead Code Cleanup

**What:** Remove unused exports and duplicate types.

**Items to clean:**
1. `src/errors.ts` — `setupShutdownHandler` function (exported, never called). Remove the function and its interface `ShutdownDeps`.
2. `src/types.ts` — `ErrorCategory` type (line 49-53) duplicates `ErrorType` in `errors.ts` (line 8). `ErrorCategory` is never imported. Remove it.
3. `src/types.ts` — `DaemonOptions` interface (lines 75-78) is exported but never imported. Remove it.
4. `src/cli.ts` — `--callback` flag (lines 50-53) is defined but never read by `main()`. Either wire it to override the preset's callback URL, or remove it.
5. `src/cli.ts` — `--env-file` flag (lines 54-57) is defined but never read by `main()`. Either implement env-file loading, or remove it.

**Decision needed for --callback and --env-file:**
- `--callback`: The flag exists but `main()` doesn't use it. Looking at the original `scraper.js`, the callback was resolved from `CALLBACKS[argv.callback || DEFAULT_CALLBACK]`. In the TypeScript rewrite, this is handled via presets. The `--callback` flag should either be wired to override the preset's callback URL, or removed if presets handle all cases.
- `--env-file`: The flag exists but `main()` doesn't use it. CONFIG-04 says "Environment variable support with explicit --env-file flag." This needs implementation — load env vars from the specified file before running the pipeline.

### Anti-Patterns to Avoid

- **Don't create new test files in `tests/`:** That directory is legacy. Use `test/unit/` or `test/integration/`.
- **Don't add new dependencies:** Phase 6 fixes existing code only.
- **Don't change business logic:** Only fix integration issues, wire missing handlers, and clean dead code.
- **Don't rewrite the config system:** cosmiconfig and Zod work correctly — just fix their placement in package.json.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Env file loading | Custom .env parser | `dotenv` or Bun's built-in `Bun.file` + parse | Env file parsing has edge cases (quotes, comments, multiline) |
| Signal handling | Custom SIGINT wrapper | `process.on('SIGINT', ...)` directly | Node/Bun signal handling is straightforward |

**Key insight:** The non-daemon shutdown handler is just wiring — calling the existing `setupDaemonShutdown` pattern from `index.ts` for the non-daemon path. No new abstraction needed.

## Common Pitfalls

### Pitfall 1: Test Directory Confusion After Consolidation
**What goes wrong:** After deleting `tests/`, some tests may fail because `bunfig.toml` or `package.json` test scripts reference the old path.
**Why it happens:** Test configuration may hardcode paths.
**How to avoid:** Check `bunfig.toml` and `package.json` scripts for test path references before and after consolidation.
**Warning signs:** `bun test` fails with "no test files found" after consolidation.

### Pitfall 2: Module Resolution Change Breaking Imports
**What goes wrong:** Changing `moduleResolution` from `"bundler"` to `"bun"` may cause TypeScript errors if any imports use extensions differently.
**Why it happens:** Bun's resolver handles `.js` extensions in `.ts` imports differently than bundler mode.
**How to avoid:** Run `bun run tsc --noEmit` after the change. Fix any type errors.
**Warning signs:** TypeScript compilation errors after tsconfig change.

### Pitfall 3: Non-Daemon Shutdown Handler Race Condition
**What goes wrong:** The shutdown handler captures `browserRef` and `urls` by closure, but `browserRef` may be null if the browser hasn't launched yet.
**Why it happens:** SIGINT could arrive before `onBrowserReady` callback fires.
**How to avoid:** The handler already checks `if (browserRef)` before closing. Also use the same `shuttingDown` guard pattern from `setupDaemonShutdown`.
**Warning signs:** "Cannot read property 'close' of null" during early Ctrl+C.

### Pitfall 4: Removing --callback Flag Breaking Existing Usage
**What goes wrong:** If users pass `--callback` on the command line, removing the flag will cause yargs to error.
**Why it happens:** The flag exists but is undocumented/unused in main().
**How to avoid:** Wire the flag to override preset callback, or keep it and log a deprecation warning.
**Warning signs:** yargs "Unknown argument: callback" error.

## Code Examples

### Non-Daemon Shutdown Handler Wiring (index.ts)

```typescript
// After runScraper starts, wire shutdown for BOTH daemon and non-daemon paths:

// Capture browser reference (already exists at line 87)
let browserRef: import('playwright-core').Browser | null = null;

// Run scraper
const urls = await runScraper(options);

// Wire shutdown handlers — for BOTH daemon and non-daemon
const shutdownDeps = {
    saveState: () => {
        saveUrlsToFile(outputFile, urls);
        logger.info(`Saved ${urls.size} URLs during shutdown`);
    },
    cleanup: async () => {
        if (browserRef) {
            try { await browserRef.close(); } catch (err) { logger.error({ err }, 'Failed to close browser during shutdown'); }
        }
    },
    logger,
};

if (process.env.SCRAPER_DAEMON_CHILD === '1') {
    const { setupDaemonShutdown } = await import('./daemon.js');
    setupDaemonShutdown(shutdownDeps);
} else {
    // Non-daemon: wire shutdown handlers directly
    let shuttingDown = false;
    const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        logger.info(`Received ${signal}, shutting down...`);
        try { shutdownDeps.saveState(); } catch (err) { logger.error({ err }, 'Failed to save state'); }
        try { await shutdownDeps.cleanup(); } catch (err) { logger.error({ err }, 'Failed to cleanup'); }
        process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}
```

### Dependency Placement Fix (package.json)

```json
{
  "dependencies": {
    "cloakbrowser": "^0.3.28",
    "cosmiconfig": "^9.0.2",
    "p-retry": "^8.0.0",
    "pino": "^10.3.1",
    "playwright-core": "^1.53.0",
    "proper-lockfile": "^4.1.2",
    "yargs": "^18.0.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.5.2",
    "@types/bun": "^1.3.14",
    "@types/pino": "^7.0.5"
  }
}
```

### Module Resolution Fix (tsconfig.json)

```json
{
  "compilerOptions": {
    "moduleResolution": "bun"
  }
}
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `tests/` directory is Phase 1/2 legacy and can be deleted after confirming `test/` covers same cases | Test Consolidation | If `tests/` has unique coverage, deleting it loses tests |
| A2 | `--callback` flag should be wired to override preset callback (not removed) | Dead Code Cleanup | User may prefer removal |
| A3 | `--env-file` flag should be implemented per CONFIG-04 requirement | Dead Code Cleanup | User may defer this to v2 |
| A4 | `setupShutdownHandler` in errors.ts is dead code and can be removed | Dead Code Cleanup | If some code path calls it, removing breaks things |
| A5 | `ErrorCategory` in types.ts is dead code (duplicate of `ErrorType` in errors.ts) | Dead Code Cleanup | If some import uses it, removing causes TS error |

## Open Questions

1. **Should --callback be wired or removed?**
   - What we know: The flag exists in cli.ts but main() ignores it. Original scraper.js had a CALLBACKS registry.
   - What's unclear: User intent — does the user want CLI-level callback override?
   - Recommendation: Wire it to override the preset's callback URL. This is low-effort and maintains backward compatibility.

2. **Should --env-file be implemented now or deferred?**
   - What we know: CONFIG-04 requires it. The flag is defined but unused.
   - What's unclear: Whether this is in scope for Phase 6 or should be a separate phase.
   - Recommendation: Implement it — it's a small change (use Bun.env or dotenv-like loading) and CONFIG-04 explicitly requires it.

3. **How should tests/ consolidation be validated?**
   - What we know: `tests/` has 11 files, `test/` has 9 files with overlaps.
   - What's unclear: Whether every test case in `tests/` has a corresponding test in `test/`.
   - Recommendation: Run `bun test` before and after deletion. If tests drop, investigate which were unique to `tests/` and migrate them.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| bun | Test runner | ✓ | — | — |
| tsc | Type checking | ✓ | — | — |

**Missing dependencies with no fallback:** None.

## Validation Architecture

> Skip this section entirely — workflow.nyquist_validation is explicitly set to false in .planning/config.json.

## Sources

### Primary (HIGH confidence)
- `.planning/v1.0-v1.0-MILESTONE-AUDIT.md` — Audit findings, orphaned requirements, integration warnings
- `.planning/REQUIREMENTS.md` — All 42 v1.0 requirements with traceability
- Source code inspection — `src/cli.ts`, `src/config.ts`, `src/output.ts`, `src/webhook.ts`, `src/errors.ts`, `src/types.ts`, `src/index.ts`, `src/daemon.ts`

### Secondary (MEDIUM confidence)
- Previous phase summaries — Phase 1-5 SUMMARY.md files for completion claims

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new packages needed; all tools already in project
- Architecture: HIGH — Codebase fully read; patterns clearly identified from source inspection
- Pitfalls: HIGH — Pitfalls derived from actual code state (test duplication, dead code, missing wiring)

**Research date:** 2026-07-06
**Valid until:** 2026-08-06 (30 days — stable codebase, no fast-moving dependencies)
