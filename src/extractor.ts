// --- GraphQL response extraction ---

import type { Logger } from 'pino';
import type { Page, Response } from 'playwright-core';
import { withTimeout } from './errors.js';
import { createChildLogger } from './logger.js';

// --- Filtered count tracking ---

let filteredCountTotal = 0;
let filteredCountLast = 0;

export function getFilteredCount(): number {
    return filteredCountTotal;
}

export function resetFilteredCount(): void {
    filteredCountTotal = 0;
    filteredCountLast = 0;
}

// --- Extract page_profile_uri from nested GraphQL response ---

export function extractProfileUrls(
    obj: unknown,
    urls: Set<string>,
): { added: number; attempted: number } {
    let added = 0;
    let attempted = 0;

    if (!obj || typeof obj !== 'object') return { added, attempted };

    if (
        'page_profile_uri' in obj &&
        typeof (obj as Record<string, unknown>).page_profile_uri === 'string'
    ) {
        attempted++;
        const url = (obj as Record<string, unknown>).page_profile_uri as string;
        if (!urls.has(url)) {
            urls.add(url);
            added++;
        }
    }

    if (Array.isArray(obj)) {
        for (const item of obj) {
            const result = extractProfileUrls(item, urls);
            added += result.added;
            attempted += result.attempted;
        }
    } else {
        for (const key of Object.keys(obj as Record<string, unknown>)) {
            const result = extractProfileUrls(
                (obj as Record<string, unknown>)[key],
                urls,
            );
            added += result.added;
            attempted += result.attempted;
        }
    }

    return { added, attempted };
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
                const beforeSize = profileUrls.size;
                const result = extractProfileUrls(json, profileUrls);
                const added = profileUrls.size - beforeSize;
                const filtered = result.attempted - added;
                filteredCountTotal += filtered;
                filteredCountLast = filtered;
                extractLogger.debug(
                    `Extracted URLs from GraphQL response: ${result.attempted} found, ${added} added, ${filtered} filtered, ${profileUrls.size} total`,
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
