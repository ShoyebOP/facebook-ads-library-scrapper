# Architecture Research

**Domain:** Stealth Web Scraper (Facebook Ads Library)
**Researched:** 2026-07-03
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                             │
│  ┌─────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Parser  │  │  Validator  │  │  Preset     │             │
│  │         │  │             │  │  Resolver   │             │
│  └────┬────┘  └──────┬──────┘  └──────┬──────┘             │
├───────┴───────────────┴────────────────┴─────────────────────┤
│                     Orchestration Layer                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Scraper Orchestrator                     │    │
│  │  (coordinates browser → extract → output pipeline)   │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                     Browser Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Launch   │  │ Stealth  │  │ Network  │  │ Humanize │   │
│  │ Manager  │  │ Config   │  │ Intercept│  │ Behavior │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
├───────┴──────────────┴──────────────┴──────────────┴─────────┤
│                     Extraction Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ GraphQL      │  │ Profile URL  │  │ Data         │      │
│  │ Response     │  │ Extractor    │  │ Transformer  │      │
│  │ Parser       │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
├─────────┴──────────────────┴──────────────────┴──────────────┤
│                     Output Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ File     │  │ Webhook  │  │ Logger   │  │ Daemon   │   │
│  │ Writer   │  │ Notifier │  │          │  │ Manager  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│                     Cross-Cutting                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Config   │  │ Error    │  │ Retry    │  │ Health   │   │
│  │ Manager  │  │ Handler  │  │ Engine   │  │ Monitor  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| CLI Parser | Parse command-line arguments, resolve presets | `commander` or custom parser with typed options |
| Validator | Validate all inputs before execution | Zod schema validation with descriptive errors |
| Preset Resolver | Map preset names to config.json entries | Config file loader with fallback defaults |
| Scraper Orchestrator | Coordinate the full scrape pipeline | Async function managing browser lifecycle |
| Launch Manager | Start/stop Playwright browser instances | `cloakbrowser` wrapper with launch options |
| Stealth Config | Apply anti-detection patches | Browser args, init scripts, fingerprint config |
| Network Interceptor | Block assets, capture GraphQL responses | `page.route()` + `page.on('response')` |
| Humanize Behavior | Mouse movements, scrolling, typing delays | Random delay functions, viewport interaction |
| GraphQL Response Parser | Parse nested GraphQL JSON structures | Recursive traversal with field extraction |
| Profile URL Extractor | Collect unique profile URLs from responses | `Set<URL>` with deduplication |
| Data Transformer | Format extracted data for output | Mapper functions, schema validation |
| File Writer | Persist results to JSON files | `Bun.write()` with atomic writes |
| Webhook Notifier | POST completion notifications | HTTP client with HMAC auth support |
| Logger | Structured logging with levels | Custom logger with file + console transports |
| Daemon Manager | Fork, PID management, restart logic | `Bun.spawn()` with PID files and signal handling |
| Config Manager | Load/merge configs from files + env | JSON config loader with env var overrides |
| Error Handler | Centralized error classification | Custom error types with recovery strategies |
| Retry Engine | Exponential backoff for transient errors | Async retry wrapper with jitter |
| Health Monitor | Heartbeat logging, progress tracking | Periodic status reporting |

## Recommended Project Structure

```
src/
├── cli/                    # CLI entry point and argument handling
│   ├── index.ts            # Main CLI entry, parses args, dispatches
│   ├── parser.ts           # Argument parsing logic
│   ├── validator.ts        # Input validation with Zod schemas
│   └── presets.ts          # Preset resolution from config.json
├── browser/                # Browser automation layer
│   ├── launcher.ts         # Browser launch/stop lifecycle
│   ├── stealth.ts          # Anti-detection configuration
│   ├── intercept.ts        # Network request/response interception
│   └── humanize.ts         # Human-like behavior (mouse, scroll, type)
├── scraper/                # Core scraping logic
│   ├── orchestrator.ts     # Main scrape pipeline coordinator
│   ├── extractor.ts        # GraphQL response parsing, URL extraction
│   └── scroll.ts           # Auto-scroll loop with adaptive timing
├── output/                 # Output and notification layer
│   ├── writer.ts           # File output (JSON, incremental saves)
│   ├── webhook.ts          # Webhook notification with HMAC auth
│   └── logger.ts           # Structured logging framework
├── daemon/                 # Background execution management
│   ├── manager.ts          # Process forking, PID management
│   ├── signals.ts          # Graceful shutdown signal handling
│   └── pid.ts              # PID file read/write/check
├── config/                 # Configuration management
│   ├── loader.ts           # Config file loading and merging
│   ├── schema.ts           # Config schema definitions (Zod)
│   └── types.ts            # TypeScript types for config
├── errors/                 # Error handling framework
│   ├── base.ts             # Base error class hierarchy
│   ├── recovery.ts         # Error recovery strategies
│   └── retry.ts            # Retry logic with exponential backoff
├── types/                  # Shared TypeScript types
│   ├── index.ts            # Re-exports all types
│   ├── scraper.ts          # Scraper-specific types
│   └── config.ts           # Config type definitions
└── utils/                  # Shared utilities
    ├── delay.ts            # Random delay helpers
    ├── timeout.ts          # Promise timeout wrapper
    └── sanitize.ts         # Input sanitization (proxy creds, etc.)
tests/
├── unit/                   # Unit tests (no browser)
│   ├── cli/
│   ├── scraper/
│   ├── output/
│   ├── config/
│   └── errors/
├── integration/            # Integration tests (mock browser)
│   ├── browser.test.ts
│   ├── scraper.test.ts
│   └── daemon.test.ts
└── e2e/                    # End-to-end tests (real browser)
    ├── smoke.test.ts
    └── full-scrape.test.ts
```

### Structure Rationale

- **cli/:** Separates argument parsing from business logic. Enables testing CLI independently.
- **browser/:** Isolates all Playwright/cloakbrowser code. Can swap browser engines without touching scraper logic.
- **scraper/:** Pure scraping logic that receives a page object and returns data. Testable with mocks.
- **output/:** Decouples output format from extraction. Add CSV, database, or other outputs without changing scraper.
- **daemon/:** Isolates process management complexity. Daemon mode is orthogonal to scraping logic.
- **config/:** Single source of truth for all configuration. Schema validation catches errors at startup.
- **errors/:** Centralized error handling enables consistent recovery across all modules.
- **types/:** Shared type definitions prevent circular dependencies between modules.
- **utils/:** Stateless helper functions used across multiple modules.

## Architectural Patterns

### Pattern 1: Pipeline Architecture

**What:** Sequential stages connected by typed data contracts. Each stage transforms data and passes it forward.

**When to use:** When you have a clear data flow (intercept → extract → transform → output) and want each stage independently testable.

**Trade-offs:**
- (+) Easy to add/remove/replace stages
- (+) Each stage is independently testable
- (+) Clear data flow direction
- (-) Can be overkill for simple scrapers
- (-) Stage ordering requires careful design

**Example:**
```typescript
// Each stage is a pure function or small class
const pipeline = createPipeline([
  new NetworkInterceptor(page),    // Stage 1: capture responses
  new GraphQLParser(),             // Stage 2: parse JSON
  new ProfileURLExtractor(),       // Stage 3: extract URLs
  new FileWriter(outputPath),      // Stage 4: persist
  new WebhookNotifier(webhookUrl), // Stage 5: notify
]);

await pipeline.run(url);
```

### Pattern 2: Strategy Pattern for Output

**What:** Define output behavior through interfaces, allowing different implementations (file, webhook, database) to be swapped at runtime.

**When to use:** When output destinations may change or you want to support multiple simultaneous outputs.

**Trade-offs:**
- (+) Add new output formats without changing scraper
- (+) Test output independently from scraping
- (+) Run multiple outputs simultaneously
- (-) Slight abstraction overhead
- (-) Need to define clear interface contracts

**Example:**
```typescript
interface OutputWriter {
  write(data: ScrapeResult): Promise<void>;
  close(): Promise<void>;
}

class CompositeWriter implements OutputWriter {
  constructor(private writers: OutputWriter[]) {}
  
  async write(data: ScrapeResult) {
    await Promise.all(this.writers.map(w => w.write(data)));
  }
}
```

### Pattern 3: Event-Driven Extraction

**What:** Use browser events (response, request) to trigger extraction. Decouples page navigation from data capture.

**When to use:** When data comes from network responses (GraphQL, API calls) rather than DOM scraping.

**Trade-offs:**
- (+) Captures data regardless of page state
- (+) Works with infinite scroll (captures incrementally)
- (+) No DOM dependency for extraction
- (-) Need to handle concurrent events
- (-) Event ordering can be non-deterministic

**Example:**
```typescript
class NetworkInterceptor {
  private urls = new Set<string>();
  
  constructor(private page: Page) {
    this.page.on('response', (response) => this.handleResponse(response));
  }
  
  private async handleResponse(response: Response) {
    if (this.isTargetResponse(response)) {
      const json = await response.json();
      this.extractURLs(json);
    }
  }
  
  private extractURLs(obj: unknown) {
    // Recursive extraction into this.urls
  }
  
  getURLs(): string[] {
    return [...this.urls];
  }
}
```

## Data Flow

### Request Flow

```
User: bun scraper.js "query" --preset taqwa
    │
    ▼
┌─────────────┐
│ CLI Parser   │ → parse args, validate, resolve preset
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Orchestrator │ → initialize config, create components
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Browser      │ → launch cloakbrowser with stealth config
│ Launcher     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Network      │ → intercept GraphQL responses
│ Interceptor  │ → block heavy assets (images, fonts)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Page         │ → navigate to Facebook Ads Library
│ Navigation   │ → wait for domcontentloaded
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Auto-Scroll  │ → scroll to bottom, wait for new content
│ Loop         │ → adaptive timing (wait for network idle)
│              │ → DOM cleanup (remove processed rows)
└──────┬──────┘
       │ (responses intercepted continuously)
       ▼
┌─────────────┐
│ Profile URL  │ → recursive extraction from GraphQL JSON
│ Extractor    │ → deduplicate into Set<URL>
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ File Writer  │ → atomic write to output/*.json
│              │ → incremental saves during scroll
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Webhook      │ → POST to configured endpoint
│ Notifier     │ → HMAC signature in header
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Browser      │ → close browser context
│ Cleanup      │ → remove PID file (if daemon)
└─────────────┘
```

### State Management

```
┌─────────────────────────────────────────────────────────────┐
│                    In-Memory State                            │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Set<string>      │  │ Config           │                 │
│  │ profileUrls      │  │ (resolved)       │                 │
│  └──────────────────┘  └──────────────────┘                 │
├─────────────────────────────────────────────────────────────┤
│                    File System State                          │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ output/*.json    │  │ .pid files       │                 │
│  │ (results)        │  │ (daemon state)   │                 │
│  └──────────────────┘  └──────────────────┘                 │
├─────────────────────────────────────────────────────────────┤
│                    Environment State                          │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ SCRAPER_*        │  │ Proxy            │                 │
│  │ env vars         │  │ credentials      │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Data Flows

1. **GraphQL Interception:** Browser makes requests → `page.on('response')` fires → check if URL contains 'graphql' → parse JSON → recursive extraction → add to `Set<string>`
2. **Incremental Output:** During scroll loop → periodically write current URLs to file → prevents data loss on crash
3. **Daemon Lifecycle:** CLI detects `--daemon` → fork child process → child writes PID file → parent exits → child runs scraper → on completion: delete PID file, notify webhook
4. **Graceful Shutdown:** SIGINT/SIGTERM received → set `shuttingDown` flag → save current URLs → close browser → delete PID file → exit

## Error Handling Boundaries

### Error Classification

| Error Type | Source | Recovery | Example |
|------------|--------|----------|---------|
| Transient | Network timeout, temporary block | Retry with backoff | GraphQL response timeout |
| Permanent | Invalid query, missing config | Exit with error message | Unknown preset name |
| Browser | Crash, navigation failure | Restart browser, retry | Cloakbrowser crash |
| Extraction | Malformed response, missing field | Skip and log | Non-JSON GraphQL response |
| Shutdown | Signal received | Graceful cleanup | SIGINT during scrape |

### Error Handler Interface

```typescript
interface ErrorHandler {
  classify(error: Error): ErrorSeverity;
  recover(error: Error, context: ScraperContext): Promise<boolean>;
  log(error: Error, context: ScraperContext): void;
}

enum ErrorSeverity {
  TRANSIENT = 'transient',    // retry
  PERMANENT = 'permanent',    // abort
  BROWSER = 'browser',        // restart
  EXTRACTION = 'extraction',  // skip
}
```

### Retry Strategy

```typescript
// Exponential backoff with jitter
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000 } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );
      await Bun.sleep(delay);
    }
  }
  throw new Error('Unreachable');
}
```

## Daemon Mode Architecture

### Process Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Parent Process                             │
│  1. Parse CLI args (including --daemon)                      │
│  2. Validate inputs                                          │
│  3. Create log file in output/                               │
│  4. Fork child process (detached)                            │
│  5. Print child PID to stdout                                │
│  6. Print log file path to stderr                            │
│  7. Exit with code 0                                         │
└─────────────────────────┬───────────────────────────────────┘
                          │ fork()
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Child Process (Daemon)                     │
│  1. Write PID file to output/.scraper.pid                   │
│  2. Register SIGTERM/SIGINT handlers                        │
│  3. Run scraper pipeline (same as foreground)               │
│  4. On completion: save results, notify webhook             │
│  5. Delete PID file                                         │
│  6. Exit with code 0                                         │
└─────────────────────────────────────────────────────────────┘
```

### PID Management

```typescript
class PIDManager {
  private pidPath: string;
  
  constructor(outputDir: string) {
    this.pidPath = path.join(outputDir, '.scraper.pid');
  }
  
  async write(pid: number): Promise<void> {
    await Bun.write(this.pidPath, String(pid));
  }
  
  async read(): Promise<number | null> {
    try {
      const content = await Bun.file(this.pidPath).text();
      return parseInt(content, 10);
    } catch {
      return null;
    }
  }
  
  async isRunning(): Promise<boolean> {
    const pid = await this.read();
    if (!pid) return false;
    try {
      process.kill(pid, 0); // Signal 0 = check existence
      return true;
    } catch {
      return false;
    }
  }
  
  async delete(): Promise<void> {
    try {
      await Bun.unlink(this.pidPath);
    } catch {
      // Ignore if already deleted
    }
  }
}
```

### Graceful Shutdown

```typescript
class GracefulShutdown {
  private isShuttingDown = false;
  
  constructor(
    private browser: Browser,
    private pidManager: PIDManager,
    private saveFn: () => Promise<void>
  ) {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }
  
  private async shutdown(signal: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    try {
      await this.saveFn(); // Save current results
    } catch (e) {
      console.error('Failed to save results:', e);
    }
    
    try {
      await this.browser.close();
    } catch (e) {
      console.error('Failed to close browser:', e);
    }
    
    await this.pidManager.delete();
    process.exit(0);
  }
}
```

## Testing Architecture

### Test Pyramid

```
         ┌─────────┐
         │  E2E    │  ~5% of tests
         │ (slow)  │  Real browser, real Facebook
         ├─────────┤
         │  INT    │  ~25% of tests
         │ (med)   │  Mock browser, real extraction
         ├─────────┤
         │  UNIT   │  ~70% of tests
         │ (fast)  │  Pure functions, no I/O
         └─────────┘
```

### Unit Tests (No Browser)

**What to test:**
- CLI argument parsing and validation
- Config loading and preset resolution
- GraphQL response parsing (input JSON → output URLs)
- URL extraction logic (recursive traversal)
- Error classification logic
- Retry logic (mock delays)
- Output formatting

**Example:**
```typescript
// tests/unit/scraper/extractor.test.ts
import { describe, it, expect } from 'bun:test';
import { extractProfileUrls } from '../../../src/scraper/extractor';

describe('ProfileURLExtractor', () => {
  it('extracts nested page_profile_uri', () => {
    const input = {
      data: {
        ad_archive_renderer: {
          results: [
            { page_profile_uri: 'https://facebook.com/ad1' },
            { page_profile_uri: 'https://facebook.com/ad2' },
          ],
        },
      },
    };
    
    const urls = extractProfileUrls(input);
    expect(urls).toEqual([
      'https://facebook.com/ad1',
      'https://facebook.com/ad2',
    ]);
  });
  
  it('deduplicates URLs', () => {
    const input = {
      a: { page_profile_uri: 'https://facebook.com/ad1' },
      b: { page_profile_uri: 'https://facebook.com/ad1' },
    };
    
    const urls = extractProfileUrls(input);
    expect(urls).toHaveLength(1);
  });
});
```

### Integration Tests (Mock Browser)

**What to test:**
- Full scraper pipeline with mock Playwright page
- Network interception with mocked responses
- File output with real filesystem
- Webhook notification with mock HTTP server
- Daemon mode process forking
- Graceful shutdown signal handling

**Example:**
```typescript
// tests/integration/scraper/pipeline.test.ts
import { describe, it, expect, mock } from 'bun:test';
import { ScraperOrchestrator } from '../../../src/scraper/orchestrator';

describe('ScraperOrchestrator', () => {
  it('runs full pipeline with mocked browser', async () => {
    const mockPage = createMockPage({
      responses: [mockGraphQLResponse(['url1', 'url2'])],
    });
    
    const orchestrator = new ScraperOrchestrator({
      browser: createMockBrowser(mockPage),
      output: new MemoryWriter(),
    });
    
    const result = await orchestrator.run({ query: 'test' });
    
    expect(result.urls).toHaveLength(2);
    expect(result.success).toBe(true);
  });
});
```

### E2E Tests (Real Browser)

**What to test:**
- Smoke test: minimal query returns results
- Full scrape: complete pipeline with real Facebook
- Daemon mode: start, check PID, stop
- Error recovery: browser crash, network timeout

**Note:** E2E tests are slow and flaky. Run them sparingly (before releases, in CI nightly).

```typescript
// tests/e2e/smoke.test.ts
import { describe, it, expect, afterAll } from 'bun:test';
import { Scraper } from '../../src';

describe('Smoke Test', () => {
  const scraper = new Scraper();
  
  afterAll(async () => {
    await scraper.close();
  });
  
  it('returns results for simple query', async () => {
    const result = await scraper.run({
      query: 'test query',
      maxUrls: 5,
      headless: true,
    });
    
    expect(result.urls.length).toBeGreaterThan(0);
    expect(result.urls[0]).toMatch(/facebook\.com/);
  }, 60000); // 60s timeout for real scraping
});
```

## Plugin/Extension Patterns

### Future Growth Points

| Extension Point | Pattern | When to Add |
|-----------------|---------|-------------|
| New output format | Strategy pattern (OutputWriter interface) | When user needs CSV, database, etc. |
| New data source | Interface-based scraper | When scraping Instagram, LinkedIn, etc. |
| New stealth technique | Config-driven browser args | When Facebook changes detection |
| Enrichment pipeline | Middleware pattern | When leads need email/phone lookup |
| Scheduler | External cron or internal timer | When recurring scrapes are needed |

### Plugin Interface (Future)

```typescript
interface ScraperPlugin {
  name: string;
  
  // Called before scraping starts
  onBeforeScrape?(context: ScraperContext): Promise<void>;
  
  // Called for each intercepted response
  onResponse?(response: Response, context: ScraperContext): Promise<void>;
  
  // Called after scraping completes
  onAfterScrape?(result: ScrapeResult, context: ScraperContext): Promise<void>;
  
  // Called on error
  onError?(error: Error, context: ScraperContext): Promise<boolean>;
}
```

### Extension by Configuration

The preset system enables adding new scrape targets without code changes:

```json
{
  "presets": {
    "taqwa": {
      "query": "delivery",
      "country": "BD",
      "webhook": "https://automation.zaktomate.com/webhook/leadgen-taqwa",
      "maxUrls": 1000,
      "scrollPause": 2500
    },
    "new-vertical": {
      "query": "real estate",
      "country": "US",
      "webhook": "https://example.com/webhook/new",
      "maxUrls": 500,
      "scrollPause": 3000,
      "proxy": "http://proxy.example.com:8080"
    }
  }
}
```

## Anti-Patterns

### Anti-Pattern 1: God Object Orchestrator

**What people do:** Put all logic (browser, extraction, output, logging) in one orchestrator class.

**Why it's wrong:** Creates untestable monolith, violates single responsibility, makes swapping components impossible.

**Do this instead:** Each component has a single responsibility and communicates through typed interfaces.

### Anti-Pattern 2: Silent Error Swallowing

**What people do:** `catch (e) {}` or `catch (e) { console.error(e) }` without classification.

**Why it's wrong:** Permanent errors (bad config) get retried infinitely. Transient errors crash the process. Browser errors go unnoticed.

**Do this instead:** Classify every error by severity. Retry transient, abort permanent, restart browser, skip extraction.

### Anti-Pattern 3: Hardcoded Configuration

**What people do:** Webhook URLs, country codes, and callback names in source code.

**Why it's wrong:** Requires code changes and redeployment for new configurations.

**Do this instead:** External config.json with preset system. Environment variables for secrets.

### Anti-Pattern 4: Synchronous DOM Scraping

**What people do:** Use `document.querySelectorAll()` to scrape rendered DOM.

**Why it's wrong:** Facebook's Ads Library loads data via GraphQL, not rendered DOM. DOM scraping is fragile and slow.

**Do this instead:** Intercept network responses (GraphQL) for reliable, structured data extraction.

### Anti-Pattern 5: Fixed Scroll Timing

**What people do:** `await page.waitForTimeout(2500)` after every scroll.

**Why it's wrong:** Too short = miss data. Too long = waste time. Doesn't adapt to network conditions.

**Do this instead:** Wait for network idle or specific network activity to resume. Adaptive timing based on response interception.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-10 queries/day | Single process, no daemon mode needed |
| 10-100 queries/day | Daemon mode for background execution, PID management |
| 100-1000 queries/day | Queue-based job system, multiple scraper instances |
| 1000+ queries/day | Distributed scraping, proxy rotation, browser pool |

### Scaling Priorities

1. **First bottleneck:** Browser memory (DOM cleanup during scroll already handles this)
2. **Second bottleneck:** Proxy rate limits (add proxy rotation)
3. **Third bottleneck:** Facebook rate limits (add delay between queries, multiple browser contexts)

## Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| CLI ↔ Orchestrator | Function call with typed config | CLI validates, Orchestrator executes |
| Orchestrator ↔ Browser | Async method calls | Browser layer wraps cloakbrowser |
| Browser ↔ Interceptor | Event emitter (response events) | Decoupled via event system |
| Interceptor ↔ Extractor | Direct function call with JSON | Extractor is pure function |
| Extractor ↔ Output | Data passing | Output writes, doesn't transform |
| Orchestrator ↔ Daemon | Process forking | Daemon is orthogonal to pipeline |

## Sources

- [stealth-scraper-playwright](https://github.com/M-Hammad-Faisal/stealth-scraper-playwright) — Modular TypeScript scraper with stealth patterns
- [universal-playwright-leads-scraper](https://github.com/NehaNiamat/universal-playwright-leads-scraper) — Config-driven modular lead scraper
- [Playwright Network Interception](https://playwright.dev/docs/network) — Official docs on response interception
- [Node.js Graceful Shutdown](https://dev.to/axiom_agent/nodejs-graceful-shutdown-the-right-way-sigterm-connection-draining-and-kubernetes-fp8) — SIGTERM handling patterns
- [DaemonPID](https://www.npmjs.com/package/daemon-pid) — PID file management patterns
- [Bug0 Playwright Scraping](https://bug0.com/knowledge-base/playwright-web-scraping) — 2026 Playwright scraping landscape
- [Bun Documentation](https://bun.sh/docs) — Bun-native APIs (spawn, file I/O)
- Existing codebase: `scraper.js` (260 lines) — Current monolith being rewritten

---
*Architecture research for: Facebook Ads Library Scraper*
*Researched: 2026-07-03*
