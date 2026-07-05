# Phase 5 Plan Check

**Checked:** 2026-07-06
**Plans:** 2 (05-01-PLAN.md, 05-02-PLAN.md)
**Status:** ISSUES FOUND — 2 blocker(s), 2 warning(s)

## Dimension Summary

| Dimension | Status |
|-----------|--------|
| 1. Requirement Coverage | ✅ PASS |
| 2. Task Completeness | ✅ PASS |
| 3. Dependency Correctness | ✅ PASS |
| 4. Key Links Planned | ✅ PASS |
| 5. Scope Sanity | ✅ PASS |
| 6. Verification Derivation | ✅ PASS |
| 7. Context Compliance | ❌ FAIL |
| 7b. Scope Reduction | ✅ PASS |
| 8. Nyquist Compliance | SKIPPED (disabled) |
| 9. Cross-Plan Data Contracts | ❌ FAIL |
| 10. AGENTS.md Compliance | ✅ PASS |
| 11. Research Resolution | ⚠️ WARNING |
| 12. Pattern Compliance | ✅ PASS |

## Blockers

### B1. [context_compliance] D-15 not covered — silent error swallowing in cleanup callback

- **Plan:** 05-02
- **Task:** 1
- **Decision:** D-15: "Fix silent error swallowing: add logging to catch blocks in daemon.ts"
- **Problem:** Plan 05-02 Task 1 action includes `try { await browser.close(); } catch {}` — an empty catch block that silently swallows errors. CONTEXT.md D-15 explicitly requires adding logging to catch blocks in daemon.ts. The plan's action contradicts the locked decision.
- **Fix:** Change the empty catch to `catch (err) { logger.error({ err }, 'Failed to close browser during shutdown'); }` in the cleanup callback.

### B2. [cross_plan_data_contract] Plan 02 modifies src/types.ts but doesn't declare it in files_modified

- **Plan:** 05-02
- **Task:** 1
- **Problem:** Plan 05-02 Task 1 action step 1 says "In `src/types.ts`, add `onBrowserReady?: (browser: Browser) => void` to ScraperOptions" and acceptance criteria includes "src/types.ts has onBrowserReady optional property". However, Plan 05-02's frontmatter `files_modified` only lists `src/index.ts` and `src/scraper.ts` — `src/types.ts` is missing. This creates a cross-plan contract issue: Plan 01 modifies types.ts (adds `incrementalSaver`), Plan 02 also needs to modify it (adds `onBrowserReady`), but the file isn't declared. The executor may skip the modification or get confused about which plan owns the change.
- **Fix:** Add `src/types.ts` to Plan 05-02's `files_modified` frontmatter field.

## Warnings

### W1. [context_compliance] D-16 not covered — double log file cleanup bug

- **Plan:** 05-01, 05-02
- **Decision:** D-16: "Remove double log file cleanup bug (if present in new code)"
- **Problem:** Neither plan addresses D-16. The CONTEXT.md says "(if present in new code)" — if the bug doesn't exist in the current TypeScript codebase (it was in the old scraper.js), this should be explicitly noted as N/A. If it does exist, a task is needed. The current plans silently ignore this decision.
- **Fix:** Either add a brief verification step confirming the bug doesn't exist in current code, or explicitly note in must_haves/truths that D-16 was verified as not applicable.

### W2. [research_resolution] Open questions not resolved

- **File:** 05-RESEARCH.md
- **Problem:** RESEARCH.md has `## Open Questions` section without `(RESOLVED)` suffix. Two questions remain:
  1. "Should proxy URL format validation be added?" — recommendation given but not marked RESOLVED
  2. "Should shutdown handlers be wired for non-daemon mode too?" — recommendation given but not marked RESOLVED
- **Fix:** Mark each question with inline `RESOLVED` and add `(RESOLVED)` to the section heading. The plans already make reasonable choices (skip URL format validation, daemon-only shutdown), so this is a documentation gap, not a planning gap.

## Structured Issues

```yaml
issues:
  - plan: "05-02"
    dimension: "context_compliance"
    severity: "blocker"
    description: "D-15 not covered — empty catch {} in cleanup callback contradicts 'add logging to catch blocks' requirement"
    task: 1
    fix_hint: "Change `catch {}` to `catch (err) { logger.error({ err }, 'Failed to close browser during shutdown'); }`"

  - plan: "05-02"
    dimension: "cross_plan_data_contract"
    severity: "blocker"
    description: "Plan 02 modifies src/types.ts (adds onBrowserReady) but files_modified only lists index.ts and scraper.ts"
    task: 1
    fix_hint: "Add src/types.ts to Plan 05-02 files_modified frontmatter"

  - plan: "05-01, 05-02"
    dimension: "context_compliance"
    severity: "warning"
    description: "D-16 (double log file cleanup) not addressed — should be verified as N/A or explicitly covered"
    fix_hint: "Add a verification step or truth confirming D-16 is not applicable to current TypeScript codebase"

  - plan: null
    dimension: "research_resolution"
    severity: "warning"
    description: "RESEARCH.md Open Questions section not marked RESOLVED"
    fix_hint: "Add RESOLVED markers to each question and section heading"
```

## Coverage Matrices

### Requirement Coverage

| Requirement | Plan 05-01 | Plan 05-02 | Status |
|-------------|------------|------------|--------|
| DAEMON-01 | ✅ | — | Covered |
| DAEMON-04 | — | ✅ | Covered |
| SCRAPE-10 | ✅ | ✅ | Covered |
| OUTPUT-02 | — | ✅ | Covered |

### Decision Coverage

| Decision | Plan 05-01 | Plan 05-02 | Status |
|----------|------------|------------|--------|
| D-01 | ✅ | — | Covered |
| D-02 | ✅ | — | Covered |
| D-03 | ✅ | — | Covered |
| D-04 | ✅ | — | Covered |
| D-05 | — | ✅ | Covered |
| D-06 | — | ✅ | Covered |
| D-07 | — | ✅ | Covered |
| D-08 | — | ✅ | Covered |
| D-09 | ✅ | ✅ | Covered |
| D-10 | — | ✅ | Covered |
| D-11 | — | ✅ | Covered |
| D-12 | — | ✅ | Covered |
| D-13 | N/A (already removed) | — | N/A |
| D-14 | ✅ | — | Covered |
| D-15 | — | ❌ | **NOT COVERED** |
| D-16 | — | ❌ | **NOT COVERED** |

### Plan Summary

| Plan | Tasks | Files | Wave | Status |
|------|-------|-------|------|--------|
| 05-01 | 2 | 4 | 1 | Valid (structure) |
| 05-02 | 2 | 2 (+1 undeclared) | 2 | Valid (structure) |

## Recommendation

2 blocker(s) require revision. Returning to planner with feedback.

**Required fixes before execution:**
1. Plan 05-02: Add logging to the empty catch block in cleanup callback (D-15)
2. Plan 05-02: Add `src/types.ts` to files_modified frontmatter

**Recommended fixes:**
3. Verify D-16 is N/A and document it
4. Mark RESEARCH.md open questions as RESOLVED
