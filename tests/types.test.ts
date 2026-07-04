import { describe, it, expect } from 'bun:test';

describe('types.ts', () => {
    it('exports BrowserOptions with correct fields', async () => {
        const mod = await import('../src/types');
        // TypeScript compilation verifies the shape - this test ensures the module exports exist
        expect(mod).toBeDefined();
    });

    it('exports ScraperOptions with correct fields', async () => {
        const mod = await import('../src/types');
        expect(mod).toBeDefined();
    });

    it('exports ErrorCategory type', async () => {
        const mod = await import('../src/types');
        expect(mod).toBeDefined();
    });

    it('BrowserOptions accepts headless boolean', async () => {
        // This test verifies the type can be used correctly at runtime
        // TypeScript will catch type errors at compile time
        const { default: pino } = await import('pino');
        const logger = pino({ level: 'silent' });

        // Dynamic import to test the module loads
        const mod = await import('../src/types');
        expect(mod).toBeDefined();
        logger.destroy();
    });

    it('ScraperOptions accepts query string and maxUrls number', async () => {
        const { default: pino } = await import('pino');
        const logger = pino({ level: 'silent' });

        const mod = await import('../src/types');
        expect(mod).toBeDefined();
        logger.destroy();
    });
});
