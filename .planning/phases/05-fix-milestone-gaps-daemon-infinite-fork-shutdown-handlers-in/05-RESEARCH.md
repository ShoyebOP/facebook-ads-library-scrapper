# Phase 5: Fix milestone gaps (daemon infinite fork, shutdown handlers, incremental saver) - Research

**Researched:** 2026-07-06
**Domain:** Bug fixes and integration gaps in daemon mode, shutdown handling, and incremental saving
**Confidence:** HIGH

## Summary

Phase 5 addresses four critical gaps in the milestone implementation that were identified during code review and testing. The most severe issue is the daemon infinite fork bug — when the child process starts, it hits the `--daemon` block in `index.ts` and attempts to fork again, creating an infinite loop. This is a showstopper for daemon mode functionality.

The second critical gap is that shutdown handlers exist in both `daemon.ts` and `errors.ts` but are never wired into the main execution flow. This means SIGINT/SIGTERM signals are not handled, causing abrupt termination without saving state or closing the browser gracefully.

The third gap is the unused incremental saver — `createIncrementalSaver()` exists in `output.ts` with full test coverage, but is never integrated into the scraper loop. This means URLs are only saved at the end, risking data loss on crashes.

Finally, there are minor CLI validation gaps (missing `--proxy` value check) and potential dead code to clean up.

**Primary recommendation:** Fix daemon infinite fork first (highest severity), then wire shutdown handlers, integrate incremental saver, and clean up CLI validation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 to D-04:** Daemon fork prevention via `SCRAPER_DAEMON_CHILD=1` environment variable
- **D-05 to D-08:** Shutdown handler wiring in `main()` after scraper starts, passing saveState and cleanup callbacks
- **D-09 to D-12:** Incremental saver integration via ScraperOptions, calling saver after each scroll
- **D-13 to D-16:** Dead code cleanup (remove old scraper.js), fix `--proxy` validation, add logging to catch blocks

### the agent's Discretion
- Exact validation approach for `--proxy` flag (yargs implies vs custom check)
- Whether to add proxy URL format validation (HTTP/SOCKS5 scheme check)
- Order of operations for the fixes
- Test coverage for the bug fixes

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DAEMON-01 | Daemon mode via child process forking | Fix infinite fork loop by adding env var check before fork |
| DAEMON-04 | Graceful shutdown handlers (SIGTERM, SIGINT) | Wire existing `setupDaemonShutdown()` and `setupShutdownHandler()` into main flow |
| SCRAPE-10 | Graceful shutdown on SIGINT/SIGTERM | Same as DAEMON-04 — integrate shutdown handlers |
| OUTPUT-02 | Incremental URL saving (every 100 new URLs or on crash) | Integrate existing `createIncrementalSaver()` into scraper loop |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Daemon fork prevention | CLI/Process | — | Environment variable check in `main()` before fork decision |
| Shutdown signal handling | Process | Browser | Signal handlers must close browser and save state before exit |
| Incremental URL saving | Scraper Loop | Output | Saver must be called after each scroll iteration in scraper |
| CLI validation | CLI | — | Argument validation in `cli.ts` before calling `main()` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pino | ^10.3.1 | Structured logging | Already in use, provides consistent logging |
| child_process (built-in) | — | Process forking | Node.js/Bun standard for daemon mode |
| fs (built-in) | — | File I/O | Standard for PID file and output management |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| proper-lockfile | ^4.1.2 | PID file locking | Prevents race conditions on concurrent daemon starts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Environment variable check | IPC message from parent | More complex; env var is simpler and matches existing pattern |
| createIncrementalSaver() | Manual save in scraper | Saver encapsulates threshold logic; reuse existing tested code |

**Installation:** No new packages needed — all dependencies already installed.

## Package Legitimacy Audit

> No new packages being installed in this phase — all dependencies already in package.json.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### Daemon Fork Prevention Pattern

**What:** Use environment variable `SCRAPER_DAEMON_CHILD=1` to prevent infinite fork loops
**When to use:** Any daemon mode that uses child_process.fork()
**Example:**
```typescript
// Source: Phase 5 CONTEXT.md D-01 to D-04
// In src/daemon.ts startDaemon():
const child = fork(process.argv[1], argv, {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, SCRAPER_DAEMON_CHILD: '1' },  // D-02: Set env var
});

// In src/index.ts main():
if (argv.daemon) {
    // D-03: Check if already a daemon child
    if (process.env.SCRAPER_DAEMON_CHILD === '1') {
        // D-04: Skip fork, run scraper directly
        logger.info('Running as daemon child, skipping fork');
    } else {
        const { startDaemon } = await import('./daemon.js');
        const pid = await startDaemon(argv.query, daemonArgv, logger);
        console.log(pid);
        process.exit(0);
    }
}
```

### Shutdown Handler Wiring Pattern

**What:** Register signal handlers after browser is launched, with callbacks for state saving and cleanup
**When to use:** Long-running processes that need graceful shutdown
**Example:**
```typescript
// Source: Phase 5 CONTEXT.md D-05 to D-08
// In src/index.ts main(), after runScraper starts:
import { setupDaemonShutdown } from './daemon.js';

// Only wire shutdown handlers when running as daemon
if (process.env.SCRAPER_DAEMON_CHILD === '1') {
    setupDaemonShutdown({
        saveState: () => {
            // D-06: Save collected URLs to output file
            saveUrlsToFile(outputFile, urls);
            logger.info(`Saved ${urls.size} URLs during shutdown`);
        },
        cleanup: async () => {
            // D-07: Close browser gracefully
            if (browser) {
                await browser.close();
            }
        },
        logger,
    });
}
```

### Incremental Saver Integration Pattern

**What:** Call incremental saver after each successful scroll to persist URLs periodically
**When to use:** Long-running scrapers where data loss on crash is unacceptable
**Example:**
```typescript
// Source: Phase 5 CONTEXT.md D-09 to D-12
// In src/types.ts — add to ScraperOptions:
export interface ScraperOptions {
    // ... existing fields
    incrementalSaver?: (urls: Set<string>) => void;  // D-09: Optional saver
}

// In src/scraper.ts scroll loop, after successful scroll:
const { incrementalSaver } = options;

// After each scroll iteration:
if (incrementalSaver) {
    incrementalSaver(profileUrls);  // D-10: Call saver after each scroll
}

// In src/index.ts main():
const { createIncrementalSaver } = await import('./output.js');
const incrementalSaver = createIncrementalSaver({
    outputFile,
    saveInterval: 100,  // D-12: Save every 100 new URLs
});

const options: ScraperOptions = {
    // ... existing options
    incrementalSaver,  // D-11: Pass saver to scraper
};
```

### Anti-Patterns to Avoid

- **Infinite fork loop:** Never fork without checking if already a child process
- **Shutdown handlers before browser launch:** Handlers that reference `browser` before it's initialized will crash
- **Incremental saver without output path:** Saver must receive the output file path before scraper starts

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Daemon fork prevention | Custom IPC protocol | Environment variable | Simpler, matches existing SCRAPER_* pattern |
| Incremental saving | Manual file writes in scroll loop | createIncrementalSaver() | Already tested, encapsulates threshold logic |
| Shutdown signal handling | Custom SIGINT/SIGTERM handlers | setupDaemonShutdown() | Already implemented, handles all edge cases |

**Key insight:** All three major fixes have existing implementations that just need wiring — this is an integration phase, not a build phase.

## Runtime State Inventory

> This is a bug fix phase, not a rename/refactor phase. Runtime state inventory not applicable.

None — verified by examining codebase for rename/refactor patterns.

## Common Pitfalls

### Pitfall 1: Infinite Fork Loop
**What goes wrong:** Child process starts, hits `--daemon` block, forks again, creating infinite loop
**Why it happens:** `startDaemon()` doesn't set any flag to indicate child process; `main()` always checks `argv.daemon`
**How to avoid:** Set `SCRAPER_DAEMON_CHILD=1` env var when forking, check it in `main()` before fork
**Warning signs:** Process CPU usage spikes, multiple daemon processes in `ps aux`

### Pitfall 2: Shutdown Handlers Reference Uninitialized Browser
**What goes wrong:** Shutdown handler tries to close `browser` before it's initialized, causing crash
**Why it happens:** Handlers registered before `runScraper()` is called
**How to avoid:** Wire shutdown handlers AFTER browser is launched, use closure to capture browser reference
**Warning signs:** `Cannot read properties of undefined` errors on SIGTERM

### Pitfall 3: Incremental Saver Uses Wrong Output Path
**What goes wrong:** Saver writes to default path instead of timestamped output file
**Why it happens:** Output path generated after scraper runs, but saver needs it before
**How to avoid:** Generate output path BEFORE running scraper, pass to both saver and final save
**Warning signs:** URLs saved to wrong file, or saver doesn't write at all

### Pitfall 4: Double Log File Cleanup
**What goes wrong:** Log file deleted twice — once in shutdown handler, once after main loop
**Why it happens:** Shutdown handler and main cleanup both call `fs.unlinkSync(logFile)`
**How to avoid:** Check if file exists before deleting, or use single cleanup path
**Warning signs:** `ENOENT` errors in logs (non-fatal but wasteful)

## Code Examples

### Daemon Fork with Environment Variable
```typescript
// Source: Phase 5 CONTEXT.md D-01 to D-04
// src/daemon.ts — startDaemon() modification
export async function startDaemon(
    query: string,
    argv: string[],
    logger: Logger,
): Promise<number> {
    const release = await acquirePidLock();
    try {
        const existingPid = readPid();
        if (existingPid && isProcessRunning(existingPid)) {
            throw new Error(`Daemon already running (PID: ${existingPid})`);
        }

        fs.writeFileSync(LOG_FILE, '');

        // D-02: Set SCRAPER_DAEMON_CHILD=1 to prevent infinite fork
        const child = fork(process.argv[1], argv, {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
            env: { ...process.env, SCRAPER_DAEMON_CHILD: '1' },
        });

        writePid(child.pid!);
        child.unref();
        logger.info(`Daemon started (PID: ${child.pid})`);
        return child.pid!;
    } finally {
        await release();
    }
}
```

### Main Function with Fork Prevention
```typescript
// Source: Phase 5 CONTEXT.md D-03 to D-04
// src/index.ts — main() modification
export async function main(argv: CliArgs): Promise<Set<string>> {
    const logger = createLogger();

    // D-03: Check if already a daemon child — skip fork
    if (argv.daemon && process.env.SCRAPER_DAEMON_CHILD !== '1') {
        const { startDaemon } = await import('./daemon.js');
        const daemonArgv = process.argv.slice(2);
        const pid = await startDaemon(argv.query, daemonArgv, logger);
        console.log(pid);
        process.exit(0);
    }

    // ... rest of main function
}
```

### Incremental Saver in Scraper Loop
```typescript
// Source: Phase 5 CONTEXT.md D-09 to D-12
// src/scraper.ts — scroll loop modification
export async function runScraper(
    options: ScraperOptions,
): Promise<Set<string>> {
    const { incrementalSaver } = options;
    // ... existing code

    while (noNewUrlsCount < maxNoNewScrolls && profileUrls.size < maxUrls) {
        // ... scroll and extract logic

        // D-10: Call incremental saver after each successful scroll
        if (incrementalSaver) {
            incrementalSaver(profileUrls);
        }

        // ... rest of loop
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No fork prevention | SCRAPER_DAEMON_CHILD env var | Phase 5 | Prevents infinite fork loops |
| No shutdown handlers | setupDaemonShutdown() wired | Phase 5 | Enables graceful shutdown |
| Manual save at end | Incremental saver every 100 URLs | Phase 5 | Prevents data loss on crash |

**Deprecated/outdated:**
- Old `scraper.js` — already removed in Phase 01.1, no action needed

## Assumptions Log

> All claims in this research were verified against the actual codebase. No assumptions needed.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| (none) | — | — | — |

## Open Questions (RESOLVED)

1. **Should proxy URL format validation be added?**
   - RESOLVED: No — D-14 only requires checking for missing value (empty string). Format validation (HTTP/SOCKS5 scheme) is deferred to a future phase. Keep the fix minimal.

2. **Should shutdown handlers be wired for non-daemon mode too?**
   - RESOLVED: No — D-08 explicitly requires only daemon mode (`SCRAPER_DAEMON_CHILD=1`). Foreground runs handle Ctrl+C via the OS default signal behavior.

3. **D-16 (double log file cleanup bug):** Verified N/A — the old `scraper.js` with this bug was removed in Phase 01.1. The current TypeScript codebase does not have this issue.

## Validation Architecture

> Skip this section entirely — workflow.nyquist_validation is explicitly set to false in .planning/config.json.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Add proxy URL scheme validation in cli.ts |

### Known Threat Patterns for this Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Infinite fork loop | Denial of Service | Environment variable check before fork |
| Ungraceful shutdown | Information Disclosure | Save state before exit |

## Sources

### Primary (HIGH confidence)
- Source code analysis of `src/daemon.ts`, `src/index.ts`, `src/scraper.ts`, `src/output.ts`, `src/cli.ts`
- Phase 5 CONTEXT.md — locked decisions D-01 through D-16
- Phase 4 CONTEXT.md — daemon implementation decisions

### Secondary (MEDIUM confidence)
- Codebase concerns in `.planning/codebase/CONCERNS.md` — known bugs documented

### Tertiary (LOW confidence)
- (none — all findings verified against source code)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in use, no new dependencies
- Architecture: HIGH — fixes use existing patterns (env var, signal handlers, incremental saver)
- Pitfalls: HIGH — all pitfalls documented in CONCERNS.md and verified in code

**Research date:** 2026-07-06
**Valid until:** 30 days (stable — bug fixes, not new features)
