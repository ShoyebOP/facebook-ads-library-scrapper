// --- Webhook handler — POST notification with retry and error isolation ---

import http from 'http';
import https from 'https';
import pRetry, { AbortError } from 'p-retry';
import { createChildLogger } from './logger.js';
import type { WebhookOptions } from './types.js';

// --- Resolve webhook endpoint from preset (D-17, D-18) ---

export function resolveEndpoint(preset: { callback: string }): string {
    return preset.callback;
}

// --- Default request timeout (D-12) ---

const DEFAULT_TIMEOUT_MS = 10_000;

// --- Default retry count (D-14: 1 original + 2 retries = 3 total) ---

const DEFAULT_RETRIES = 2;

// --- Send a POST signal to the webhook (D-09, D-11) ---

export async function notifyWebhook(options: WebhookOptions): Promise<void> {
    const {
        url,
        payload,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        retries = DEFAULT_RETRIES,
        logger: parentLogger,
    } = options;

    const webhookLogger = createChildLogger(parentLogger, 'webhook');
    const body = JSON.stringify(payload);

    try {
        await pRetry(
            async () => {
                const parsedUrl = new URL(url);
                const client = parsedUrl.protocol === 'https:' ? https : http;

                return new Promise<void>((resolve, reject) => {
                    const req = client.request(
                        parsedUrl,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': Buffer.byteLength(body),
                            },
                            signal: AbortSignal.timeout(timeoutMs),
                        },
                        (res) => {
                            const statusCode = res.statusCode ?? 0;

                            // 5xx: throw to trigger retry (D-15)
                            if (statusCode >= 500) {
                                reject(
                                    new Error(
                                        `Server returned ${statusCode}`,
                                    ),
                                );
                                return;
                            }

                            // 4xx: throw AbortError to stop retrying (D-15)
                            if (statusCode >= 400) {
                                reject(
                                    new AbortError(
                                        `Client error ${statusCode}`,
                                    ),
                                );
                                return;
                            }

                            // Success (2xx, 3xx)
                            webhookLogger.info(
                                `Webhook notified (${statusCode})`,
                            );
                            resolve();
                        },
                    );

                    req.on('error', (err) => {
                        // Network/timeout errors: throw to trigger retry (D-15)
                        reject(err);
                    });

                    req.end(body);
                });
            },
            {
                retries,
                onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
                    webhookLogger.warn(
                        `Attempt ${attemptNumber} failed: ${error.message}. ${retriesLeft} retries left.`,
                    );
                },
            },
        );
    } catch (error) {
        // D-16: webhook failure never crashes scraper — log and return
        const err = error instanceof Error ? error : new Error(String(error));
        webhookLogger.error(`Webhook failed: ${err.message}`);
    }
}
