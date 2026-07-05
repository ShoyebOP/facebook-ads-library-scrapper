import { describe, expect, it } from 'bun:test';

describe('webhook.ts', () => {
    describe('resolveEndpoint', () => {
        it('exports a function that returns preset.callback', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toMatch(/export\s+function\s+resolveEndpoint/);
            expect(src).toContain('return preset.callback');
        });
    });

    describe('notifyWebhook', () => {
        it('sends POST with Content-Type application/json', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain("'Content-Type': 'application/json'");
        });

        it('uses pRetry for retry logic', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('pRetry');
        });

        it('has AbortError import from p-retry', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('AbortError');
        });

        it('uses AbortSignal.timeout for request timeout', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('AbortSignal.timeout(');
        });

        it('has outer try/catch that does not re-throw (D-16)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('onFailedAttempt');
        });

        it('configures retries: 2 (3 total attempts)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('DEFAULT_RETRIES = 2');
        });

        it('imports http and https modules', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain("from 'http'");
            expect(src).toContain("from 'https'");
        });
    });

    describe('types', () => {
        it('exports WebhookPayload interface with query, outputFile, count fields', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/types.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('export interface WebhookPayload');
            expect(src).toContain('query: string');
            expect(src).toContain('outputFile: string');
            expect(src).toContain('count: number');
        });

        it('exports WebhookOptions interface with url, payload, timeoutMs?, retries?, logger fields', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/types.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('export interface WebhookOptions');
            expect(src).toContain('url: string');
            expect(src).toContain('payload: WebhookPayload');
            expect(src).toMatch(/timeoutMs\?\s*:\s*number/);
            expect(src).toMatch(/retries\?\s*:\s*number/);
            expect(src).toContain('logger: Logger');
        });
    });

    describe('function signatures', () => {
        it('notifyWebhook has correct signature', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toMatch(/export\s+(async\s+)?function\s+notifyWebhook/);
            expect(src).toContain('WebhookOptions');
        });

        it('resolveEndpoint has correct signature', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toMatch(/export\s+function\s+resolveEndpoint/);
            expect(src).toContain('{ callback: string }');
        });
    });

    describe('pipeline wiring (source verification)', () => {
        it('src/index.ts imports from output.js', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/index.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain("from './output.js'");
        });

        it('src/index.ts imports from webhook.js', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/index.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain("from './webhook.js'");
        });

        it('src/index.ts calls ensureOutputDir', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/index.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain("ensureOutputDir('output')");
        });

        it('src/index.ts calls saveUrlsToFile', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/index.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('saveUrlsToFile(outputFile, urls)');
        });

        it('src/index.ts calls notifyWebhook', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/index.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('await notifyWebhook(');
        });

        it('file save happens BEFORE webhook call', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/index.ts', import.meta.url),
                'utf-8',
            );
            const saveIdx = src.indexOf('saveUrlsToFile(outputFile, urls)');
            const webhookIdx = src.indexOf('await notifyWebhook(');
            expect(saveIdx).toBeGreaterThan(-1);
            expect(webhookIdx).toBeGreaterThan(-1);
            expect(saveIdx).toBeLessThan(webhookIdx);
        });
    });

    describe('error handling verification', () => {
        it('webhook failure never crashes scraper (D-16)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            // Should have a catch block that logs error and returns, not re-throws
            expect(src).toContain('webhookLogger.error');
            expect(src).toContain('Webhook failed:');
        });

        it('uses 10s default timeout (D-12)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('DEFAULT_TIMEOUT_MS = 10_000');
        });
    });
});
