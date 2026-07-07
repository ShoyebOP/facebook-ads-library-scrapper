// --- Main entry — pipeline orchestrator ---

import { loadConfig, resolvePreset } from './config.js';
import { createLogger } from './logger.js';
import {
    createIncrementalSaver,
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
    callback?: string;
    envFile?: string;
    url?: string;
};

// --- Main pipeline orchestrator ---

export async function main(argv: CliArgs): Promise<Set<string>> {
    // D-20: create structured logger
    const logger = createLogger();

    // Load env file if specified (safety net for when CLI entry point is bypassed)
    if (argv.envFile) {
        const fs = await import('node:fs');
        try {
            const content = fs.readFileSync(argv.envFile, 'utf-8');
            const lines = content.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const eqIndex = trimmed.indexOf('=');
                if (eqIndex === -1) continue;
                const key = trimmed.substring(0, eqIndex).trim();
                let value = trimmed.substring(eqIndex + 1).trim();
                // Strip surrounding quotes
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
            logger.info(`Loaded env file: ${argv.envFile}`);
        } catch (err) {
            logger.error({ err }, 'Failed to load env file');
        }
    }

    // D-04: If --daemon flag (and not already child), fork child process and exit parent
    if (argv.daemon && process.env.SCRAPER_DAEMON_CHILD !== '1') {
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

    // CLI --callback flag overrides preset callback URL
    if (argv.callback) {
        webhookUrl = argv.callback;
        logger.info(`Using --callback flag override: ${argv.callback}`);
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

    // Generate output path early — needed for incremental saver and shutdown handler
    const outputFile = generateOutputPath({ query: argv.query, logger });
    await ensureOutputDir('output');

    // D-05: create incremental saver for periodic URL writes during scraping
    const incrementalSaver = createIncrementalSaver({ outputFile });

    // Capture browser reference for shutdown handler cleanup
    let browserRef: import('playwright-core').Browser | null = null;

    // Mutable container for shutdown handler closure (urls populated after runScraper)
    const state = { urls: new Set<string>() };

    // D-08: Wire shutdown handlers — registered BEFORE runScraper
    // so SIGTERM/SIGINT is handled even if scraper hasn't finished yet
    let shuttingDown = false;
    const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        logger.info(`Received ${signal}, shutting down...`);
        try {
            saveUrlsToFile(outputFile, state.urls);
            logger.info(`Saved ${state.urls.size} URLs during shutdown`);
        } catch (err) {
            logger.error({ err }, 'Failed to save URLs during shutdown');
        }
        try {
            if (browserRef) {
                await browserRef.close();
            }
        } catch (err) {
            logger.error({ err }, 'Failed to close browser during shutdown');
        }
        process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Construct ScraperOptions from CliArgs
    const options: ScraperOptions = {
        query: argv.query,
        maxUrls: argv.maxUrls,
        maxNoNewScrolls: argv.maxNoNewScrolls,
        headless: argv.headless,
        proxy: argv.proxy,
        url: resolvedUrl,
        logger,
        incrementalSaver,
        onBrowserReady: (b) => { browserRef = b; },
        targetUrls: state.urls,
    };

    // Run scraper pipeline
    const startTime = Date.now();
    const urls = await runScraper(options);
    const elapsedMs = Date.now() - startTime;
    const elapsedMin = Math.floor(elapsedMs / 60000);
    const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);

    // Log completion with URL count and elapsed time
    logger.info(
        `Scrape complete: ${urls.size} URLs in ${elapsedMin}m ${elapsedSec}s`,
    );

    // D-07: save file BEFORE webhook notification (data safety)
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
