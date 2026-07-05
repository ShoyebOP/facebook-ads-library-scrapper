import { describe, it, expect } from 'bun:test';
import { existsSync, readFileSync } from 'fs';

describe('Project setup', () => {
    it('tsconfig.json exists', () => {
        expect(existsSync('tsconfig.json')).toBe(true);
    });

    it('tsconfig.json has moduleResolution: bundler', () => {
        const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf-8'));
        expect(tsconfig.compilerOptions.moduleResolution).toBe('bundler');
    });

    it('tsconfig.json has types: ["bun"]', () => {
        const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf-8'));
        expect(tsconfig.compilerOptions.types).toEqual(['bun']);
    });

    it('tsconfig.json has strict: true', () => {
        const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf-8'));
        expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it('biome.json exists', () => {
        expect(existsSync('biome.json')).toBe(true);
    });

    it('biome.json has formatter config', () => {
        const biome = JSON.parse(readFileSync('biome.json', 'utf-8'));
        expect(biome.formatter.enabled).toBe(true);
        expect(biome.formatter.indentStyle).toBe('space');
        expect(biome.formatter.indentWidth).toBe(4);
    });

    it('config.example.json exists', () => {
        expect(existsSync('config.example.json')).toBe(true);
    });

    it('config.example.json is valid JSON', () => {
        const config = JSON.parse(readFileSync('config.example.json', 'utf-8'));
        expect(config).toBeDefined();
        expect(config.presets).toBeDefined();
    });

    it('package.json has correct scripts', () => {
        const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
        expect(pkg.scripts.test).toBe('bun test');
        expect(pkg.scripts.lint).toBe('bunx biome check ./src');
        expect(pkg.scripts.typecheck).toBe('bun run tsc --noEmit');
    });

    it('package.json has type: module', () => {
        const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
        expect(pkg.type).toBe('module');
    });
});

describe('src/ module exports', () => {
    it('src/config.ts exports loadConfig', async () => {
        const mod = await import('../src/config');
        expect(typeof mod.loadConfig).toBe('function');
    });

    it('src/browser.ts exports launchBrowser', async () => {
        const mod = await import('../src/browser');
        expect(typeof mod.launchBrowser).toBe('function');
    });

    it('src/scraper.ts exports runScraper', async () => {
        const mod = await import('../src/scraper');
        expect(typeof mod.runScraper).toBe('function');
    });

    it('src/output.ts exports generateOutputPath', async () => {
        const mod = await import('../src/output');
        expect(typeof mod.generateOutputPath).toBe('function');
    });

    it('src/webhook.ts exports notifyWebhook', async () => {
        const mod = await import('../src/webhook');
        expect(typeof mod.notifyWebhook).toBe('function');
    });

    it('src/webhook.ts exports resolveEndpoint', async () => {
        const mod = await import('../src/webhook');
        expect(typeof mod.resolveEndpoint).toBe('function');
    });

    it('src/index.ts exports main', async () => {
        const mod = await import('../src/index');
        expect(typeof mod.main).toBe('function');
    });
});
