import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import pino from 'pino';

const logger = pino({ level: 'silent' });
const tmpDir = '/tmp/output-test';

describe('output.ts', () => {
    beforeEach(async () => {
        await mkdir(tmpDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(tmpDir, { recursive: true, force: true });
    });

    describe('generateOutputPath', () => {
        it('returns a string ending with .json', async () => {
            const mod = await import('../../src/output.js');
            const result = mod.generateOutputPath({ query: 'test', logger });
            expect(typeof result).toBe('string');
            expect(result).toEndWith('.json');
        });

        it('contains output/ directory prefix by default', async () => {
            const mod = await import('../../src/output.js');
            const result = mod.generateOutputPath({ query: 'test', logger });
            expect(result).toContain('output/');
        });

        it('replaces spaces with underscores in query', async () => {
            const mod = await import('../../src/output.js');
            const result = mod.generateOutputPath({
                query: 'real estate',
                logger,
            });
            expect(result).toContain('real_estate');
        });

        it('uses custom outputDir when provided', async () => {
            const mod = await import('../../src/output.js');
            const result = mod.generateOutputPath({
                query: 'test',
                outputDir: tmpDir,
                logger,
            });
            expect(result).toContain(tmpDir);
        });

        it('timestamp matches DD-MM-YYYY:HH:MM pattern', async () => {
            const mod = await import('../../src/output.js');
            const result = mod.generateOutputPath({ query: 'test', logger });
            const filename = result.split('/').pop();
            expect(filename).toMatch(
                /^\d{2}-\d{2}-\d{4}:\d{2}-\d{2}\.test\.json$/,
            );
        });
    });

    describe('ensureOutputDir', () => {
        it('creates directory if missing', async () => {
            const mod = await import('../../src/output.js');
            const dir = join(tmpDir, 'new-dir');
            await mod.ensureOutputDir(dir);
            expect(existsSync(dir)).toBe(true);
        });

        it('does not throw if directory already exists', async () => {
            const mod = await import('../../src/output.js');
            await mod.ensureOutputDir(tmpDir);
            await mod.ensureOutputDir(tmpDir);
        });
    });

    describe('saveUrlsToFile', () => {
        it('writes valid JSON array to file', async () => {
            const mod = await import('../../src/output.js');
            const filePath = join(tmpDir, 'test.json');
            const urls = new Set(['https://fb.com/a', 'https://fb.com/b']);

            mod.saveUrlsToFile(filePath, urls);

            const content = await readFile(filePath, 'utf-8');
            const parsed = JSON.parse(content);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed).toContain('https://fb.com/a');
            expect(parsed).toContain('https://fb.com/b');
        });

        it('overwrites existing file (not appends)', async () => {
            const mod = await import('../../src/output.js');
            const filePath = join(tmpDir, 'test.json');

            mod.saveUrlsToFile(filePath, new Set(['https://fb.com/old']));
            mod.saveUrlsToFile(filePath, new Set(['https://fb.com/new']));

            const content = await readFile(filePath, 'utf-8');
            const parsed = JSON.parse(content);
            expect(parsed).toEqual(['https://fb.com/new']);
        });
    });

    describe('createIncrementalSaver', () => {
        it('does NOT save when new URLs below threshold', async () => {
            const mod = await import('../../src/output.js');
            const filePath = join(tmpDir, 'incr.json');
            const saver = mod.createIncrementalSaver({
                outputFile: filePath,
                saveInterval: 3,
            });

            saver(new Set(['https://fb.com/a']));

            expect(existsSync(filePath)).toBe(false);
        });

        it('saves when accumulated URLs reach threshold', async () => {
            const mod = await import('../../src/output.js');
            const filePath = join(tmpDir, 'incr.json');
            const saver = mod.createIncrementalSaver({
                outputFile: filePath,
                saveInterval: 2,
            });

            saver(new Set(['https://fb.com/a', 'https://fb.com/b']));

            expect(existsSync(filePath)).toBe(true);
            const content = await readFile(filePath, 'utf-8');
            const parsed = JSON.parse(content);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBe(2);
        });

        it('does NOT re-save when no new URLs added', async () => {
            const mod = await import('../../src/output.js');
            const filePath = join(tmpDir, 'incr.json');
            const saver = mod.createIncrementalSaver({
                outputFile: filePath,
                saveInterval: 1,
            });

            saver(new Set(['https://fb.com/a']));
            const content1 = await readFile(filePath, 'utf-8');

            saver(new Set(['https://fb.com/a']));
            const content2 = await readFile(filePath, 'utf-8');

            expect(content1).toBe(content2);
        });
    });

    describe('edge cases', () => {
        it('handles empty URLs set', async () => {
            const mod = await import('../../src/output.js');
            const filePath = join(tmpDir, 'empty.json');
            mod.saveUrlsToFile(filePath, new Set());

            const content = await readFile(filePath, 'utf-8');
            const parsed = JSON.parse(content);
            expect(parsed).toEqual([]);
        });

        it('generateOutputPath with special characters in query', async () => {
            const mod = await import('../../src/output.js');
            const result = mod.generateOutputPath({ query: 'test@#$%', logger });
            expect(result).toContain('test@#$%');
            expect(result).toEndWith('.json');
        });
    });
});
