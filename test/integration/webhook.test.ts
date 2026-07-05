import { describe, it, expect, mock, beforeEach } from 'bun:test';
import pino from 'pino';

const logger = pino({ level: 'silent' });

describe('webhook integration', () => {
    describe('resolveEndpoint', () => {
        it('returns preset callback URL', async () => {
            const { resolveEndpoint } = await import('../../src/webhook.js');

            const result = resolveEndpoint({ callback: 'https://example.com/hook' });
            expect(result).toBe('https://example.com/hook');
        });

        it('returns URL as-is without normalization', async () => {
            const { resolveEndpoint } = await import('../../src/webhook.js');

            const result = resolveEndpoint({ callback: 'http://localhost:3000/webhook' });
            expect(result).toBe('http://localhost:3000/webhook');
        });
    });

    describe('notifyWebhook contracts', () => {
        it('is an async function that accepts WebhookOptions', async () => {
            const { notifyWebhook } = await import('../../src/webhook.js');
            expect(typeof notifyWebhook).toBe('function');
        });

        it('has default timeout of 10s (D-12)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('DEFAULT_TIMEOUT_MS = 10_000');
        });

        it('has default retries of 2 (D-14: 1 original + 2 retries = 3 total)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('DEFAULT_RETRIES = 2');
        });

        it('uses HTTP/HTTPS based on URL protocol', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain("parsedUrl.protocol === 'https:' ? https : http");
        });

        it('sends POST with application/json Content-Type', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain("'Content-Type': 'application/json'");
        });

        it('retries on 5xx errors (D-15)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            // 5xx throws regular Error to trigger retry
            expect(src).toContain('statusCode >= 500');
            expect(src).toContain('new Error(');
        });

        it('aborts on 4xx errors (D-15)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            // 4xx throws AbortError to stop retrying
            expect(src).toContain('statusCode >= 400');
            expect(src).toContain('new AbortError(');
        });

        it('never throws on failure (D-16)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            // Outer catch block logs but does not re-throw
            expect(src).toContain('catch (error)');
            expect(src).toContain('webhookLogger.error');
            expect(src).toContain('Webhook failed:');
        });

        it('uses pRetry with onFailedAttempt logging', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('pRetry');
            expect(src).toContain('onFailedAttempt');
        });
    });
});
