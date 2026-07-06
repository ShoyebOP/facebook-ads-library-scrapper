---
status: diagnosed
trigger: "Ctrl+C during scraping closes the script immediately instead of gracefully shutting down (saving URLs, closing browser, exiting cleanly)."
created: 2026-07-05T00:00:00Z
updated: 2026-07-05T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — setupShutdownHandler is defined in errors.ts but never imported or called from any file
test: grep for setupShutdownHandler across codebase
expecting: only definition site, no call sites
next_action: return diagnosis

## Symptoms

expected: Ctrl+C triggers graceful shutdown: save URLs, close browser, exit with code 0
actual: process terminates immediately without cleanup
errors: (none — silent termination)
reproduction: run scraper, press Ctrl+C
started: always broken (handler never wired up)

## Eliminated

(none — root cause confirmed on first hypothesis)

## Evidence

- timestamp: 2026-07-05T00:00:00Z
  checked: grep for "setupShutdownHandler" across src/
  found: only 1 match — the function definition in errors.ts:118. Zero call sites.
  implication: SIGINT/SIGTERM handlers are never registered. Default Node/Bun behavior kills process immediately.

- timestamp: 2026-07-05T00:00:00Z
  checked: src/scraper.ts imports
  found: imports withTimeout from errors.js but NOT setupShutdownHandler
  implication: scraper.ts is the logical place to wire the handler (it owns the browser lifecycle) but doesn't

- timestamp: 2026-07-05T00:00:00Z
  checked: src/index.ts and src/cli.ts
  found: no signal handler registration anywhere in the call chain
  implication: no fallback handler exists either

## Resolution

root_cause: setupShutdownHandler (errors.ts:118) is defined and exported but never imported or called from any file in the project. The SIGINT/SIGTERM handlers are never registered, so the default runtime behavior (immediate termination) takes effect on Ctrl+C.

fix: (not applied — diagnosis only)

verification: (not applied)

files_changed: []
