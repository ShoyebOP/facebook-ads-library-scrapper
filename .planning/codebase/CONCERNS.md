# Codebase Concerns

**Analysis Date:** 2026-07-07

## Tech Debt

**Duplicate env file loading logic:**
- Issue: The `--env-file` loading code is copy-pasted identically in both `src/cli.ts` (lines 99-122) and `src/index.ts` (lines 38-60). `cli.ts` parses the env file into `process.env` and then calls `main()` in `index.ts`, which parses the *same* env file again. The double-load is wasteful and the two implementations could drift.
- Files: `src/cli.ts` (lines 99-122), `src/index.ts` (lines 38-60)
- Impact: Duplicated code that could diverge silently; env vars set twice per run; if `main()` is ever called without `cli.ts` (e.g., programmatic usage), the `cli.ts` load never runs — but the `index.ts` safety net catches it. The redundancy is confusing rather than harmful.
- Fix approach: Remove the env file loading from `cli.ts` and keep only the one in `index.ts` (the safety net), OR remove from `index.ts` and document that `cli.ts` is the only entry point. The `index.ts` comment says "safety net for when CLI entry point is bypassed" — decide which contract wins.

**Duplicate shutdown handler logic:**
- Issue: The non-daemon shutdown handler in `src/index.ts` (lines 152-174) duplicates the `setupDaemonShutdown` pattern in `src/daemon.ts` (lines 126-160). Both implement the same `shuttingDown` flag + save + cleanup + exit pattern, but the non-daemon path inlines it instead of reusing the function.
- Files: `src/index.ts` (lines 152-174), `src/daemon.ts` (lines 126-160)
- Impact: Bug fixes to shutdown logic must be applied in two places. The daemon version handles `saveState` failure gracefully; the non-daemon version has slightly different error handling (saves URLs directly instead of calling a `saveState` callback).
- Fix approach: Refactor `setupDaemonShutdown` to work for both daemon and non-daemon contexts (it already accepts callbacks), and call it from `index.ts` in both branches.

**Browser crash not recovered:**
- Issue: If the browser crashes mid-scroll loop, the error propagates and the scraper terminates. There is no restart/retry logic for browser crashes during a scrape session — only the initial `launchBrowser` call has retry via `withRetry` (`src/browser.ts:31`).
- Files: `src/scraper.ts` (lines 58-171), `src/browser.ts` (lines 30-34)
- Impact: A transient browser crash (e.g., OOM, Facebook anti-bot detection) kills the entire scrape. All collected URLs up to that point are saved (thanks to the incremental saver), but the session cannot resume.
- Fix approach: Add a try/catch around the scroll loop body to detect browser crashes (classified as `'browser'` errors by `classifyError`) and optionally restart the browser or exit gracefully with saved state.

**`withTimeout` leaks timers on resolution:**
- Issue: The `setTimeout` in `withTimeout` (`src/errors.ts:42`) is never cleared when the wrapped promise resolves first. The timer fires after resolution and the rejection callback runs (doing nothing harmful since the promise is already settled), but the timer is held in memory until it fires.
- Files: `src/errors.ts` (lines 38-44)
- Impact: Minor memory and timer leak. For short timeouts (15s, 60s) this is negligible, but for long-running operations it could accumulate. In the worst case with many concurrent extractions, many zombie timers exist simultaneously.
- Fix approach: Use `AbortSignal.timeout()` instead of `Promise.race` with `setTimeout`, or clear the timeout on resolution using `clearTimeout`.

## Known Bugs

**Daemon tests write to project root:**
- Symptoms: `test/unit/daemon.test.ts` and `test/integration/daemon.test.ts` call `writePid(12345)` which writes to `.daemon.pid` relative to CWD. If CWD is the project root during tests, these tests create/modify `.daemon.pid` and `daemon.log` in the working directory.
- Files: `test/unit/daemon.test.ts` (lines 25, 46), `test/integration/daemon.test.ts` (lines 33, 54)
- Trigger: Running `bun test` from project root.
- Workaround: The `beforeEach`/`afterEach` blocks clean up the files, but test failure mid-test leaves artifacts. The constants `PID_FILE` and `LOG_FILE` are relative paths hardcoded in `src/daemon.ts`.

**`--callback` flag type mismatch:**
- Symptoms: The `--callback` CLI flag is typed as `string` and expects a callback URL (`src/cli.ts:50-53`), but it's assigned to `webhookUrl` in `src/index.ts:87` which feeds into `notifyWebhook`. However, in `cli.ts:50` the flag is described as "Webhook callback name (overrides preset)" — suggesting it should be a *name* (like `preset`), not a raw URL. The naming is inconsistent.
- Files: `src/cli.ts` (line 50-53), `src/index.ts` (line 86-89)
- Trigger: User passes `--callback leadgen` expecting preset resolution but gets a URL-lookup failure in `notifyWebhook`.
- Workaround: Users must pass the full URL string with `--callback`.

**Output path uses local time without timezone awareness:**
- Symptoms: `generateOutputPath` in `src/output.ts:14-19` uses `new Date()` which reflects the system timezone. If the scraper runs on a server in UTC but the user expects local filenames, the timestamps may be off. The browser can be configured with a timezone (`--timezone`), but the output filename doesn't honor it.
- Files: `src/output.ts` (lines 14-19)
- Trigger: Running on a server with different timezone than the target region.
- Workaround: None — the output filename is always in the server's local time.

## Security Considerations

**Env file loaded directly into `process.env`:**
- Risk: The `--env-file` feature (`src/cli.ts:115`, `src/index.ts:54`) reads an arbitrary file and sets each `KEY=VALUE` line as an environment variable. There is no validation of key names, no allowlist, and no sanitization. A malicious env file could overwrite critical Node.js internals (e.g., `NODE_OPTIONS`, `PATH`).
- Files: `src/cli.ts` (lines 99-122), `src/index.ts` (lines 38-60)
- Current mitigation: The user controls which file to pass via `--env-file`.
- Recommendations: Add an allowlist of permitted env var keys, or at minimum skip keys starting with `NODE_` and `BUN_`. Document the security implication.

**Webhook URLs committed to config.json:**
- Risk: `config.json` contains full webhook URLs (`https://automation.zaktomate.com/webhook/leadgen-zaktomate`). While `.gitignore` lists `config.json`, it currently exists in the repo (not tracked per `git ls-files`).
- Files: `config.json`
- Current mitigation: `.gitignore` contains `config.json` entry.
- Recommendations: Ensure `config.json` is never committed. Add `config.json` to a `.gitignore` check in CI.

**Proxy credentials in launch options:**
- Risk: Proxy URLs containing credentials (e.g., `http://user:pass@host:port`) are passed to `cloakbrowser` launch options. The logger in `src/browser.ts:28` logs `launchOpts` at debug level, which includes the proxy string.
- Files: `src/browser.ts` (lines 14-28)
- Current mitigation: `src/logger.ts:10` configures pino redaction for `proxy` and `*.proxy` keys.
- Recommendations: The redaction covers pino structured logging. Verify that `console.log` calls elsewhere don't leak proxy strings. The redaction config is good.

**Daemon PID file in project root:**
- Risk: `.daemon.pid` is written to the current working directory (`src/daemon.ts:10`). If the scraper runs from a sensitive directory, the PID file is created there. The PID file contains a process ID that could be used to send signals.
- Files: `src/daemon.ts` (line 10)
- Current mitigation: PID file is listed in `.gitignore` as `*.pid`.
- Recommendations: Consider writing the PID file to a temp directory or a dedicated `.daemon/` directory instead of the project root.

## Performance Bottlenecks

**Recursive `extractProfileUrls` on large GraphQL responses:**
- Problem: `extractProfileUrls` (`src/extractor.ts:10-29`) performs a depth-first recursive traversal of the entire JSON response tree. For very large GraphQL responses (megabytes of nested data), this could cause stack overflow or high CPU usage.
- Files: `src/extractor.ts` (lines 10-29)
- Cause: Unbounded recursion on arbitrary JSON depth. No depth limit is enforced.
- Improvement path: Add a max depth parameter (e.g., 50) to prevent stack overflow on pathological inputs. Convert to iterative traversal using an explicit stack for very deep structures.

**Incremental saver writes entire file on each save:**
- Problem: `saveUrlsToFile` (`src/output.ts:30-33`) serializes the entire URL set to JSON and overwrites the file each time. As the URL count grows (thousands), each save becomes progressively more expensive in CPU and I/O.
- Files: `src/output.ts` (lines 30-33)
- Cause: Overwrite semantics — the entire array is re-serialized on every save.
- Improvement path: For very large sets, consider append-based JSON or streaming writes. For current scale (hundreds to low thousands), this is acceptable.

**DOM cleanup runs on every scroll:**
- Problem: The DOM cleanup (`src/scraper.ts:111-129`) queries all `[role="row"]` elements and checks their bounding rects on every scroll iteration. This runs even when the page has few elements.
- Files: `src/scraper.ts` (lines 111-129)
- Cause: No conditional check on page size before running cleanup.
- Improvement path: Only run DOM cleanup after a minimum scroll count (e.g., after 10 scrolls) or when the page has a minimum number of rows.

## Fragile Areas

**GraphQL response structure dependency:**
- Files: `src/extractor.ts` (lines 10-29), `test/fixtures/graphql-response.json`
- Why fragile: The scraper relies on Facebook's internal GraphQL response structure (`edges → node → sponsored_item → page_profile_uri`). Facebook can change this structure at any time without notice, breaking extraction silently (0 URLs collected, no errors).
- Safe modification: The extraction logic is isolated to `extractProfileUrls`. When Facebook changes its API, only `extractor.ts` needs updating. Maintain the fixture file `test/fixtures/graphql-response.json` as a contract reference.
- Test coverage: Well covered by unit tests in `test/unit/extractor.test.ts` and e2e tests in `test/e2e/scraper.test.ts`.

**Browser launch dependency on cloakbrowser:**
- Files: `src/browser.ts` (lines 3-40)
- Why fragile: The entire anti-detection capability depends on `cloakbrowser` (a third-party package at `^0.3.28`). If the package is abandoned, has a breaking change, or Facebook updates its detection, the scraper breaks entirely. The browser tests (`test/unit/browser.test.ts`) can't actually test the launch — they catch and swallow errors, testing only the source code text.
- Safe modification: The launch options are configuration-driven. If `cloakbrowser` needs replacement, only `src/browser.ts` changes.
- Test coverage: No behavioral tests for browser launch — all tests are source-inspection (checking source contains expected strings). The package is assumed to work.

**Daemon forking model:**
- Files: `src/daemon.ts` (lines 57-93), `src/index.ts` (lines 62-69)
- Why fragile: Daemon mode uses `child_process.fork` with `detached: true`. The parent process prints the PID and exits. If the child crashes before writing its PID, or if the PID file becomes stale (e.g., machine reboot), the `stopDaemon` command will fail to find/kill the process. The `proper-lockfile` dependency prevents concurrent daemon starts, but lock files can also become stale.
- Safe modification: The daemon code is self-contained in `src/daemon.ts`. Changes to the fork/shutdown model are isolated.
- Test coverage: Unit tests cover PID file operations. Integration tests verify the module exports but don't actually fork processes.

**Auto-scroll loop stopping conditions:**
- Files: `src/scraper.ts` (lines 88-153)
- Why fragile: The loop stops when either `maxNoNewScrolls` consecutive scrolls yield no new URLs, or `maxUrls` is reached. If Facebook changes how ads load (e.g., lazy loading with different scroll triggers), the scraper may stop prematurely or loop forever. The `maxNoNewScrolls` default of 10 is a heuristic.
- Safe modification: All scroll parameters are constants at the top of `scraper.ts`. Adjust thresholds without changing logic.
- Test coverage: No behavioral tests for the scroll loop (would require a live browser). The `withTimeout` wrapper protects against hangs.

## Scaling Limits

**Single-process concurrent scraping:**
- Current capacity: One scraper session per `bun scraper.js` invocation. Daemon mode runs one background process at a time (enforced by PID lock).
- Limit: Cannot scrape multiple queries in parallel without launching separate processes manually.
- Scaling path: The `--daemon` flag already forks a child process. To run multiple queries, invoke the CLI multiple times. A future enhancement could add a job queue or batch mode.

**Memory growth during long scrapes:**
- Current capacity: URLs stored in an in-memory `Set<string>` (`src/scraper.ts:49`). DOM cleanup removes processed rows, but the Set grows monotonically.
- Limit: At ~1000 URLs with average 80-char strings, memory is ~80KB — negligible. At 100K+ URLs, the Set takes ~8MB plus the full GraphQL response JSON objects held in memory during extraction.
- Scaling path: The incremental saver (`src/output.ts:37-48`) periodically writes to disk, but the Set is never pruned. For extreme scale, consider a streaming/paginated approach.

## Dependencies at Risk

**cloakbrowser (`^0.3.28`):**
- Risk: Third-party stealth browser library. Version `0.3.x` suggests pre-1.0 stability. If unmaintained, Facebook detection bypass degrades over time.
- Impact: Browser launches fail or are detected by Facebook, breaking the entire scraper.
- Migration plan: Replace with Playwright + stealth plugins (e.g., `playwright-extra` + `stealth` plugin) if cloakbrowser becomes unavailable. The abstraction in `src/browser.ts` isolates this dependency.

**proper-lockfile (`^4.1.2`):**
- Risk: Used for daemon PID file locking (`src/daemon.ts:5`). Lock files can become stale after crashes or reboots, preventing new daemon starts.
- Impact: Daemon mode becomes unusable until stale lock files are manually removed.
- Migration plan: Consider `proper-lockfile` with `stale` option (already configured at 5 retries, but stale detection timeout is not explicitly set). Alternatively, use PID-based locking with `isProcessRunning` checks.

**@types/pino (`^7.0.5`) vs pino (`^10.3.1`):**
- Risk: The `@types/pino` version is at `^7.0.5` while the actual `pino` package is at `^10.3.1`. This version mismatch may cause incorrect type definitions for newer pino APIs.
- Impact: TypeScript compilation may not catch incorrect logger usage if types are outdated.
- Migration plan: Update `@types/pino` to a version matching pino 10.x, or switch to pino's built-in TypeScript support (pino 8+ ships its own types).

## Missing Critical Features

**No rate limiting / throttling:**
- Problem: The scraper makes unbounded GraphQL requests as fast as Facebook serves them. There is no configurable rate limit or request-per-second cap.
- Blocks: Large-scale scraping runs risk Facebook rate limiting or IP banning. The `SCROLL_INTERVAL_MS` of 2500ms is the only throttle.

**No retry on browser crash during scraping:**
- Problem: If the browser crashes mid-scrape, all collected URLs are saved but the scrape cannot resume. There is no session persistence or checkpoint mechanism.
- Blocks: Long-running scrape sessions (hours) are vulnerable to browser instability.

**No structured output schema validation:**
- Problem: The output JSON file contains a bare array of URL strings (`["https://...", ...]`). There is no metadata (query, timestamp, count, version) embedded in the file.
- Blocks: Downstream consumers cannot determine when or how the data was collected without parsing the filename.

**No progress reporting for external systems:**
- Problem: During a scrape, progress (URL count, scroll count) is only logged locally. There is no mechanism to stream progress to external monitoring systems.
- Blocks: Integration with CI/CD or monitoring dashboards requires parsing log files.

## Test Coverage Gaps

**Source-inspection tests (brittle, not behavioral):**
- What's not tested: Many tests in `test/unit/browser.test.ts`, `test/unit/errors.test.ts` (browser/extractor sections), `src/webhook.test.ts`, `src/output.test.ts` (source verification blocks) read source files with `fs.readFileSync` and assert on string content (e.g., `expect(source).toContain('withRetry')`). These verify code *exists* but not that it *works correctly*.
- Files: `test/unit/browser.test.ts` (lines 73-115), `test/unit/errors.test.ts` (lines 157-185), `src/webhook.test.ts` (lines 124-176), `src/output.test.ts` (lines 156-180)
- Risk: Source text changes (refactoring variable names, reformatting) break tests without behavioral change. Conversely, actual bugs slip through because the behavior isn't exercised.
- Priority: High — replace source-inspection tests with behavioral tests using mocks for external dependencies (cloakbrowser, HTTP).

**No tests for `main()` pipeline orchestration:**
- What's not tested: The `main()` function in `src/index.ts` wires config → scraper → output → webhook together, but `test/integration/cli.test.ts` mocks all dependencies (`runScraper`, `loadConfig`, etc.) so the actual wiring is never exercised.
- Files: `src/index.ts` (lines 33-196), `test/integration/cli.test.ts` (all)
- Risk: Integration bugs (wrong function call order, missing await, incorrect argument passing) go undetected.
- Priority: High — add a true integration test that wires real output saving with a temp directory.

**No tests for scroll loop behavior:**
- What's not tested: The auto-scroll loop in `src/scraper.ts` (lines 88-153) — scrolling, DOM cleanup, heartbeat logging, no-new-URLs counting — has zero behavioral tests.
- Files: `src/scraper.ts` (lines 88-153)
- Risk: Scroll-related regressions (wrong timeout, broken cleanup logic, incorrect stopping condition) go undetected.
- Priority: Medium — would require Playwright page mocking, which is complex. Consider E2E tests with a local HTML page.

**No tests for `config.ts` cosmiconfig integration:**
- What's not tested: The cosmiconfig-based config loading (`src/config.ts`) is tested only for the `resolvePreset` function. The `loadConfig` function's cosmiconfig integration (search strategy, file format support) is untested.
- Files: `src/config.ts` (lines 58-68), `test/unit/config.test.ts`
- Risk: Config loading breaks silently for users with non-standard config file locations.
- Priority: Low — cosmiconfig is well-tested; integration is straightforward.

---

*Concerns audit: 2026-07-07*
