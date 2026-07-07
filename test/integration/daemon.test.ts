// --- Daemon integration tests ---

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import fs from 'fs';
import { join } from 'path';
import pino from 'pino';
import { PID_FILE, LOG_FILE, writePid, readPid, removePidFile, isProcessRunning } from '../../src/daemon.js';

const logger = pino({ level: 'silent' });
const testDir = '/tmp/facebook-scraper-test';
const PID_FILE_PATH = join(testDir, PID_FILE);
const LOG_FILE_PATH = join(testDir, LOG_FILE);

describe('daemon.ts', () => {
    beforeEach(async () => {
        await fs.promises.mkdir(testDir, { recursive: true });
        // Clean up any existing PID/LOG files in both CWD and testDir
        try { fs.unlinkSync(PID_FILE); } catch {}
        try { fs.unlinkSync(LOG_FILE); } catch {}
        try { fs.unlinkSync(PID_FILE_PATH); } catch {}
        try { fs.unlinkSync(LOG_FILE_PATH); } catch {}
    });

    afterEach(async () => {
        // Clean up everything
        try { fs.unlinkSync(PID_FILE); } catch {}
        try { fs.unlinkSync(LOG_FILE); } catch {}
        try { fs.unlinkSync(PID_FILE_PATH); } catch {}
        try { fs.unlinkSync(LOG_FILE_PATH); } catch {}
        try { await fs.promises.rm(testDir, { recursive: true, force: true }); } catch {}
    });

    describe('writePid', () => {
        it('writes PID number to temp dir PID file', () => {
            writePid(12345, PID_FILE_PATH);
            expect(fs.existsSync(PID_FILE_PATH)).toBe(true);
            const content = fs.readFileSync(PID_FILE_PATH, 'utf-8');
            expect(content).toBe('12345');
        });

        it('overwrites existing PID file', () => {
            writePid(11111, PID_FILE_PATH);
            writePid(22222, PID_FILE_PATH);
            const content = fs.readFileSync(PID_FILE_PATH, 'utf-8');
            expect(content).toBe('22222');
        });
    });

    describe('readPid', () => {
        it('returns null when PID file does not exist', () => {
            const result = readPid(PID_FILE_PATH);
            expect(result).toBeNull();
        });

        it('returns parsed PID number from file', () => {
            writePid(99999, PID_FILE_PATH);
            const result = readPid(PID_FILE_PATH);
            expect(result).toBe(99999);
        });

        it('returns null for empty file', () => {
            fs.writeFileSync(PID_FILE_PATH, '');
            const result = readPid(PID_FILE_PATH);
            expect(result).toBeNull();
        });

        it('trims whitespace from PID file', () => {
            fs.writeFileSync(PID_FILE_PATH, '  12345  \n');
            const result = readPid(PID_FILE_PATH);
            expect(result).toBe(12345);
        });
    });

    describe('removePidFile', () => {
        it('deletes PID file silently', () => {
            writePid(12345, PID_FILE_PATH);
            expect(fs.existsSync(PID_FILE_PATH)).toBe(true);
            removePidFile(PID_FILE_PATH);
            expect(fs.existsSync(PID_FILE_PATH)).toBe(false);
        });

        it('does not throw when PID file does not exist', () => {
            expect(() => removePidFile(PID_FILE_PATH)).not.toThrow();
        });
    });

    describe('isProcessRunning', () => {
        it('returns true for current process', () => {
            const result = isProcessRunning(process.pid);
            expect(result).toBe(true);
        });

        it('returns false for non-existent PID', () => {
            // Use a very high PID that's unlikely to exist
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

    describe('startDaemon', () => {
        it('exports startDaemon function', async () => {
            const daemon = await import('../../src/daemon.js');
            expect(typeof daemon.startDaemon).toBe('function');
        });

        it('startDaemon is async', async () => {
            const daemon = await import('../../src/daemon.js');
            // Verify it returns a promise
            const result = daemon.startDaemon('test', [], logger);
            expect(result).toBeInstanceOf(Promise);
            // We need to catch the error since we can't actually fork in test
            try { await result; } catch {}
        });
    });

    describe('stopDaemon', () => {
        it('exports stopDaemon function', async () => {
            const daemon = await import('../../src/daemon.js');
            expect(typeof daemon.stopDaemon).toBe('function');
        });
    });

    describe('setupDaemonShutdown', () => {
        it('exports setupDaemonShutdown function', async () => {
            const daemon = await import('../../src/daemon.js');
            expect(typeof daemon.setupDaemonShutdown).toBe('function');
        });
    });
});
