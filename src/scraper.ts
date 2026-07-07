// --- Scraper engine — scroll loop with DOM cleanup ---

import type { Browser } from 'playwright-core';
import { launchBrowser } from './browser.js';
import { withTimeout } from './errors.js';
import { setupGraphQLInterceptor } from './extractor.js';
import { createChildLogger } from './logger.js';
import type { ScraperOptions } from './types.js';

// --- Default base URL for Facebook Ads Library search ---

const DEFAULT_BASE_URL =
    'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BD&is_targeted_country=BD&media_type=all&publisher_platforms[0]=facebook&q={query}&search_type=keyword_unordered&sort_data[mode]=total_impressions&sort_data[direction]=desc';

// --- Scroll interval between scrolls (D-14) ---

const SCROLL_INTERVAL_MS = 2500;

// --- DOM cleanup timeout (D-15) ---

const DOM_CLEANUP_TIMEOUT_MS = 10000;

// --- Scroll operation timeout ---

const SCROLL_TIMEOUT_MS = 10000;

// --- Retry delay on scroll failure (D-17) ---

const SCROLL_RETRY_DELAY_MS = 1000;

// --- Run the scraper: launch browser, scroll, extract URLs ---

export async function runScraper(
    options: ScraperOptions,
): Promise<Set<string>> {
    const {
        query,
        maxUrls = Infinity,
        maxNoNewScrolls,
        headless,
        proxy,
        locale,
        timezone,
        logger,
        incrementalSaver,
    } = options;

    const scrollLogger = createChildLogger(logger, 'scroll');
    const profileUrls = new Set<string>();
    const targetSet = options.targetUrls ?? profileUrls;

    // Build search URL: use provided URL or fall back to default
    const searchUrl =
        options.url ??
        DEFAULT_BASE_URL.replace('{query}', encodeURIComponent(query));

    // Launch browser (D-04: will be closed in finally)
    let browser: Browser | null = null;
    try {
        browser = await launchBrowser({
            headless,
            proxy,
            locale,
            timezone,
            logger,
        });

        // Notify caller that browser is ready (for shutdown handler cleanup)
        options.onBrowserReady?.(browser);

        const page = await browser.newPage();

        // Setup GraphQL interceptor for URL extraction
        setupGraphQLInterceptor(page, targetSet, logger);

        // Navigate to Facebook Ads Library
        scrollLogger.info(`Navigating to Ads Library...`);
        await page.goto(searchUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });
        scrollLogger.info('Page loaded. Scrolling to load more ads...');

        // Auto-scroll loop
        let noNewUrlsCount = 0;
        let scrollCount = 0;
        let lastLogTime = Date.now();

        while (noNewUrlsCount < maxNoNewScrolls && targetSet.size < maxUrls) {
            const before = targetSet.size;

            // Scroll to bottom
            try {
                await withTimeout(
                    page.evaluate(() =>
                        window.scrollTo(0, document.body.scrollHeight),
                    ),
                    SCROLL_TIMEOUT_MS,
                );
            } catch (e) {
                scrollLogger.error(
                    `Scroll failed: ${(e as Error).message}. Retrying...`,
                );
                await page.waitForTimeout(SCROLL_RETRY_DELAY_MS);
                continue;
            }

            // Wait between scrolls (D-14)
            await page.waitForTimeout(SCROLL_INTERVAL_MS);

            // DOM cleanup: remove rows above viewport (D-15)
            try {
                await withTimeout(
                    page.evaluate(() => {
                        const rows = document.querySelectorAll('[role="row"]');
                        const viewportTop = window.scrollY;
                        for (const row of rows) {
                            const rect = row.getBoundingClientRect();
                            if (rect.bottom < viewportTop - 500) {
                                row.remove();
                            }
                        }
                    }),
                    DOM_CLEANUP_TIMEOUT_MS,
                );
            } catch (e) {
                scrollLogger.error(
                    `DOM cleanup failed: ${(e as Error).message}. Continuing...`,
                );
            }

            scrollCount++;

            if (targetSet.size === before) {
                noNewUrlsCount++;
                // Heartbeat: log periodically even when no new URLs found
                const elapsed = Date.now() - lastLogTime;
                if (elapsed >= 30000) {
                    scrollLogger.info(
                        `[heartbeat] Scroll #${scrollCount}: ${targetSet.size} URLs, no new leads in ${Math.round(elapsed / 1000)}s (${noNewUrlsCount}/${maxNoNewScrolls} dead scrolls)`,
                    );
                    lastLogTime = Date.now();
                }
            } else {
                noNewUrlsCount = 0;
                lastLogTime = Date.now();
                scrollLogger.info(
                    `${targetSet.size} unique profile URLs found...`,
                );
            }

            // Incremental save — persist URLs periodically
            incrementalSaver?.(targetSet);
        }

        if (targetSet.size >= maxUrls) {
            scrollLogger.info(`Reached max URLs limit (${maxUrls}).`);
        } else {
            scrollLogger.info('No more new ads loading.');
        }

        return targetSet;
    } finally {
        // D-04: always close browser
        if (browser) {
            try {
                await browser.close();
            } catch {
                // Browser may already be closed
            }
        }
    }
}
