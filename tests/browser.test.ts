import { describe, it, expect, mock, beforeEach } from 'bun:test';
import pino from 'pino';

// --- Mock cloakbrowser ---
const mockLaunch = mock(() =>
    Promise.resolve({
        newPage: mock(() => Promise.resolve({})),
        close: mock(() => Promise.resolve()),
    })
);

mock.module('cloakbrowser', () => ({
    launch: mockLaunch,
}));

describe('browser.ts', () => {
    beforeEach(() => {
        mockLaunch.mockClear();
    });

    it('launchBrowser calls cloakbrowser launch with headless option', async () => {
        const { launchBrowser } = await import('../src/browser');
        const logger = pino({ level: 'silent' });

        await launchBrowser({ headless: true, logger });

        expect(mockLaunch).toHaveBeenCalledWith(
            expect.objectContaining({
                headless: true,
            })
        );
        logger.destroy();
    });

    it('launchBrowser sets humanize: true and human_preset: careful (D-02, D-04)', async () => {
        const { launchBrowser } = await import('../src/browser');
        const logger = pino({ level: 'silent' });

        await launchBrowser({ headless: true, logger });

        expect(mockLaunch).toHaveBeenCalledWith(
            expect.objectContaining({
                humanize: true,
                human_preset: 'careful',
            })
        );
        logger.destroy();
    });

    it('launchBrowser includes stealth_args: true (D-04)', async () => {
        const { launchBrowser } = await import('../src/browser');
        const logger = pino({ level: 'silent' });

        await launchBrowser({ headless: true, logger });

        expect(mockLaunch).toHaveBeenCalledWith(
            expect.objectContaining({
                stealth_args: true,
            })
        );
        logger.destroy();
    });

    it('launchBrowser includes proxy when provided (D-03)', async () => {
        const { launchBrowser } = await import('../src/browser');
        const logger = pino({ level: 'silent' });

        await launchBrowser({
            headless: true,
            proxy: 'http://user:pass@host:1080',
            logger,
        });

        expect(mockLaunch).toHaveBeenCalledWith(
            expect.objectContaining({
                proxy: 'http://user:pass@host:1080',
            })
        );
        logger.destroy();
    });

    it('launchBrowser does not include proxy when not provided', async () => {
        const { launchBrowser } = await import('../src/browser');
        const logger = pino({ level: 'silent' });

        await launchBrowser({ headless: true, logger });

        const callArgs = mockLaunch.mock.calls[0][0];
        expect(callArgs.proxy).toBeUndefined();
        logger.destroy();
    });

    it('launchBrowser includes locale and timezone when provided (D-06)', async () => {
        const { launchBrowser } = await import('../src/browser');
        const logger = pino({ level: 'silent' });

        await launchBrowser({
            headless: true,
            locale: 'bn-BD',
            timezone: 'Asia/Dhaka',
            logger,
        });

        expect(mockLaunch).toHaveBeenCalledWith(
            expect.objectContaining({
                locale: 'bn-BD',
                timezone: 'Asia/Dhaka',
            })
        );
        logger.destroy();
    });

    it('launchBrowser uses fallback locale and timezone (D-06)', async () => {
        const { launchBrowser } = await import('../src/browser');
        const logger = pino({ level: 'silent' });

        await launchBrowser({ headless: true, logger });

        expect(mockLaunch).toHaveBeenCalledWith(
            expect.objectContaining({
                locale: 'en-US',
                timezone: 'Asia/Dhaka',
            })
        );
        logger.destroy();
    });

    it('launchBrowser logs error and re-throws on failure (D-07)', async () => {
        const { launchBrowser } = await import('../src/browser');
        const logger = pino({ level: 'silent' });

        // Make launch fail
        mockLaunch.mockRejectedValueOnce(new Error('Browser launch failed'));

        await expect(
            launchBrowser({ headless: true, logger })
        ).rejects.toThrow('Browser launch failed');
        logger.destroy();
    });

    it('launchBrowser returns Browser instance on success', async () => {
        const { launchBrowser } = await import('../src/browser');
        const logger = pino({ level: 'silent' });

        const browser = await launchBrowser({ headless: true, logger });

        expect(browser).toBeDefined();
        expect(browser).toHaveProperty('newPage');
        expect(browser).toHaveProperty('close');
        logger.destroy();
    });
});
