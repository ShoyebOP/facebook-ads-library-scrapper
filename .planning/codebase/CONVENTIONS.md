# Coding Conventions

**Analysis Date:** 2026-06-29

## Project Context

This is a **single-file JavaScript project** (`scraper.js`, 260 lines) using ES modules, run via Bun. There are no linting tools, no formatter configs, and no TypeScript. All conventions below are inferred from the existing code.

## Naming Patterns

**Files:**
- Lowercase with hyphens for non-code files: `example_page_code.html`
- Lowercase with no separators for code: `scraper.js`
- Follow the pattern: `scraper.js` (not `Scraper.js`, not `scraper-service.js`)

**Functions:**
- camelCase: `extractProfileUrls`, `withTimeout`, `notifyWebhook`, `saveUrls`
- Short utility helpers use terse names: `pad` (`scraper.js:45`)
- Prefixed with action verb when producing side effects: `notifyWebhook` (`scraper.js:97`), `saveUrls` (`scraper.js:87`)
- Boolean-result functions use no prefix: check `extractProfileUrls` name does not imply boolean

**Variables:**
- camelCase for local variables: `profileUrls`, `noNewUrlsCount`, `scrollCount`, `lastLogTime`
- UPPER_SNAKE_CASE for constants that are module-level config: `CALLBACKS`, `DEFAULT_CALLBACK`, `BASE_URL`
- Module-level `const` for anything set once at the top (`scraper.js:8-30`)

**CLI Argument Variables:**
- Pattern: `<name>Idx` for the index, `<name>` for the parsed value
- Examples: `proxyIdx` / `proxy`, `maxUrlsIdx` / `maxUrls`, `maxNoNewScrollsIdx` / `maxNoNewScrolls`, `callbackIdx` / `callbackName`
- Defined at module scope in sequential order (`scraper.js:19-30`)

## Code Style

**Formatting:**
- No formatter configured. Observed style uses **4-space indentation** throughout `scraper.js`
- Opening braces on same line as statement
- Trailing semicolons used consistently
- Single quotes for string literals: `'use strict'`-style not used (ESM)
- Template literals for string interpolation: `` `${outputFile}` `` (`scraper.js:90`)

**Line Length:**
- No enforced limit. Long lines exist, e.g., `BASE_URL` (`scraper.js:16`) and output path construction (`scraper.js:52`)

**Linting:**
- No ESLint, Biome, or any linter configured
- No `.eslintrc`, `eslint.config.js`, `biome.json`, or equivalent

## Import Organization

**Order (observed in `scraper.js:1-5`):**
1. Third-party packages: `cloakbrowser` (`scraper.js:1`)
2. Node.js built-in modules: `fs`, `child_process`, `http`, `https` (`scraper.js:2-5`)

**Style:**
- Named imports for functions: `import { launch } from 'cloakbrowser'`
- Default imports for full modules: `import fs from 'fs'`
- Named imports for Node built-ins: `import { fork } from 'child_process'`

**Path Aliases:**
- None. No `tsconfig.json` or bundler config. All imports use bare specifiers.

## Module Design

**Module System:** ESM (`"type": "module"` in `package.json:4`)

**Structure:**
- Single file, all logic in one module
- Constants at top (`scraper.js:8-16`)
- CLI argument parsing at top (`scraper.js:19-30`)
- Helper functions in middle (`scraper.js:45-115`)
- Main async function at bottom (`scraper.js:118-239`)
- Entry point invocation last: `main().catch(...)` (`scraper.js:257-260`)

**Exports:**
- No exports. This is a CLI script, not a library.

## Error Handling

**Patterns:**

1. **try/catch with `console.error` and continue:**
   ```javascript
   // scraper.js:154-159
   try {
       const json = await withTimeout(response.json(), 5000);
       extractProfileUrls(json, profileUrls);
   } catch (e) {
       if (e.message.includes('Timed out')) {
           console.error(`Skipped slow GraphQL response (${e.message})`);
       }
       // Non-JSON or failed responses, skip
   }
   ```
   - Pattern: catch, log specific error, silently skip non-critical failures

2. **try/catch with retry:**
   ```javascript
   // scraper.js:188-194
   try {
       await withTimeout(page.evaluate(...), 10000);
   } catch (e) {
       console.error(`Scroll failed: ${e.message}. Retrying...`);
       await page.waitForTimeout(1000);
       continue;
   }
   ```
   - Pattern: catch, log, brief delay, continue loop

3. **Empty catch for cleanup operations:**
   ```javascript
   // scraper.js:169-170
   try { await browser.close(); } catch { }
   try { if (logFile) fs.unlinkSync(logFile); } catch { }
   ```
   - Pattern: swallow errors for non-essential cleanup

4. **Top-level catch with `process.exit(1)`:**
   ```javascript
   // scraper.js:257-260
   main().catch((err) => {
       console.error('Error:', err.message);
       process.exit(1);
   });
   ```

**CLI Argument Validation:**
- `process.exit(1)` with `console.error` for missing required args (`scraper.js:32-35`)
- `process.exit(1)` for invalid callback names (`scraper.js:37-40`)

**Timeout Pattern:**
- Custom `withTimeout` wrapper (`scraper.js:79-84`) wrapping `Promise.race` for operations that may hang (network responses, DOM evaluations)

## Logging

**Framework:** `console.log` and `console.error` only. No structured logging library.

**Patterns:**
- `console.log` for progress output: URL counts, status messages, file paths (`scraper.js:90,119-122,176-178`)
- `console.error` for failures: scroll errors, webhook failures, skip messages (`scraper.js:38,112,156,191,209`)
- Heartbeat logging: periodic status even when no new data found (`scraper.js:218-221`)
- Daemon mode: parent prints PID via `console.log(child.pid)` and logs path via `console.error` (`scraper.js:252-253`)

**Log Message Style:**
- Prefix-free for normal output
- `[heartbeat]` prefix for periodic status (`scraper.js:220`)
- Template literals for all interpolated values

## Comments

**When to Comment:**
- Section dividers using `// --- Section Name ---` pattern (`scraper.js:7,15,18,44,59,78,86,96,117,241`)
- Inline explanation of non-obvious logic: resource type blocking (`scraper.js:138`), memory cleanup (`scraper.js:197`), heartbeat logging (`scraper.js:217`)
- Commented-out code: one instance in `CALLBACKS` object (`scraper.js:12`)

**Style:**
- `// --- Name ---` for section headers
- `//` single-line for inline explanations
- No JSDoc or TSDoc (no type system)
- No file-level header comments

## Function Design

**Size:**
- `main()` is 120 lines (`scraper.js:118-239`) — this is the largest function and handles the entire scrape lifecycle
- Helper functions are small and focused: `extractProfileUrls` (16 lines), `withTimeout` (4 lines), `saveUrls` (7 lines), `notifyWebhook` (14 lines), `pad` (2 lines)

**Parameters:**
- Keep parameter count low (0-3)
- `extractProfileUrls(obj, urls)` — object to search, Set to accumulate (`scraper.js:60`)
- `withTimeout(promise, ms)` — generic promise wrapper (`scraper.js:79`)
- `notifyWebhook(count)` — uses closure for `CALLBACKS`, `query`, `outputFile` (`scraper.js:97`)

**Return Values:**
- Mutate passed-in state (e.g., `urls.add()` in `extractProfileUrls`) rather than returning new collections
- `withTimeout` returns the wrapped promise result
- Helper functions return `void`; side effects are the primary pattern

## Daemon Mode Pattern

- Use `child_process.fork` with `detached: true` to spawn background processes (`scraper.js:245-254`)
- Parent prints PID and exits; child runs independently
- IPC channel created but child unref'd so parent can exit
- Environment variables passed to child for file paths (`scraper.js:248`)
- Log stream opened, child inherits it, parent closes its handle (`scraper.js:244-251`)

## Webhook Pattern

- HTTP/HTTPS determined by URL protocol at runtime (`scraper.js:100`)
- `client.request` (not `fetch`) for Node.js native HTTP
- JSON POST body with `Content-Type: application/json`
- Fire-and-forget: no response body handling beyond status code logging
- Error handler logs but does not throw (`scraper.js:110-112`)

## Graceful Shutdown

- `SIGINT` and `SIGTERM` handlers registered (`scraper.js:173-174`)
- `shuttingDown` flag prevents double-execution (`scraper.js:163`)
- Shutdown sequence: save data → close browser → cleanup log file → `process.exit(0)` (`scraper.js:164-172`)

---

*Convention analysis: 2026-06-29*
