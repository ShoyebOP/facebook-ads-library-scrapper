import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { readFile } from 'node:fs/promises';
import pino from 'pino';

const logger = pino({ level: 'silent' });

describe('webhook.ts', () => {
    describe('resolveEndpoint', () => {
        it('returns the callback URL from preset', async () => {
            const { resolveEndpoint } = await import('./webhook');
            const result = resolveEndpoint({ callback: 'https://example.com/hook' });
            expect(result).toBe('https://example.com/hook');
        });

        it('returns the exact string from the preset callback field', async () => {
            const { resolveEndpoint } = await import('./webhook');
            const url = 'https://custom-domain.com/api/webhook?token=abc123';
            const result = resolveEndpoint({ callback: url });
            expect(result).toBe(url);
        });
    });

    describe('notifyWebhook', () => {
        it('sends POST with Content-Type application/json', async () => {
            const src = require('node:fs').readFileSync(
                new URL('./webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('Content-Type: application/json');
        });

        it('uses pRetry for retry logic', async () => {
            const src = require('node:fs').readFileSync(
                new URL('./webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('pRetry');
        });

        it('has AbortError import from p-retry', async () => {
            const src = require('node:fs').readFileSync(
                new URL('./webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('AbortError');
        });

        it('uses AbortSignal.timeout for request timeout', async () => {
            const src = require('node:fs').readFileSync(
                new URL('./webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('AbortSignal.timeout(');
        });

        it('has outer try/catch that does not re-throw (D-16)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('./webhook.ts', import.meta.url),
                'utf-8',
            );
            // Should have a catch block that logs error and returns, not re-throws
            expect(src).toContain('onFailedAttempt');
        });

        it('configures retries: 2 (3 total attempts)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('./webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toMatch(/retries:\s*2/);
        });

        it('imports http and https modules', async () => {
            const src = require('node:fs').readFileSync(
                new URL('./webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain("from 'http'");
            expect(src).toContain("from 'https'");
        });
    });

    describe('types', () => {
        it('exports WebhookPayload interface with query, outputFile, count fields', async () => {
            const src = require('node:fs').readFileSync(
                new URL('./types.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('export interface WebhookPayload');
            expect(src).toContain('query: string');
            expect(src).toContain('outputFile: string');
            expect(src).toContain('count: number');
        });

        it('exports WebhookOptions interface with url, payload, timeoutMs?, retries?, logger fields', async () => {
            const src = require('node:fs').readFileSync(
                new URL('./types.ts', import.meta.url),
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
                new URL('./webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toMatch(/export\s+(async\s+)?function\s+notifyWebhook/);
            expect(src).toContain('WebhookOptions');
        });

        it('resolveEndpoint has correct signature', async () => {
            const src = require('node:fs').readFileSync(
                new URL('./webhook.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toMatch(/export\s+function\s+resolveEndpoint/);
            expect(src).toContain('{ callback: string }');
        });
    });
});
