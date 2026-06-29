<!-- refreshed: 2026-06-29 -->
# Architecture

**Analysis Date:** 2026-06-29

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      CLI Entry Point                        │
│              `scraper.js` (main module)                     │
├──────────────────┬──────────────────┬───────────────────────┤
│   CLI Parser     │   Browser        │   Webhook             │
│   Lines 19-35    │   Control        │   Callbacks           │
│                  │   Lines 118-238  │   Lines 8-12          │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Cloak Browser (Playwright)                   │
│                 `cloakbrowser` package                       │
│         Lines 124-134: Launch with stealth options           │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Facebook Ads Library (External)                             │
│  URL: facebook.com/ads/library/                              │
│  Data: GraphQL API responses with profile URLs               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Output Layer                                                │
│  - JSON file: `output/DD-MM-YYYY:HH:MM.query.json`         │
│  - Webhook POST: JSON payload with query, file, count       │
└─────────────────────────────────────────────────────────────┘
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

**Overall:** Single-File CLI Scraper Pattern

**Key Characteristics:**
- Monolithic single-file architecture (`scraper.js`)
- Process-level isolation via daemon mode (child process forking)
- Network interception for data extraction (not DOM scraping)
- Stealth browser automation with human-like behavior
- Webhook-based integration with external automation systems

## Layers

**CLI Layer:**
- Purpose: Parse user input and configuration
- Location: `scraper.js` (Lines 19-42)
- Contains: Argument parsing, validation, URL construction
- Depends on: None
- Used by: Browser Controller

**Browser Control Layer:**
- Purpose: Manage stealth browser lifecycle
- Location: `scraper.js` (Lines 118-238)
- Contains: Browser launch, page navigation, scroll management, DOM cleanup
- Depends on: `cloakbrowser` package
- Used by: Network Interceptor, File Saver

**Network Interception Layer:**
- Purpose: Capture GraphQL API responses from Facebook
- Location: `scraper.js` (Lines 139-160)
- Contains: Route blocking, response interception, JSON parsing
- Depends on: Browser Control Layer
- Used by: Profile URL Extractor

**Data Extraction Layer:**
- Purpose: Parse nested GraphQL responses to extract profile URLs
- Location: `scraper.js` (Lines 60-76)
- Contains: Recursive JSON traversal, URL collection
- Depends on: Network Interception Layer
- Used by: File Saver

**Output Layer:**
- Purpose: Persist results and notify external systems
- Location: `scraper.js` (Lines 87-115)
- Contains: File I/O, HTTP webhook calls
- Depends on: Data Extraction Layer
- Used by: Daemon Manager (cleanup)

## Data Flow

### Primary Request Path

1. CLI parsing extracts query and options (`scraper.js:19-35`)
2. Browser launches with stealth configuration (`scraper.js:124-134`)
3. Heavy assets blocked via route interception (`scraper.js:139-145`)
4. Browser navigates to Facebook Ads Library URL (`scraper.js:177`)
5. Auto-scroll loop loads additional ads (`scraper.js:185-228`)
6. GraphQL responses intercepted and parsed (`scraper.js:148-160`)
7. Profile URLs extracted from nested JSON (`scraper.js:60-76`)
8. URLs saved to JSON file (`scraper.js:87-94`)
9. Webhook POST sent to configured endpoint (`scraper.js:97-115`)

### Daemon Mode Flow

1. CLI parsing detects `--daemon` flag (`scraper.js:242`)
2. Log file created in `output/` directory (`scraper.js:243`)
3. Child process forked with detached mode (`scraper.js:244-248`)
4. Parent process prints PID and exits (`scraper.js:252-254`)
5. Child runs primary request path independently

**State Management:**
- In-memory `Set` for collected profile URLs (`scraper.js:136`)
- File system for persistent output (`output/*.json`)
- Environment variables for daemon mode (`SCRAPER_OUTPUT_FILE`, `SCRAPER_LOG_FILE`, `SCRAPER_CALLBACK_NAME`)

## Key Abstractions

**Cloak Browser:**
- Purpose: Stealth browser automation that bypasses detection
- Examples: `scraper.js:124-134` (launch configuration)
- Pattern: Playwright wrapper with anti-detection features

**Webhook Callbacks:**
- Purpose: External system integration points
- Examples: `scraper.js:8-12` (endpoint definitions)
- Pattern: Named callback registry with HTTP POST notifications

**Recursive JSON Extractor:**
- Purpose: Navigate deeply nested GraphQL responses
- Examples: `scraper.js:60-76` (extractProfileUrls function)
- Pattern: Depth-first traversal collecting specific fields

## Entry Points

**CLI Entry:**
- Location: `scraper.js` (Line 257-259)
- Triggers: `bun scraper.js "<query>" [options]`
- Responsibilities: Initialize and run main scraper function

**Daemon Entry:**
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

**What happens:** Webhook URLs are hardcoded in source code
**Why it's wrong:** Configuration should be externalized for different environments
**Do this instead:** Move to environment variables or configuration file

### No Error Recovery for Browser Crashes

**What happens:** Browser crashes cause immediate exit
**Why it's wrong:** Long-running scrapers need resilience
**Do this instead:** Implement retry logic with exponential backoff

### Single File Monolith

**What happens:** All logic in one 260-line file
**Why it's wrong:** Makes testing and maintenance difficult
**Do this instead:** Separate into modules (CLI, browser, extractor, output)

## Error Handling

**Strategy:** Try-catch with graceful degradation

**Patterns:**
- Network timeout handling with 5-second timeout (`scraper.js:79-84`)
- Non-JSON response skipping (`scraper.js:154-159`)
- Scroll failure retry with 1-second delay (`scraper.js:190-194`)
- Graceful shutdown on SIGINT/SIGTERM (`scraper.js:164-174`)

## Cross-Cutting Concerns

**Logging:** Console output with heartbeat monitoring (`scraper.js:219-221`)
**Validation:** CLI argument validation with usage message (`scraper.js:32-40`)
**Authentication:** None (public Facebook Ads Library)

---

*Architecture analysis: 2026-06-29*
