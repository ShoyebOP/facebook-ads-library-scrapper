# Phase 7: Daemon actions not working, daemon logs not being saved, tests polluting output - Research

**Researched:** 2026-07-07
**Domain:** CLI architecture, child process management, test isolation
**Confidence:** MEDIUM

## Summary

Phase 7 addresses three concrete bugs in the daemon mode implementation. The primary issue is that daemon management commands (stop/status/logs) fail because yargs requires the `--query` argument, making it impossible to run daemon actions without providing a search query. The second issue is that daemon logs are not being saved to a file despite the log file being created and cleared on startup—the child process stdout/stderr streams are piped but never connected to the log file. The third issue is that tests and manual runs leave artifacts in the project root directory without proper cleanup.

The research reveals that the solution requires architectural changes: creating a separate daemon-actions script that bypasses yargs entirely, properly piping child process streams to a file, and implementing robust test isolation with temp directories and cleanup hooks.

**Primary recommendation:** Create `src/daemon-actions.ts` as a standalone script with simple process.argv parsing, pipe child.stdout/stderr to a WriteStream in `startDaemon()`, and ensure all tests use `/tmp/` directories with proper afterEach cleanup.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Daemon action routing | CLI Layer | — | Daemon actions are user-facing CLI commands that need to bypass main CLI validation |
| Log file piping | Daemon Manager | CLI Layer | Child process stream management belongs in daemon.ts where forking happens |
| Test isolation | Test Infrastructure | — | Test file I/O should be isolated to temp directories, not project root |
| PID file management | Daemon Manager | — | Already correctly implemented in daemon.ts |
| Signal handling | Daemon Manager | — | Already correctly implemented via setupDaemonShutdown() |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| child_process | Node.js built-in | Fork daemon processes | Already used in daemon.ts for forking |
| fs | Node.js built-in | File I/O for PID/log files | Already used for PID management |
| pino | ^10.3.1 | Structured logging | Already used in logger.ts, provides credential redaction |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| process.argv | Node.js built-in | Simple argument parsing for daemon-actions.ts | When yargs is too heavy or requires unwanted validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate daemon-actions.ts | Keep --daemon-action in cli.ts with query optional | More complex, requires yargs config changes |
| fs.createWriteStream | Bun.write() for log piping | WriteStream is better for streaming child process output |
| /tmp/ for test isolation | Custom temp directory per test | /tmp/ is standard, predictable, and auto-cleaned by OS |

**Installation:**
```bash
# No new dependencies needed - all are Node.js built-ins or already installed
```

## Package Legitimacy Audit

> No new packages are being installed in this phase. All dependencies are Node.js built-ins or already in package.json.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Command                              │
│  bun daemon-actions stop|status|logs                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              daemon-actions.ts (NEW)                         │
│  Simple process.argv parsing → no yargs validation          │
│  Handles: stop (SIGTERM), status (read PID), logs (read file)│
└───────────────────────┬─────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐
    │ stop    │   │ status  │   │ logs    │
    │ Sends   │   │ Reads   │   │ Reads   │
    │ SIGTERM │   │ PID file│   │ log file│
    └─────────┘   └─────────┘   └─────────┘

┌─────────────────────────────────────────────────────────────┐
│                    daemon.ts (MODIFIED)                      │
│  startDaemon(): pipe child.stdout/stderr to .daemon.log     │
│  stopDaemon(): send SIGTERM (already implemented)           │
│  setupDaemonShutdown(): save state + cleanup (already done) │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── daemon-actions.ts    # NEW: standalone daemon management script
├── daemon.ts            # MODIFIED: add log file piping
├── cli.ts               # MODIFIED: remove --daemon-action handling
└── ... (other files unchanged)
```

### Pattern 1: Standalone CLI Script
**What:** A separate script that handles its own argument parsing without yargs
**When to use:** When CLI commands need to bypass main CLI validation requirements
**Example:**
```typescript
// Source: [ASSUMED] - based on project conventions
#!/usr/bin/env bun
// --- Daemon management actions ---

import fs from 'fs';
import { readPid, isProcessRunning, removePidFile } from './daemon.js';
import { createLogger } from './logger.js';

const action = process.argv[2];

if (action === 'stop') {
    const logger = createLogger();
    const pid = readPid();
    if (pid && isProcessRunning(pid)) {
        process.kill(pid, 'SIGTERM');
        // Wait briefly then verify
        setTimeout(() => {
            if (!fs.existsSync('.daemon.pid')) {
                console.log('Daemon stopped');
            } else {
                console.warn('Daemon may still be running');
            }
        }, 2000);
    } else {
        console.log('Daemon not running');
    }
} else if (action === 'status') {
    const pid = readPid();
    if (pid && isProcessRunning(pid)) {
        console.log(`Daemon running (PID: ${pid})`);
    } else {
        console.log('Daemon not running');
    }
} else if (action === 'logs') {
    try {
        const content = fs.readFileSync('.daemon.log', 'utf-8');
        console.log(content);
    } catch {
        console.error('No daemon log file found');
    }
} else {
    console.error('Usage: bun daemon-actions <stop|status|logs>');
    process.exit(1);
}
```

### Pattern 2: Pipe Child Process Streams to File
**What:** Connect child.stdout and child.stderr to a file WriteStream
**When to use:** When daemon mode needs to persist logs to disk
**Example:**
```typescript
// Source: [ASSUMED] - based on Node.js child_process documentation
import { fork } from 'child_process';
import fs from 'fs';

const LOG_FILE = '.daemon.log';

// Clear log on start
fs.writeFileSync(LOG_FILE, '');

const child = fork(process.argv[1], argv, {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, SCRAPER_DAEMON_CHILD: '1' },
});

// Pipe stdout and stderr to log file
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
child.stdout?.pipe(logStream);
child.stderr?.pipe(logStream);
```

### Anti-Patterns to Avoid
- **Requiring --query for daemon actions:** Daemon management doesn't need a search query; requiring it breaks the CLI contract
- **Ignoring child.stdout/stderr:** Pipes created but never connected means logs are lost
- **Using CWD for test artifacts:** Tests should use /tmp/ to avoid polluting the project root

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Argument parsing for daemon-actions | Custom regex parsing | Simple process.argv[2] check | Only 3 actions, no flags needed |
| Log file piping | Manual chunk handling | fs.createWriteStream + pipe | Handles buffering, encoding, backpressure |
| Test temp directories | Custom temp path logic | /tmp/ with random suffix | OS-managed, predictable, auto-cleaned |

**Key insight:** The daemon-actions script is intentionally minimal—it only needs to check one argument and perform one action. Yargs adds unnecessary complexity and validation that actively breaks daemon management.

## Common Pitfalls

### Pitfall 1: Yargs Requires --query
**What goes wrong:** Running `bun src/cli.ts daemon-action stop` fails with "query required"
**Why it happens:** Yargs has `demandOption: true` for query, and daemon actions are processed after validation
**How to avoid:** Create separate daemon-actions.ts script that bypasses yargs entirely
**Warning signs:** Error message "query required" when running daemon commands

### Pitfall 2: Child Process Pipes Not Connected
**What goes wrong:** Daemon.log is created and cleared but remains empty
**Why it happens:** stdio: ['ignore', 'pipe', 'pipe', 'ipc'] creates pipes but they're never read
**How to avoid:** Pipe child.stdout and child.stderr to a WriteStream
**Warning signs:** Daemon runs but .daemon.log is empty

### Pitfall 3: Test Artifacts in Project Root
**What goes wrong:** .daemon.pid, daemon.log, output/ files appear in project root after tests
**Why it happens:** Tests use relative paths or CWD for file I/O
**How to avoid:** Use /tmp/ with random suffixes, cleanup in afterEach hooks
**Warning signs:** Unexpected files in project root after running `bun test`

## Code Examples

### Daemon Actions Script
```typescript
// Source: [ASSUMED] - based on project conventions and CONTEXT.md decisions
#!/usr/bin/env bun
// --- Daemon management actions (D-01 through D-06) ---

import fs from 'fs';
import { readPid, isProcessRunning, removePidFile } from './daemon.js';
import { createLogger } from './logger.js';

const action = process.argv[2];

if (action === 'stop') {
    const logger = createLogger();
    const pid = readPid();
    if (pid && isProcessRunning(pid)) {
        logger.info(`Sending SIGTERM to daemon (PID: ${pid})`);
        process.kill(pid, 'SIGTERM');
        // D-09: Wait briefly then verify PID file is deleted
        setTimeout(() => {
            if (!fs.existsSync('.daemon.pid')) {
                logger.info('Daemon stopped');
            } else {
                logger.warn('Daemon may still be running');
            }
        }, 2000);
    } else {
        logger.warn('Daemon not running');
    }
} else if (action === 'status') {
    const pid = readPid();
    if (pid && isProcessRunning(pid)) {
        console.log(`Daemon running (PID: ${pid})`);
    } else {
        console.log('Daemon not running');
    }
} else if (action === 'logs') {
    try {
        const content = fs.readFileSync('.daemon.log', 'utf-8');
        console.log(content);
    } catch {
        console.error('No daemon log file found');
    }
} else {
    console.error('Usage: bun daemon-actions <stop|status|logs>');
    process.exit(1);
}
```

### Log File Piping in startDaemon()
```typescript
// Source: [ASSUMED] - based on Node.js child_process documentation
// Modification to src/daemon.ts startDaemon() function

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

        // D-12: Clear daemon log on start
        fs.writeFileSync(LOG_FILE, '');

        // D-04: Fork detached child process
        const child = fork(process.argv[1], argv, {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
            env: { ...process.env, SCRAPER_DAEMON_CHILD: '1' },
        });

        // D-13: Pipe child stdout/stderr to log file
        const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
        child.stdout?.pipe(logStream);
        child.stderr?.pipe(logStream);

        // D-04: Write PID and release lock
        writePid(child.pid!);
        child.unref();

        logger.info(`Daemon started (PID: ${child.pid})`);
        return child.pid!;
    } finally {
        await release();
    }
}
```

### Test Isolation Pattern
```typescript
// Source: [CITED: bun.sh/docs/test/lifecycle] - lifecycle hooks documentation
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import { join } from 'path';

// Use /tmp/ with random suffix for test isolation
const testDir = `/tmp/daemon-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe('daemon.ts', () => {
    beforeEach(async () => {
        await fs.promises.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        // Clean up test artifacts
        try { await fs.promises.rm(testDir, { recursive: true, force: true }); } catch {}
    });

    it('writes PID file to test directory', () => {
        const testPidFile = join(testDir, '.daemon.pid');
        fs.writeFileSync(testPidFile, '12345');
        expect(fs.existsSync(testPidFile)).toBe(true);
    });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Daemon actions via --daemon-action flag | Separate daemon-actions.ts script | This phase | Removes yargs dependency for daemon management |
| Child process pipes not connected | Pipe stdout/stderr to WriteStream | This phase | Daemon logs now persist to .daemon.log |
| Tests write to CWD | Tests use /tmp/ directories | This phase | No more artifacts in project root |

**Deprecated/outdated:**
- `--daemon-action` flag in cli.ts: Being replaced by separate daemon-actions.ts script
- `daemon.log` filename: Being replaced by `.daemon.log` (dot-prefixed, hidden)

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this
> section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | daemon-actions.ts should use simple process.argv[2] check | Pattern 1 | Low - only 3 actions, no flags needed |
| A2 | .daemon.log should replace daemon.log (dot-prefixed) | State of the Art | Low - matches CONTEXT.md decision D-11 |
| A3 | Test temp dirs should use Date.now() + random suffix | Common Pitfalls | Low - prevents collisions between parallel test runs |
| A4 | Stop action should wait 2s then verify PID deletion | Pattern 1 | Low - matches CONTEXT.md decision D-09 |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Should daemon-actions.ts be a separate npm script or just a file?**
   - What we know: CONTEXT.md decision D-02 suggests adding npm script `"daemon-actions": "bun run src/daemon-actions.ts"`
   - What's unclear: Whether to also add to bin field in package.json for global installation
   - Recommendation: Follow CONTEXT.md D-02 - add as npm script only

2. **Should stop action force-kill after timeout?**
   - What we know: CONTEXT.md decision D-10 says "warn user but don't force-kill"
   - What's unclear: Whether to add --force flag as an optional enhancement
   - Recommendation: Implement as per D-10 (warn only), add --force flag as future enhancement if needed

3. **Should log file path be configurable?**
   - What we know: Currently hardcoded as LOG_FILE constant
   - What's unclear: Whether different daemon instances need different log paths
   - Recommendation: Keep hardcoded for now, can be made configurable in future phase

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test |
| Config file | none - see Wave 0 |
| Quick run command | `bun test` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DAEMON-01 | Daemon mode via child process forking | integration | `bun test test/integration/daemon.test.ts` | ✅ |
| DAEMON-02 | PID file management with flock-based locking | unit | `bun test test/unit/daemon.test.ts` | ✅ |
| DAEMON-03 | Proper logging to log file in daemon mode | unit | `bun test test/unit/daemon.test.ts` | ✅ |
| DAEMON-04 | Graceful shutdown handlers (SIGTERM, SIGINT) | integration | `bun test test/integration/daemon.test.ts` | ✅ |
| DAEMON-05 | State saving before exit | integration | `bun test test/integration/daemon.test.ts` | ✅ |

### Sampling Rate
- **Per task commit:** `bun test`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/unit/daemon-actions.test.ts` — covers new daemon-actions.ts script
- [ ] `test/integration/daemon-logging.test.ts` — covers log file piping
- [ ] Update `test/unit/daemon.test.ts` — update LOG_FILE constant test to use .daemon.log

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | process.argv[2] validation in daemon-actions.ts |
| V6 Cryptography | no | — |

### Known Threat Patterns for daemon-actions.ts

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| PID file race condition | Tampering | proper-lockfile (already implemented) |
| Stale PID file | Denial of Service | isProcessRunning check before sending signals |
| Log file injection | Tampering | pino logger with structured output |

## Sources

### Primary (HIGH confidence)
- [CITED: bun.sh/docs/test/lifecycle] - Lifecycle hooks for test isolation
- [CITED: github.com/oven-sh/bun/issues/6024] - bun test isolation discussion

### Secondary (MEDIUM confidence)
- [WebSearch: "How to create standalone CLI script in Bun"] - General patterns for argument parsing
- [WebSearch: "child_process.fork stdout stderr pipe to file"] - Stream piping patterns

### Tertiary (LOW confidence)
- [ASSUMED] - Specific implementation patterns based on project conventions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all dependencies are Node.js built-ins or already installed
- Architecture: MEDIUM - based on CONTEXT.md decisions and project conventions
- Pitfalls: HIGH - identified from actual codebase analysis and CONCERNS.md

**Research date:** 2026-07-07
**Valid until:** 2026-08-07 (30 days - stable dependencies)
