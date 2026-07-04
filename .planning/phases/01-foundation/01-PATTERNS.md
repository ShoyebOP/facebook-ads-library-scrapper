# Phase 1: Foundation - Pattern Map

**Mapped:** 2026-07-04
**Files analyzed:** 12
**Analogs found:** 1 / 12 (single file codebase, patterns from `scraper.js`)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/cli.ts` | controller | request-response | `scraper.js` (lines 19-42) | exact |
| `src/config.ts` | utility | transform | `scraper.js` (lines 8-16, 19-30) | role-match |
| `src/browser.ts` | service | event-driven | `scraper.js` (lines 124-134) | exact |
| `src/scraper.ts` | service | event-driven | `scraper.js` (lines 60-76, 185-228) | exact |
| `src/output.ts` | utility | file-I/O | `scraper.js` (lines 87-115) | exact |
| `src/index.ts` | controller | pipeline | `scraper.js` (lines 118-239) | role-match |
| `tsconfig.json` | config | — | No analog (greenfield) | — |
| `biome.json` | config | — | No analog (greenfield) | — |
| `config.example.json` | config | — | `scraper.js` (lines 8-12) | partial |
| `package.json` | config | — | `package.json` (existing) | exact |
| `tests/config.test.ts` | test | — | No analog (greenfield) | — |
| `tests/setup.test.ts` | test | — | No analog (greenfield) | — |

## Pattern Assignments

### `src/cli.ts` (controller, request-response)

**Analog:** `scraper.js` (lines 19-42)

**Imports pattern** (lines 1-5):
```typescript
// Convert existing import style to TypeScript
import { launch } from 'cloakbrowser';
import fs from 'fs';
import { fork } from 'child_process';
import http from 'http';
import https from 'https';
```

**CLI argument parsing pattern** (lines 19-30):
```typescript
// Existing pattern to convert to yargs
const args = process.argv.slice(2);
const query = args.find(a => !a.startsWith('--'));
const headless = args.includes('--headless');
const proxyIdx = args.indexOf('--proxy');
const proxy = proxyIdx !== -1 ? args[proxyIdx + 1] : undefined;
const maxUrlsIdx = args.indexOf('--max-urls');
const maxUrls = maxUrlsIdx !== -1 ? parseInt(args[maxUrlsIdx + 1], 10) : Infinity;
const maxNoNewScrollsIdx = args.indexOf('--max-no-new-scrolls');
const maxNoNewScrolls = maxNoNewScrollsIdx !== -1 ? parseInt(args[maxNoNewScrollsIdx + 1], 10) : 10;
const daemon = args.includes('--daemon');
const callbackIdx = args.indexOf('--callback');
const callbackName = process.env.SCRAPER_CALLBACK_NAME || (callbackIdx !== -1 ? args[callbackIdx + 1] : DEFAULT_CALLBACK);
```

**Error handling pattern** (lines 32-40):
```typescript
// Terse error messages per D-11
if (!query) {
    console.error('Usage: bun scraper.js "<search query>" [--headless] [--proxy "http://..."] [--max-urls N] [--max-no-new-scrolls N] [--daemon] [--callback name]');
    process.exit(1);
}

if (!CALLBACKS[callbackName]) {
    console.error(`Unknown callback: ${callbackName}. Available: ${Object.keys(CALLBACKS).join(', ')}`);
    process.exit(1);
}
```

---

### `src/config.ts` (utility, transform)

**Analog:** `scraper.js` (lines 8-16, 19-30)

**Constants pattern** (lines 8-16):
```typescript
// Module-level constants (carry forward UPPER_SNAKE_CASE)
const CALLBACKS = {
    taqwa: 'https://automation.zaktomate.com/webhook/leadgen-taqwa',
    khanit: 'https://automation.zaktomate.com/webhook/leadgen-khanit'
};
const DEFAULT_CALLBACK = 'taqwa';
const BASE_URL = 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BD&is_targeted_country=BD&media_type=all&publisher_platforms[0]=facebook&q={query}&search_type=keyword_unordered&sort_data[mode]=total_impressions&sort_data[direction]=desc';
```

**Config structure** (from CONTEXT.md D-06):
```typescript
// Zod schema for config validation
import { z } from 'zod';

const ConfigSchema = z.object({
    presets: z.record(z.object({
        callback: z.string().url()
    }))
});

type Config = z.infer<typeof ConfigSchema>;
```

**Cosmiconfig discovery pattern** (from RESEARCH.md):
```typescript
import { cosmiconfig } from 'cosmiconfig';

const explorer = cosmiconfig('facebook-scraper', {
    searchStrategy: 'project'
});

const result = await explorer.search();
```

---

### `src/browser.ts` (service, event-driven)

**Analog:** `scraper.js` (lines 124-134)

**Browser launch pattern** (lines 124-134):
```typescript
const launchOpts = {
    headless,
    humanize: true,
    human_preset: 'careful',
    stealth_args: true,
    locale: 'en-US',
    timezone: 'Asia/Dhaka',
};
if (proxy) launchOpts.proxy = proxy;

const browser = await launch(launchOpts);
const page = await browser.newPage();
```

**Route blocking pattern** (lines 139-145):
```typescript
// Block heavy assets — we only need GraphQL JSON responses
await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        return route.abort();
    }
    return route.continue();
});
```

**Response interception pattern** (lines 148-160):
```typescript
// Intercept network responses
page.on('response', async (response) => {
    try {
        if (response.status() === 200 && response.url().includes('graphql')) {
            const json = await withTimeout(response.json(), 5000);
            extractProfileUrls(json, profileUrls);
        }
    } catch (e) {
        if (e.message.includes('Timed out')) {
            console.error(`Skipped slow GraphQL response (${e.message})`);
        }
        // Non-JSON or failed responses, skip
    }
});
```

---

### `src/scraper.ts` (service, event-driven)

**Analog:** `scraper.js` (lines 60-76, 185-228)

**URL extraction pattern** (lines 60-76):
```typescript
// Recursive GraphQL response traversal
function extractProfileUrls(obj, urls) {
    if (!obj || typeof obj !== 'object') return;

    if (obj.page_profile_uri) {
        urls.add(obj.page_profile_uri);
    }

    if (Array.isArray(obj)) {
        for (const item of obj) {
            extractProfileUrls(item, urls);
        }
    } else {
        for (const key of Object.keys(obj)) {
            extractProfileUrls(obj[key], urls);
        }
    }
}
```

**Timeout wrapper pattern** (lines 79-84):
```typescript
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)),
    ]);
}
```

**Auto-scroll loop pattern** (lines 185-228):
```typescript
while (noNewUrlsCount < maxNoNewScrolls && profileUrls.size < maxUrls) {
    const before = profileUrls.size;

    try {
        await withTimeout(page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)), 10000);
    } catch (e) {
        console.error(`Scroll failed: ${e.message}. Retrying...`);
        await page.waitForTimeout(1000);
        continue;
    }
    await page.waitForTimeout(2500);

    // Remove already-processed ad cards above the viewport to free memory
    try {
        await withTimeout(page.evaluate(() => {
            const rows = document.querySelectorAll('[role="row"]');
            const viewportTop = window.scrollY;
            for (const row of rows) {
                const rect = row.getBoundingClientRect();
                if (rect.bottom < viewportTop - 500) {
                    row.remove();
                }
            }
        }), 10000);
    } catch (e) {
        console.error(`DOM cleanup failed: ${e.message}. Continuing...`);
    }

    scrollCount++;

    if (profileUrls.size === before) {
        noNewUrlsCount++;
        // Heartbeat: log periodically even when no new URLs are found
        const elapsed = Date.now() - lastLogTime;
        if (elapsed >= 30000) {
            console.log(`[heartbeat] Scroll #${scrollCount}: ${profileUrls.size} URLs, no new leads in ${Math.round(elapsed / 1000)}s (${noNewUrlsCount}/${maxNoNewScrolls} dead scrolls)`);
            lastLogTime = Date.now();
        }
    } else {
        noNewUrlsCount = 0;
        lastLogTime = Date.now();
        console.log(`${profileUrls.size} unique profile URLs found...`);
    }
}
```

---

### `src/output.ts` (utility, file-I/O)

**Analog:** `scraper.js` (lines 44-57, 87-115)

**Output path generation pattern** (lines 44-57):
```typescript
function pad(n) {
    return String(n).padStart(2, '0');
}

const now = new Date();
const outputDir = 'output';
const sanitizedQuery = query.replace(/ /g, '_');
const outputFile = process.env.SCRAPER_OUTPUT_FILE || `${outputDir}/${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}:${pad(now.getHours())}-${pad(now.getMinutes())}.${sanitizedQuery}.json`;
const logFile = process.env.SCRAPER_LOG_FILE || null;

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
```

**File save pattern** (lines 87-94):
```typescript
function saveUrls(urls) {
    const data = [...urls];
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
    console.log(`\nSaved ${data.length} unique profile URLs to ${outputFile}`);
    if (CALLBACKS[callbackName]) {
        notifyWebhook(data.length);
    }
}
```

**Webhook notification pattern** (lines 97-115):
```typescript
function notifyWebhook(count) {
    const callbackUrl = CALLBACKS[callbackName];
    const url = new URL(callbackUrl);
    const client = url.protocol === 'https:' ? https : http;
    const body = JSON.stringify({ query, outputFile, count });

    const req = client.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
        console.log(`Webhook notified (${res.statusCode})`);
    });

    req.on('error', (err) => {
        console.error(`Webhook failed: ${err.message}`);
    });

    req.end(body);
}
```

---

### `src/index.ts` (controller, pipeline)

**Analog:** `scraper.js` (lines 118-239)

**Main function pattern** (lines 118-239):
```typescript
async function main() {
    console.log(`Query: ${query}`);
    console.log(`Max URLs: ${maxUrls === Infinity ? 'unlimited' : maxUrls}`);
    console.log(`Output file: ${outputFile}`);
    console.log(`Launching Cloak browser...\n`);

    // ... browser launch, navigation, scrolling loop ...

    saveUrls(profileUrls);
    await browser.close();
    if (logFile) fs.unlinkSync(logFile);
}
```

**Graceful shutdown pattern** (lines 162-174):
```typescript
let shuttingDown = false;
const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\nStopping...');
    saveUrls(profileUrls);
    try { await browser.close(); } catch { }
    try { if (logFile) fs.unlinkSync(logFile); } catch { }
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

**Entry point pattern** (lines 257-260):
```typescript
main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
```

**Daemon mode pattern** (lines 242-255):
```typescript
if (daemon) {
    const logFilePath = `${outputDir}/${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}:${pad(now.getHours())}-${pad(now.getMinutes())}.${sanitizedQuery}.log`;
    const logStream = fs.openSync(logFilePath, 'a');
    const child = fork(process.argv[1], process.argv.slice(2).filter(a => a !== '--daemon'), {
        detached: true,
        stdio: ['ignore', logStream, logStream, 'ipc'],
        env: { ...process.env, SCRAPER_OUTPUT_FILE: outputFile, SCRAPER_LOG_FILE: logFilePath, SCRAPER_CALLBACK_NAME: callbackName },
    });
    child.unref();
    fs.closeSync(logStream);
    console.log(child.pid);
    console.error(`Logs: ${logFilePath}`);
    process.exit(0);
}
```

---

### `tsconfig.json` (config)

**No analog** — greenfield configuration

**Pattern from RESEARCH.md** (Bun TypeScript configuration):
```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "types": ["bun"]
  }
}
```

---

### `biome.json` (config)

**No analog** — greenfield configuration

**Pattern from RESEARCH.md**:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 4
  }
}
```

---

### `config.example.json` (config)

**Analog:** `scraper.js` (lines 8-12) — callback definitions

**Pattern from CONTEXT.md D-06**:
```json
{
  "presets": {
    "leadgen": {
      "callback": "https://automation.zaktomate.com/webhook/leadgen"
    },
    "taqwa": {
      "callback": "https://automation.zaktomate.com/webhook/leadgen-taqwa"
    }
  }
}
```

---

### `package.json` (config)

**Analog:** `package.json` (existing file)

**Existing pattern** (lines 1-14):
```json
{
  "name": "facebook-ads-library-scrapper",
  "version": "1.0.0",
  "type": "module",
  "description": "Facebook Ads Library profile URL scraper using Cloak browser",
  "main": "scraper.js",
  "scripts": {
    "start": "bun scraper.js"
  },
  "dependencies": {
    "cloakbrowser": "^0.3.28",
    "playwright-core": "^1.53.0"
  }
}
```

**Additions needed** (from RESEARCH.md):
```json
{
  "scripts": {
    "start": "bun run src/cli.ts",
    "dev": "bun run --watch src/cli.ts",
    "test": "bun test",
    "lint": "bunx biome check ./src",
    "format": "bunx biome format --write ./src"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.0.0",
    "@types/bun": "^1.0.0",
    "cosmiconfig": "^9.0.0",
    "yargs": "^17.0.0",
    "zod": "^3.0.0"
  }
}
```

---

### `tests/config.test.ts` (test)

**No analog** — greenfield test file

**Pattern from bun:test**:
```typescript
import { describe, it, expect } from 'bun:test';
import { loadConfig } from '../src/config';

describe('Config loading', () => {
    it('should load config from file', async () => {
        const config = await loadConfig();
        expect(config).toBeDefined();
        expect(config.presets).toBeDefined();
    });

    it('should validate config schema', () => {
        // Zod validation tests
    });
});
```

---

### `tests/setup.test.ts` (test)

**No analog** — greenfield test file

**Pattern from bun:test**:
```typescript
import { describe, it, expect } from 'bun:test';
import { existsSync } from 'fs';

describe('Project setup', () => {
    it('should have tsconfig.json', () => {
        expect(existsSync('tsconfig.json')).toBe(true);
    });

    it('should have biome.json', () => {
        expect(existsSync('biome.json')).toBe(true);
    });

    it('should have config.example.json', () => {
        expect(existsSync('config.example.json')).toBe(true);
    });
});
```

---

## Shared Patterns

### Logging
**Source:** `scraper.js`
**Apply to:** All modules
```typescript
// Console logging patterns
console.log(`Query: ${query}`);           // Progress output
console.error(`Webhook failed: ${err.message}`);  // Errors
console.log(`[heartbeat] Scroll #${scrollCount}: ${profileUrls.size} URLs`);  // Prefixed status
```

### Error Handling
**Source:** `scraper.js`
**Apply to:** All modules
```typescript
// Try/catch with specific error handling
try {
    await withTimeout(page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)), 10000);
} catch (e) {
    console.error(`Scroll failed: ${e.message}. Retrying...`);
    await page.waitForTimeout(1000);
    continue;
}
```

### Timeout Wrapper
**Source:** `scraper.js` (lines 79-84)
**Apply to:** All async operations
```typescript
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)),
    ]);
}
```

### Section Dividers
**Source:** `scraper.js`
**Apply to:** All modules
```typescript
// --- Webhook callbacks ---
// --- Base URL ---
// --- Parse CLI args ---
// --- Extract page_profile_uri ---
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tsconfig.json` | config | — | No TypeScript config exists (greenfield) |
| `biome.json` | config | — | No linting config exists (greenfield) |
| `tests/config.test.ts` | test | — | No test framework exists (greenfield) |
| `tests/setup.test.ts` | test | — | No test framework exists (greenfield) |

---

## Metadata

**Analog search scope:** `/home/shoyeb/projects/facebook-ads-library-scrapper` (entire project)
**Files scanned:** 8 (scraper.js, package.json, bun.lock, .gitignore, README.md, AGENTS.md, planning docs)
**Pattern extraction date:** 2026-07-04

**Notes:**
- Single-file codebase (`scraper.js`) is the primary analog source
- All TypeScript modules will be greenfield conversions from JavaScript
- Zod, cosmiconfig, yargs patterns come from RESEARCH.md (no existing codebase examples)
- Biome configuration follows official documentation patterns
- Test patterns use bun:test (no existing tests to reference)
