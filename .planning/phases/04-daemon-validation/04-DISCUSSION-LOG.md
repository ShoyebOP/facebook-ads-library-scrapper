# Phase 4: Daemon & Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-05
**Phase:** 4-daemon-validation
**Areas discussed:** Daemon API design, Test organization, E2E test strategy, Log & PID file management

---

## Daemon API design

### How should daemon mode be triggered?

| Option | Description | Selected |
|--------|-------------|----------|
| --daemon flag only | Keep existing pattern: `bun src/cli.ts --query X --daemon` | |
| Separate subcommand | `bun src/cli.ts daemon --query X`. More explicit, allows daemon-specific options | |
| Both | --daemon flag for quick use, plus `daemon start/stop/status` subcommands | |

**User's choice:** --daemon flag with values for management (start/stop/status/logs)
**Notes:** User concerned about yargs parsing conflicts when --daemon has no value but other flags follow.

### How should daemon management work?

| Option | Description | Selected |
|--------|-------------|----------|
| Boolean --daemon + --daemon-action | `--daemon` (boolean, starts bg) + `--daemon-action stop/status/logs` for management | ✓ |
| Single --daemon with required value | `-d start\|stop\|status\|logs` as a required-choice flag | |
| Boolean --daemon only | Keep --daemon boolean only. No stop/status/logs — user kills process manually | |

**User's choice:** Boolean --daemon + --daemon-action
**Notes:** Clean yargs parsing, no ambiguity.

### What should the parent process do on daemon start?

| Option | Description | Selected |
|--------|-------------|----------|
| Print PID and exit parent | Parent prints PID, child runs independently. User stops via `--daemon-action stop` | ✓ |
| Parent stays alive as supervisor | Parent stays alive, monitors child. More complex but allows real-time status | |
| Hybrid: confirm start then exit | Print PID, save to file, AND parent stays briefly to confirm child started | |

**User's choice:** Print PID and exit parent
**Notes:** Matches existing scraper.js pattern.

### How should --daemon-action stop work?

| Option | Description | Selected |
|--------|-------------|----------|
| Require PID argument | User provides PID: `--daemon-action stop <pid>` | |
| Auto-detect from PID file | Read PID from file, send SIGTERM. User just runs `--daemon-action stop` | ✓ |
| Both: PID file default, PID override | Support both: auto-detect from PID file, or accept explicit PID as override | |

**User's choice:** Auto-detect from PID file
**Notes:** Simpler UX.

### What happens if daemon already running?

| Option | Description | Selected |
|--------|-------------|----------|
| Deny new start | Deny start, print error: 'Daemon already running (PID X)' | |
| Auto-restart | Stop the existing daemon, then start new one | |
| Prompt user for confirmation | Ask user: 'Daemon running. Stop existing and start new?' | ✓ |

**User's choice:** Prompt user for confirmation
**Notes:** User wants control over whether to replace running daemon.

---

## Test organization

### Where should test files live?

| Option | Description | Selected |
|--------|-------------|----------|
| Co-locate tests | output.test.ts next to output.ts | |
| Separate test/ directory | test/output.test.ts, test/webhook.test.ts, etc. | ✓ |
| Hybrid: unit co-located, integration separate | Unit tests co-located, integration/E2E tests in test/ | |

**User's choice:** Separate test/ directory
**Notes:** Keeps src/ clean.

### How should the test/ directory be structured?

| Option | Description | Selected |
|--------|-------------|----------|
| Organized by test type | test/unit/ for pure functions, test/integration/ for CLI+webhook, test/e2e/ for full workflow | ✓ |
| Flat test/ directory | All tests flat in test/. Simple, no nested directories | |
| Organized by module | Organized by module: test/output/, test/webhook/, test/scraper/, etc. | |

**User's choice:** Organized by test type
**Notes:** Clear separation of concerns.

### What coverage target?

| Option | Description | Selected |
|--------|-------------|----------|
| No hard target, critical paths only | Focus on critical paths (extraction, config parsing, CLI validation) | |
| 70% minimum coverage | Set a minimum like 70% line coverage. Enforce in CI. | ✓ |
| 80% minimum coverage | Set 80% minimum. Aggressive but ensures quality | |

**User's choice:** 70% minimum coverage
**Notes:** Enforce in CI.

### Which test runner?

| Option | Description | Selected |
|--------|-------------|----------|
| bun test | Uses bun's built-in test runner. Already configured in Phase 1. | ✓ |
| vitest via bunx | Vitest has more features but adds a dependency | |
| Both bun test and vitest | Support both: bun test for quick runs, vitest for coverage reports | |

**User's choice:** bun test
**Notes:** Already configured.

### Test isolation?

| Option | Description | Selected |
|--------|-------------|----------|
| Isolate tests from production paths | Never write to production folders like output/ | ✓ |

**User's choice:** Never write to production folders like output/
**Notes:** Use temp directories or test fixtures.

---

## E2E test strategy

### How should E2E tests handle the browser?

| Option | Description | Selected |
|--------|-------------|----------|
| Full mock | Mock cloakbrowser entirely. Fast, no network. | |
| Real browser with fixture | Use a real browser against a local HTML fixture. More realistic. | ✓ |
| Mock default, real optional | Smoke test with mocked browser + one optional real-browser test | |

**User's choice:** Real browser with fixture
**Notes:** User initially chose full mock, then changed to real browser with fixture.

### What should E2E smoke test verify?

| Option | Description | Selected |
|--------|-------------|----------|
| Pipeline wiring only | Test that CLI args flow through config → browser → scraper → output correctly | |
| Data flow end-to-end | Mock browser returns fake GraphQL data, verify URLs appear in output file | |
| Fixture-based with real data | Capture real GraphQL response as test/fixtures/graphql-response.json | ✓ |

**User's choice:** Fixture-based with real data
**Notes:** User asked about using actual GraphQL data. Recommended capturing real responses as fixture files.

---

## Log & PID file management

### Where should PID file be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| Project root .daemon.pid | Simple, gitignored | ✓ |
| .pids/ directory | Cleaner separation | |
| OS temp directory | Standard for daemons | |

**User's choice:** Project root .daemon.pid
**Notes:** Matches existing pattern.

### Where should daemon logs be written?

| Option | Description | Selected |
|--------|-------------|----------|
| Project root daemon.log | Simple, gitignored | ✓ |
| logs/ directory | Cleaner separation | |
| OS temp directory | Standard location | |

**User's choice:** Project root daemon.log
**Notes:** Simple.

### How should daemon.log be managed?

| Option | Description | Selected |
|--------|-------------|----------|
| Overwrite on start | Clear and overwrite on each daemon start | ✓ |
| Append to existing | Append to existing log. Grows over time | |
| Rotate with backup files | Rotate: rename daemon.log to daemon.log.1 on start | |

**User's choice:** Clear and overwrite on each start
**Notes:** Keeps logs small.

### Should daemon clean up PID on exit?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete PID on exit | Delete PID file on clean exit | ✓ |
| Keep PID file with status | Keep PID file, mark as 'stopped' | |
| No cleanup, always check alive | Never clean up. Always check if process alive via kill -0 | |

**User's choice:** Delete PID on exit
**Notes:** Stale PID file detected on next start if crash occurs.

---

## the agent's Discretion

- flock implementation details (which Node.js API to use)
- Daemon module API shape (function with options vs separate functions)
- Test file naming convention within each test/ subdirectory
- Fixture file format and organization
- Exact coverage enforcement mechanism (CI script vs package.json check)

## Deferred Ideas

None — discussion stayed within phase scope
