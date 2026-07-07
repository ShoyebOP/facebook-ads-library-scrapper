import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import { join } from 'path';
import { PID_FILE, LOG_FILE, handleStop, handleStatus, handleLogs } from '../../src/daemon-actions.js';

const testDir = '/tmp/facebook-scraper-test';

describe('daemon-actions.ts', () => {
    beforeEach(async () => {
        await fs.promises.mkdir(testDir, { recursive: true });
        // Clean up any existing PID/LOG files
        try { fs.unlinkSync(join(testDir, PID_FILE)); } catch {}
        try { fs.unlinkSync(join(testDir, LOG_FILE)); } catch {}
        // Also clean CWD (in case tests left artifacts before)
        try { fs.unlinkSync(PID_FILE); } catch {}
        try { fs.unlinkSync(LOG_FILE); } catch {}
    });

    afterEach(async () => {
        // Clean up
        try { fs.unlinkSync(join(testDir, PID_FILE)); } catch {}
        try { fs.unlinkSync(join(testDir, LOG_FILE)); } catch {}
        try { fs.unlinkSync(PID_FILE); } catch {}
        try { fs.unlinkSync(LOG_FILE); } catch {}
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

            handleStatus();

            console.log = origLog;
            expect(logs.some(l => l.includes('Daemon not running'))).toBe(true);
        });
    });

    describe('handleStop', () => {
        it('prints warning when no daemon running', () => {
            const logs: string[] = [];
            const origLog = console.log;
            console.log = (...args: unknown[]) => logs.push(args.join(' '));

            handleStop();

            console.log = origLog;
            expect(logs.some(l => l.includes('Daemon not running'))).toBe(true);
        });
    });

    describe('handleLogs', () => {
        it('prints "No daemon log file found" when log file missing', () => {
            const logs: string[] = [];
            const origLog = console.log;
            console.log = (...args: unknown[]) => logs.push(args.join(' '));

            handleLogs();

            console.log = origLog;
            expect(logs.some(l => l.includes('No daemon log file found'))).toBe(true);
        });

        it('prints log contents when log file exists', () => {
            fs.writeFileSync(LOG_FILE, 'test log line\n');
            const logs: string[] = [];
            const origLog = console.log;
            console.log = (...args: unknown[]) => logs.push(args.join(' '));

            handleLogs();

            console.log = origLog;
            expect(logs.some(l => l.includes('test log line'))).toBe(true);
        });

        it('prints "empty" message when log file is empty', () => {
            fs.writeFileSync(LOG_FILE, '');
            const logs: string[] = [];
            const origLog = console.log;
            console.log = (...args: unknown[]) => logs.push(args.join(' '));

            handleLogs();

            console.log = origLog;
            expect(logs.some(l => l.includes('empty'))).toBe(true);
        });
    });
});
