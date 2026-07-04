#!/usr/bin/env bun

// --- CLI entry point with yargs parsing ---

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { type CliArgs, main } from './index.js';

// --- Parse CLI arguments ---

const argv = (await yargs(hideBin(process.argv))
    .options({
        query: {
            type: 'string',
            demandOption: true,
            describe: 'Search keyword for Facebook Ads',
        },
        preset: {
            type: 'string',
            describe: 'Configuration preset name (resolves callback URL)',
        },
        headless: {
            type: 'boolean',
            default: false,
            describe: 'Run browser in headless mode',
        },
        proxy: {
            type: 'string',
            describe: 'Proxy server URL (HTTP/SOCKS5)',
        },
        'max-urls': {
            type: 'number',
            describe: 'Maximum URLs to collect',
        },
        'max-no-new-scrolls': {
            type: 'number',
            default: 10,
            describe: 'Stop after N scrolls with no new results',
        },
        daemon: {
            type: 'boolean',
            default: false,
            describe: 'Run as background process',
        },
        callback: {
            type: 'string',
            describe: 'Webhook callback name (overrides preset)',
        },
        'env-file': {
            type: 'string',
            describe: 'Path to env file',
        },
    })
    .strict()
    .help()
    .parse()) as CliArgs;

// --- Validate required arguments ---

if (!argv.query) {
    console.error('Error: query required');
    process.exit(1);
}

// --- Validate numeric arguments ---

if (argv.maxUrls !== undefined) {
    if (isNaN(argv.maxUrls) || argv.maxUrls <= 0) {
        console.error('Error: --max-urls must be a positive integer');
        process.exit(1);
    }
}

if (argv.maxNoNewScrolls !== undefined) {
    if (isNaN(argv.maxNoNewScrolls) || argv.maxNoNewScrolls <= 0) {
        console.error('Error: --max-no-new-scrolls must be a positive integer');
        process.exit(1);
    }
}

// --- Run main pipeline ---

try {
    await main(argv);
} catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
}
