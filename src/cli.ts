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
        'daemon-action': {
            type: 'string',
            choices: ['stop', 'status', 'logs'],
            describe: 'Manage running daemon (stop, status, logs)',
        },
        callback: {
            type: 'string',
            describe: 'Webhook callback name (overrides preset)',
        },
        'env-file': {
            type: 'string',
            describe: 'Path to env file',
        },
        url: {
            type: 'string',
            describe: 'Override ad library URL for this run',
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
    if (Number.isNaN(argv.maxUrls) || argv.maxUrls <= 0) {
        console.error('Error: --max-urls must be a positive integer');
        process.exit(1);
    }
}

if (argv.maxNoNewScrolls !== undefined) {
    if (Number.isNaN(argv.maxNoNewScrolls) || argv.maxNoNewScrolls <= 0) {
        console.error('Error: --max-no-new-scrolls must be a positive integer');
        process.exit(1);
    }
}

// --- Validate proxy value ---

if (argv.proxy !== undefined && argv.proxy === '') {
    console.error('Error: --proxy requires a URL value');
    process.exit(1);
}

// --- Handle daemon actions ---

if (argv.daemonAction) {
    const { stopDaemon } = await import('./daemon.js');
    const { createLogger } = await import('./logger.js');
    const logger = createLogger();

    if (argv.daemonAction === 'stop') {
        await stopDaemon(logger);
        process.exit(0);
    } else if (argv.daemonAction === 'status') {
        const { readPid, isProcessRunning } = await import('./daemon.js');
        const pid = readPid();
        if (pid && isProcessRunning(pid)) {
            console.log(`Daemon running (PID: ${pid})`);
        } else {
            console.log('Daemon not running');
        }
        process.exit(0);
    } else if (argv.daemonAction === 'logs') {
        const fs = await import('node:fs');
        try {
            const content = fs.readFileSync('daemon.log', 'utf-8');
            console.log(content);
        } catch {
            console.error('No daemon log file found');
        }
        process.exit(0);
    }
}

// --- Run main pipeline ---

try {
    await main(argv);
} catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
}
