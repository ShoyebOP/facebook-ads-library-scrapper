// --- Structured logging with pino ---

import fs from 'fs';
import pino from 'pino';

// --- Create base logger with proxy credential redaction (D-21) ---

export function createLogger(level: string = 'info'): pino.Logger {
    const logLevel = process.env.LOG_LEVEL || level;

    // Child process: write logs directly to file via SCRAPER_LOG_FILE env var
    const logFile = process.env.SCRAPER_LOG_FILE;
    if (logFile) {
        const destination = pino.destination({ dest: logFile, sync: false, append: true, mkdir: true });
        return pino({
            level: logLevel,
            redact: ['proxy', '*.proxy'],
        }, destination);
    }

    return pino({
        level: logLevel,
        redact: ['proxy', '*.proxy'],
    });
}

// --- Create child logger with module context ---

export function createChildLogger(
    parent: pino.Logger,
    module: string,
): pino.Logger {
    return parent.child({ module });
}
