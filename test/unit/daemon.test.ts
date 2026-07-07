import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import { PID_FILE, LOG_FILE, writePid, readPid, removePidFile, isProcessRunning } from '../../src/daemon.js';

const testDir = '/tmp/daemon-unit-test';

describe('daemon.ts', () => {
    beforeEach(async () => {
        await fs.promises.mkdir(testDir, { recursive: true });
        // Clean up any existing PID files
        try { fs.unlinkSync(PID_FILE); } catch {}
        try { fs.unlinkSync(LOG_FILE); } catch {}
    });

    afterEach(async () => {
        // Clean up
        try { fs.unlinkSync(PID_FILE); } catch {}
        try { fs.unlinkSync(LOG_FILE); } catch {}
        try { await fs.promises.rm(testDir, { recursive: true, force: true }); } catch {}
    });

    describe('writePid', () => {
        it('writes PID number to .daemon.pid file', () => {
            writePid(12345);
            expect(fs.existsSync(PID_FILE)).toBe(true);
            const content = fs.readFileSync(PID_FILE, 'utf-8');
            expect(content).toBe('12345');
        });

        it('overwrites existing PID file', () => {
            writePid(11111);
            writePid(22222);
            const content = fs.readFileSync(PID_FILE, 'utf-8');
            expect(content).toBe('22222');
        });
    });

    describe('readPid', () => {
        it('returns null when PID file does not exist', () => {
            const result = readPid();
            expect(result).toBeNull();
        });

        it('returns parsed PID number from file', () => {
            writePid(99999);
            const result = readPid();
            expect(result).toBe(99999);
        });

        it('returns null for empty file', () => {
            fs.writeFileSync(PID_FILE, '');
            const result = readPid();
            expect(result).toBeNull();
        });

        it('trims whitespace from PID file', () => {
            fs.writeFileSync(PID_FILE, '  12345  \n');
            const result = readPid();
            expect(result).toBe(12345);
        });
    });

    describe('removePidFile', () => {
        it('deletes PID file silently', () => {
            writePid(12345);
            expect(fs.existsSync(PID_FILE)).toBe(true);
            removePidFile();
            expect(fs.existsSync(PID_FILE)).toBe(false);
        });

        it('does not throw when PID file does not exist', () => {
            expect(() => removePidFile()).not.toThrow();
        });
    });

    describe('isProcessRunning', () => {
        it('returns true for current process', () => {
            const result = isProcessRunning(process.pid);
            expect(result).toBe(true);
        });

        it('returns false for non-existent PID', () => {
            const result = isProcessRunning(99999999);
            expect(result).toBe(false);
        });
    });

    describe('PID file constants', () => {
        it('PID_FILE is .daemon.pid', () => {
            expect(PID_FILE).toBe('.daemon.pid');
        });

        it('LOG_FILE is .daemon.log', () => {
            expect(LOG_FILE).toBe('.daemon.log');
        });
    });

    describe('module exports', () => {
        it('exports startDaemon function', async () => {
            const daemon = await import('../../src/daemon.js');
            expect(typeof daemon.startDaemon).toBe('function');
        });

        it('exports stopDaemon function', async () => {
            const daemon = await import('../../src/daemon.js');
            expect(typeof daemon.stopDaemon).toBe('function');
        });

        it('exports setupDaemonShutdown function', async () => {
            const daemon = await import('../../src/daemon.js');
            expect(typeof daemon.setupDaemonShutdown).toBe('function');
        });
    });
});
