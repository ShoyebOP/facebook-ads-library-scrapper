# Testing Patterns

**Analysis Date:** 2026-07-07

## Test Framework

**Runner:**
- Bun test (`bun test`)
- Config: `bunfig.toml`
- No separate test framework (uses built-in `bun:test`)

**Assertion Library:**
- Built-in Bun assertions (`expect` from `bun:test`)
- No external assertion library (e.g., chai, jest)

**Run Commands:**
```bash
bun test                    # Run all tests
bun test --watch            # Watch mode
bun test test/unit/         # Run unit tests only
bun test test/integration/  # Run integration tests only
bun test test/e2e/          # Run e2e tests only
```

**Coverage Configuration:**
```toml
# bunfig.toml
[test]
coverageThreshold = { line = 0.7, function = 0.7, statement = 0.7 }
```

## Test File Organization

**Location:**
- Primary: `test/` directory with subdirectories by test type
- Secondary: Co-located in `src/` (e.g., `src/webhook.test.ts`, `src/output.test.ts`)

**Naming:**
- Test files: `camelCase.test.ts`
- Matches source file name (e.g., `src/errors.ts` → `test/unit/errors.test.ts`)

**Structure:**
```
test/
├── fixtures/                  # Test data files
│   └── graphql-response.json  # Mock GraphQL response
├── unit/                      # Unit tests (isolated, mocked)
│   ├── browser.test.ts
│   ├── config.test.ts
│   ├── daemon.test.ts
│   ├── errors.test.ts
│   ├── extractor.test.ts
│   ├── interceptor.test.ts
│   ├── logger.test.ts
│   ├── output.test.ts
│   ├── setup.test.ts
│   ├── types.test.ts
│   └── webhook.test.ts
├── integration/               # Integration tests (multiple modules)
│   ├── cli.test.ts
│   ├── daemon.test.ts
│   └── webhook.test.ts
└── e2e/                       # End-to-end tests (full pipeline)
    └── scraper.test.ts

src/
├── output.test.ts             # Co-located unit test
└── webhook.test.ts            # Co-located unit test
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';

describe('Module name', () => {
    describe('Function name', () => {
        it('description of behavior', async () => {
            // Arrange
            const input = setupTestData();
            
            // Act
            const result = functionUnderTest(input);
            
            // Assert
            expect(result).toBe(expectedValue);
        });
    });
});
```

**Patterns:**
- Nested `describe` blocks for module → function → behavior
- `it` for individual test cases
- Descriptive test names starting with action verbs
- Async tests use `async/await`

## Mocking

**Framework:** Built-in Bun mocking (`mock` from `bun:test`)

**Module Mocking:**
```typescript
// Mock entire modules
mock.module('../../src/errors.js', () => ({
    withTimeout: mockWithTimeout,
}));

mock.module('../../src/logger.js', () => ({
    createChildLogger: mockCreateChildLogger,
}));
```

**Function Mocking:**
```typescript
// Create mock functions
const mockLoadConfig = mock(() => Promise.resolve({
    presets: {
        leadgen: { callback: 'https://example.com/webhook/leadgen' },
    },
}));

// Mock implementation
const mockRunScraper = mock(() => Promise.resolve(new Set<string>()));

// Clear mocks between tests
beforeEach(() => {
    mockLoadConfig.mockClear();
    mockRunScraper.mockClear();
});
```

**Process Mocking:**
```typescript
// Mock process.exit to prevent test termination
const originalExit = process.exit;
let exitCalled = false;
let exitCode: number | undefined;

beforeEach(() => {
    exitCalled = false;
    exitCode = undefined;
    process.exit = ((code?: number) => {
        exitCalled = true;
        exitCode = code;
        throw new Error(`process.exit(${code})`);
    }) as any;
});

afterEach(() => {
    process.exit = originalExit;
});
```

**What to Mock:**
- External dependencies: `cloakbrowser`, `pino`, `p-retry`
- File system operations: `fs`, `fs/promises`
- Network calls: `http`, `https`
- Process operations: `process.exit`, `process.kill`
- Time-dependent operations: `Date.now()` (if needed)

**What NOT to Mock:**
- Pure functions: `extractProfileUrls`, `pad`, `classifyError`
- Types/interfaces: No runtime behavior to mock
- Configuration constants: `PID_FILE`, `LOG_FILE`

## Fixtures and Factories

**Test Data:**
```json
// test/fixtures/graphql-response.json
{
  "data": {
    "ad_library_results": {
      "edges": [
        {
          "node": {
            "sponsored_item": {
              "page_profile_uri": "https://facebook.com/profile/advertiser1",
              "ad_archive_info": { "body": "Sample ad body text 1" }
            }
          }
        },
        // ... more edges
      ]
    }
  }
}
```

**Fixture Usage:**
```typescript
import fixtureData from '../fixtures/graphql-response.json';

it('extracts all profile URLs from fixture', async () => {
    const { extractProfileUrls } = await import('../../src/extractor.js');
    const urls = new Set<string>();
    extractProfileUrls(fixtureData, urls);
    expect(urls.size).toBe(3);
});
```

**Location:** `test/fixtures/`

## Coverage

**Requirements:**
- Line coverage: 70%
- Function coverage: 70%
- Statement coverage: 70%

**View Coverage:**
```bash
bun test --coverage          # Run with coverage report
```

## Test Types

**Unit Tests:**
- Scope: Individual functions/modules in isolation
- Mocking: Heavy use of `mock.module` and `mock()`
- Location: `test/unit/` and `src/*.test.ts`
- Focus: Function behavior, edge cases, error handling

**Integration Tests:**
- Scope: Multiple modules working together
- Mocking: Selective mocking of external dependencies
- Location: `test/integration/`
- Focus: Pipeline wiring, module interactions, CLI argument parsing

**E2E Tests:**
- Scope: Full pipeline contracts
- Mocking: Minimal, uses real fixture data
- Location: `test/e2e/`
- Focus: Data flow, output format, pipeline orchestration

## Common Patterns

**Async Testing:**
```typescript
it('async function returns expected result', async () => {
    const result = await asyncFunctionUnderTest();
    expect(result).toBe(expectedValue);
});
```

**Error Testing:**
```typescript
it('throws on invalid input', async () => {
    await expect(
        asyncFunctionUnderTest(invalidInput)
    ).rejects.toThrow('Expected error message');
});

it('handles error gracefully', async () => {
    // Function should not throw
    await expect(
        asyncFunctionThatShouldNotThrow()
    ).resolves.not.toThrow();
});
```

**Source Code Inspection Pattern:**
```typescript
// Verify implementation details by reading source
it('uses withRetry for launch', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/browser.ts', 'utf-8');
    expect(source).toContain('withRetry');
});
```

**Dynamic Import Pattern:**
```typescript
// Import module under test inside test function
it('function exists', async () => {
    const mod = await import('../../src/config');
    expect(typeof mod.loadConfig).toBe('function');
});
```

**Temp Directory Pattern:**
```typescript
const tmpDir = '/tmp/output-test';

beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
});
```

---

*Testing analysis: 2026-07-07*
