// --- Main entry stub ---

import { loadConfig, resolvePreset } from './config.js';
import { launchBrowser } from './browser.js';
import { runScraper } from './scraper.js';
import { saveOutput } from './output.js';

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

export async function main(argv: CliArgs) {
    console.log(`Query: ${argv.query}`);
    console.log(`Max URLs: ${argv.maxUrls === undefined ? 'unlimited' : argv.maxUrls}`);
    console.log(`Output file: output.json`);
    console.log(`Launching Cloak browser...\n`);

    // Load configuration
    const config = await loadConfig();

    // Resolve preset if provided
    let callbackUrl = '';
    if (argv.preset) {
        const preset = resolvePreset(config, argv.preset);
        callbackUrl = preset.callback;
        console.log(`Using preset: ${argv.preset} (${callbackUrl})`);
    }

    // Run pipeline stubs
    await launchBrowser();
    await runScraper();
    saveOutput();

    console.log('\nPipeline complete (stubs — real implementation in Phase 2)');
}
