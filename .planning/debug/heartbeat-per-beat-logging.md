---
status: diagnosed
trigger: "heartbeat logs only show when all 10 beats fail, does not show what happened in each beat"
created: 2026-07-08T00:00:00Z
updated: 2026-07-08T00:00:00Z
---

## Current Focus

hypothesis: "Heartbeat is gated inside the `targetSet.size === before` branch, so it only fires when no new URLs are found. The user wants per-beat detail regardless of whether URLs were found."
test: "Trace the heartbeat code path and confirm it never executes when URLs ARE found"
expecting: "Heartbeat code is only reachable when targetSet.size === before, confirming the root cause"
next_action: "Return structured diagnosis with root cause and fix direction"

## Symptoms

expected: "Each heartbeat beat logs what happened individually - URLs found, scroll height, etc. The user wants visibility into each beat, not just a summary after all beats fail."
actual: "The heartbeat log only fires when noNewUrlsCount reaches a threshold (after multiple scrolls with no new URLs). It shows a summary like 'no new leads in Xs (N/M dead scrolls)' but doesn't show per-beat metrics."
errors: "None - this is a missing feature gap in the heartbeat implementation."
reproduction: "Run the scraper. The heartbeat only appears when scrolls stop finding new URLs."
started: "Always been this way since heartbeat was added."

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-07-08T00:01:00Z
  checked: "scraper.ts lines 161-174 - heartbeat code path"
  found: "Heartbeat block (lines 163-170) is nested inside `if (targetSet.size === before)` which only executes when no new URLs found this scroll. The `else` branch (lines 171-173) resets counters but never logs anything."
  implication: "Heartbeat is structurally incapable of logging when URLs ARE found. This is the root cause."

- timestamp: 2026-07-08T00:02:00Z
  checked: "scraper.ts lines 138-159 - per-scroll metrics logging"
  found: "Per-scroll metrics are already logged at lines 151-159 (scrollHeight, urlsFound, filteredCount, runningTotal). These fire every scroll regardless of outcome."
  implication: "The per-scroll logging already captures the data the user wants in heartbeat. The heartbeat just needs to use the same metrics and fire on a timer, not gated by URL count."

## Resolution

root_cause: "The heartbeat is gated inside the `if (targetSet.size === before)` branch (line 161), so it only executes when no new URLs are found. The user wants per-beat detail regardless of whether URLs were found."
fix: ""
verification: ""
files_changed: []
