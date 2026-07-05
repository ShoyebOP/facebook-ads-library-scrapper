# Phase 3: Output & Delivery - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-05
**Phase:** 3-Output & Delivery
**Areas discussed:** Output file structure, Incremental saving, Webhook payload, Webhook retry policy

---

## Output file structure

| Option | Description | Selected |
|--------|-------------|----------|
| Just URLs array | Simple array of profile URLs — matches existing scraper.js behavior | ✓ |
| Object with metadata | Include query, timestamp, count, and URLs array in an object | |
| You decide | Let the agent pick based on simplicity and downstream compatibility | |

**User's choice:** Just URLs array
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current format | DD-MM-YYYY:HH:MM.query.json — matches existing scraper.js | ✓ |
| ISO format | YYYY-MM-DDTHH-MM-SS.query.json — sortable, standard | |
| You decide | Let the agent pick based on convention | |

**User's choice:** Keep current format
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| output/ subdirectory | Keep current output/ directory. Auto-create if missing | ✓ |
| Configurable path | Allow output directory to be set in config.json or CLI flag | |
| You decide | Let the agent pick based on simplicity | |

**User's choice:** output/ subdirectory
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Overwrite | Latest scrape wins. Simple, no file proliferation | ✓ |
| Append counter | Add -1, -2, etc. to filename. Preserves all runs | |
| You decide | Let the agent pick based on simplicity | |

**User's choice:** Overwrite
**Notes:** None

---

## Incremental saving

| Option | Description | Selected |
|--------|-------------|----------|
| Every 100 new URLs | Balance between safety and file I/O. Matches Phase 2 requirement | ✓ |
| Every scroll | Save after each scroll completes. More frequent but more I/O | |
| You decide | Let the agent pick based on performance and safety | |

**User's choice:** Every 100 new URLs
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Overwrite same file | Write current URL set to the same file | ✓ |
| Write to temp, then rename | Write to .tmp file, then atomic rename. Safer but more complex | |
| You decide | Let the agent pick based on safety vs simplicity | |

**User's choice:** Overwrite same file
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Save what we have | On SIGINT/SIGTERM/crash, save collected URLs to the output file | ✓ |
| Only save on success | Only write file after full scrape completes | |
| You decide | Let the agent pick based on safety | |

**User's choice:** Save what we have
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, always valid | Write complete JSON array each time. Downstream tools can read at any point | ✓ |
| Append lines | Append one URL per line (JSON Lines format). Faster but changes format | |
| You decide | Let the agent pick based on downstream compatibility | |

**User's choice:** Yes, always valid
**Notes:** None

---

## Webhook payload

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current format | { query, outputFile, count } — matches existing scraper.js | ✓ |
| Add metadata | Add status (success/failure), duration, timestamp | |
| You decide | Let the agent pick based on simplicity | |

**User's choice:** Keep current format
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| No, just metadata | Payload has query, outputFile, count. Downstream reads JSON file for URLs | ✓ |
| Yes, include URLs | Add URLs array to payload. Downstream doesn't need to read the file | |
| You decide | Let the agent pick based on downstream needs | |

**User's choice:** No, just metadata
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| application/json | Standard JSON POST. Matches current scraper.js behavior | ✓ |
| application/x-www-form-urlencoded | Form-encoded data. Some older webhook receivers prefer this | |
| You decide | Let the agent pick based on convention | |

**User's choice:** application/json
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 10 seconds | Reasonable timeout for HTTP POST. If webhook server is slow, fail fast | ✓ |
| 30 seconds | Longer timeout for slow servers. But blocks scraper completion | |
| You decide | Let the agent pick based on typical webhook behavior | |

**User's choice:** 10 seconds
**Notes:** None

---

## Webhook retry policy

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, retry with backoff | Use p-retry (available from Phase 2) for transient failures | ✓ |
| No, fire-and-forget | Log error and continue. Simpler but webhook may be missed | |
| You decide | Let the agent pick based on reliability needs | |

**User's choice:** Yes, retry with backoff
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3 attempts | Original + 2 retries. Balances reliability with not blocking too long | ✓ |
| 5 attempts | More aggressive retry. Better for unreliable networks | |
| You decide | Let the agent pick based on typical failure patterns | |

**User's choice:** 3 attempts
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Network/timeout only | Retry on ECONNRESET, ETIMEDOUT, 5xx status codes | ✓ |
| Any non-200 status | Retry on any error status code. More aggressive | |
| You decide | Let the agent pick based on error classification | |

**User's choice:** Network/timeout only
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Log error, continue | Webhook failure shouldn't prevent file output | ✓ |
| Log warning, continue | Log as warning instead of error | |
| You decide | Let the agent pick based on error severity | |

**User's choice:** File saved first, webhook is fire-and-forget
**Notes:** User clarified: file saving happens before webhook notification, so webhook failure doesn't affect data safety.

---

## the agent's Discretion

- Webhook module API shape (function with options vs class)
- Error classification for webhook failures (which HTTP codes are retryable)
- File write strategy (sync vs async)
- Output directory structure within `output/`

## Deferred Ideas

None — discussion stayed within phase scope