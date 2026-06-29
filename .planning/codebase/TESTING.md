# Testing Patterns

**Analysis Date:** 2026-06-29

## Test Framework

**Runner:**
- Not detected. No test framework is configured or installed.
- No `jest.config.*`, `vitest.config.*`, `.mocharc.*`, or equivalent exists.

**Assertion Library:**
- Not detected.

**Run Commands:**
```bash
# No test command configured in package.json
# "scripts" only contains:
#   "start": "bun scraper.js"
```

## Test File Organization

**Location:**
- No test files exist anywhere in the repository.

**Naming:**
- No `*.test.*` or `*.spec.*` files found.
- No `test/`, `tests/`, `__tests__/`, or `spec/` directories exist.

**Structure:**
```text
facebook-ads-library-scrapper/
├── scraper.js              # The entire application (260 lines)
├── package.json            # No test script defined
├── bun.lock                # Lockfile only
├── example_page_code.html  # Sample Facebook page HTML
├── output/                 # Scraped results (gitignored)
│   └── *.json
└── README.md               # Minimal (2 lines)
```

## What Exists vs. What's Missing

**Exists:**
- `package.json` with `"scripts": { "start": "bun scraper.js" }` — no `"test"` script
- Single source file: `scraper.js` (260 lines, 20 functions)
- Runtime: Bun 1.3.12 / Node v22.22.3
- Dependencies: `cloakbrowser` ^0.3.28, `playwright-core` ^1.53.0

**Missing (all of the following):**
- Test framework (Jest, Vitest, Mocha, etc.)
- Test runner configuration
- Test scripts in `package.json`
- Any test files (`*.test.js`, `*.spec.js`)
- Test directories
- Mock infrastructure
- CI/CD configuration
- Linting and formatting tools
- Code coverage configuration

## Recommended Test Strategy (If Adding Tests)

Since no tests exist, this section prescribes what to add if testing is introduced.

### Framework Choice

Use **Vitest** — it has native ESM support, fast execution via Bun/Node, and minimal configuration.

```bash
bun add -d vitest
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "start": "bun scraper.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Test File Location

Co-locate test files next to source:
```
scraper.js
scraper.test.js    # Unit tests for helpers
```

Or create a `test/` directory for integration tests:
```
test/
├── helpers.test.js      # Unit tests for extractProfileUrls, withTimeout, pad
├── cli-args.test.js     # CLI argument parsing tests
├── daemon.test.js       # Daemon mode fork tests
└── integration/
    └── scrape.test.js   # Full scrape (requires live browser)
```

### Testable Units (Isolated Helpers)

These functions in `scraper.js` are pure or easily mockable:

| Function | Lines | Testability | Notes |
|----------|-------|-------------|-------|
| `pad(n)` | `scraper.js:45-47` | **Easy** | Pure function, no deps |
| `extractProfileUrls(obj, urls)` | `scraper.js:60-76` | **Easy** | Pure recursive traversal, takes Set |
| `withTimeout(promise, ms)` | `scraper.js:79-84` | **Easy** | Promise wrapper, no deps |
| `saveUrls(urls)` | `scraper.js:87-94` | **Medium** | File I/O — mock `fs.writeFileSync` |
| `notifyWebhook(count)` | `scraper.js:97-115` | **Medium** | HTTP client — mock `http.request` |

### Functions That Are Hard to Test (Current Structure)

| Function | Lines | Difficulty | Why |
|----------|-------|------------|-----|
| CLI arg parsing | `scraper.js:19-30` | **Hard** | Module-level side effects, `process.argv` coupling |
| `main()` | `scraper.js:118-239` | **Hard** | 120 lines, browser launch, network, scroll loop, all in one function |
| Daemon mode | `scraper.js:242-255` | **Hard** | `fork`, `process.exit`, file I/O, all at module scope |

### Mocking Guidelines

**What to Mock:**
- `fs.writeFileSync` / `fs.existsSync` / `fs.mkdirSync` for file operations
- `http.request` / `https.request` for webhook notifications
- `cloakbrowser.launch` for browser operations
- `process.argv` for CLI argument tests

**What NOT to Mock:**
- `extractProfileUrls` — pure function, test with real objects
- `withTimeout` — pure promise wrapper, test with real timers
- `pad` — trivial pure function

**Mock Pattern (using Vitest):**
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs before importing anything that uses it
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn().mockReturnValue(true),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        unlinkSync: vi.fn(),
        openSync: vi.fn(),
        closeSync: vi.fn(),
    },
}));

// Mock the browser launcher
vi.mock('cloakbrowser', () => ({
    launch: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
            route: vi.fn(),
            on: vi.fn(),
            goto: vi.fn(),
            evaluate: vi.fn(),
            waitForTimeout: vi.fn(),
            close: vi.fn(),
        }),
        close: vi.fn(),
    }),
}));
```

### Critical Architecture Problem for Testing

The entire application runs as a **top-level script with side effects at import time** (`scraper.js:19-57`). This means:

1. Importing `scraper.js` in a test triggers CLI parsing, directory creation, and potentially browser launch
2. `process.exit(1)` calls (`scraper.js:34,39`) will terminate the test runner
3. Module-level constants depend on `process.argv` which is shared state

**To make this testable, refactor into:**

```javascript
// scraper.js — thin entry point only
import { run } from './lib/scraper-core.js';
run(process.argv.slice(2));

// lib/scraper-core.js — all logic, no side effects on import
export function parseArgs(argv) { /* returns parsed config */ }
export async function run(argv) { /* main logic */ }
```

### Sample Unit Tests (For Existing Helpers)

```javascript
import { describe, it, expect, vi } from 'vitest';

// Extracted from scraper.js for testing
function pad(n) {
    return String(n).padStart(2, '0');
}

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

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
        ),
    ]);
}

describe('pad', () => {
    it('pads single digits', () => {
        expect(pad(0)).toBe('00');
        expect(pad(5)).toBe('05');
        expect(pad(9)).toBe('09');
    });

    it('does not pad double digits', () => {
        expect(pad(10)).toBe('10');
        expect(pad(31)).toBe('31');
    });
});

describe('extractProfileUrls', () => {
    it('extracts direct page_profile_uri', () => {
        const urls = new Set();
        extractProfileUrls(
            { page_profile_uri: 'https://fb.com/page1' },
            urls
        );
        expect(urls).toEqual(new Set(['https://fb.com/page1']));
    });

    it('recursively extracts from nested objects', () => {
        const urls = new Set();
        extractProfileUrls(
            {
                data: {
                    node: {
                        snapshot: {
                            page_profile_uri: 'https://fb.com/page2',
                        },
                    },
                },
            },
            urls
        );
        expect(urls).toEqual(new Set(['https://fb.com/page2']));
    });

    it('recursively extracts from arrays', () => {
        const urls = new Set();
        extractProfileUrls(
            [
                { page_profile_uri: 'https://fb.com/a' },
                { page_profile_uri: 'https://fb.com/b' },
            ],
            urls
        );
        expect(urls).toEqual(
            new Set(['https://fb.com/a', 'https://fb.com/b'])
        );
    });

    it('handles null/undefined gracefully', () => {
        const urls = new Set();
        extractProfileUrls(null, urls);
        extractProfileUrls(undefined, urls);
        expect(urls.size).toBe(0);
    });

    it('deduplicates via Set', () => {
        const urls = new Set();
        extractProfileUrls(
            { page_profile_uri: 'https://fb.com/dup' },
            urls
        );
        extractProfileUrls(
            { page_profile_uri: 'https://fb.com/dup' },
            urls
        );
        expect(urls.size).toBe(1);
    });
});

describe('withTimeout', () => {
    it('resolves if promise completes before timeout', async () => {
        const result = await withTimeout(
            Promise.resolve('ok'),
            1000
        );
        expect(result).toBe('ok');
    });

    it('rejects if promise exceeds timeout', async () => {
        await expect(
            withTimeout(new Promise(() => {}), 50)
        ).rejects.toThrow('Timed out after 50ms');
    });
});
```

## Coverage

**Requirements:** None enforced.

**Coverage Tool:** None configured. If adding Vitest, use `@vitest/coverage-v8`:
```bash
bun add -d @vitest/coverage-v8
```

**View Coverage:**
```bash
bun run test:coverage
# Generates report in ./coverage/
```

## CI/CD Testing

**Not configured.** No `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, or equivalent exists.

**Recommended CI pipeline (if added):**
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test
```

---

*Testing analysis: 2026-06-29*
