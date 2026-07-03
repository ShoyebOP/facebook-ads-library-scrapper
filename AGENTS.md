<!-- GSD:project-start source:PROJECT.md -->

## Project

**Facebook Ads Library Scraper**

A stealth web scraper that extracts advertiser profile URLs from Facebook Ads Library. Built with Bun, Playwright, and cloakbrowser for anti-detection. Designed for lead generation workflows with webhook integration to external automation systems.

**Core Value:** Reliably extract Facebook Ads Library profile URLs at scale without detection, delivering results via JSON files and webhook notifications.

### Constraints

- **Runtime**: Bun only — no Node.js compatibility required
- **Anti-detection**: Must use cloakbrowser for Facebook bypass
- **Output**: JSON format only (per user preference)
- **Webhooks**: Keep simple POST approach (no auth complexity)
- **Configuration**: Preset-based system via config.json

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- JavaScript (ES Modules) - Single file `scraper.js` (260 lines)
- None

## Runtime

- Bun (JavaScript runtime)
- Module system: ES Modules (`"type": "module"` in `package.json`)
- Bun
- Lockfile: `bun.lock` (present, lockfileVersion 1)

## Frameworks

- None (vanilla JS, no framework)
- Not detected - no test framework configured
- None - runs directly via `bun scraper.js`

## Key Dependencies

- `cloakbrowser` `^0.3.28` - Stealth browser automation library (anti-detection)
- `playwright-core` `^1.53.0` - Browser automation engine (peer dependency of cloakbrowser)
- `fs` (Node.js built-in) - File I/O for output
- `child_process` (Node.js built-in) - Daemon mode via `fork()`
- `http`/`https` (Node.js built-in) - Webhook notifications

## Configuration

- No `.env` file present
- Environment variables used:
- No build step - runs directly via `bun scraper.js`

## Platform Requirements

- Bun runtime installed
- Network access to Facebook Ads Library
- Optional: proxy server for rate limiting bypass
- Bun runtime
- Network access to:
- Optional: proxy server (SOCKS5/HTTP)

## NPM Scripts

## CLI Arguments

- `<search query>` (required) - Search keyword for Facebook Ads
- `--headless` - Run browser in headless mode
- `--proxy "http://..."` - Use proxy server
- `--max-urls N` - Limit number of URLs to collect
- `--max-no-new-scrolls N` - Stop after N scrolls with no new results (default: 10)
- `--daemon` - Run as detached background process
- `--callback name` - Webhook callback name (default: 'leadgen')

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Project Context

## Naming Patterns

- Lowercase with hyphens for non-code files: `example_page_code.html`
- Lowercase with no separators for code: `scraper.js`
- Follow the pattern: `scraper.js` (not `Scraper.js`, not `scraper-service.js`)
- camelCase: `extractProfileUrls`, `withTimeout`, `notifyWebhook`, `saveUrls`
- Short utility helpers use terse names: `pad` (`scraper.js:45`)
- Prefixed with action verb when producing side effects: `notifyWebhook` (`scraper.js:97`), `saveUrls` (`scraper.js:87`)
- Boolean-result functions use no prefix: check `extractProfileUrls` name does not imply boolean
- camelCase for local variables: `profileUrls`, `noNewUrlsCount`, `scrollCount`, `lastLogTime`
- UPPER_SNAKE_CASE for constants that are module-level config: `CALLBACKS`, `DEFAULT_CALLBACK`, `BASE_URL`
- Module-level `const` for anything set once at the top (`scraper.js:8-30`)
- Pattern: `<name>Idx` for the index, `<name>` for the parsed value
- Examples: `proxyIdx` / `proxy`, `maxUrlsIdx` / `maxUrls`, `maxNoNewScrollsIdx` / `maxNoNewScrolls`, `callbackIdx` / `callbackName`
- Defined at module scope in sequential order (`scraper.js:19-30`)

## Code Style

- No formatter configured. Observed style uses **4-space indentation** throughout `scraper.js`
- Opening braces on same line as statement
- Trailing semicolons used consistently
- Single quotes for string literals: `'use strict'`-style not used (ESM)
- Template literals for string interpolation: `` `${outputFile}` `` (`scraper.js:90`)
- No enforced limit. Long lines exist, e.g., `BASE_URL` (`scraper.js:16`) and output path construction (`scraper.js:52`)
- No ESLint, Biome, or any linter configured
- No `.eslintrc`, `eslint.config.js`, `biome.json`, or equivalent

## Import Organization

- Named imports for functions: `import { launch } from 'cloakbrowser'`
- Default imports for full modules: `import fs from 'fs'`
- Named imports for Node built-ins: `import { fork } from 'child_process'`
- None. No `tsconfig.json` or bundler config. All imports use bare specifiers.

## Module Design

- Single file, all logic in one module
- Constants at top (`scraper.js:8-16`)
- CLI argument parsing at top (`scraper.js:19-30`)
- Helper functions in middle (`scraper.js:45-115`)
- Main async function at bottom (`scraper.js:118-239`)
- Entry point invocation last: `main().catch(...)` (`scraper.js:257-260`)
- No exports. This is a CLI script, not a library.

## Error Handling

- `process.exit(1)` with `console.error` for missing required args (`scraper.js:32-35`)
- `process.exit(1)` for invalid callback names (`scraper.js:37-40`)
- Custom `withTimeout` wrapper (`scraper.js:79-84`) wrapping `Promise.race` for operations that may hang (network responses, DOM evaluations)

## Logging

- `console.log` for progress output: URL counts, status messages, file paths (`scraper.js:90,119-122,176-178`)
- `console.error` for failures: scroll errors, webhook failures, skip messages (`scraper.js:38,112,156,191,209`)
- Heartbeat logging: periodic status even when no new data found (`scraper.js:218-221`)
- Daemon mode: parent prints PID via `console.log(child.pid)` and logs path via `console.error` (`scraper.js:252-253`)
- Prefix-free for normal output
- `[heartbeat]` prefix for periodic status (`scraper.js:220`)
- Template literals for all interpolated values

## Comments

- Section dividers using `// --- Section Name ---` pattern (`scraper.js:7,15,18,44,59,78,86,96,117,241`)
- Inline explanation of non-obvious logic: resource type blocking (`scraper.js:138`), memory cleanup (`scraper.js:197`), heartbeat logging (`scraper.js:217`)
- Commented-out code: one instance in `CALLBACKS` object (`scraper.js:12`)
- `// --- Name ---` for section headers
- `//` single-line for inline explanations
- No JSDoc or TSDoc (no type system)
- No file-level header comments

## Function Design

- `main()` is 120 lines (`scraper.js:118-239`) — this is the largest function and handles the entire scrape lifecycle
- Helper functions are small and focused: `extractProfileUrls` (16 lines), `withTimeout` (4 lines), `saveUrls` (7 lines), `notifyWebhook` (14 lines), `pad` (2 lines)
- Keep parameter count low (0-3)
- `extractProfileUrls(obj, urls)` — object to search, Set to accumulate (`scraper.js:60`)
- `withTimeout(promise, ms)` — generic promise wrapper (`scraper.js:79`)
- `notifyWebhook(count)` — uses closure for `CALLBACKS`, `query`, `outputFile` (`scraper.js:97`)
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

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| CLI Parser | Parse command-line arguments | `scraper.js` (Lines 19-35) |
| Browser Controller | Launch stealth browser, handle navigation | `scraper.js` (Lines 118-238) |
| Network Interceptor | Block heavy assets, capture GraphQL responses | `scraper.js` (Lines 139-160) |
| Profile URL Extractor | Recursively extract page_profile_uri from JSON | `scraper.js` (Lines 60-76) |
| Auto-Scroller | Scroll page to load more ads, clean DOM | `scraper.js` (Lines 185-228) |
| File Saver | Write URLs to JSON output file | `scraper.js` (Lines 87-94) |
| Webhook Notifier | POST completion notification to external endpoints | `scraper.js` (Lines 97-115) |
| Daemon Manager | Fork detached child process for background execution | `scraper.js` (Lines 242-255) |

## Pattern Overview

- Monolithic single-file architecture (`scraper.js`)
- Process-level isolation via daemon mode (child process forking)
- Network interception for data extraction (not DOM scraping)
- Stealth browser automation with human-like behavior
- Webhook-based integration with external automation systems

## Layers

- Purpose: Parse user input and configuration
- Location: `scraper.js` (Lines 19-42)
- Contains: Argument parsing, validation, URL construction
- Depends on: None
- Used by: Browser Controller
- Purpose: Manage stealth browser lifecycle
- Location: `scraper.js` (Lines 118-238)
- Contains: Browser launch, page navigation, scroll management, DOM cleanup
- Depends on: `cloakbrowser` package
- Used by: Network Interceptor, File Saver
- Purpose: Capture GraphQL API responses from Facebook
- Location: `scraper.js` (Lines 139-160)
- Contains: Route blocking, response interception, JSON parsing
- Depends on: Browser Control Layer
- Used by: Profile URL Extractor
- Purpose: Parse nested GraphQL responses to extract profile URLs
- Location: `scraper.js` (Lines 60-76)
- Contains: Recursive JSON traversal, URL collection
- Depends on: Network Interception Layer
- Used by: File Saver
- Purpose: Persist results and notify external systems
- Location: `scraper.js` (Lines 87-115)
- Contains: File I/O, HTTP webhook calls
- Depends on: Data Extraction Layer
- Used by: Daemon Manager (cleanup)

## Data Flow

### Primary Request Path

### Daemon Mode Flow

- In-memory `Set` for collected profile URLs (`scraper.js:136`)
- File system for persistent output (`output/*.json`)
- Environment variables for daemon mode (`SCRAPER_OUTPUT_FILE`, `SCRAPER_LOG_FILE`, `SCRAPER_CALLBACK_NAME`)

## Key Abstractions

- Purpose: Stealth browser automation that bypasses detection
- Examples: `scraper.js:124-134` (launch configuration)
- Pattern: Playwright wrapper with anti-detection features
- Purpose: External system integration points
- Examples: `scraper.js:8-12` (endpoint definitions)
- Pattern: Named callback registry with HTTP POST notifications
- Purpose: Navigate deeply nested GraphQL responses
- Examples: `scraper.js:60-76` (extractProfileUrls function)
- Pattern: Depth-first traversal collecting specific fields

## Entry Points

- Location: `scraper.js` (Line 257-259)
- Triggers: `bun scraper.js "<query>" [options]`
- Responsibilities: Initialize and run main scraper function
- Location: `scraper.js` (Lines 242-255)
- Triggers: `bun scraper.js "<query>" --daemon`
- Responsibilities: Fork child process and exit parent

## Architectural Constraints

- **Threading:** Single-threaded with child process forking for daemon mode
- **Global state:** `CALLBACKS` registry, `BASE_URL` constant (Lines 8-16)
- **Circular imports:** None (single file)
- **Memory management:** DOM cleanup of processed rows to prevent memory leaks (Lines 197-210)

## Anti-Patterns

### Hardcoded Webhook Endpoints

### No Error Recovery for Browser Crashes

### Single File Monolith

## Error Handling

- Network timeout handling with 5-second timeout (`scraper.js:79-84`)
- Non-JSON response skipping (`scraper.js:154-159`)
- Scroll failure retry with 1-second delay (`scraper.js:190-194`)
- Graceful shutdown on SIGINT/SIGTERM (`scraper.js:164-174`)

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
