# Phase 3: Output & Delivery - Validation

**Created:** 2026-07-05
**Source:** 03-RESEARCH.md Validation Architecture section

## Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test |
| Config file | none — see Phase 1 SETUP-04 |
| Quick run command | `bun test src/output.test.ts src/webhook.test.ts` |
| Full suite command | `bun test` |

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OUTPUT-01 | Generate timestamped filename | unit | `bun test src/output.test.ts::testGenerateOutputPath -x` | ❌ Wave 0 |
| OUTPUT-02 | Incremental save at 100 URLs | unit | `bun test src/output.test.ts::testIncrementalSave -x` | ❌ Wave 0 |
| OUTPUT-03 | Create output directory | unit | `bun test src/output.test.ts::testEnsureOutputDir -x` | ❌ Wave 0 |
| WEBHOOK-01 | POST JSON payload | integration | `bun test src/webhook.test.ts::testNotifyWebhook -x` | ❌ Wave 0 |
| WEBHOOK-02 | Resolve preset endpoint | unit | `bun test src/webhook.test.ts::testResolveEndpoint -x` | ❌ Wave 0 |
| WEBHOOK-03 | Handle webhook failure | unit | `bun test src/webhook.test.ts::testWebhookErrorIsolation -x` | ❌ Wave 0 |

## Sampling Rate

- **Per task commit:** `bun test src/output.test.ts src/webhook.test.ts`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

## Wave 0 Gaps

- [ ] `src/output.test.ts` — covers OUTPUT-01, OUTPUT-02, OUTPUT-03
- [ ] `src/webhook.test.ts` — covers WEBHOOK-01, WEBHOOK-02, WEBHOOK-03
- [ ] Test fixtures: mock HTTP server for webhook tests
- [ ] Mock filesystem for output tests (or use tmp directory)
