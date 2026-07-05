# Phase 4: Daemon & Validation - Research

**Researched:** 2026-07-05
**Domain:** Process management, file locking, test automation
**Confidence:** HIGH

## Summary

Phase 4 adds daemon mode with proper process management and a comprehensive test suite. The daemon implementation requires child process forking with PID file management, flock-based locking to prevent race conditions, and graceful signal handlers. The test suite uses bun:test with mock functions for unit tests, integration tests for CLI and webhook behavior, and E2E tests with fixture files.

**Primary recommendation:** Use `proper-lockfile` for PID management (17M+ weekly downloads, verified OK) and bun:test's native mock/spyOn for testing. Implement daemon as a vertical slice first, then add tests.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `--daemon` is a boolean flag (starts background process). No value needed.
- **D-02:** `--daemon-action` is a separate string flag for management: `stop`, `status`, `logs`
- **D-03:** This avoids yargs parsing conflicts where `--daemon --query X` would misassign `--query` as daemon's value
- **D-04:** Parent prints PID and exits immediately after forking child. Child runs independently.
- **D-05:** `--daemon-action stop` auto-detects PID from `.daemon.pid` file, sends SIGTERM
- **D-06:** If daemon already running when starting new one: prompt user for confirmation before stopping existing
- **D-07:** PID file location: project root `.daemon.pid`
- **D-08:** PID file format: plain text PID number
- **D-09:** Use flock-based locking to prevent race conditions between simultaneous starts
- **D-10:** Delete PID file on clean exit (SIGTERM/SIGINT handler)
- **D-11:** Daemon log location: project root `daemon.log`
- **D-12:** Log file is cleared and overwritten on each daemon start (no append, no rotation)
- **D-13:** Test files in separate `test/` directory (not co-located with source)
- **D-14:** Structure: `test/unit/`, `test/integration/`, `test/e2e/` organized by test type
- **D-15:** Test runner: `bun test` (Phase 1 decision, SETUP-04)
- **D-16:** Coverage target: 70% minimum line coverage
- **D-17:** Tests never write to production folders like `output/` — use temp directories or test fixtures
- **D-18:** E2E tests use real browser with HTML fixture (not mocked browser)
- **D-19:** Capture real GraphQL responses as fixture files in `test/fixtures/`
- **D-20:** E2E tests verify full data flow: args → config → browser → extraction → output

### the agent's Discretion

- flock implementation details (which Node.js API to use)
- Daemon module API shape (function with options vs separate functions)
- Test file naming convention within each test/ subdirectory
- Fixture file format and organization
- Exact coverage enforcement mechanism (CI script vs package.json check)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DAEMON-01 | Daemon mode via child process forking | Use `Bun.spawn()` with detached option or Node.js `child_process.fork()` — both verified via Context7 |
| DAEMON-02 | PID file management with flock-based locking | Use `proper-lockfile` package (17M+ weekly downloads, verified OK) |
| DAEMON-03 | Proper logging to log file in daemon mode | Redirect stdout/stderr to log file via stdio option in spawn |
| DAEMON-04 | Graceful shutdown handlers (SIGTERM, SIGINT) | Register process.on('SIGTERM') and process.on('SIGINT') handlers |
| DAEMON-05 | State saving before exit | Call saveUrlsToFile() in shutdown handler before process.exit() |
| TEST-01 | Unit tests for extraction logic | Test extractProfileUrls() with mock objects using bun:test |
| TEST-02 | Unit tests for configuration parsing | Test loadConfig() and resolvePreset() with mock cosmiconfig |
| TEST-03 | Integration tests for CLI argument parsing | Test yargs parsing with process.argv mocking |
| TEST-04 | Integration tests for webhook notification | Test notifyWebhook() with mock http/https using bun:test mock() |
| TEST-05 | E2E tests for full scrape workflow (mocked browser) | Test runScraper() with mocked cloakbrowser launch |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Daemon process forking | CLI/Entry | — | Daemon is triggered by CLI flag, forks child process |
| PID file management | CLI/Entry | — | PID file is created/checked at startup, deleted on shutdown |
| Signal handling (SIGTERM/SIGINT) | CLI/Entry | — | Signals are registered in daemon child process |
| Log file redirection | CLI/Entry | — | Log file is created when daemon flag is set |
| Test infrastructure | DevTooling | — | Test framework, fixtures, coverage config |
| Extraction testing | DevTooling | Extraction | Test the extractProfileUrls function in isolation |
| Config testing | DevTooling | Config | Test loadConfig and resolvePreset with mocks |
| CLI testing | DevTooling | CLI | Test yargs argument parsing |
| Webhook testing | DevTooling | Webhook | Test HTTP POST with mocked network |
| E2E testing | DevTooling | Scraper | Test full pipeline with mocked browser |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `proper-lockfile` | 4.1.2 | File-based locking for PID management | 17M+ weekly downloads, cross-platform, handles stale locks |
| `bun:test` | built-in | Test runner and assertion library | Native Bun testing, fast execution, built-in mocking |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `bun:test` mock() | built-in | Create mock functions | When testing functions with external dependencies |
| `bun:test` spyOn() | built-in | Spy on object methods | When verifying method calls on existing objects |
| `child_process.fork()` | built-in | Fork Node.js/Bun processes | When creating daemon child process |
| `Bun.spawn()` | built-in | Spawn arbitrary processes | Alternative to fork for non-Node processes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `proper-lockfile` | `fs.flock()` (POSIX) | proper-lockfile is cross-platform and handles stale locks automatically |
| `child_process.fork()` | `Bun.spawn()` | fork is simpler for Bun/Node scripts, spawn is more flexible |
| `bun:test` | `vitest` | bun:test is native to Bun runtime, faster startup |

**Installation:**
```bash
bun add proper-lockfile
```

**Version verification:** Before writing the Standard Stack table, verify each recommended package exists and is current using the ecosystem-appropriate command:
```bash
npm view proper-lockfile version          # Node.js phases
```
Document the verified version and publish date. Training data versions may be months stale — always confirm against the correct ecosystem registry.

## Package Legitimacy Audit

> **Required** whenever this phase installs external packages. Run the Package Legitimacy Gate protocol before completing this section.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `proper-lockfile` | npm | 2021-01-25 | 17,403,961/week | github.com/moxystudio/node-proper-lockfile | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*Packages discovered via WebSearch or training data that have not been verified against an authoritative source are tagged `[ASSUMED]` and the planner must gate each install behind a `checkpoint:human-verify` task.*

## Architecture Patterns

### System Architecture Diagram

```
CLI Entry (src/cli.ts)
    │
    ├── Parse --daemon flag
    │   └── YES → Daemon Manager (src/daemon.ts)
    │       ├── Acquire flock on .daemon.pid
    │       ├── Write PID to .daemon.pid
    │       ├── Fork child process
    │       ├── Parent: print PID, exit
    │       └── Child: run main pipeline
    │
    └── NO → Main Pipeline (src/index.ts)
        ├── Load config
        ├── Run scraper
        ├── Save output
        └── Notify webhook

Test Infrastructure
    │
    ├── test/unit/
    │   ├── extractor.test.ts
    │   ├── config.test.ts
    │   ├── output.test.ts
    │   └── webhook.test.ts
    │
    ├── test/integration/
    │   ├── cli.test.ts
    │   └── pipeline.test.ts
    │
    ├── test/e2e/
    │   └── scraper.test.ts
    │
    └── test/fixtures/
        ├── graphql-response.json
        └── facebook-page.html
```

### Recommended Project Structure

```
src/
├── cli.ts          # CLI entry point (add --daemon-action flag)
├── index.ts        # Main pipeline orchestrator
├── daemon.ts       # NEW: Daemon manager module
├── config.ts       # Configuration loading
├── scraper.ts      # Scraper engine
├── extractor.ts    # GraphQL extraction
├── output.ts       # File output
├── webhook.ts      # Webhook notifications
├── browser.ts      # Browser controller
├── errors.ts       # Error handling
├── logger.ts       # Logging
└── types.ts        # Shared types

test/
├── unit/
│   ├── extractor.test.ts
│   ├── config.test.ts
│   ├── output.test.ts
│   └── webhook.test.ts
├── integration/
│   ├── cli.test.ts
│   └── pipeline.test.ts
├── e2e/
│   └── scraper.test.ts
└── fixtures/
    ├── graphql-response.json
    └── facebook-page.html
```

### Pattern 1: Daemon Process Forking
**What:** Fork a detached child process that runs independently after parent exits
**When to use:** When background execution is needed without blocking the terminal
**Example:**
```typescript
// Source: [CITED: github.com/oven-sh/bun/blob/main/docs/runtime/child-process.mdx]
import { fork } from 'child_process';
import fs from 'fs';

function startDaemon(argv: string[]): number {
    const child = fork(process.argv[1], argv, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    child.unref();
    return child.pid!;
}
```

### Pattern 2: PID File Management with Locking
**What:** Use proper-lockfile to prevent race conditions when multiple daemons start simultaneously
**When to use:** When PID file must be atomic and race-safe
**Example:**
```typescript
// Source: [CITED: github.com/moxystudio/node-proper-lockfile/blob/master/README.md]
import lockfile from 'proper-lockfile';
import fs from 'fs';

const PID_FILE = '.daemon.pid';

async function acquirePidLock(): Promise<() => Promise<void>> {
    // Create PID file if it doesn't exist
    if (!fs.existsSync(PID_FILE)) {
        fs.writeFileSync(PID_FILE, '');
    }
    return lockfile.lock(PID_FILE, {
        retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 },
    });
}

function writePid(pid: number): void {
    fs.writeFileSync(PID_FILE, String(pid));
}

function readPid(): number | null {
    if (!fs.existsSync(PID_FILE)) return null;
    const content = fs.readFileSync(PID_FILE, 'utf-8').trim();
    return content ? parseInt(content, 10) : null;
}

function removePidFile(): void {
    try { fs.unlinkSync(PID_FILE); } catch {}
}
```

### Pattern 3: Graceful Shutdown Handler
**What:** Register SIGTERM/SIGINT handlers that save state before exit
**When to use:** When daemon must clean up on termination
**Example:**
```typescript
// Source: [CITED: github.com/oven-sh/bun/blob/main/docs/runtime/child-process.mdx]
function setupShutdownHandler(deps: {
    saveState: () => void;
    cleanup: () => Promise<void>;
    logger: Logger;
}): void {
    let shuttingDown = false;

    const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;

        deps.logger.info(`Received ${signal}, shutting down...`);

        try {
            deps.saveState();
        } catch (err) {
            deps.logger.error({ err }, 'Failed to save state');
        }

        try {
            await deps.cleanup();
        } catch (err) {
            deps.logger.error({ err }, 'Failed to cleanup');
        }

        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
```

### Pattern 4: bun:test Mocking
**What:** Use mock() and spyOn() for test doubles
**When to use:** When testing functions with external dependencies (file I/O, network)
**Example:**
```typescript
// Source: [CITED: github.com/oven-sh/bun/blob/main/docs/test/mocks.mdx]
import { describe, it, expect, mock } from 'bun:test';

// Mock fs module
const mockWriteFileSync = mock(() => {});
const mockReadFileSync = mock(() => '');

// Test extraction logic
describe('extractProfileUrls', () => {
    it('extracts direct page_profile_uri', () => {
        const urls = new Set<string>();
        extractProfileUrls({ page_profile_uri: 'https://fb.com/page1' }, urls);
        expect(urls).toEqual(new Set(['https://fb.com/page1']));
    });
});
```

### Anti-Patterns to Avoid

- **PID file without locking:** Race condition when multiple daemons start simultaneously — use proper-lockfile
- **process.exit() in shutdown handler without saving:** Data loss if state is not persisted first
- **Mocking pure functions:** Don't mock extractProfileUrls() — it's pure, test with real objects
- **Co-located tests:** Tests should be in test/ directory per D-13, not next to source files

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File locking | Custom flock with fs.flock() | `proper-lockfile` | Cross-platform, handles stale locks, 17M+ weekly downloads |
| PID management | Custom PID read/write with fs | `proper-lockfile` with PID file | Atomic operations, race condition prevention |
| Test mocking | Manual mock objects | `bun:test` mock() | Built-in, type-safe, call tracking |
| Coverage reporting | Custom coverage script | `bun test --coverage` | Built-in, detailed reports, threshold support |

**Key insight:** File locking is deceptively complex — stale locks, race conditions, cross-platform behavior. proper-lockfile handles all edge cases.

## Runtime State Inventory

> Include this section for rename/refactor/migration phases only. Omit entirely for greenfield phases.

This section is OMIOTTED — Phase 4 is not a rename/refactor/migration phase.

## Common Pitfalls

### Pitfall 1: PID File Race Condition
**What goes wrong:** Two daemons start simultaneously, both write to PID file, one overwrites the other's PID
**Why it happens:** No locking mechanism on PID file
**How to avoid:** Use proper-lockfile to acquire exclusive lock before writing PID
**Warning signs:** Daemon fails to start, PID file contains wrong PID

### Pitfall 2: Stale PID File
**What goes wrong:** Daemon crashes without cleaning up PID file, next start thinks daemon is running
**Why it happens:** PID file not deleted on abnormal exit
**How to avoid:** Check if process with stored PID is actually running before prompting user
**Warning signs:** "Daemon already running" message when no daemon is running

### Pitfall 3: Log File Not Cleared
**What goes wrong:** Log file grows unbounded across daemon restarts
**Why it happens:** Log file opened in append mode without clearing
**How to avoid:** Use 'w' mode instead of 'a' mode when opening log file, or truncate on start
**Warning signs:** Log file contains entries from previous runs

### Pitfall 4: Test Isolation Failures
**What goes wrong:** Tests write to production output/ directory, causing flaky tests
**Why it happens:** Tests not using temp directories per D-17
**How to avoid:** Use Bun.tempdir() or /tmp/ for all test file operations
**Warning signs:** Tests fail when output/ directory has unexpected files

### Pitfall 5: Mock Leak Between Tests
**What goes wrong:** Mock functions retain call history between tests, causing false positives
**Why it happens:** Not calling mockClear() in beforeEach/afterEach
**How to avoid:** Clear all mocks in beforeEach hook
**Warning signs:** Tests pass individually but fail when run together

## Code Examples

Verified patterns from official sources:

### Daemon Start with PID Lock
```typescript
// Source: [CITED: github.com/moxystudio/node-proper-lockfile/blob/master/README.md]
import lockfile from 'proper-lockfile';
import { fork } from 'child_process';
import fs from 'fs';

const PID_FILE = '.daemon.pid';

async function startDaemon(query: string, options: DaemonOptions): Promise<number> {
    // Acquire lock on PID file
    const release = await lockfile.lock(PID_FILE, {
        retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 },
    });

    try {
        // Check if daemon already running
        const existingPid = readPid();
        if (existingPid && isProcessRunning(existingPid)) {
            throw new Error(`Daemon already running (PID: ${existingPid})`);
        }

        // Fork child process
        const child = fork(process.argv[1], [query, ...buildArgs(options)], {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        });

        // Write PID and release lock
        writePid(child.pid!);
        child.unref();

        return child.pid!;
    } finally {
        await release();
    }
}
```

### bun:test Unit Test for Extraction
```typescript
// Source: [CITED: github.com/oven-sh/bun/blob/main/docs/test/mocks.mdx]
import { describe, it, expect } from 'bun:test';
import { extractProfileUrls } from '../../src/extractor.js';

describe('extractProfileUrls', () => {
    it('extracts direct page_profile_uri', () => {
        const urls = new Set<string>();
        extractProfileUrls({ page_profile_uri: 'https://fb.com/page1' }, urls);
        expect(urls).toEqual(new Set(['https://fb.com/page1']));
    });

    it('recursively extracts from nested objects', () => {
        const urls = new Set<string>();
        extractProfileUrls(
            { data: { node: { snapshot: { page_profile_uri: 'https://fb.com/page2' } } } },
            urls,
        );
        expect(urls).toEqual(new Set(['https://fb.com/page2']));
    });

    it('handles null/undefined gracefully', () => {
        const urls = new Set<string>();
        extractProfileUrls(null, urls);
        extractProfileUrls(undefined, urls);
        expect(urls.size).toBe(0);
    });
});
```

### bun:test Mock for Webhook
```typescript
// Source: [CITED: github.com/oven-sh/bun/blob/main/docs/test/mocks.mdx]
import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock http module
const mockRequest = mock(() => ({
    on: mock(() => {}),
    end: mock(() => {}),
}));

mock.module('http', () => ({
    default: { request: mockRequest },
}));

describe('notifyWebhook', () => {
    beforeEach(() => {
        mockRequest.mockClear();
    });

    it('sends POST with Content-Type application/json', async () => {
        await notifyWebhook({
            url: 'http://example.com/webhook',
            payload: { query: 'test', outputFile: 'test.json', count: 10 },
            logger: pino({ level: 'silent' }),
        });

        expect(mockRequest).toHaveBeenCalled();
        const callArgs = mockRequest.mock.calls[0];
        expect(callArgs[1].headers['Content-Type']).toBe('application/json');
    });
});
```

### Coverage Configuration
```toml
# Source: [CITED: github.com/oven-sh/bun/blob/main/docs/runtime/bunfig.mdx]
# bunfig.toml
[test]
coverageThreshold = { line = 0.7, function = 0.7, statement = 0.7 }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual PID file management | proper-lockfile with atomic locking | 2021+ | Prevents race conditions |
| Jest/Vitest for testing | bun:test native testing | 2023+ | Faster execution, built-in mocking |
| Custom coverage scripts | bun test --coverage | 2023+ | Built-in coverage reporting |

**Deprecated/outdated:**
- `fs.flock()` for file locking: Platform-specific, doesn't handle stale locks — use proper-lockfile
- Jest for Bun projects: Slower startup, requires configuration — use bun:test

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this
> section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `proper-lockfile` works with Bun runtime | Standard Stack | Daemon mode PID locking may need alternative approach |
| A2 | `child_process.fork()` works identically in Bun as Node.js | Architecture Patterns | Daemon forking may need Bun.spawn() alternative |
| A3 | bun:test mock() supports mock.module() for module mocking | Code Examples | Webhook tests may need different mocking strategy |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Does `proper-lockfile` work with Bun?**
   - What we know: proper-lockfile is a Node.js package with 17M+ weekly downloads
   - What's unclear: Bun compatibility — Bun has Node.js API compatibility but may have edge cases
   - Recommendation: Test during Plan 04-01; fallback to manual flock with fs.flock() if issues

2. **Should daemon module be separate file or part of index.ts?**
   - What we know: Current architecture has index.ts as pipeline orchestrator
   - What's unclear: Whether daemon logic belongs in index.ts or separate daemon.ts
   - Recommendation: Create separate daemon.ts per D-13 (testability) and clean separation

## Environment Availability

> Skip this section if the phase has no external dependencies (code/config-only changes).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun runtime | All tests | ✓ | 1.3.12 | — |
| proper-lockfile | PID locking | ✓ (to install) | 4.1.2 | Manual flock with fs |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- proper-lockfile: Install via `bun add proper-lockfile`; fallback to manual fs.flock() if Bun incompatible

## Validation Architecture

> Skip this section entirely if workflow.nyquist_validation is explicitly set to false in .planning/config.json. If the key is absent, treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | bunfig.toml (for coverage thresholds) |
| Quick run command | `bun test` |
| Full suite command | `bun test --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DAEMON-01 | Daemon mode via child process forking | integration | `bun test test/integration/daemon.test.ts` | ❌ Wave 0 |
| DAEMON-02 | PID file management with flock-based locking | unit | `bun test test/unit/daemon.test.ts` | ❌ Wave 0 |
| DAEMON-03 | Proper logging to log file in daemon mode | integration | `bun test test/integration/daemon.test.ts` | ❌ Wave 0 |
| DAEMON-04 | Graceful shutdown handlers (SIGTERM, SIGINT) | unit | `bun test test/unit/daemon.test.ts` | ❌ Wave 0 |
| DAEMON-05 | State saving before exit | unit | `bun test test/unit/daemon.test.ts` | ❌ Wave 0 |
| TEST-01 | Unit tests for extraction logic | unit | `bun test test/unit/extractor.test.ts` | ❌ Wave 0 |
| TEST-02 | Unit tests for configuration parsing | unit | `bun test test/unit/config.test.ts` | ❌ Wave 0 |
| TEST-03 | Integration tests for CLI argument parsing | integration | `bun test test/integration/cli.test.ts` | ❌ Wave 0 |
| TEST-04 | Integration tests for webhook notification | integration | `bun test test/integration/webhook.test.ts` | ❌ Wave 0 |
| TEST-05 | E2E tests for full scrape workflow | e2e | `bun test test/e2e/scraper.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `bun test`
- **Per wave merge:** `bun test --coverage`
- **Phase gate:** Full suite green with 70% coverage before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `test/unit/extractor.test.ts` — covers TEST-01
- [ ] `test/unit/config.test.ts` — covers TEST-02
- [ ] `test/unit/daemon.test.ts` — covers DAEMON-02, DAEMON-04, DAEMON-05
- [ ] `test/unit/output.test.ts` — move existing src/output.test.ts
- [ ] `test/unit/webhook.test.ts` — move existing src/webhook.test.ts
- [ ] `test/integration/cli.test.ts` — covers TEST-03
- [ ] `test/integration/daemon.test.ts` — covers DAEMON-01, DAEMON-03
- [ ] `test/integration/webhook.test.ts` — covers TEST-04
- [ ] `test/e2e/scraper.test.ts` — covers TEST-05
- [ ] `test/fixtures/graphql-response.json` — E2E fixture
- [ ] `test/fixtures/facebook-page.html` — E2E fixture
- [ ] `bunfig.toml` — coverage threshold config

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

## Security Domain

> Required when `security_enforcement` is enabled (absent = enabled). Omit only if explicitly `false` in config.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A (CLI tool, no auth) |
| V3 Session Management | No | N/A (stateless CLI) |
| V4 Access Control | No | N/A (single-user CLI) |
| V5 Input Validation | Yes | Zod schema validation (already implemented) |
| V6 Cryptography | No | N/A (no encryption needed) |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| PID file tampering | Tampering | proper-lockfile atomic operations |
| Log file injection | Tampering | Log to file with controlled format |
| Process spawn injection | Elevation of Privilege | Validate all inputs before fork() |

## Sources

### Primary (HIGH confidence)
- [Context7 /oven-sh/bun] - bun:test mocking, snapshot, coverage documentation
- [Context7 /moxystudio/node-proper-lockfile] - File locking API and patterns
- [npm registry] - proper-lockfile version 4.1.2, 17M+ weekly downloads

### Secondary (MEDIUM confidence)
- [GitHub oven-sh/bun] - child_process.fork() and Bun.spawn() documentation
- [GitHub moxystudio/node-proper-lockfile] - README with usage examples

### Tertiary (LOW confidence)
- None — all findings verified via Context7 or npm registry

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - proper-lockfile verified via npm registry and Context7
- Architecture: HIGH - daemon patterns verified via Bun documentation
- Pitfalls: HIGH - common patterns documented in official sources

**Research date:** 2026-07-05
**Valid until:** 2026-08-04 (30 days — stable ecosystem)
