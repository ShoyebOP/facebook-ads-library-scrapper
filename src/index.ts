// --- Main entry — pipeline orchestrator ---

import { loadConfig, resolvePreset } from './config.js';
import { createLogger } from './logger.js';
import {
    ensureOutputDir,
    generateOutputPath,
    saveUrlsToFile,
} from './output.js';
import { runScraper } from './scraper.js';
import type { ScraperOptions } from './types.js';
import { notifyWebhook, resolveEndpoint } from './webhook.js';

// --- CLI argument types ---

export type CliArgs = {
    query: string;
    preset?: string;
    headless: boolean;
    proxy?: string;
    maxUrls?: number;
    maxNoNewScrolls: number;
    daemon: boolean;
    daemonAction?: string;
    callback?: string;
    envFile?: string;
    url?: string;
};

// --- Main pipeline orchestrator ---

export async function main(argv: CliArgs): Promise<Set<string>> {
    // D-20: create structured logger
    const logger = createLogger();

    // D-04: If --daemon flag, fork child process and exit parent
    if (argv.daemon) {
        const { startDaemon } = await import('./daemon.js');
        const daemonArgv = process.argv.slice(2);
        const pid = await startDaemon(argv.query, daemonArgv, logger);
        console.log(pid); // Parent prints PID to stdout
        logger.info(`Daemon started (PID: ${pid})`);
        process.exit(0);
    }

    // Load configuration
    const config = await loadConfig();

    // Resolve preset if provided
    let webhookUrl: string | null = null;
    let adLibraryUrl: string | undefined;
    if (argv.preset) {
        const preset = resolvePreset(config, argv.preset);
        webhookUrl = resolveEndpoint(preset);
        adLibraryUrl = preset.adLibraryUrl;
        logger.info(`Using preset: ${argv.preset} (${webhookUrl})`);
    }

    // Determine ad library URL with precedence: CLI flag > config preset > default
    let resolvedUrl: string | undefined;
    if (argv.url) {
        // CLI --url flag has highest priority
        resolvedUrl = argv.url.replace(
            '{query}',
            encodeURIComponent(argv.query),
        );
        logger.info(`Using CLI --url flag: ${argv.url}`);
    } else if (adLibraryUrl) {
        // Config preset adLibraryUrl
        resolvedUrl = adLibraryUrl.replace(
            '{query}',
            encodeURIComponent(argv.query),
        );
        logger.info(`Using preset adLibraryUrl: ${adLibraryUrl}`);
    }
    // If neither, resolvedUrl remains undefined and scraper.ts will use DEFAULT_BASE_URL

    // Construct ScraperOptions from CliArgs
    const options: ScraperOptions = {
        query: argv.query,
        maxUrls: argv.maxUrls,
        maxNoNewScrolls: argv.maxNoNewScrolls,
        headless: argv.headless,
        proxy: argv.proxy,
        url: resolvedUrl,
        logger,
    };

    // Run scraper pipeline
    const urls = await runScraper(options);

    // Log completion with URL count
    logger.info(
        `Scraping complete: ${urls.size} unique profile URLs collected`,
    );

    // D-07: save file BEFORE webhook notification (data safety)
    const outputFile = generateOutputPath({ query: argv.query, logger });
    await ensureOutputDir('output');
    saveUrlsToFile(outputFile, urls);
    logger.info(`Saved ${urls.size} unique profile URLs to ${outputFile}`);

    // D-09: send webhook notification if preset has callback URL
    if (webhookUrl) {
        await notifyWebhook({
            url: webhookUrl,
            payload: { query: argv.query, outputFile, count: urls.size },
            logger,
        });
    }

    return urls;
}
