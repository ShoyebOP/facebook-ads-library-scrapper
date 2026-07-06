// --- Output handler — timestamped JSON file writing with incremental saves ---

import { mkdir } from 'node:fs/promises';
import type { IncrementalSaverOptions, OutputOptions } from './types.js';

// --- Zero-padding helper (matching scraper.js:45-47) ---

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

// --- Generate timestamped output path: output/DD-MM-YYYY:HH:MM.query.json (D-02) ---

export function generateOutputPath(options: OutputOptions): string {
    const now = new Date();
    const dir = options.outputDir ?? 'output';
    const sanitizedQuery = options.query.replace(/ /g, '_');
    const filename = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}:${pad(now.getHours())}-${pad(now.getMinutes())}.${sanitizedQuery}.json`;
    return `${dir}/${filename}`;
}

// --- Ensure output directory exists, create if missing (D-03) ---

export async function ensureOutputDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
}

// --- Save URLs to JSON file (D-01, D-04) — overwrite semantics ---

export function saveUrlsToFile(filePath: string, urls: Set<string>): void {
    const data = [...urls];
    Bun.write(filePath, JSON.stringify(data, null, 2));
}

// --- Create incremental saver that triggers at threshold (D-05, D-06, D-08) ---

export function createIncrementalSaver(
    options: IncrementalSaverOptions,
): (urls: Set<string>) => void {
    const saveInterval = options.saveInterval ?? 100;
    let lastSaveCount = 0;

    return (urls: Set<string>): void => {
        if (urls.size - lastSaveCount >= saveInterval) {
            saveUrlsToFile(options.outputFile, urls);
            lastSaveCount = urls.size;
        }
    };
}
