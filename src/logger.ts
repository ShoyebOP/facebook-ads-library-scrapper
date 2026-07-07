// --- Structured logging with pino + pino-pretty ---

import fs from 'fs';
import pino from 'pino';
import pinoPretty from 'pino-pretty';

// --- Create base logger with proxy credential redaction (D-21) ---

export function createLogger(level: string = 'info'): pino.Logger {
    const logLevel = process.env.LOG_LEVEL || level;
    const logFile = process.env.SCRAPER_LOG_FILE;

    const baseOptions = {
        level: logLevel,
        redact: ['proxy', '*.proxy'],
    };

    if (logFile) {
        // Daemon mode: pretty to file, no colors (D-06)
        return pino({
            ...baseOptions,
        }, pinoPretty({
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

    // CLI mode: pretty to stdout with colors (D-01)
    return pino({
        ...baseOptions,
    }, pinoPretty({
        colorize: true,
        levelFirst: true,
        ignore: 'pid,hostname',
        translateTime: false,
        messageFormat: '{levelLabel} [{module}]: {msg}',
    }));
}

// --- Create child logger with module context ---

export function createChildLogger(
    parent: pino.Logger,
    module: string,
): pino.Logger {
    return parent.child({ module });
}
