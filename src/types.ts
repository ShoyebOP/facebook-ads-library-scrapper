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

// --- Error category (D-19) ---

export type ErrorCategory = 'transient' | 'permanent' | 'browser' | 'extraction';
