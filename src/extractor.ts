// --- GraphQL response extraction ---

import type { Logger } from 'pino';
import type { Page, Response } from 'playwright-core';
import { withTimeout } from './errors.js';
import { createChildLogger } from './logger.js';

// --- Extract page_profile_uri from nested GraphQL response ---

export function extractProfileUrls(obj: unknown, urls: Set<string>): void {
    if (!obj || typeof obj !== 'object') return;

    if (
        'page_profile_uri' in obj &&
        typeof (obj as Record<string, unknown>).page_profile_uri === 'string'
    ) {
        urls.add((obj as Record<string, unknown>).page_profile_uri as string);
    }

    if (Array.isArray(obj)) {
        for (const item of obj) {
            extractProfileUrls(item, urls);
        }
    } else {
        for (const key of Object.keys(obj as Record<string, unknown>)) {
            extractProfileUrls((obj as Record<string, unknown>)[key], urls);
        }
    }
}

// --- Setup GraphQL response interceptor ---

export function setupGraphQLInterceptor(
    page: Page,
    profileUrls: Set<string>,
    logger: Logger,
): void {
    const extractLogger = createChildLogger(logger, 'extractor');

    page.on('response', async (response: Response) => {
        try {
            if (
                response.status() === 200 &&
                response.url().includes('graphql')
            ) {
                const json = await withTimeout(response.json(), 15000);
                extractProfileUrls(json, profileUrls);
                extractLogger.debug(
                    `Extracted URLs from GraphQL response: ${profileUrls.size} total`,
                );
            }
        } catch (e) {
            const error = e as Error;
            if (error.message.includes('Timed out')) {
                extractLogger.warn(
                    `Skipped slow GraphQL response: ${error.message}`,
                );
            } else {
                extractLogger.debug(
                    `Skipped non-JSON response: ${error.message}`,
                );
            }
        }
    });
}
