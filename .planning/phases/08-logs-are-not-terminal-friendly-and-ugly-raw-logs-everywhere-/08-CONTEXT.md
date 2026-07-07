# Phase 8: Logs are not terminal friendly and ugly raw logs everywhere - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Make logs clean and readable in both CLI and daemon mode — transform raw pino JSON output into a polished, human-readable terminal experience using pino-pretty, with consistent formatting across interactive and background execution.

</domain>

<decisions>
## Implementation Decisions

### CLI Log Formatting
- **D-01:** Use `pino-pretty` for terminal output — pino's official prettifier, zero config, dev-friendly
- **D-02:** Log levels displayed as abbreviated uppercase: `INFO`, `WARN`, `ERROR`, `DEBUG`
- **D-03:** No timestamps in output — hide timestamps entirely for cleaner interactive sessions
- **D-04:** Module names shown as bracketed prefix with colon: `INFO [scraper]: Scroll complete`

### Daemon Log File Format
- **D-05:** Daemon log file uses same pino-pretty format as CLI — no separate formatters, no code duplication
- **D-06:** No ANSI color codes in daemon log file — strip colors for clean cat/less viewing
- **D-07:** Daemon logs captured by parent process already have pino-pretty applied — no separate transport needed

### Progress/Status Display
- **D-08:** Keep existing log messages and heartbeat format — just make them readable through pino-pretty formatting
- **D-09:** Simple summary for scrape completion: `'Scrape complete: 142 URLs in 3m 22s'` — clean, no extra formatting

### the agent's Discretion
- Exact pino-pretty configuration options (translateTime, levelFirst, etc.)
- Whether to add a `--verbose` / `--quiet` flag to control log level from CLI
- How to handle non-pino output (console.log from third-party libs) in pino-pretty
- Whether to add a `--json` flag to force JSON output even in CLI mode (for piping/scripting)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ERROR-01 (structured logging with pino), ERROR-05 (proxy credential sanitization)
- `.planning/ROADMAP.md` — Phase 8 definition and goal

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/STATE.md` — Current project state and accumulated context

### Codebase Analysis
- `.planning/codebase/CONVENTIONS.md` — Logging patterns (pino config, child loggers, log levels)
- `.planning/codebase/CONCERNS.md` — Known issues (proxy credentials in logs, env file security)
- `.planning/codebase/ARCHITECTURE.md` — Component responsibilities and data flow

### Source Files
- `src/logger.ts` — Current pino logger implementation (createLogger, createChildLogger)
- `src/index.ts` — Main pipeline with logger.info/error calls
- `src/scraper.ts` — Scroll loop with heartbeat logging
- `src/daemon.ts` — Daemon logging to file via SCRAPER_LOG_FILE env var

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/logger.ts:8-25` — `createLogger()`: pino with proxy redaction, SCRAPER_LOG_FILE env var for daemon file output
- `src/logger.ts:29-33` — `createChildLogger()`: wraps parent with module context
- `src/daemon.ts:59-93` — `startDaemon()`: pipes child.stdout/stderr to log file stream

### Established Patterns
- Pino structured logging throughout all modules
- Child loggers with module names: `createChildLogger(logger, 'scraper')`
- Proxy credential redaction via pino `redact` config
- Log levels: info (progress), warn (non-fatal), error (failures), debug (extraction details)

### Integration Points
- `src/logger.ts` — Primary modification target: add pino-pretty transport for CLI mode
- `src/daemon.ts` — Update log file piping to use pino-pretty with no colors
- `src/index.ts` — Logger instantiation: detect CLI vs daemon mode, configure transport accordingly

</code_context>

<specifics>
## Specific Ideas

- pino-pretty format: `[module] LEVEL: message` style with bracketed module prefix
- No timestamps — cleaner for interactive sessions
- Same formatter for both CLI and daemon — just toggle colorize option
- Daemon log file: no ANSI codes, clean text for cat/less/grep
- Completion message: simple `'Scrape complete: N URLs in Xm Ys'`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 8-Logs are not terminal friendly and ugly raw logs everywhere*
*Context gathered: 2026-07-07*
