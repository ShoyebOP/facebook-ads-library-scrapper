// --- Logger tests ---

import { describe, it, expect, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { createLogger, createChildLogger } from './logger.js';

function getTempLogFile(): string {
    return path.join(os.tmpdir(), `test-log-${Date.now()}-${Math.random().toString(36).slice(2)}.log`);
}

function flushAndRead(logFile: string, logger: pino.Logger): Promise<string> {
    return new Promise((resolve) => {
        // Flush pino's internal buffer
        logger.flush();
        // Give sonic-boom time to write to disk
        setTimeout(() => {
            resolve(fs.readFileSync(logFile, 'utf-8'));
        }, 200);
    });
}

function createFileLogger(logFile: string, level = 'info'): pino.Logger {
    return pino({ level, redact: ['proxy', '*.proxy'] }, pinoPretty({
        colorize: false,
        levelFirst: true,
        ignore: 'pid,hostname',
        translateTime: false,
        messageFormat: '{levelLabel} [{module}]: {msg}',
        destination: logFile,
        append: true,
        mkdir: true,
    }));
}

describe('createLogger', () => {
    let tempFiles: string[] = [];

    afterEach(() => {
        for (const f of tempFiles) {
            try { fs.unlinkSync(f); } catch { /* ignore */ }
        }
        tempFiles = [];
    });

    it('CLI mode outputs formatted text, not raw JSON', async () => {
        const logFile = getTempLogFile();
        tempFiles.push(logFile);

        const logger = createFileLogger(logFile);
        logger.info('test message');

        const content = await flushAndRead(logFile, logger);
        expect(content).toContain('INFO');
        expect(content).toContain('test message');
        expect(content).not.toMatch(/^{"level":/);
    });

    it('formatted output does NOT contain timestamps', async () => {
        const logFile = getTempLogFile();
        tempFiles.push(logFile);

        const logger = createFileLogger(logFile);
        logger.info('no timestamp test');

        const content = await flushAndRead(logFile, logger);
        expect(content).not.toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(content).not.toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('formatted output does NOT contain pid or hostname', async () => {
        const logFile = getTempLogFile();
        tempFiles.push(logFile);

        const logger = createFileLogger(logFile);
        logger.info('no pid test');

        const content = await flushAndRead(logFile, logger);
        expect(content).not.toMatch(new RegExp(`pid:${process.pid}`));
        expect(content).not.toMatch(/hostname/);
    });

    it('daemon mode writes formatted text to log file without ANSI codes', async () => {
        const logFile = getTempLogFile();
        tempFiles.push(logFile);
        process.env.SCRAPER_LOG_FILE = logFile;

        const logger = createLogger();
        logger.info('daemon test message');

        const content = await flushAndRead(logFile, logger);
        expect(content).toContain('INFO');
        expect(content).toContain('daemon test message');
        expect(content).not.toMatch(/\x1b\[/);
        expect(content).not.toMatch(/\\e\[/);

        delete process.env.SCRAPER_LOG_FILE;
    });

    it('proxy credentials are redacted in output', async () => {
        const logFile = getTempLogFile();
        tempFiles.push(logFile);

        const logger = createFileLogger(logFile);
        logger.info({ proxy: 'http://user:secret123@proxy:8080' }, 'proxy test');

        const content = await flushAndRead(logFile, logger);
        expect(content).not.toContain('secret123');
    });

    it('child logger shows module name in brackets', async () => {
        const logFile = getTempLogFile();
        tempFiles.push(logFile);

        const logger = createFileLogger(logFile);
        const child = createChildLogger(logger, 'scraper');
        child.info('child logger test');

        const content = await flushAndRead(logFile, logger);
        expect(content).toContain('[scraper]');
        expect(content).toContain('child logger test');
    });

    it('log levels display as abbreviated uppercase', async () => {
        const logFile = getTempLogFile();
        tempFiles.push(logFile);

        const logger = createFileLogger(logFile, 'debug');
        logger.info('info msg');
        logger.warn('warn msg');
        logger.error('error msg');
        logger.debug('debug msg');

        const content = await flushAndRead(logFile, logger);
        expect(content).toContain('INFO');
        expect(content).toContain('WARN');
        expect(content).toContain('ERROR');
        expect(content).toContain('DEBUG');
    });
});
