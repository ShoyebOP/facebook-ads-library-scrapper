// --- Main entry — pipeline orchestrator ---

import { loadConfig, resolvePreset } from './config.js';
import { createLogger } from './logger.js';
import { runScraper } from './scraper.js';
import type { ScraperOptions } from './types.js';

// --- CLI argument types ---

export type CliArgs = {
    query: string;
    preset?: string;
    headless: boolean;
    proxy?: string;
    maxUrls?: number;
    maxNoNewScrolls: number;
    daemon: boolean;
    callback?: string;
    envFile?: string;
};

// --- Main pipeline orchestrator ---

export async function main(argv: CliArgs): Promise<Set<string>> {
    // D-20: create structured logger
    const logger = createLogger();

    // Load configuration
    const config = await loadConfig();

    // Resolve preset if provided
    if (argv.preset) {
        const preset = resolvePreset(config, argv.preset);
        logger.info(`Using preset: ${argv.preset} (${preset.callback})`);
    }

    // Construct ScraperOptions from CliArgs
    const options: ScraperOptions = {
        query: argv.query,
        maxUrls: argv.maxUrls,
        maxNoNewScrolls: argv.maxNoNewScrolls,
        headless: argv.headless,
        proxy: argv.proxy,
        logger,
    };

    // Run scraper pipeline
    const urls = await runScraper(options);

    // Log completion with URL count
    logger.info(
        `Scraping complete: ${urls.size} unique profile URLs collected`,
    );

    return urls;
}
