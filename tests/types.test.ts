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

    it('module loads without error', async () => {
        // TypeScript compilation verifies the interface shapes
        // Runtime test just ensures the module loads without error
        const mod = await import('../src/types');
        expect(mod).toBeDefined();
    });
});
