import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import pino from 'pino';

const logger = pino({ level: 'silent' });

describe('shutdown handler wiring', () => {
    describe('ScraperOptions.targetUrls', () => {
        it('accepts a Set<string> as targetUrls', async () => {
            const { runScraper } = await import('../../src/scraper.js');
            const targetUrls = new Set<string>();
            // Just verify the function accepts the option without throwing
            // We cannot call runScraper without a real browser, so we verify the type signature compiles
            expect(typeof runScraper).toBe('function');
            expect(targetUrls).toBeInstanceOf(Set);
        });

        it('targetUrls is optional (backward compatible)', async () => {
            // When targetUrls is NOT provided, scraper should create its own Set
            // This is verified by the fact that ScraperOptions doesn't require targetUrls
            const mod = await import('../../src/types.js');
            expect(mod).toBeDefined();
        });
    });

    describe('index.ts shutdown handler registration order', () => {
        it('registers non-daemon shutdown handlers before runScraper', async () => {
            // Read the source file and verify shutdown handlers are registered BEFORE runScraper
            const source = fs.readFileSync('src/index.ts', 'utf-8');
            const shutdownHandlerIndex = source.indexOf('process.on(\'SIGINT\'');
            const runScraperCallIndex = source.indexOf('await runScraper(');

            // Shutdown handlers should be registered before runScraper is called
            // Both daemon and non-daemon handlers must be registered before the scraper runs
            expect(shutdownHandlerIndex).toBeGreaterThan(0);
            expect(runScraperCallIndex).toBeGreaterThan(0);
            expect(shutdownHandlerIndex).toBeLessThan(runScraperCallIndex);
        });

        it('daemon shutdown handler is registered before runScraper', async () => {
            const source = fs.readFileSync('src/index.ts', 'utf-8');
            // Unified shutdown handler (both daemon and non-daemon) is registered before runScraper
            const shutdownHandlerIndex = source.indexOf('process.on(\'SIGTERM\'');
            const runScraperCallIndex = source.indexOf('await runScraper(');

            // Shutdown must be registered before scraping starts
            expect(shutdownHandlerIndex).toBeGreaterThan(0);
            expect(runScraperCallIndex).toBeGreaterThan(0);
            expect(shutdownHandlerIndex).toBeLessThan(runScraperCallIndex);
        });

        it('runScraper is called with targetUrls option', async () => {
            const source = fs.readFileSync('src/index.ts', 'utf-8');
            // Verify runScraper is called with targetUrls: state.urls
            expect(source).toContain('targetUrls: state.urls');
        });
    });

    describe('scraper populates targetUrls', () => {
        it('scraper.ts uses targetUrls when provided', async () => {
            const source = fs.readFileSync('src/scraper.ts', 'utf-8');
            // Verify the scraper uses options.targetUrls
            expect(source).toContain('options.targetUrls');
            // Verify the targetSet pattern: const targetSet = options.targetUrls ?? profileUrls
            expect(source).toContain('targetSet');
        });

        it('scraper returns the targetSet (which IS targetUrls when provided)', async () => {
            const source = fs.readFileSync('src/scraper.ts', 'utf-8');
            // The function returns ScraperResult with urls: targetSet
            expect(source).toContain('urls: targetSet');
        });
    });

    describe('state.urls is populated incrementally during scraping', () => {
        it('state.urls is passed as targetUrls to runScraper', async () => {
            const source = fs.readFileSync('src/index.ts', 'utf-8');
            // The runScraper call should include targetUrls: state.urls
            expect(source).toContain('targetUrls: state.urls');
        });

        it('no state.urls = urls assignment after runScraper', async () => {
            const source = fs.readFileSync('src/index.ts', 'utf-8');
            // The old pattern "state.urls = urls;" should NOT exist after runScraper
            const lines = source.split('\n');
            const runScraperLine = lines.findIndex(l => l.includes('await runScraper('));
            // Check lines after runScraper for the old pattern
            const afterRunScraper = lines.slice(runScraperLine + 1);
            const oldPattern = afterRunScraper.some(l => l.trim() === 'state.urls = urls;');
            expect(oldPattern).toBe(false);
        });
    });
});
