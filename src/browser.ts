// --- Browser controller with cloakbrowser stealth integration ---

import { launch } from 'cloakbrowser';
import type { Browser } from 'playwright-core';
import { withRetry } from './errors.js';
import { createChildLogger } from './logger.js';
import type { BrowserOptions } from './types.js';

// --- Launch stealth browser with anti-detection configuration ---

export async function launchBrowser(options: BrowserOptions): Promise<Browser> {
    const browserLogger = createChildLogger(options.logger, 'browser');

    const launchOpts: Record<string, unknown> = {
        headless: options.headless,
        humanize: true,
        human_preset: 'careful',
        stealth_args: true,
        locale: options.locale || 'en-US',
        timezone: options.timezone || 'Asia/Dhaka',
    };

    // Per D-03: proxy URL-embedded format passed directly to launch
    if (options.proxy) {
        launchOpts.proxy = options.proxy;
    }

    browserLogger.debug({ launchOpts }, 'Launching cloakbrowser');

    try {
        const browser = await withRetry(
            () => launch(launchOpts),
            { retries: 3, logger: browserLogger },
        );
        browserLogger.info('Browser launched successfully');
        return browser;
    } catch (error) {
        browserLogger.error({ err: error }, 'Browser launch failed');
        throw error;
    }
}
