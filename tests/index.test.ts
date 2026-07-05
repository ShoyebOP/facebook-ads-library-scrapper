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
const mockGenerateOutputPath = mock(() => 'output/05-07-2026:10-53.test.json');
const mockEnsureOutputDir = mock(() => Promise.resolve());
const mockSaveUrlsToFile = mock(() => {});
mock.module('../src/output.js', () => ({
    generateOutputPath: mockGenerateOutputPath,
    ensureOutputDir: mockEnsureOutputDir,
    saveUrlsToFile: mockSaveUrlsToFile,
}));

// Mock webhook
const mockResolveEndpoint = mock(() => 'https://example.com/webhook/leadgen');
const mockNotifyWebhook = mock(() => Promise.resolve());
mock.module('../src/webhook.js', () => ({
    resolveEndpoint: mockResolveEndpoint,
    notifyWebhook: mockNotifyWebhook,
}));

// --- Tests ---

describe('main pipeline', () => {
    beforeEach(() => {
        mockCreateLogger.mockClear();
        mockLoadConfig.mockClear();
        mockResolvePreset.mockClear();
        mockRunScraper.mockClear();
        mockLogger.info.mockClear();
        mockGenerateOutputPath.mockClear();
        mockEnsureOutputDir.mockClear();
        mockSaveUrlsToFile.mockClear();
        mockResolveEndpoint.mockClear();
        mockNotifyWebhook.mockClear();
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

    it('generates output path with query', async () => {
        const { main } = await import('../src/index.js');

        await main({
            query: 'test',
            maxNoNewScrolls: 10,
            headless: true,
            daemon: false,
        });

        expect(mockGenerateOutputPath).toHaveBeenCalledWith(
            expect.objectContaining({ query: 'test' }),
        );
    });

    it('ensures output directory before saving', async () => {
        const { main } = await import('../src/index.js');

        await main({
            query: 'test',
            maxNoNewScrolls: 10,
            headless: true,
            daemon: false,
        });

        expect(mockEnsureOutputDir).toHaveBeenCalledWith('output');
    });

    it('saves URLs to file before sending webhook', async () => {
        const { main } = await import('../src/index.js');

        await main({
            query: 'test',
            preset: 'leadgen',
            maxNoNewScrolls: 10,
            headless: true,
            daemon: false,
        });

        // File save should have been called
        expect(mockSaveUrlsToFile).toHaveBeenCalled();

        // Webhook should have been called
        expect(mockNotifyWebhook).toHaveBeenCalled();
    });

    it('sends webhook when preset is provided', async () => {
        const { main } = await import('../src/index.js');

        await main({
            query: 'test',
            preset: 'leadgen',
            maxNoNewScrolls: 10,
            headless: true,
            daemon: false,
        });

        expect(mockNotifyWebhook).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://example.com/webhook/leadgen',
                payload: expect.objectContaining({
                    query: 'test',
                    count: 2,
                }),
            }),
        );
    });

    it('does NOT send webhook when no preset provided', async () => {
        const { main } = await import('../src/index.js');

        await main({
            query: 'test',
            maxNoNewScrolls: 10,
            headless: true,
            daemon: false,
        });

        expect(mockNotifyWebhook).not.toHaveBeenCalled();
    });
});
