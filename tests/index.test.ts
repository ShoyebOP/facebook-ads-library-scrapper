import { describe, it, expect, mock, beforeEach } from 'bun:test';

// --- Mock setup ---

// Mock logger
const mockLogger = {
    info: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
    warn: mock(() => {}),
    child: mock(() => mockLogger),
};
const mockCreateLogger = mock(() => mockLogger);
const mockCreateChildLogger = mock(() => mockLogger);
mock.module('../src/logger.js', () => ({
    createLogger: mockCreateLogger,
    createChildLogger: mockCreateChildLogger,
}));

// Mock config
const mockLoadConfig = mock(() => Promise.resolve({
    presets: {
        leadgen: { callback: 'https://example.com/webhook/leadgen' },
    },
}));
const mockResolvePreset = mock(() => ({ callback: 'https://example.com/webhook/leadgen' }));
mock.module('../src/config.js', () => ({
    loadConfig: mockLoadConfig,
    resolvePreset: mockResolvePreset,
}));

// Mock browser
const mockClose = mock(() => Promise.resolve());
const mockLaunchBrowser = mock(() => Promise.resolve({ close: mockClose, newPage: mock(() => Promise.resolve()) }));
mock.module('../src/browser.js', () => ({
    launchBrowser: mockLaunchBrowser,
}));

// Mock scraper
const mockRunScraper = mock(() => Promise.resolve(new Set(['https://facebook.com/profile/1', 'https://facebook.com/profile/2'])));
mock.module('../src/scraper.js', () => ({
    runScraper: mockRunScraper,
}));

// Mock output
const mockSaveOutput = mock(() => {});
mock.module('../src/output.js', () => ({
    saveOutput: mockSaveOutput,
}));

// --- Tests ---

describe('main pipeline', () => {
    beforeEach(() => {
        mockCreateLogger.mockClear();
        mockLoadConfig.mockClear();
        mockResolvePreset.mockClear();
        mockRunScraper.mockClear();
        mockLogger.info.mockClear();
    });

    it('creates logger with pino', async () => {
        const { main } = await import('../src/index.js');

        await main({
            query: 'test',
            maxNoNewScrolls: 10,
            headless: true,
            daemon: false,
        });

        expect(mockCreateLogger).toHaveBeenCalled();
    });

    it('loads config', async () => {
        const { main } = await import('../src/index.js');

        await main({
            query: 'test',
            maxNoNewScrolls: 10,
            headless: true,
            daemon: false,
        });

        expect(mockLoadConfig).toHaveBeenCalled();
    });

    it('resolves preset if provided', async () => {
        const { main } = await import('../src/index.js');

        await main({
            query: 'test',
            preset: 'leadgen',
            maxNoNewScrolls: 10,
            headless: true,
            daemon: false,
        });

        expect(mockResolvePreset).toHaveBeenCalledWith(
            expect.anything(),
            'leadgen',
        );
    });

    it('calls runScraper with ScraperOptions', async () => {
        const { main } = await import('../src/index.js');

        await main({
            query: 'test query',
            maxUrls: 50,
            maxNoNewScrolls: 10,
            headless: true,
            proxy: 'http://proxy:8080',
            daemon: false,
        });

        expect(mockRunScraper).toHaveBeenCalledWith(
            expect.objectContaining({
                query: 'test query',
                maxUrls: 50,
                maxNoNewScrolls: 10,
                headless: true,
                proxy: 'http://proxy:8080',
            }),
        );
    });

    it('logs completion with URL count', async () => {
        const { main } = await import('../src/index.js');

        await main({
            query: 'test',
            maxNoNewScrolls: 10,
            headless: true,
            daemon: false,
        });

        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('2'),
        );
    });

    it('returns Set of URLs', async () => {
        const { main } = await import('../src/index.js');

        const result = await main({
            query: 'test',
            maxNoNewScrolls: 10,
            headless: true,
            daemon: false,
        });

        expect(result).toBeInstanceOf(Set);
        expect(result.size).toBe(2);
    });
});
