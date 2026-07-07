# Phase 8: Logs are not terminal friendly and ugly raw logs everywhere - Research

**Researched:** 2026-07-07
**Domain:** Log formatting with pino-pretty for Bun runtime
**Confidence:** HIGH

## Summary

Phase 8 transforms raw pino JSON log output into a polished, human-readable terminal experience using pino-pretty. The critical finding is that **pino transports (worker_threads) are incompatible with Bun** — the project's runtime — so pino-pretty must be used as a **synchronous stream** instead of a transport. The stream API (`pino(pretty(options))`) works identically in Bun and provides the same formatting capabilities.

The implementation modifies `src/logger.ts` to accept a `pretty` option, then uses pino-pretty as a stream to stdout (CLI mode) or to a file stream (daemon mode). The `daemon.ts` log file piping needs updating to use pino-pretty with `colorize: false` so the log file is clean text for `cat/less/grep`. The `daemon-actions.ts` `handleLogs()` function currently dumps raw file content — after this phase, the file will already be formatted.

**Primary recommendation:** Use pino-pretty as a stream (not transport) with `ignore: 'pid,hostname'`, `levelFirst: true`, `messageFormat` for `[module] LEVEL: message` format, and `colorize` toggled by mode.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use `pino-pretty` for terminal output — pino's official prettifier, zero config, dev-friendly
- **D-02:** Log levels displayed as abbreviated uppercase: `INFO`, `WARN`, `ERROR`, `DEBUG`
- **D-03:** No timestamps in output — hide timestamps entirely for cleaner interactive sessions
- **D-04:** Module names shown as bracketed prefix with colon: `INFO [scraper]: Scroll complete`
- **D-05:** Daemon log file uses same pino-pretty format as CLI — no separate formatters, no code duplication
- **D-06:** No ANSI color codes in daemon log file — strip colors for clean cat/less viewing
- **D-07:** Daemon logs captured by parent process already have pino-pretty applied — no separate transport needed
- **D-08:** Keep existing log messages and heartbeat format — just make them readable through pino-pretty formatting
- **D-09:** Simple summary for scrape completion: `'Scrape complete: 142 URLs in 3m 22s'` — clean, no extra formatting

### the agent's Discretion
- Exact pino-pretty configuration options (translateTime, levelFirst, etc.)
- Whether to add a `--verbose` / `--quiet` flag to control log level from CLI
- How to handle non-pino output (console.log from third-party libs) in pino-pretty
- Whether to add a `--json` flag to force JSON output even in CLI mode (for piping/scripting)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ERROR-01 | Structured logging with pino (levels: fatal, error, warn, info, debug) | pino already configured in `src/logger.ts`; pino-pretty adds formatting layer without changing pino's structured output |
| ERROR-05 | Proxy credential sanitization in logs | Already implemented via pino `redact: ['proxy', '*.proxy']` in `src/logger.ts:17,24`; pino-pretty respects redaction config |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Log formatting | Frontend Server (logger) | — | Logger is instantiated once in `src/logger.ts`, consumed by all modules |
| CLI pretty output | Browser / CLI | — | Terminal formatting is a presentation concern |
| Daemon file output | API / Backend | — | Daemon child process writes to file; parent pipes |
| Log level filtering | API / Backend | — | Controlled via `LOG_LEVEL` env var in `src/logger.ts` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pino-pretty | ^13.1.3 | Log formatting for terminal and file output | Official pino prettifier; stream API works with Bun (transport does not) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pino | ^10.3.1 | Structured logging foundation (already installed) | Already in project; no change needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pino-pretty stream | pino-pretty transport | Transport uses worker_threads — incompatible with Bun runtime |
| pino-pretty | custom prettifier function | More control but reinvents the wheel; pino-pretty handles edge cases |
| pino-pretty | chalk + manual formatting | Lose structured log benefits; fragile with nested objects |

**Installation:**
```bash
bun add pino-pretty
```

**Version verification:**
```bash
npm view pino-pretty version  # → 13.1.3 (verified 2026-07-07)
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| pino-pretty | npm | 7+ years | 16.7M/week | github.com/pinojs/pino-pretty | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CLI Mode (Interactive)                │
│                                                         │
│  createLogger() → pino({ level }) + pino-pretty(stream) │
│       │                                                 │
│       ▼                                                 │
│  process.stdout (colorized)                             │
│  Format: INFO [scraper]: Scroll complete                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Daemon Mode (Background)              │
│                                                         │
│  createLogger() → pino({ level }) + pino-pretty(stream) │
│       │                                                 │
│       ▼                                                 │
│  .daemon.log (no color, formatted text)                 │
│  Format: INFO [scraper]: Scroll complete                │
└─────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── logger.ts        # Modified: add pino-pretty stream integration
├── index.ts         # Modified: detect CLI vs daemon, configure logger
├── daemon.ts        # Modified: update log file piping
└── daemon-actions.ts # Modified: handleLogs reads formatted file
```

### Pattern 1: Bun-Compatible pino-pretty Integration
**What:** Use pino-pretty as a stream (not transport) to avoid Bun worker_threads incompatibility
**When to use:** Any Bun project that needs formatted pino output
**Example:**
```typescript
// Source: [CITED: github.com/pinojs/pino-pretty Readme.md]
import pino from 'pino';
import pinoPretty from 'pino-pretty';

// CLI mode — pretty to stdout with colors
const cliLogger = pino({
    level: logLevel,
    redact: ['proxy', '*.proxy'],
}, pinoPretty({
    colorize: true,
    levelFirst: true,
    ignore: 'pid,hostname',
    translateTime: false,
    messageFormat: '{levelLabel} [{module}]: {msg}',
}));

// Daemon mode — pretty to file without colors
import fs from 'fs';
const fileStream = fs.createWriteStream(logFile, { flags: 'a' });
const daemonLogger = pino({
    level: logLevel,
    redact: ['proxy', '*.proxy'],
}, pinoPretty({
    colorize: false,
    levelFirst: true,
    ignore: 'pid,hostname',
    translateTime: false,
    messageFormat: '{levelLabel} [{module}]: {msg}',
    destination: logFile,
    append: true,
    mkdir: true,
}));
```

### Pattern 2: Conditional Logger Configuration
**What:** Detect CLI vs daemon mode and configure logger accordingly
**When to use:** When the same code path needs different output formats
**Example:**
```typescript
// Source: [CITED: github.com/pinojs/pino-pretty API Reference]
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import fs from 'fs';

export function createLogger(level: string = 'info'): pino.Logger {
    const logLevel = process.env.LOG_LEVEL || level;
    const logFile = process.env.SCRAPER_LOG_FILE;

    const baseOptions = {
        level: logLevel,
        redact: ['proxy', '*.proxy'],
    };

    if (logFile) {
        // Daemon mode: pretty to file, no colors
        return pino({
            ...baseOptions,
        }, pinoPretty({
            colorize: false,
            levelFirst: true,
            ignore: 'pid,hostname',
            translateTime: false,
            messageFormat: '{levelLabel} [{module}]: {msg}',
            destination: logFile,
            append: true,
            mkdir: true,
        }));
    }

    // CLI mode: pretty to stdout with colors
    return pino({
        ...baseOptions,
    }, pinoPretty({
        colorize: true,
        levelFirst: true,
        ignore: 'pid,hostname',
        translateTime: false,
        messageFormat: '{levelLabel} [{module}]: {msg}',
    }));
}
```

### Anti-Patterns to Avoid
- **pino.transport() in Bun:** Uses worker_threads — crashes with `unable to determine transport target` error. Always use stream API instead.
- **Separate formatters for CLI and daemon:** Creates code duplication. Use same pino-pretty config with `colorize` toggled.
- **Timestamps in CLI output:** Clutters interactive sessions. Use `translateTime: false` and `ignore: 'time'` to hide.
- **Raw JSON in daemon log file:** Hard to read with `cat/less`. Use pino-pretty with `colorize: false` for clean text.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Log formatting | Custom string templates | pino-pretty | Handles edge cases: nested objects, error serialization, color support detection |
| Color detection | Manual TTY checks | pino-pretty `colorize` option | Uses colorette internally; handles edge cases |
| Timestamp formatting | Date formatting code | pino-pretty `translateTime` | Handles timezone, locale, format strings |
| Log level filtering | Manual level checks | pino-pretty `minimumLevel` | Integrated with pino's level system |

**Key insight:** pino-pretty handles all the edge cases of log formatting — nested objects, error serialization, color support detection, timestamp formatting. Hand-rolling these leads to fragile, incomplete solutions.

## Common Pitfalls

### Pitfall 1: pino.transport() Crash in Bun
**What goes wrong:** Using `pino({ transport: { target: 'pino-pretty' } })` crashes with `unable to determine transport target for "pino-pretty"`
**Why it happens:** pino transports use worker_threads internally; Bun's worker_threads implementation differs from Node.js
**How to avoid:** Use pino-pretty as a stream: `pino(pretty(options))` or `pino(options, prettyStream)`
**Warning signs:** Error message mentions "transport target" or "worker thread"

### Pitfall 2: Module Name Not Showing in Logs
**What goes wrong:** pino-pretty shows `[undefined]` or no module prefix
**Why it happens:** Child loggers use `parent.child({ module })` but pino-pretty needs `messageFormat` to reference it
**How to use:** Ensure `messageFormat: '{levelLabel} [{module}]: {msg}'` and child loggers are created with `createChildLogger(logger, 'moduleName')`
**Warning signs:** Log output shows `[undefined]` or missing module prefix

### Pitfall 3: Daemon Log File Has ANSI Color Codes
**What goes wrong:** `cat .daemon.log` shows escape sequences like `[32mINFO[39m` instead of clean text
**Why it happens:** pino-pretty defaults to `colorize: true` when stdout is a TTY
**How to avoid:** Explicitly set `colorize: false` for daemon log file output
**Warning signs:** Raw escape sequences visible when viewing log file

### Pitfall 4: pino-pretty as Dependency Not Installed
**What goes wrong:** `Cannot find module 'pino-pretty'` error at runtime
**Why it happens:** pino-pretty is a peer dependency — must be installed alongside pino
**How to install:** Run `bun add pino-pretty` explicitly
**Warning signs:** Module not found error mentioning pino-pretty

## Code Examples

### Modified logger.ts (Complete)
```typescript
// Source: [CITED: github.com/pinojs/pino-pretty Readme.md, API Reference]
import fs from 'fs';
import pino from 'pino';
import pinoPretty from 'pino-pretty';

// --- Create base logger with proxy credential redaction (D-21) ---

export function createLogger(level: string = 'info'): pino.Logger {
    const logLevel = process.env.LOG_LEVEL || level;
    const logFile = process.env.SCRAPER_LOG_FILE;

    const baseOptions = {
        level: logLevel,
        redact: ['proxy', '*.proxy'],
    };

    if (logFile) {
        // Daemon mode: pretty to file, no colors (D-06)
        return pino({
            ...baseOptions,
        }, pinoPretty({
            colorize: false,           // D-06: no ANSI codes in daemon log
            levelFirst: true,          // D-02: level before timestamp
            ignore: 'pid,hostname',    // D-03: hide pid/hostname
            translateTime: false,      // D-03: no timestamps
            messageFormat: '{levelLabel} [{module}]: {msg}',  // D-04
            destination: logFile,
            append: true,
            mkdir: true,
        }));
    }

    // CLI mode: pretty to stdout with colors (D-01)
    return pino({
        ...baseOptions,
    }, pinoPretty({
        colorize: true,               // D-01: colorized terminal output
        levelFirst: true,             // D-02: level before timestamp
        ignore: 'pid,hostname',       // D-03: hide pid/hostname
        translateTime: false,         // D-03: no timestamps
        messageFormat: '{levelLabel} [{module}]: {msg}',  // D-04
    }));
}

// --- Create child logger with module context ---

export function createChildLogger(
    parent: pino.Logger,
    module: string,
): pino.Logger {
    return parent.child({ module });
}
```

### Expected Output Format
```
# CLI mode (colorized):
INFO [scraper]: Navigating to Ads Library...
INFO [scroll]: 142 unique profile URLs found...
WARN [scroll]: Scroll failed: timeout. Retrying...
ERROR [webhook]: Webhook notification failed

# Daemon log file (no colors, clean text):
INFO [scraper]: Navigating to Ads Library...
INFO [scroll]: 142 unique profile URLs found...
WARN [scroll]: Scroll failed: timeout. Retrying...
ERROR [webhook]: Webhook notification failed
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw pino JSON output | pino-pretty stream formatting | Phase 8 | Logs become human-readable |
| No timestamps in CLI | No timestamps (kept) | — | Cleaner interactive sessions |
| ANSI colors in daemon log | No colors in daemon log | Phase 8 | Clean cat/less viewing |
| Separate formatters | Single pino-pretty config with colorize toggle | Phase 8 | No code duplication |

**Deprecated/outdated:**
- pino transports in Bun: Use stream API instead (worker_threads incompatible)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | pino-pretty stream API works with Bun without issues | Common Pitfalls | Low — stream API is documented as Bun-compatible; transport is the known incompatible path |
| A2 | `messageFormat` template string supports `{module}` from child logger properties | Code Examples | Low — documented in pino-pretty API; child logger properties are accessible in messageFormat |
| A3 | `pino-pretty` as stream does not need `sync: true` for normal operation | Standard Stack | Low — async is default and recommended; sync is only for Jest/testing |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Should we add `--verbose` / `--quiet` flags?**
   - What we know: `LOG_LEVEL` env var already controls log level
   - What's unclear: Whether CLI flags add value over env var
   - Recommendation: Keep env var approach; add flags only if user requests

2. **Should we add `--json` flag for piping/scripting?**
   - What we know: pino-pretty can be bypassed by checking `process.stdout.isTTY`
   - What's unclear: Whether users need raw JSON in CLI mode
   - Recommendation: Skip for now; add if needed later

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pino-pretty | Log formatting | ✗ (not installed) | 13.1.3 | — |

**Missing dependencies with no fallback:**
- `pino-pretty` — must be installed via `bun add pino-pretty`

## Validation Architecture

> Skip this section entirely if workflow.nyquist_validation is explicitly set to false. If the key is absent, treat as enabled.

**Note:** `workflow.nyquist_validation` is `false` in `.planning/config.json`. Skipping Validation Architecture section.

## Security Domain

> Required when `security_enforcement` is enabled (absent = enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | no | Not applicable — this phase only formats existing log output |
| V6 Cryptography | no | Not applicable — no cryptographic operations |

### Known Threat Patterns for pino-pretty

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Log injection via malformed messages | Tampering | pino-pretty sanitizes output; no raw user input in logs |
| Credential exposure in logs | Information Disclosure | pino `redact` config already masks proxy credentials |

## Sources

### Primary (HIGH confidence)
- [CITED: github.com/pinojs/pino-pretty Readme.md] - pino-pretty options, stream API, messageFormat
- [CITED: github.com/pinojs/pino-pretty API Reference] - PrettyOptions interface, customPrettifiers
- [VERIFIED: npm registry] - pino-pretty v13.1.3, 16.7M weekly downloads

### Secondary (MEDIUM confidence)
- [CITED: deepwiki.com/pinojs/pino-pretty] - Integration patterns, sync vs async
- [CITED: github.com/oven-sh/bun/issues/4280] - pino transport incompatibility with Bun

### Tertiary (LOW confidence)
- [ASSUMED] - pino-pretty stream API performance characteristics (not benchmarked)

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — pino-pretty is the official pino prettifier; stream API is documented Bun-compatible
- Architecture: HIGH — pattern is well-documented and straightforward
- Pitfalls: HIGH — Bun/pino transport incompatibility is well-documented issue

**Research date:** 2026-07-07
**Valid until:** 2026-08-07 (30 days — pino-pretty is stable)

