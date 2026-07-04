// --- Error handling, classification, and retry ---

import pRetry, { AbortError } from 'p-retry';

// --- Error type enum (D-19) ---

export type ErrorType = 'transient' | 'permanent' | 'browser' | 'extraction';

// --- Error classification keywords ---

const TRANSIENT_KEYWORDS = ['timeout', 'timed out', 'network', 'econnrefused', 'econnreset', 'socket hang up', 'fetch failed'];
const BROWSER_KEYWORDS = ['browser', 'crash', 'target closed', 'target detached', 'page closed', 'session closed'];
const EXTRACTION_KEYWORDS = ['json', 'parse', 'unexpected token', 'syntax error'];

// --- Helper: run a promise with a timeout ---

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
        ),
    ]);
}

// --- Classify error into category (D-19) ---

export function classifyError(error: Error): ErrorType {
    const msg = error.message.toLowerCase();

    if (TRANSIENT_KEYWORDS.some((kw) => msg.includes(kw))) {
        return 'transient';
    }
    if (BROWSER_KEYWORDS.some((kw) => msg.includes(kw))) {
        return 'browser';
    }
    if (EXTRACTION_KEYWORDS.some((kw) => msg.includes(kw))) {
        return 'extraction';
    }
    return 'permanent';
}

// --- Retry wrapper with exponential backoff (ERROR-03, ERROR-04) ---

interface RetryOptions {
    retries?: number;
    logger: { warn: (...args: unknown[]) => void };
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions,
): Promise<T> {
    const { retries = 3, logger } = options;

    return pRetry(
        async (attemptNumber) => {
            try {
                return await fn();
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                const category = classifyError(err);

                // Permanent errors: throw immediately, don't consume retry budget
                if (category === 'permanent' || category === 'browser' || category === 'extraction') {
                    throw new AbortError(err.message);
                }

                // Transient errors: allow retry
                throw err;
            }
        },
        {
            retries,
            onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
                logger.warn(
                    `Attempt ${attemptNumber} failed: ${error.message}. ${retriesLeft} retries left.`,
                );
            },
        },
    );
}
