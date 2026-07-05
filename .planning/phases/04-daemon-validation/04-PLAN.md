---
phase: 04-daemon-validation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/daemon.ts
  - src/cli.ts
  - src/index.ts
  - src/types.ts
  - test/integration/daemon.test.ts
autonomous: true
requirements:
  - DAEMON-01
  - DAEMON-02
  - DAEMON-03
  - DAEMON-04
  - DAEMON-05
user_setup: []

must_haves:
  truths:
    - "Daemon starts as detached child process and parent exits immediately"
    - "PID file is created with flock-based locking to prevent race conditions"
    - "Daemon logs to file instead of stdout/stderr"
    - "SIGTERM/SIGINT handlers save state before exit"
    - "PID file is deleted on clean exit"
    - "Daemon can be stopped via --daemon-action stop"
  artifacts:
    - src/daemon.ts
    - src/cli.ts (modified)
    - src/index.ts (modified)
    - src/types.ts (modified)
    - test/integration/daemon.test.ts
  key_links:
    - "cli.ts -> daemon.ts (fork on --daemon flag)"
    - "daemon.ts -> child_process.fork (detached process)"
    - "daemon.ts -> proper-lockfile (PID locking)"
    - "daemon.ts -> index.ts (child runs pipeline)"
---

<objective>
Implement daemon mode with proper process management, PID file locking, signal handlers, and CLI integration.

Purpose: Enable background execution for automated scraping workflows with reliable process lifecycle management.
Output: daemon.ts module, CLI integration with --daemon-action flag, daemon integration tests.
</objective>

<execution_context>
@/home/shoyeb/.config/opencode/gsd-core/workflows/execute-plan.md
@/home/shoyeb/.config/opencode/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04-daemon-validation/04-CONTEXT.md
@.planning/phases/04-daemon-validation/04-RESEARCH.md
@.planning/phases/04-daemon-validation/04-PATTERNS.md
@src/cli.ts
@src/index.ts
@src/errors.ts
@src/logger.ts
@src/types.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create daemon.ts with PID management, flock locking, signal handlers, and log file</name>
  <files>src/daemon.ts, src/types.ts, test/integration/daemon.test.ts</files>
  <read_first>
    - src/errors.ts (shutdown handler pattern at lines 118-150)
    - src/logger.ts (createChildLogger pattern)
    - .planning/phases/04-daemon-validation/04-RESEARCH.md (Pattern 1-3)
    - .planning/phases/04-daemon-validation/04-PATTERNS.md (daemon.ts patterns)
  </read_first>
  <behavior>
    - startDaemon() acquires flock on .daemon.pid, forks detached child, writes PID, returns child PID
    - startDaemon() throws if daemon already running (D-06)
    - startDaemon() clears daemon.log on start (D-12)
    - stopDaemon() reads PID from .daemon.pid, sends SIGTERM, deletes PID file
    - stopDaemon() handles stale PID gracefully (process not running)
    - setupDaemonShutdown() registers SIGTERM/SIGINT handlers that save state then remove PID file (D-10)
    - readPid() returns null when PID file doesn't exist
    - readPid() returns parsed PID number from file
    - removePidFile() deletes PID file silently
    - isProcessRunning() returns true for existing process, false for non-existent
  </behavior>
  <action>
    1. Install proper-lockfile: `bun add proper-lockfile` (verified: 17M+ weekly downloads, OK verdict per Package Legitimacy Audit)
    2. Create src/daemon.ts with the following exports per D-01 through D-12:
       - PID_FILE = '.daemon.pid' (D-07, D-08)
       - LOG_FILE = 'daemon.log' (D-11)
       - writePid(pid: number): void
       - readPid(): number | null
       - removePidFile(): void
       - isProcessRunning(pid: number): boolean (uses process.kill(pid, 0))
       - startDaemon(query: string, argv: string[], logger: Logger): Promise<number> -- acquires lock per D-09, checks existing daemon per D-06, clears log per D-12, forks child detached per D-04, writes PID, releases lock
       - stopDaemon(logger: Logger): Promise<void> -- reads PID, checks running, sends SIGTERM per D-05, removes PID file
       - setupDaemonShutdown(deps: { saveState: () => void; cleanup: () => Promise<void>; logger: Logger }): void -- registers SIGTERM/SIGINT, calls saveState then cleanup then removePidFile per D-10
    3. Add DaemonOptions interface to src/types.ts: { query: string; argv: string[]; logger: Logger }
    4. Write test/integration/daemon.test.ts using mock.module for child_process.fork and fs operations:
       - Test startDaemon forks with detached option
       - Test startDaemon writes PID to .daemon.pid
       - Test startDaemon throws if daemon already running
       - Test stopDaemon sends SIGTERM to existing PID
       - Test stopDaemon handles stale PID gracefully
       - Test setupDaemonShutdown registers SIGTERM and SIGINT
    5. Run `bun test test/integration/daemon.test.ts` -- all tests must pass
  </action>
  <verify>
    <automated>bun test test/integration/daemon.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - daemon.ts exports startDaemon, stopDaemon, setupShutdownHandler, readPid, removePidFile, isProcessRunning
    - startDaemon uses proper-lockfile for PID locking (D-09)
    - PID file at .daemon.pid in project root (D-07)
    - Log file at daemon.log in project root, cleared on start (D-11, D-12)
    - Signal handlers save state before exit (D-04, D-10)
    - All integration tests pass
  </acceptance_criteria>
  <done>daemon.ts implements full daemon lifecycle with PID management, flock locking, signal handlers, and log file management. Integration tests verify all behaviors.</done>
</task>

<task type="auto">
  <name>Task 2: Wire daemon into CLI and pipeline, add --daemon-action flag</name>
  <files>src/cli.ts, src/index.ts, src/types.ts</files>
  <read_first>
    - src/cli.ts (existing --daemon flag at lines 40-44)
    - src/index.ts (main pipeline at lines 30-79)
    - .planning/phases/04-daemon-validation/04-CONTEXT.md (D-01 through D-06)
    - .planning/phases/04-daemon-validation/04-PATTERNS.md (cli.ts and index.ts modifications)
  </read_first>
  <action>
    1. Add --daemon-action option to src/cli.ts per D-02:
       - Type: string, choices: ['stop', 'status', 'logs']
       - Describe: 'Manage running daemon (stop, status, logs)'
    2. Add daemonAction handling in src/cli.ts after argument parsing per D-03:
       - If argv.daemonAction === 'stop', import stopDaemon from daemon.ts, call it, exit
       - status and logs can be stubbed with console.log for now
    3. Add daemon fork branch in src/index.ts main() function per D-04:
       - If argv.daemon is true, import startDaemon from daemon.ts
       - Call startDaemon with query and process.argv.slice(2)
       - Print PID to stdout, log "Daemon started (PID: X)" to stderr
       - Call process.exit(0)
    4. Update CliArgs type in src/types.ts to include daemonAction?: string
    5. Run `bun run typecheck` to verify TypeScript compilation
    6. Run `bun test test/integration/daemon.test.ts` to verify existing tests still pass
  </action>
  <verify>
    <automated>bun run typecheck && bun test test/integration/daemon.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - CLI accepts --daemon-action flag with choices stop/status/logs (D-02)
    - --daemon flag triggers fork and parent exit (D-04)
    - --daemon-action stop triggers stopDaemon (D-05)
    - TypeScript compiles without errors
    - Integration tests pass
  </acceptance_criteria>
  <done>CLI and pipeline are wired for daemon mode. --daemon flag forks child process, --daemon-action stop stops daemon. TypeScript compiles.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CLI -> Daemon | User input (query, args) crosses into child process |
| Daemon -> PID File | Process writes PID to shared filesystem |
| Daemon -> Log File | Process writes logs to shared filesystem |
| Daemon -> Process Manager | External signal (SIGTERM) crosses into daemon |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-04-01 | Tampering | PID file | medium | mitigate | proper-lockfile atomic operations prevent race conditions |
| T-04-02 | Tampering | Log file | low | accept | Log file is overwritten on start, no append; injection requires filesystem access |
| T-04-03 | Elevation of Privilege | child_process.fork | medium | mitigate | Validate all inputs before fork(), no user-controlled code injection |
| T-04-04 | Denial of Service | PID file stale lock | low | mitigate | proper-lockfile handles stale locks with retry logic |
</threat_model>

<verification>
1. `bun test test/integration/daemon.test.ts` -- all tests pass
2. `bun run typecheck` -- no TypeScript errors
3. Manual verification: `bun run src/cli.ts --query test --daemon` starts daemon, prints PID, parent exits
4. Manual verification: `bun run src/cli.ts --daemon-action stop` stops daemon
5. PID file (.daemon.pid) created and deleted on clean exit
6. Log file (daemon.log) created and written during daemon execution
</verification>

<success_criteria>
- Daemon starts as detached child process (D-01, D-04)
- PID file managed with flock-based locking (D-02, D-09)
- Daemon logs to file (D-03, D-11, D-12)
- Graceful shutdown on SIGTERM/SIGINT (D-04, D-10)
- State saved before exit (D-05)
- Daemon can be stopped via --daemon-action stop (D-05, D-06)
</success_criteria>

<output>
Create `.planning/phases/04-daemon-validation/04-01-SUMMARY.md` when done
</output>

---

---
phase: 04-daemon-validation
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - test/unit/extractor.test.ts
  - test/unit/config.test.ts
  - test/unit/output.test.ts
  - test/unit/webhook.test.ts
  - test/unit/daemon.test.ts
  - test/integration/cli.test.ts
  - test/integration/webhook.test.ts
  - test/e2e/scraper.test.ts
  - test/fixtures/graphql-response.json
  - bunfig.toml
autonomous: true
requirements:
  - TEST-01
  - TEST-02
  - TEST-03
  - TEST-04
  - TEST-05
user_setup: []

must_haves:
  truths:
    - "Unit tests verify extraction logic with mock objects"
    - "Unit tests verify config loading and preset resolution"
    - "Integration tests verify CLI argument parsing with mocked pipeline"
    - "Integration tests verify webhook notification with mocked HTTP"
    - "E2E tests verify full scrape workflow with mocked browser"
    - "Test coverage meets 70% threshold"
  artifacts:
    - test/unit/extractor.test.ts
    - test/unit/config.test.ts
    - test/unit/output.test.ts
    - test/unit/webhook.test.ts
    - test/unit/daemon.test.ts
    - test/integration/cli.test.ts
    - test/integration/webhook.test.ts
    - test/e2e/scraper.test.ts
    - test/fixtures/graphql-response.json
    - bunfig.toml
  key_links:
    - "test/unit/ -> src/*.ts (unit test imports)"
    - "test/integration/ -> src/*.ts (integration test mocks)"
    - "test/e2e/ -> test/fixtures/ (fixture data loading)"
    - "bunfig.toml -> bun test (coverage thresholds)"
---

<objective>
Migrate existing tests to organized test/ directory structure and add comprehensive test suite covering unit, integration, and E2E tests.

Purpose: Validate the full system with 70% minimum line coverage per D-16.
Output: Complete test suite in test/unit/, test/integration/, test/e2e/ with fixtures.
</objective>

<execution_context>
@/home/shoyeb/.config/opencode/gsd-core/workflows/execute-plan.md
@/home/shoyeb/.config/opencode/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04-daemon-validation/04-CONTEXT.md
@.planning/phases/04-daemon-validation/04-RESEARCH.md
@.planning/phases/04-daemon-validation/04-PATTERNS.md
@src/extractor.ts
@src/config.ts
@src/output.ts
@src/webhook.ts
@src/index.ts
@src/output.test.ts
@src/webhook.test.ts
@tests/extractor.test.ts
@tests/config.test.ts
@tests/cli.test.ts
@tests/scraper.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Migrate existing tests to test/ structure, add unit tests for extraction and config</name>
  <files>test/unit/extractor.test.ts, test/unit/config.test.ts, test/unit/output.test.ts, test/unit/webhook.test.ts, test/unit/daemon.test.ts</files>
  <read_first>
    - src/extractor.ts (extractProfileUrls function signature and behavior)
    - src/config.ts (loadConfig, resolvePreset function signatures)
    - src/output.ts (generateOutputPath, saveUrlsToFile, createIncrementalSaver)
    - src/webhook.ts (resolveEndpoint, notifyWebhook)
    - tests/extractor.test.ts (existing test patterns -- 10 test cases)
    - tests/config.test.ts (existing test patterns -- 12 test cases)
    - src/output.test.ts (existing test patterns -- 16 test cases)
    - src/webhook.test.ts (existing test patterns -- 16 source verification tests)
  </read_first>
  <action>
    1. Create test/unit/extractor.test.ts per TEST-01:
       - Migrate all tests from tests/extractor.test.ts
       - Update import path from '../src/extractor.js' to '../../src/extractor.js'
       - Add tests for deeply nested GraphQL response structures
       - Add tests for edge cases: empty arrays, circular references, very large objects
    2. Create test/unit/config.test.ts per TEST-02:
       - Migrate all tests from tests/config.test.ts
       - Update import path to '../../src/config.js'
       - Add tests for loadConfig with valid/invalid config files
       - Add tests for resolvePreset with valid/invalid preset names
       - Add tests for Zod schema validation errors
    3. Create test/unit/output.test.ts:
       - Migrate all tests from src/output.test.ts
       - Update import path from './output' to '../../src/output.js'
       - Keep temp directory isolation pattern (beforeEach/afterEach with /tmp/)
       - Add tests for edge cases: empty URLs set, special characters in query
    4. Create test/unit/webhook.test.ts:
       - Migrate all tests from src/webhook.test.ts (source verification tests)
       - Update import paths to '../../src/webhook.ts'
       - Add tests for resolveEndpoint with different preset formats
       - Add tests for notifyWebhook error handling (D-16: never crashes scraper)
    5. Create test/unit/daemon.test.ts:
       - Add unit tests for PID file operations (writePid, readPid, removePidFile)
       - Add unit tests for isProcessRunning with mock process.kill
       - Add unit tests for setupShutdownHandler (mock process.on)
       - Use temp directories for PID file operations (D-17)
    6. Run `bun test test/unit/` -- all tests must pass
  </action>
  <verify>
    <automated>bun test test/unit/</automated>
  </verify>
  <acceptance_criteria>
    - test/unit/extractor.test.ts covers all extraction edge cases (TEST-01)
    - test/unit/config.test.ts covers config loading and preset resolution (TEST-02)
    - test/unit/output.test.ts covers file writing and incremental saves
    - test/unit/webhook.test.ts covers endpoint resolution and error handling
    - test/unit/daemon.test.ts covers PID operations and shutdown handlers
    - All unit tests pass
    - No tests write to production output/ directory (D-17)
  </acceptance_criteria>
  <done>Unit tests for extraction, config, output, webhook, and daemon modules complete. All tests pass with proper isolation.</done>
</task>

<task type="auto">
  <name>Task 2: Add integration tests (CLI, webhook) and E2E tests with fixtures, configure coverage</name>
  <files>test/integration/cli.test.ts, test/integration/webhook.test.ts, test/e2e/scraper.test.ts, test/fixtures/graphql-response.json, bunfig.toml</files>
  <read_first>
    - src/cli.ts (argument parsing logic)
    - src/index.ts (main pipeline function)
    - src/webhook.ts (notifyWebhook with HTTP/HTTPS)
    - tests/cli.test.ts (existing integration test patterns -- 13 test cases)
    - tests/scraper.test.ts (existing mock.module patterns -- 10 test cases)
    - src/extractor.ts (data shape for fixtures)
  </read_first>
  <action>
    1. Create test/integration/cli.test.ts per TEST-03:
       - Migrate all tests from tests/cli.test.ts
       - Update import paths to '../../src/index.js'
       - Add tests for --daemon-action flag parsing (D-02)
       - Add tests for --daemon flag triggering fork behavior
       - Mock daemon module for --daemon tests
       - Verify argument validation (missing query, invalid max-urls)
    2. Create test/integration/webhook.test.ts per TEST-04:
       - Mock http/https modules using mock.module pattern
       - Test notifyWebhook sends POST with correct Content-Type
       - Test notifyWebhook handles 5xx errors with retry
       - Test notifyWebhook handles 4xx errors without retry (AbortError)
       - Test notifyWebhook failure does not throw (D-16)
       - Mock p-retry to verify retry behavior
    3. Create test/e2e/scraper.test.ts per TEST-05:
       - Mock browser module (cloakbrowser launch)
       - Create mock page with fixture data injection
       - Load test/fixtures/graphql-response.json
       - Test full pipeline: args -> config -> browser -> extraction -> output
       - Verify extracted URLs match fixture data
       - Test graceful shutdown during scraping
    4. Create test/fixtures/graphql-response.json:
       - Match data shape from src/extractor.ts lines 10-29
       - Include nested edges -> node -> sponsored_item -> page_profile_uri structure
       - Include multiple profile URLs for deduplication testing
       - Include edge cases: empty edges, missing fields, extra data
    5. Create bunfig.toml for coverage configuration per D-16:
       - [test] coverageThreshold = { line = 0.7, function = 0.7, statement = 0.7 }
    6. Run `bun test --coverage` -- all tests pass with 70% coverage
  </action>
  <verify>
    <automated>bun test --coverage</automated>
  </verify>
  <acceptance_criteria>
    - test/integration/cli.test.ts covers CLI argument parsing (TEST-03)
    - test/integration/webhook.test.ts covers webhook notification (TEST-04)
    - test/e2e/scraper.test.ts covers full scrape workflow (TEST-05)
    - test/fixtures/graphql-response.json matches extractor data shape
    - bunfig.toml enforces 70% coverage threshold (D-16)
    - All tests pass with coverage meeting threshold
  </acceptance_criteria>
  <done>Integration and E2E tests complete. Coverage meets 70% threshold. Full test suite validates extraction, config, CLI, webhook, and end-to-end scrape workflow.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Test -> Source | Test imports source modules directly |
| Test -> Mock | Test replaces real dependencies with mocks |
| Fixture -> Test | External JSON data loaded into test context |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-04-05 | Tampering | Test fixtures | low | accept | Fixtures are static JSON, not user-controlled |
| T-04-06 | Information Disclosure | Test mocks | low | accept | Mocks prevent real network calls, no data leakage |
| T-04-07 | Denial of Service | Coverage threshold | low | accept | Coverage check is advisory, not blocking |
</threat_model>

<verification>
1. `bun test` -- all tests pass
2. `bun test --coverage` -- coverage meets 70% threshold
3. `bun test test/unit/` -- unit tests pass
4. `bun test test/integration/` -- integration tests pass
5. `bun test test/e2e/` -- E2E tests pass
6. No tests write to production output/ directory (D-17)
7. Test files are in test/ directory structure per D-13, D-14
</verification>

<success_criteria>
- Unit tests for extraction (TEST-01) and config (TEST-02)
- Integration tests for CLI (TEST-03) and webhook (TEST-04)
- E2E tests for full scrape workflow (TEST-05)
- Coverage meets 70% threshold (D-16)
- Tests in test/unit/, test/integration/, test/e2e/ structure (D-13, D-14)
- No production folder writes (D-17)
</success_criteria>

<output>
Create `.planning/phases/04-daemon-validation/04-02-SUMMARY.md` when done
</output>
