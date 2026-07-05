# Phase 4: Daemon & Validation - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

The scraper runs reliably as a background daemon with proper process management, and the full system is validated by a comprehensive test suite. This phase adds daemon mode with PID management and flock-based locking, plus unit/integration/E2E tests for all modules.

</domain>

<decisions>
## Implementation Decisions

### Daemon Trigger & Management
- **D-01:** `--daemon` is a boolean flag (starts background process). No value needed.
- **D-02:** `--daemon-action` is a separate string flag for management: `stop`, `status`, `logs`
- **D-03:** This avoids yargs parsing conflicts where `--daemon --query X` would misassign `--query` as daemon's value

### Daemon Lifecycle
- **D-04:** Parent prints PID and exits immediately after forking child. Child runs independently.
- **D-05:** `--daemon-action stop` auto-detects PID from `.daemon.pid` file, sends SIGTERM
- **D-06:** If daemon already running when starting new one: prompt user for confirmation before stopping existing

### PID File Management
- **D-07:** PID file location: project root `.daemon.pid`
- **D-08:** PID file format: plain text PID number
- **D-09:** Use flock-based locking to prevent race conditions between simultaneous starts
- **D-10:** Delete PID file on clean exit (SIGTERM/SIGINT handler)

### Log File Management
- **D-11:** Daemon log location: project root `daemon.log`
- **D-12:** Log file is cleared and overwritten on each daemon start (no append, no rotation)

### Test Organization
- **D-13:** Test files in separate `test/` directory (not co-located with source)
- **D-14:** Structure: `test/unit/`, `test/integration/`, `test/e2e/` organized by test type
- **D-15:** Test runner: `bun test` (Phase 1 decision, SETUP-04)
- **D-16:** Coverage target: 70% minimum line coverage
- **D-17:** Tests never write to production folders like `output/` — use temp directories or test fixtures

### E2E Test Strategy
- **D-18:** E2E tests use real browser with HTML fixture (not mocked browser)
- **D-19:** Capture real GraphQL responses as fixture files in `test/fixtures/`
- **D-20:** E2E tests verify full data flow: args → config → browser → extraction → output

### the agent's Discretion
- flock implementation details (which Node.js API to use)
- Daemon module API shape (function with options vs separate functions)
- Test file naming convention within each test/ subdirectory
- Fixture file format and organization
- Exact coverage enforcement mechanism (CI script vs package.json check)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — DAEMON-01 through DAEMON-05, TEST-01 through TEST-05
- `.planning/ROADMAP.md` — Phase 4 definition, success criteria, and plan stubs

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, key decisions, and technical environment
- `.planning/STATE.md` — Current project state and accumulated context

### Codebase Analysis
- `.planning/codebase/STACK.md` — Technology stack (Bun, cloakbrowser, playwright-core)
- `.planning/codebase/ARCHITECTURE.md` — Current single-file architecture and anti-patterns
- `.planning/codebase/TESTING.md` — Testing patterns, recommended strategy, testable units, mocking guidelines
- `.planning/codebase/CONVENTIONS.md` — Code style and patterns to preserve
- `.planning/codebase/STRUCTURE.md` — Directory layout and file locations

### Phase 1 Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Module organization, config schema, TypeScript settings

### Phase 2 Context
- `.planning/phases/02-core-scraper-engine/02-CONTEXT.md` — Browser module, extraction logic, error handling patterns

### Phase 3 Context
- `.planning/phases/03-output-delivery/03-CONTEXT.md` — Output module, webhook module, pipeline wiring

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scraper.js:242-255` — Daemon mode implementation: child_process.fork with detached, env vars, IPC channel, log stream
- `scraper.js:173-174` — SIGINT/SIGTERM handler pattern with shuttingDown flag
- `src/index.ts` — Main pipeline orchestrator: config → scraper → output → webhook
- `src/cli.ts` — CLI argument parsing with yargs (already has --daemon boolean flag)
- `src/output.test.ts` — Existing test file pattern (co-located, will be moved to test/)
- `src/webhook.test.ts` — Existing test file pattern (co-located, will be moved to test/)

### Established Patterns
- ES Modules with `"type": "module"` — preserve in TypeScript migration
- camelCase functions, UPPER_SNAKE_CASE constants — carry forward
- Section dividers using `// --- Name ---` pattern
- Functions directly exported (not classes) — per Phase 1 decision
- bun:test for testing (Phase 1 decision)

### Integration Points
- CLI entry point: `src/cli.ts` → add --daemon-action flag
- Main pipeline: `src/index.ts` → wrap with daemon fork logic
- Config loading: `src/config.ts` → daemon uses same config
- Logger: `src/logger.ts` → daemon redirects output to log file

</code_context>

<specifics>
## Specific Ideas

- PID file: `.daemon.pid` in project root — matches existing scraper.js pattern
- Log file: `daemon.log` in project root — clear on each start
- E2E fixtures: capture real GraphQL responses as JSON files in `test/fixtures/`
- Test isolation: never write to `output/` — use `Bun.tempdir()` or fixture directories
- Daemon confirmation: prompt user before stopping existing daemon

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 4-Daemon & Validation*
*Context gathered: 2026-07-05*
