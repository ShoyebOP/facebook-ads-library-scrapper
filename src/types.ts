// --- Shared types and interfaces ---

import type { Logger } from 'pino';

// --- Browser options ---

export interface BrowserOptions {
    headless: boolean;
    proxy?: string;
    locale?: string;
    timezone?: string;
    logger: Logger;
}

// --- Scraper options ---

export interface ScraperOptions {
    query: string;
    maxUrls?: number;
    maxNoNewScrolls: number;
    headless: boolean;
    proxy?: string;
    locale?: string;
    timezone?: string;
    logger: Logger;
}

// --- Output options (D-01 to D-04) ---

export interface OutputOptions {
    query: string;
    outputDir?: string;
    logger: Logger;
}

// --- Incremental saver options (D-05 to D-06) ---

export interface IncrementalSaverOptions {
    outputFile: string;
    saveInterval?: number;
}

// --- Error category (D-19) ---

export type ErrorCategory =
    | 'transient'
    | 'permanent'
    | 'browser'
    | 'extraction';

// --- Webhook payload (D-09, D-10) ---

export interface WebhookPayload {
    query: string;
    outputFile: string;
    count: number;
}

// --- Webhook options (D-11, D-12) ---

export interface WebhookOptions {
    url: string;
    payload: WebhookPayload;
    timeoutMs?: number;
    retries?: number;
    logger: Logger;
}
