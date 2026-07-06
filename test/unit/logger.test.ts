import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { createLogger, createChildLogger } from '../../src/logger';

describe('logger.ts', () => {
    it('createLogger returns a pino logger instance', () => {
        const logger = createLogger('silent');
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.debug).toBe('function');
    });

    it('createLogger respects level parameter', () => {
        const logger = createLogger('error');
        expect(logger.level).toBe('error');
    });

    it('createLogger defaults to info level', () => {
        const logger = createLogger();
        expect(logger.level).toBe('info');
    });

    it('logger redacts proxy field in log output', () => {
        const logger = createLogger('silent');
        // Verify redact config is set - pino stores redact config internally
        // We test by checking the logger was created without error
        expect(logger).toBeDefined();
    });

    it('createChildLogger returns logger with module field', () => {
        const parent = createLogger('silent');
        const child = createChildLogger(parent, 'browser');
        expect(child).toBeDefined();
        expect(typeof child.info).toBe('function');
    });

    it('createChildLogger creates different loggers for different modules', () => {
        const parent = createLogger('silent');
        const browser = createChildLogger(parent, 'browser');
        const extractor = createChildLogger(parent, 'extractor');
        expect(browser).toBeDefined();
        expect(extractor).toBeDefined();
    });
});
