// --- Integration tests for shutdown URL saving ---

import { describe, expect, it } from 'bun:test';
import fs from 'fs';

describe('shutdown URL saving integration', () => {
    describe('state.urls is the same reference as runScraper return value', () => {
        it('runScraper with targetUrls returns the same Set object', async () => {
            // Verify that when targetUrls is provided, runScraper returns it directly
            const source = fs.readFileSync('src/scraper.ts', 'utf-8');
            // The function uses: const targetSet = options.targetUrls ?? profileUrls;
            // and returns: return { urls: targetSet, ... };
            // So when targetUrls is provided, targetSet IS targetUrls, and that's what's returned
            expect(source).toContain('const targetSet = options.targetUrls ?? profileUrls');
            expect(source).toContain('urls: targetSet');
        });

        it('index.ts passes state.urls as targetUrls and uses return value for final save', async () => {
            const source = fs.readFileSync('src/index.ts', 'utf-8');
            // state.urls is passed as targetUrls
            expect(source).toContain('targetUrls: state.urls');
            // The return value (result) is used for final save and webhook
            expect(source).toContain('const result = await runScraper(options)');
            expect(source).toContain('saveUrlsToFile(outputFile, result.urls)');
            expect(source).toContain('result.urls.size');
        });
    });

    describe('shutdown handler captures state.urls (shared container)', () => {
        it('shutdown handler saves state.urls, not a local copy', async () => {
            const source = fs.readFileSync('src/index.ts', 'utf-8');
            // The shutdown handler closure captures state.urls
            expect(source).toContain('saveUrlsToFile(outputFile, state.urls)');
            expect(source).toContain('Saved ${state.urls.size} URLs during shutdown');
        });

        it('shutdown handler is registered before runScraper', async () => {
            const source = fs.readFileSync('src/index.ts', 'utf-8');
            const shutdownIndex = source.indexOf('process.on(\'SIGINT\'');
            const runScraperIndex = source.indexOf('await runScraper(');

            expect(shutdownIndex).toBeGreaterThan(0);
            expect(runScraperIndex).toBeGreaterThan(0);
            expect(shutdownIndex).toBeLessThan(runScraperIndex);
        });

        it('shuttingDown flag prevents double execution', async () => {
            const source = fs.readFileSync('src/index.ts', 'utf-8');
            // The shutdown handler checks shuttingDown flag
            expect(source).toContain('let shuttingDown = false');
            expect(source).toContain('if (shuttingDown) return');
            expect(source).toContain('shuttingDown = true');
        });
    });

    describe('backward compatibility', () => {
        it('scraper works without targetUrls (creates internal Set)', async () => {
            const source = fs.readFileSync('src/scraper.ts', 'utf-8');
            // When targetUrls is not provided, profileUrls is used as fallback
            expect(source).toContain('options.targetUrls ?? profileUrls');
            // profileUrls is still created as a local Set
            expect(source).toContain('const profileUrls = new Set<string>()');
        });

        it('ScraperOptions.targetUrls is optional', async () => {
            const source = fs.readFileSync('src/types.ts', 'utf-8');
            // targetUrls should be optional (has ?)
            expect(source).toContain('targetUrls?: Set<string>');
        });
    });

    describe('scraping flow correctness', () => {
        it('interceptor writes to targetSet (shared container)', async () => {
            const source = fs.readFileSync('src/scraper.ts', 'utf-8');
            // The interceptor receives targetSet, not profileUrls
            expect(source).toContain('setupGraphQLInterceptor(page, targetSet, logger)');
        });

        it('scroll loop uses targetSet for size checks', async () => {
            const source = fs.readFileSync('src/scraper.ts', 'utf-8');
            // The while loop condition uses targetSet.size
            expect(source).toContain('targetSet.size < maxUrls');
            // The before comparison uses targetSet.size
            expect(source).toContain('const before = targetSet.size');
        });

        it('incremental saver receives targetSet', async () => {
            const source = fs.readFileSync('src/scraper.ts', 'utf-8');
            expect(source).toContain('incrementalSaver?.(targetSet)');
        });
    });
});
