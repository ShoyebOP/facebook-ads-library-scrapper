---
phase: 7
slug: 7-daemon-actions-not-working-and-daemon-logs-not-being-saved
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-07
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test |
| **Config file** | none — see Wave 0 |
| **Quick run command** | `bun test` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test`
- **After every plan wave:** Run `bun test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | DAEMON-01, DAEMON-02, DAEMON-03 | T-7-01 / — | PID file management with flock-based locking | unit | `bun test test/unit/daemon.test.ts` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | DAEMON-04, DAEMON-05 | T-7-02 / — | Graceful shutdown handlers, state saving | integration | `bun test test/integration/daemon.test.ts` | ✅ | ⬜ pending |
| 07-01-03 | 01 | 1 | TEST-01, TEST-02 | T-7-03 / — | Test isolation with temp directories | unit | `bun test test/unit/daemon-actions.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/unit/daemon-actions.test.ts` — stubs for DAEMON-01 through DAEMON-05
- [ ] `test/integration/daemon-logging.test.ts` — covers log file piping
- [ ] Update `test/unit/daemon.test.ts` — update LOG_FILE constant test to use .daemon.log

*Existing infrastructure covers most phase requirements. Wave 0 adds daemon-actions specific tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Daemon process actually runs in background | DAEMON-01 | Requires process verification | Start daemon, verify PID file exists, verify process is running |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
