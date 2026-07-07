// --- Integration tests for daemon log file piping ---

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import { join } from 'path';
import { LOG_FILE } from '../../src/daemon.js';

const testDir = '/tmp/facebook-scraper-test';

describe('daemon log piping', () => {
    beforeEach(async () => {
        await fs.promises.mkdir(testDir, { recursive: true });
        try { fs.unlinkSync(join(testDir, LOG_FILE)); } catch {}
    });

    afterEach(async () => {
        try { fs.unlinkSync(join(testDir, LOG_FILE)); } catch {}
        try { await fs.promises.rm(testDir, { recursive: true, force: true }); } catch {}
    });

    describe('LOG_FILE constant', () => {
        it('LOG_FILE equals .daemon.log', () => {
            expect(LOG_FILE).toBe('.daemon.log');
        });
    });

    describe('log file creation', () => {
        it('can create .daemon.log file via createWriteStream', async () => {
            const logPath = join(testDir, LOG_FILE);
            const stream = fs.createWriteStream(logPath, { flags: 'a' });
            stream.write('test log output\n');
            stream.end();

            await new Promise<void>((resolve) => {
                stream.on('finish', resolve);
            });

            expect(fs.existsSync(logPath)).toBe(true);
            const content = fs.readFileSync(logPath, 'utf-8');
            expect(content).toContain('test log output');
        });

        it('log file accumulates writes with append flag', async () => {
            const logPath = join(testDir, LOG_FILE);

            const stream1 = fs.createWriteStream(logPath, { flags: 'a' });
            stream1.write('line 1\n');
            stream1.end();
            await new Promise<void>((resolve) => stream1.on('finish', resolve));

            const stream2 = fs.createWriteStream(logPath, { flags: 'a' });
            stream2.write('line 2\n');
            stream2.end();
            await new Promise<void>((resolve) => stream2.on('finish', resolve));

            const content = fs.readFileSync(logPath, 'utf-8');
            expect(content).toContain('line 1');
            expect(content).toContain('line 2');
        });

        it('daemon log file is empty by default', () => {
            expect(fs.existsSync(join(testDir, LOG_FILE))).toBe(false);
        });
    });
});
