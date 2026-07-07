# Phase 8: Logs are not terminal friendly and ugly raw logs everywhere - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-07
**Phase:** 08-logs-are-not-terminal-friendly-and-ugly-raw-logs-everywhere-
**Areas discussed:** CLI log formatting, Daemon log file format, Progress/status display

---

## CLI log formatting

| Option | Description | Selected |
|--------|-------------|----------|
| pino-pretty (Recommended) | Pretty-prints with colors, aligned columns, timestamps. Dev-friendly, zero config. | ✓ |
| Custom format | Hand-crafted formatter with specific layout | |
| Keep JSON, add colors | Stay JSON but colorize level and add minimal formatting | |

**User's choice:** pino-pretty (Recommended)
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Abbreviated uppercase (Recommended) | INFO, WARN, ERROR, DEBUG — compact, scannable | ✓ |
| Colored badges/icons | Colored symbols like ✔ INFO, ⚠ WARN, ✖ ERROR | |
| Pino default | Let pino-pretty handle it | |

**User's choice:** Abbreviated uppercase (Recommended)
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| HH:MM:SS (Recommended) | Short relative time — clean for interactive sessions | |
| ISO 8601 | Full timestamps like 2026-07-07T12:34:56.789Z | |
| No timestamps | Hide timestamps entirely — cleaner output | ✓ |

**User's choice:** No timestamps
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| In parentheses (Recommended) | INFO (scraper): Scroll complete | |
| Prefix with colon | INFO [scraper]: Scroll complete — bracketed prefix | ✓ |
| Omit module name | Don't show module | |

**User's choice:** Prefix with colon
**Notes:** None

---

## Daemon log file format

| Option | Description | Selected |
|--------|-------------|----------|
| JSON only (Recommended) | Keep raw JSON — machine-parseable, grep-friendly | |
| Pretty format | Same pretty-printed format as CLI | |
| Dual output | Pretty to terminal + JSON to file | |
| Same as CLI (user's choice) | Same pino-pretty format as non-daemon logs — avoid code duplication | ✓ |

**User's choice:** Same as non-daemon logs, to avoid duplication of codes. As the currently daemon logs are just getting captured by parent.
**Notes:** User wants unified formatting — no separate formatters for CLI vs daemon.

| Option | Description | Selected |
|--------|-------------|----------|
| No ANSI in files (Recommended) | Strip color codes from file output | ✓ |
| Keep ANSI in files | Colors preserved — file looks identical to terminal output | |

**User's choice:** No ANSI in files (Recommended)
**Notes:** None

---

## Progress/status display

| Option | Description | Selected |
|--------|-------------|----------|
| Inline status lines (Recommended) | Simple text lines like '[scroll 5/20] URLs: 42' | |
| Progress bar/spinner | Animated progress indicator | |
| Compact single-line update | Overwrite same line with \r | |
| Keep as-is (user's choice) | Keep existing log messages, just make them readable via pino-pretty | ✓ |

**User's choice:** Just keep it as it is no need for extra status
**Notes:** No new status display mechanisms — existing heartbeat format is sufficient.

| Option | Description | Selected |
|--------|-------------|----------|
| Simple summary (Recommended) | 'Scrape complete: 142 URLs in 3m 22s' | ✓ |
| Boxed/highlighted | Boxed or highlighted completion message with stats | |
| Keep current format | Keep current format — just 'Saved 142 unique profile URLs to...' | |

**User's choice:** Simple summary
**Notes:** None

---

## the agent's Discretion

- Exact pino-pretty configuration options (translateTime, levelFirst, etc.)
- Whether to add a `--verbose` / `--quiet` flag to control log level from CLI
- How to handle non-pino output (console.log from third-party libs) in pino-pretty
- Whether to add a `--json` flag to force JSON output even in CLI mode (for piping/scripting)

## Deferred Ideas

None — discussion stayed within phase scope
