import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import { join } from 'path';
import { PID_FILE, LOG_FILE, handleStop, handleStatus, handleLogs } from '../../src/daemon-actions.js';

const testDir = '/tmp/facebook-scraper-test';
const PID_FILE_PATH = join(testDir, PID_FILE);
const LOG_FILE_PATH = join(testDir, LOG_FILE);

describe('daemon-actions.ts', () => {
    beforeEach(async () => {
        await fs.promises.mkdir(testDir, { recursive: true });
        try { fs.unlinkSync(PID_FILE_PATH); } catch {}
        try { fs.unlinkSync(LOG_FILE_PATH); } catch {}
    });

    afterEach(async () => {
        try { fs.unlinkSync(PID_FILE_PATH); } catch {}
        try { fs.unlinkSync(LOG_FILE_PATH); } catch {}
        try { await fs.promises.rm(testDir, { recursive: true, force: true }); } catch {}
    });

    describe('constants', () => {
        it('PID_FILE is .daemon.pid', () => {
            expect(PID_FILE).toBe('.daemon.pid');
        });

        it('LOG_FILE is .daemon.log', () => {
            expect(LOG_FILE).toBe('.daemon.log');
        });
    });

    describe('handleStatus', () => {
        it('prints "Daemon not running" when no PID file exists', () => {
            const logs: string[] = [];
            const origLog = console.log;
            console.log = (...args: unknown[]) => logs.push(args.join(' '));

            handleStatus({ pidFile: PID_FILE_PATH });

            console.log = origLog;
            expect(logs.some(l => l.includes('Daemon not running'))).toBe(true);
        });
    });

    describe('handleStop', () => {
        it('prints warning when no daemon running', async () => {
            const logs: string[] = [];
            const origLog = console.log;
            console.log = (...args: unknown[]) => logs.push(args.join(' '));

            await handleStop({ pidFile: PID_FILE_PATH });

            console.log = origLog;
            expect(logs.some(l => l.includes('Daemon not running'))).toBe(true);
        });
    });

    describe('handleLogs', () => {
        it('prints "No daemon log file found" when log file missing', () => {
            const logs: string[] = [];
            const origLog = console.log;
            console.log = (...args: unknown[]) => logs.push(args.join(' '));

            handleLogs({ logFile: LOG_FILE_PATH });

            console.log = origLog;
            expect(logs.some(l => l.includes('No daemon log file found'))).toBe(true);
        });

        it('prints log contents when log file exists', () => {
            fs.writeFileSync(LOG_FILE_PATH, 'test log line\n');
            const logs: string[] = [];
            const origLog = console.log;
            console.log = (...args: unknown[]) => logs.push(args.join(' '));

            handleLogs({ logFile: LOG_FILE_PATH });

            console.log = origLog;
            expect(logs.some(l => l.includes('test log line'))).toBe(true);
        });

        it('prints "empty" message when log file is empty', () => {
            fs.writeFileSync(LOG_FILE_PATH, '');
            const logs: string[] = [];
            const origLog = console.log;
            console.log = (...args: unknown[]) => logs.push(args.join(' '));

            handleLogs({ logFile: LOG_FILE_PATH });

            console.log = origLog;
            expect(logs.some(l => l.includes('empty'))).toBe(true);
        });
    });
});
