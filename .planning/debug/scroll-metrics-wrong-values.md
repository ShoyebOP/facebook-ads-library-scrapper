---
status: investigating
trigger: "Per-scroll metrics fields (found, unique, scrollHeight) show wrong values"
created: 2026-07-08T00:00:00Z
updated: 2026-07-08T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Three independent calculation errors in scraper.ts per-scroll metrics section (lines 138-159)
test: Concrete trace through scroll 3 scenario confirmed all three bugs
expecting: Each variable mismatch confirmed
next_action: Return structured diagnosis

## Symptoms

expected: Per-scroll log message should show: found = total unfiltered URLs found THIS scroll, filtered = dupes removed this scroll, unique = URLs saved this scroll, scrollHeight = per-scroll height
actual: found shows unique/saved count instead of total unfiltered; unique shows same total as found instead of unique saved; scrollHeight shows cumulative total instead of per-scroll height
errors: None - values wrong but no crashes
reproduction: Run scraper with any query, observe per-scroll log output
started: Always broken since implementation

## Eliminated

## Evidence

- timestamp: 2026-07-08T00:01:00Z
  checked: scraper.ts line 145 - urlsFound computation
  found: "const urlsFound = targetSet.size - before" computes unique additions only (Set.size delta), not total unfiltered URLs intercepted by GraphQL
  implication: urlsFound misses filtered duplicates, showing only unique count

- timestamp: 2026-07-08T00:01:00Z
  checked: scraper.ts line 158 - log format string
  found: "Unique: ${runningTotal}, Total: ${runningTotal}" - both use same variable (targetSet.size), making Unique and Total identical
  implication: Unique field shows cumulative total instead of per-scroll unique additions

- timestamp: 2026-07-08T00:01:00Z
  checked: scraper.ts line 141 - scrollHeight computation
  found: "window.scrollY" returns current scroll position (distance from top), not total page height
  implication: scrollHeight grows as page grows, appearing "cumulative" rather than showing page height at this scroll

- timestamp: 2026-07-08T00:01:00Z
  checked: extractor.ts lines 81-86 - filtered count tracking
  found: extractor tracks filteredCountTotal (cumulative) and filteredCountLast per-response. getFilteredCount() returns cumulative total. filteredThisScroll = currentFiltered - previousFiltered gives per-scroll filtered count.
  implication: filteredThisScroll is correctly computed - the bug is only in how found/unique/scrollHeight are calculated

- timestamp: 2026-07-08T00:02:00Z
  checked: Concrete trace through scroll 3 scenario
  found: "Before: targetSet.size=45, previousFiltered=12. After scroll: targetSet.size=62 (17 unique added), filteredCountTotal=18 (6 filtered). urlsFound=62-45=17 (shows unique only, should be 23 total unfiltered). Unique in log=62 (cumulative, should be 17 per-scroll). scrollHeight=window.scrollY (scroll position, should be document.body.scrollHeight)."
  implication: All three bugs confirmed by concrete trace. filteredThisScroll=6 is the only correct metric.

## Resolution

root_cause: "Three independent calculation errors in scraper.ts per-scroll metrics (lines 138-159): (1) urlsFound = targetSet.size - before computes unique additions only (Set.size delta), but should be total unfiltered = unique + filtered; (2) Unique field in log uses runningTotal (cumulative targetSet.size) instead of per-scroll unique (targetSet.size - before); (3) scrollHeight uses window.scrollY (scroll position from top) instead of document.body.scrollHeight (total page height)"
fix: "Three changes needed in scraper.ts: (1) urlsFound = (targetSet.size - before) + filteredThisScroll; (2) Log Unique: ${targetSet.size - before} instead of Unique: ${runningTotal}; (3) Change window.scrollY to document.body.scrollHeight"
verification: ""
files_changed: ["src/scraper.ts"]
