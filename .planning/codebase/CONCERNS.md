# Codebase Concerns

**Analysis Date:** 2026-06-29

## Tech Debt

**Single-File Architecture:**
- Issue: Entire scraper logic is in one 260-line file (`scraper.js`) with no separation of concerns
- Files: `scraper.js`
- Impact: Difficult to test, maintain, or extend; CLI parsing, browser automation, webhook notification, and file I/O all mixed together
- Fix approach: Extract into modules: `cli.js` (argument parsing), `browser.js` (automation), `scraper.js` (orchestration), `webhook.js` (notifications), `storage.js` (file I/O)

**Hardcoded Configuration:**
- Issue: Webhook URLs, base URL, country code (`BD`), and callback names are hardcoded in source
- Files: `scraper.js:8-16`
- Impact: Requires code changes for new callbacks or different countries; no environment-based configuration
- Fix approach: Move to environment variables or a config file (e.g., `config.json` or `.env`)

**No Input Validation:**
- Issue: CLI arguments like `--proxy`, `--max-urls`, `--max-no-new-scrolls` are not validated
- Files: `scraper.js:20-30`
- Impact: Invalid proxy URL causes cryptic browser error; non-numeric max values cause `NaN` comparisons
- Fix approach: Add validation with clear error messages; use a CLI parsing library (yargs, commander)

**No Retry Logic:**
- Issue: Browser launch, page navigation, and GraphQL parsing have no retry mechanism
- Files: `scraper.js:134,177,151`
- Impact: Transient network errors cause immediate failure; no resilience against Facebook rate limiting
- Fix approach: Add exponential backoff retry wrapper for critical operations

## Known Bugs

**Double Log File Cleanup:**
- Symptoms: `fs.unlinkSync(logFile)` called both in shutdown handler (line 170) and after main loop (line 238)
- Files: `scraper.js:170,238`
- Trigger: Normal execution completes successfully
- Workaround: Silent failure (caught by try/catch); wasteful system call

**Missing Proxy Argument Validation:**
- Symptoms: Running `--proxy` without a value causes `args[proxyIdx + 1]` to be `undefined`, passed to browser launch
- Files: `scraper.js:23`
- Trigger: `bun scraper.js "query" --proxy`
- Workaround: Always provide a URL after `--proxy`

**Silent Error Swallowing:**
- Symptoms: Multiple `catch {}` blocks with no logging (lines 169-170)
- Files: `scraper.js:169-170`
- Trigger: Browser close or log file deletion fails
- Workaround: None; errors are silently ignored

## Security Considerations

**Hardcoded Webhook URLs:**
- Risk: Webhook endpoints are committed to source code; if repository is public, automation endpoints are exposed
- Files: `scraper.js:8-11`
- Current mitigation: Repository appears private
- Recommendations: Move to environment variables; add webhook authentication (HMAC signature)

**No Webhook Authentication:**
- Risk: Webhook POST requests have no authentication; any party can call the endpoint or spoof responses
- Files: `scraper.js:103-114`
- Current mitigation: None
- Recommendations: Add HMAC signature verification; use webhook secrets

**Proxy Credential Exposure:**
- Risk: Proxy URL with credentials could appear in error messages or logs
- Files: `scraper.js:23,132`
- Current mitigation: None
- Recommendations: Sanitize proxy URL before logging; mask credentials in error output

**No HTTPS Verification for Webhooks:**
- Risk: Webhook endpoints use HTTP/HTTPS without certificate verification
- Files: `scraper.js:100`
- Current mitigation: Uses Node.js default (which verifies)
- Recommendations: Explicitly verify certificates; consider adding certificate pinning

## Performance Bottlenecks

**Fixed Scroll Timing:**
- Problem: 2500ms wait between scrolls regardless of page load speed
- Files: `scraper.js:195`
- Cause: Hardcoded delay; no adaptive timing based on network response
- Improvement path: Wait for network idle or detect new content before scrolling

**Aggressive DOM Cleanup:**
- Problem: DOM cleanup runs every scroll iteration, even when no new content is loaded
- Files: `scraper.js:198-211`
- Cause: Cleanup is not conditional on new content being loaded
- Improvement path: Only run cleanup when new URLs are found; increase threshold from 500px

**In-Memory URL Storage:**
- Problem: All URLs stored in JavaScript Set; no persistence until completion
- Files: `scraper.js:136`
- Cause: No incremental saving mechanism
- Improvement path: Write to file periodically (e.g., every 100 new URLs) or on crash

**No Connection Pooling:**
- Problem: Each webhook request creates a new HTTP/HTTPS connection
- Files: `scraper.js:97-115`
- Cause: No connection reuse
- Improvement path: Use a shared HTTP agent with keep-alive

## Fragile Areas

**Facebook GraphQL Response Parsing:**
- Files: `scraper.js:60-76`
- Why fragile: Relies on `page_profile_uri` field existing in nested GraphQL response; Facebook can change response structure at any time
- Safe modification: Add defensive null checks; log response structure for debugging; add fallback extraction patterns
- Test coverage: None

**DOM Selector Reliance:**
- Files: `scraper.js:200`
- Why fragile: Uses `[role="row"]` selector to identify ad cards; Facebook can change DOM structure
- Safe modification: Make selectors configurable; add multiple fallback selectors
- Test coverage: None

**Network Interception:**
- Files: `scraper.js:148-160`
- Why fragile: Intercepts all responses matching `graphql` in URL; could miss responses or intercept unrelated ones
- Safe modification: Add more specific URL matching; validate response structure before parsing
- Test coverage: None

**Browser Automation:**
- Files: `scraper.js:118-238`
- Why fragile: Browser automation is inherently fragile; Facebook may detect automated browsing
- Safe modification: Increase humanization settings; add random delays; rotate user agents
- Test coverage: None

## Scaling Limits

**Single-Threaded Scraping:**
- Current capacity: One query at a time per process
- Limit: Cannot parallelize multiple queries
- Scaling path: Use worker threads or separate processes; implement job queue

**In-Memory URL Deduplication:**
- Current capacity: Limited by available memory; millions of URLs could cause OOM
- Limit: JavaScript Set grows unbounded
- Scaling path: Use file-based deduplication or database; implement streaming output

**No Pagination Support:**
- Current capacity: Limited to what's visible via infinite scroll
- Limit: Cannot access ads beyond scroll depth
- Scaling path: Implement cursor-based pagination if Facebook API supports it

## Dependencies at Risk

**cloakbrowser:**
- Risk: Niche package with small community; could be abandoned or have security vulnerabilities
- Impact: Core browser automation breaks; no alternative without major refactor
- Migration plan: Evaluate playwright or puppeteer directly; implement browser abstraction layer

**playwright-core:**
- Risk: Version mismatch between package.json (^1.53.0) and lockfile (1.60.0)
- Impact: Potential API incompatibilities; unexpected behavior
- Migration plan: Pin exact version in package.json; test after updates

## Missing Critical Features

**No Test Suite:**
- Problem: No unit tests, integration tests, or end-to-end tests
- Blocks: Refactoring, confident changes, CI/CD integration

**No Logging Framework:**
- Problem: Uses raw `console.log`/`console.error` with no structured logging
- Blocks: Debugging production issues; log aggregation; audit trails

**No Configuration File:**
- Problem: All configuration via CLI args or hardcoded values
- Blocks: Easy deployment across environments; team collaboration

**No Metrics/Monitoring:**
- Problem: No visibility into scrape performance, success rates, or errors
- Blocks: Performance optimization; reliability monitoring

**No Rate Limiting:**
- Problem: No backoff or throttling when Facebook responds slowly
- Blocks: Avoiding IP bans; reliable operation at scale

## Test Coverage Gaps

**Entire Codebase:**
- What's not tested: All functionality (CLI parsing, browser automation, webhook notification, file I/O)
- Files: `scraper.js` (entire file)
- Risk: Any change could introduce regressions; no way to verify correctness
- Priority: High

**Error Handling Paths:**
- What's not tested: Error scenarios (browser crash, network failure, invalid input)
- Files: `scraper.js:148-160,188-211`
- Risk: Error handling may not work as expected; silent failures
- Priority: High

**Edge Cases:**
- What's not tested: Empty results, very large result sets, special characters in queries
- Files: `scraper.js:42,51,87-94`
- Risk: Crashes or data corruption with unusual inputs
- Priority: Medium

---

*Concerns audit: 2026-06-29*
