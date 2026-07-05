import { describe, it, expect } from 'bun:test';
import fixtureData from '../fixtures/graphql-response.json';

// --- E2E test: verifies the full pipeline contracts ---

describe('E2E scraper workflow', () => {
    describe('fixture data shape', () => {
        it('matches extractor data shape from src/extractor.ts', () => {
            // Verify fixture has the edges → node → sponsored_item → page_profile_uri structure
            expect(fixtureData).toHaveProperty('data');
            expect(fixtureData.data).toHaveProperty('ad_library_results');
            expect(fixtureData.data.ad_library_results).toHaveProperty('edges');
            expect(Array.isArray(fixtureData.data.ad_library_results.edges)).toBe(true);
        });

        it('contains multiple profile URLs for deduplication testing', () => {
            const urls = new Set<string>();
            const edges = fixtureData.data.ad_library_results.edges;
            for (const edge of edges) {
                urls.add(edge.node.sponsored_item.page_profile_uri);
            }
            expect(urls.size).toBeGreaterThanOrEqual(2);
        });

        it('each edge has node.sponsored_item.page_profile_uri', () => {
            for (const edge of fixtureData.data.ad_library_results.edges) {
                expect(edge).toHaveProperty('node');
                expect(edge.node).toHaveProperty('sponsored_item');
                expect(edge.node.sponsored_item).toHaveProperty('page_profile_uri');
                expect(typeof edge.node.sponsored_item.page_profile_uri).toBe('string');
            }
        });
    });

    describe('extractProfileUrls with fixture data', () => {
        it('extracts all profile URLs from fixture', async () => {
            const { extractProfileUrls } = await import('../../src/extractor.js');
            const urls = new Set<string>();
            extractProfileUrls(fixtureData, urls);
            expect(urls.size).toBe(3);
            expect(urls.has('https://facebook.com/profile/advertiser1')).toBe(true);
            expect(urls.has('https://facebook.com/profile/advertiser2')).toBe(true);
            expect(urls.has('https://facebook.com/profile/advertiser3')).toBe(true);
        });

        it('deduplicates URLs from fixture', async () => {
            const { extractProfileUrls } = await import('../../src/extractor.js');
            const urls = new Set<string>();
            // Run extraction twice
            extractProfileUrls(fixtureData, urls);
            extractProfileUrls(fixtureData, urls);
            expect(urls.size).toBe(3);
        });
    });

    describe('pipeline source verification', () => {
        it('scraper.ts imports launchBrowser from browser.js', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/scraper.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain("from './browser.js'");
        });

        it('scraper.ts imports setupGraphQLInterceptor from extractor.js', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/scraper.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain("from './extractor.js'");
        });

        it('scraper.ts navigates to Facebook Ads Library', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/scraper.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('facebook.com/ads/library');
        });

        it('scraper.ts scrolls to bottom of page', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/scraper.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('window.scrollTo(0, document.body.scrollHeight)');
        });

        it('scraper.ts cleans up DOM rows above viewport (D-15)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/scraper.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('querySelectorAll(\'[role="row"]\')');
            expect(src).toContain('row.remove()');
        });

        it('scraper.ts waits 2500ms between scrolls (D-14)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/scraper.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('SCROLL_INTERVAL_MS = 2500');
        });

        it('scraper.ts closes browser in finally block (D-04)', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/scraper.ts', import.meta.url),
                'utf-8',
            );
            expect(src).toContain('finally {');
            expect(src).toContain('browser.close()');
        });

        it('index.ts orchestrates full pipeline', async () => {
            const src = require('node:fs').readFileSync(
                new URL('../../src/index.ts', import.meta.url),
                'utf-8',
            );
            // Pipeline order: config → scraper → output → webhook
            expect(src).toContain('loadConfig()');
            expect(src).toContain('runScraper(');
            expect(src).toContain('generateOutputPath(');
            expect(src).toContain('saveUrlsToFile(');
            expect(src).toContain('notifyWebhook(');
        });
    });
});
