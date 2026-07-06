---
phase: 06-milestone-v1-0-gaps-found-score-32-42-requirements-satisfied
plan: 01
subsystem: config
tags: [cosmiconfig, yargs, zod, typescript, shutdown-handler]

# Dependency graph
requires:
  - phase: 05-fix-milestone-gaps
    provides: [daemon shutdown handler pattern, error classification system]
provides:
  - [runtime dependencies correctly placed in package.json]
  - [TypeScript moduleResolution set to bundler]
  - [--callback CLI flag wired to override preset callback URL]
  - [non-daemon SIGINT/SIGTERM shutdown handlers]
  - [dead setupShutdownHandler removed from errors.ts]
affects: [06-02]

# Tech tracking
tech-stack:
  added: []
  patterns: [shutdown-handler-wiring]

key-files:
  created: []
  modified: [package.json, tsconfig.json, src/index.ts, src/errors.ts, src/cli.ts]

key-decisions:
  - "Kept moduleResolution as bundler because bun is not a valid TypeScript option"
  - "Wired --callback flag to override preset callback URL instead of removing it"

patterns-established:
  - "Non-daemon shutdown handler: direct process.on(SIGINT/SIGTERM) with shuttingDown guard"

requirements-completed: [SETUP-05, SETUP-06, SETUP-02, SCRAPE-01, SCRAPE-02, CONFIG-05, DAEMON-04, SCRAPE-10]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Runtime dependencies (cosmiconfig, yargs, zod) moved to dependencies section"
    requirement: SETUP-05
    verification:
      - kind: unit
        ref: "package.json#dependencies"
        status: pass
    human_judgment: false
  - id: D2
    description: "TypeScript moduleResolution set to bundler"
    requirement: SETUP-02
    verification:
      - kind: unit
        ref: "tsconfig.json#moduleResolution"
        status: pass
    human_judgment: false
  - id: D3
    description: "--callback CLI flag overrides preset callback URL"
    requirement: SCRAPE-01
    verification:
      - kind: unit
        ref: "src/index.ts#callback override"
        status: pass
    human_judgment: false
  - id: D4
    description: "Non-daemon CLI runs respond to SIGINT/SIGTERM with graceful shutdown"
    requirement: SCRAPE-10
    verification:
      - kind: unit
        ref: "src/index.ts#shutdown handler"
        status: pass
    human_judgment: false
  - id: D5
    description: "Dead setupShutdownHandler removed from errors.ts"
    requirement: SCRAPE-02
    verification:
      - kind: unit
        ref: "src/errors.ts#no setupShutdownHandler"
        status: pass
    human_judgment: false

# Metrics
duration: 2min
completed: 2026-07-06
status: complete
---

# Phase 6 Plan 1: Fix Integration Warnings Summary

**Fixed 3 integration warnings from v1.0 milestone audit: dependency placement, module resolution, and orphaned shutdown handler**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-06T07:57:04Z
- **Completed:** 2026-07-06T07:59:48Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Moved cosmiconfig, yargs, and zod from devDependencies to dependencies
- Wired --callback CLI flag to override preset callback URL
- Wired non-daemon SIGINT/SIGTERM shutdown handlers
- Removed dead setupShutdownHandler from errors.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix package.json dependencies, tsconfig moduleResolution, and wire --callback override** - `cacbcf0` (fix)
2. **Task 2: Wire non-daemon shutdown handlers and remove dead setupShutdownHandler from errors.ts** - `bb2e1f1` (fix)

## Files Created/Modified
- `package.json` - Moved runtime dependencies to correct section
- `tsconfig.json` - Verified moduleResolution is bundler
- `src/index.ts` - Added --callback override and non-daemon shutdown handlers
- `src/errors.ts` - Removed dead setupShutdownHandler function
- `src/cli.ts` - --callback flag already defined, no changes needed

## Decisions Made
- Kept moduleResolution as bundler because bun is not a valid TypeScript option (despite plan saying to change to bun)
- Wired --callback flag to override preset callback URL instead of removing it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] TypeScript moduleResolution cannot be set to bun**
- **Found during:** Task 1 (tsconfig moduleResolution fix)
- **Issue:** TypeScript does not support moduleResolution: "bun" - only node16, nodenext, bundler are valid
- **Fix:** Kept moduleResolution as bundler which is the correct setting for Bun-native projects
- **Files modified:** tsconfig.json
- **Verification:** TypeScript compilation shows no new errors from this change
- **Committed in:** cacbcf0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Deviation necessary for correctness - TypeScript does not support the requested option. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in third-party type definitions (thread-stream, proper-lockfile) and test files - not related to our changes

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 06-01 complete, ready for plan 06-02
- All integration warnings from milestone audit resolved

---
*Phase: 06-milestone-v1-0-gaps-found-score-32-42-requirements-satisfied*
*Completed: 2026-07-06*
