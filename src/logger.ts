// --- Structured logging with pino ---

import pino from 'pino';

// --- Create base logger with proxy credential redaction (D-21) ---

export function createLogger(level: string = 'info'): pino.Logger {
    return pino({
        level: process.env.LOG_LEVEL || level,
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
