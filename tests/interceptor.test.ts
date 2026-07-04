import { describe, it, expect, mock, beforeEach } from 'bun:test';
import type { Page, Response } from 'playwright-core';

// Mock the errors module
const mockWithTimeout = mock((promise: Promise<unknown>, _ms: number) => promise);
mock.module('../src/errors.js', () => ({
    withTimeout: mockWithTimeout,
}));

// Mock the logger module
const mockLogger = {
    info: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
    warn: mock(() => {}),
    child: mock(() => mockLogger),
};
const mockCreateChildLogger = mock(() => mockLogger);
mock.module('../src/logger.js', () => ({
    createChildLogger: mockCreateChildLogger,
}));

describe('setupGraphQLInterceptor', () => {
    let mockPage: Page;
    let profileUrls: Set<string>;
    let responseHandler: ((response: Response) => Promise<void>) | undefined;

    beforeEach(() => {
        mockWithTimeout.mockClear();
        mockLogger.debug.mockClear();
        mockLogger.warn.mockClear();
        mockCreateChildLogger.mockClear();

        profileUrls = new Set<string>();

        // Create mock page that captures the response handler
        mockPage = {
            on: mock((event: string, handler: (response: Response) => Promise<void>) => {
                if (event === 'response') {
                    responseHandler = handler;
                }
                return mockPage;
            }),
        } as unknown as Page;
    });

    it('registers page.on("response") listener', async () => {
        const { setupGraphQLInterceptor } = await import('../src/extractor.js');
        const logger = mockLogger as unknown as import('pino').Logger;

        setupGraphQLInterceptor(mockPage, profileUrls, logger);

        expect(mockPage.on).toHaveBeenCalledWith(
            'response',
            expect.any(Function),
        );
    });

    it('filters responses where URL contains "graphql"', async () => {
        const { setupGraphQLInterceptor } = await import('../src/extractor.js');
        const logger = mockLogger as unknown as import('pino').Logger;

        setupGraphQLInterceptor(mockPage, profileUrls, logger);

        // Create mock response with graphql URL
        const mockResponse = {
            status: () => 200,
            url: () => 'https://www.facebook.com/api/graphql',
            json: () => Promise.resolve({}),
        } as unknown as Response;

        // Create mock response with non-graphql URL
        const nonGraphqlResponse = {
            status: () => 200,
            url: () => 'https://www.facebook.com/api/data',
            json: () => Promise.resolve({}),
        } as unknown as Response;

        // Call the handler
        if (responseHandler) {
            await responseHandler(mockResponse);
            await responseHandler(nonGraphqlResponse);
        }

        // withTimeout should only be called for graphql responses
        expect(mockWithTimeout).toHaveBeenCalledTimes(1);
    });

    it('filters responses with status 200', async () => {
        const { setupGraphQLInterceptor } = await import('../src/extractor.js');
        const logger = mockLogger as unknown as import('pino').Logger;

        setupGraphQLInterceptor(mockPage, profileUrls, logger);

        // Create mock response with non-200 status
        const mockResponse = {
            status: () => 404,
            url: () => 'https://www.facebook.com/api/graphql',
            json: () => Promise.resolve({}),
        } as unknown as Response;

        // Call the handler
        if (responseHandler) {
            await responseHandler(mockResponse);
        }

        // withTimeout should not be called for non-200 responses
        expect(mockWithTimeout).toHaveBeenCalledTimes(0);
    });

    it('calls extractProfileUrls with parsed JSON', async () => {
        const { setupGraphQLInterceptor } = await import('../src/extractor.js');
        const logger = mockLogger as unknown as import('pino').Logger;

        setupGraphQLInterceptor(mockPage, profileUrls, logger);

        const testData = {
            page_profile_uri: 'https://facebook.com/profile/123',
        };

        const mockResponse = {
            status: () => 200,
            url: () => 'https://www.facebook.com/api/graphql',
            json: () => Promise.resolve(testData),
        } as unknown as Response;

        // Call the handler
        if (responseHandler) {
            await responseHandler(mockResponse);
        }

        // Profile URL should be extracted
        expect(profileUrls.has('https://facebook.com/profile/123')).toBe(true);
    });

    it('wraps response.json() with 15s timeout', async () => {
        const { setupGraphQLInterceptor } = await import('../src/extractor.js');
        const logger = mockLogger as unknown as import('pino').Logger;

        setupGraphQLInterceptor(mockPage, profileUrls, logger);

        const mockResponse = {
            status: () => 200,
            url: () => 'https://www.facebook.com/api/graphql',
            json: () => Promise.resolve({}),
        } as unknown as Response;

        // Call the handler
        if (responseHandler) {
            await responseHandler(mockResponse);
        }

        // withTimeout should be called with 15000ms
        expect(mockWithTimeout).toHaveBeenCalledWith(expect.any(Promise), 15000);
    });

    it('logs warning on timeout and continues', async () => {
        const { setupGraphQLInterceptor } = await import('../src/extractor.js');
        const logger = mockLogger as unknown as import('pino').Logger;

        setupGraphQLInterceptor(mockPage, profileUrls, logger);

        // Make withTimeout throw a timeout error
        mockWithTimeout.mockRejectedValueOnce(new Error('Timed out after 15000ms'));

        const mockResponse = {
            status: () => 200,
            url: () => 'https://www.facebook.com/api/graphql',
            json: () => Promise.resolve({}),
        } as unknown as Response;

        // Call the handler
        if (responseHandler) {
            await responseHandler(mockResponse);
        }

        // Should log warning
        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Skipped slow GraphQL response'),
        );
    });

    it('logs debug on non-JSON response and continues', async () => {
        const { setupGraphQLInterceptor } = await import('../src/extractor.js');
        const logger = mockLogger as unknown as import('pino').Logger;

        setupGraphQLInterceptor(mockPage, profileUrls, logger);

        // Make withTimeout throw a non-timeout error
        mockWithTimeout.mockRejectedValueOnce(new Error('Unexpected token'));

        const mockResponse = {
            status: () => 200,
            url: () => 'https://www.facebook.com/api/graphql',
            json: () => Promise.resolve({}),
        } as unknown as Response;

        // Call the handler
        if (responseHandler) {
            await responseHandler(mockResponse);
        }

        // Should log debug
        expect(mockLogger.debug).toHaveBeenCalledWith(
            expect.stringContaining('Skipped non-JSON response'),
        );
    });

    it('logs total URL count after extraction', async () => {
        const { setupGraphQLInterceptor } = await import('../src/extractor.js');
        const logger = mockLogger as unknown as import('pino').Logger;

        setupGraphQLInterceptor(mockPage, profileUrls, logger);

        const testData = {
            page_profile_uri: 'https://facebook.com/profile/456',
        };

        const mockResponse = {
            status: () => 200,
            url: () => 'https://www.facebook.com/api/graphql',
            json: () => Promise.resolve(testData),
        } as unknown as Response;

        // Call the handler
        if (responseHandler) {
            await responseHandler(mockResponse);
        }

        // Should log debug with URL count
        expect(mockLogger.debug).toHaveBeenCalledWith(
            expect.stringContaining('Extracted URLs from GraphQL response'),
        );
    });
});
