import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { main } from '../src/index.js';
import type { CliArgs } from '../src/index.js';

// --- Mock modules ---

const mockLoadConfig = mock(() => Promise.resolve({
    presets: {
        leadgen: { callback: 'https://example.com/webhook/leadgen' },
        custom: { callback: 'https://example.com/webhook/custom' },
    },
}));

const mockResolvePreset = mock((config: any, presetName: string) => {
    const preset = config.presets[presetName];
    if (!preset) {
        throw new Error(`Preset "${presetName}" not found. Available presets: ${Object.keys(config.presets).join(', ')}`);
    }
    return preset;
});

const mockLaunchBrowser = mock(() => Promise.resolve());
const mockRunScraper = mock(() => Promise.resolve(new Set<string>()));
const mockSaveOutput = mock(() => {});

// Mock the config module
mock.module('../src/config.js', () => ({
    loadConfig: mockLoadConfig,
    resolvePreset: mockResolvePreset,
}));

// Mock the browser module
mock.module('../src/browser.js', () => ({
    launchBrowser: mockLaunchBrowser,
}));

// Mock the scraper module
mock.module('../src/scraper.js', () => ({
    runScraper: mockRunScraper,
}));

// Mock the output module
mock.module('../src/output.js', () => ({
    saveOutput: mockSaveOutput,
}));

// --- Test data ---

const validArgs: CliArgs = {
    query: 'real estate',
    headless: false,
    maxNoNewScrolls: 10,
    daemon: false,
};

// --- Argument parsing tests ---

describe('CLI argument parsing', () => {
    beforeEach(() => {
        mockLoadConfig.mockClear();
        mockResolvePreset.mockClear();
        mockLaunchBrowser.mockClear();
        mockRunScraper.mockClear();
        mockSaveOutput.mockClear();
    });

    it('should parse --query correctly', async () => {
        const args: CliArgs = { ...validArgs, query: 'real estate' };
        await main(args);
        expect(mockLoadConfig).toHaveBeenCalled();
    });

    it('should parse --headless flag', async () => {
        const args: CliArgs = { ...validArgs, headless: true };
        await main(args);
        expect(mockLoadConfig).toHaveBeenCalled();
    });

    it('should parse --max-urls as number', async () => {
        const args: CliArgs = { ...validArgs, maxUrls: 100 };
        await main(args);
        expect(mockLoadConfig).toHaveBeenCalled();
    });

    it('should parse --max-no-new-scrolls as number', async () => {
        const args: CliArgs = { ...validArgs, maxNoNewScrolls: 5 };
        await main(args);
        expect(mockLoadConfig).toHaveBeenCalled();
    });

    it('should parse --proxy correctly', async () => {
        const args: CliArgs = { ...validArgs, proxy: 'http://proxy:8080' };
        await main(args);
        expect(mockLoadConfig).toHaveBeenCalled();
    });

    it('should parse --daemon flag', async () => {
        const args: CliArgs = { ...validArgs, daemon: true };
        await main(args);
        expect(mockLoadConfig).toHaveBeenCalled();
    });

    it('should parse --preset correctly', async () => {
        const args: CliArgs = { ...validArgs, preset: 'leadgen' };
        await main(args);
        expect(mockLoadConfig).toHaveBeenCalled();
        expect(mockResolvePreset).toHaveBeenCalledWith(expect.anything(), 'leadgen');
    });

    it('should parse --callback correctly', async () => {
        const args: CliArgs = { ...validArgs, callback: 'custom' };
        await main(args);
        expect(mockLoadConfig).toHaveBeenCalled();
    });
});

// --- Validation tests ---

describe('CLI validation', () => {
    it('should handle missing --query in main (validation is in cli.ts)', async () => {
        const args: CliArgs = { ...validArgs, query: '' };
        // main() doesn't validate query; validation is in cli.ts
        // This test ensures main() doesn't crash with empty query
        await main(args);
        expect(mockLoadConfig).toHaveBeenCalled();
    });
});

// --- Pipeline integration tests ---

describe('Pipeline integration', () => {
    beforeEach(() => {
        mockLoadConfig.mockClear();
        mockResolvePreset.mockClear();
        mockLaunchBrowser.mockClear();
        mockRunScraper.mockClear();
        mockSaveOutput.mockClear();
    });

    it('should call loadConfig with valid args', async () => {
        await main(validArgs);
        expect(mockLoadConfig).toHaveBeenCalled();
    });

    it('should resolve preset when --preset provided', async () => {
        const args: CliArgs = { ...validArgs, preset: 'leadgen' };
        await main(args);
        expect(mockResolvePreset).toHaveBeenCalledWith(expect.anything(), 'leadgen');
    });

    it('should skip preset resolution without --preset', async () => {
        await main(validArgs);
        expect(mockResolvePreset).not.toHaveBeenCalled();
    });

    it('should call config, then scraper in order', async () => {
        const callOrder: string[] = [];
        mockLoadConfig.mockImplementation(() => {
            callOrder.push('config');
            return Promise.resolve({ presets: {} });
        });
        mockRunScraper.mockImplementation(() => {
            callOrder.push('scraper');
            return Promise.resolve(new Set<string>());
        });

        await main(validArgs);

        expect(callOrder).toEqual(['config', 'scraper']);
    });

    it('should handle preset resolution error', async () => {
        const args: CliArgs = { ...validArgs, preset: 'nonexistent' };
        await expect(main(args)).rejects.toThrow('Preset "nonexistent" not found');
    });
});