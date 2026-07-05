import { describe, it, expect } from 'bun:test';
import { extractProfileUrls } from '../../src/extractor.js';

describe('extractProfileUrls', () => {
    // --- Migrated from tests/extractor.test.ts ---

    it('extracts page_profile_uri from flat object', () => {
        const urls = new Set<string>();
        const data = {
            page_profile_uri: 'https://facebook.com/profile/123',
        };

        extractProfileUrls(data, urls);

        expect(urls.has('https://facebook.com/profile/123')).toBe(true);
    });

    it('extracts URLs from nested arrays (edges → node pattern)', () => {
        const urls = new Set<string>();
        const data = {
            edges: [
                { node: { page_profile_uri: 'https://facebook.com/profile/1' } },
                { node: { page_profile_uri: 'https://facebook.com/profile/2' } },
            ],
        };

        extractProfileUrls(data, urls);

        expect(urls.size).toBe(2);
        expect(urls.has('https://facebook.com/profile/1')).toBe(true);
        expect(urls.has('https://facebook.com/profile/2')).toBe(true);
    });

    it('extracts URLs from deeply nested objects', () => {
        const urls = new Set<string>();
        const data = {
            data: {
                ad_results: {
                    edges: [
                        {
                            node: {
                                sponsored_item: {
                                    page_profile_uri: 'https://facebook.com/profile/deep',
                                },
                            },
                        },
                    ],
                },
            },
        };

        extractProfileUrls(data, urls);

        expect(urls.has('https://facebook.com/profile/deep')).toBe(true);
    });

    it('deduplicates URLs using Set', () => {
        const urls = new Set<string>();
        const data = {
            page_profile_uri: 'https://facebook.com/profile/123',
        };

        extractProfileUrls(data, urls);
        extractProfileUrls(data, urls);

        expect(urls.size).toBe(1);
    });

    it('handles null input gracefully', () => {
        const urls = new Set<string>();
        extractProfileUrls(null, urls);
        expect(urls.size).toBe(0);
    });

    it('handles undefined input gracefully', () => {
        const urls = new Set<string>();
        extractProfileUrls(undefined, urls);
        expect(urls.size).toBe(0);
    });

    it('handles non-object input gracefully', () => {
        const urls = new Set<string>();
        extractProfileUrls('string', urls);
        extractProfileUrls(123, urls);
        extractProfileUrls(true, urls);
        expect(urls.size).toBe(0);
    });

    it('handles empty object gracefully', () => {
        const urls = new Set<string>();
        extractProfileUrls({}, urls);
        expect(urls.size).toBe(0);
    });

    it('handles empty array gracefully', () => {
        const urls = new Set<string>();
        extractProfileUrls([], urls);
        expect(urls.size).toBe(0);
    });

    it('extracts multiple URLs from different branches', () => {
        const urls = new Set<string>();
        const data = {
            ad1: { page_profile_uri: 'https://facebook.com/profile/a' },
            ad2: { page_profile_uri: 'https://facebook.com/profile/b' },
            ad3: { page_profile_uri: 'https://facebook.com/profile/c' },
        };

        extractProfileUrls(data, urls);

        expect(urls.size).toBe(3);
    });

    // --- Additional edge case tests ---

    it('extracts URLs from deeply nested GraphQL response structure', () => {
        const urls = new Set<string>();
        const data = {
            data: {
                ad_library_results: {
                    edges: [
                        {
                            node: {
                                ad_data: {
                                    sponsored_item: {
                                        page_profile_uri: 'https://facebook.com/profile/nested-1',
                                    },
                                },
                            },
                        },
                        {
                            node: {
                                ad_data: {
                                    sponsored_item: {
                                        page_profile_uri: 'https://facebook.com/profile/nested-2',
                                    },
                                },
                            },
                        },
                    ],
                },
            },
        };

        extractProfileUrls(data, urls);

        expect(urls.size).toBe(2);
        expect(urls.has('https://facebook.com/profile/nested-1')).toBe(true);
        expect(urls.has('https://facebook.com/profile/nested-2')).toBe(true);
    });

    it('handles empty edges array', () => {
        const urls = new Set<string>();
        const data = {
            edges: [],
        };

        extractProfileUrls(data, urls);

        expect(urls.size).toBe(0);
    });

    it('handles node with missing sponsored_item', () => {
        const urls = new Set<string>();
        const data = {
            edges: [
                { node: { other_field: 'value' } },
                { node: { page_profile_uri: 'https://facebook.com/profile/valid' } },
            ],
        };

        extractProfileUrls(data, urls);

        expect(urls.size).toBe(1);
        expect(urls.has('https://facebook.com/profile/valid')).toBe(true);
    });

    it('handles page_profile_uri that is not a string', () => {
        const urls = new Set<string>();
        const data = {
            page_profile_uri: 12345,
        };

        extractProfileUrls(data, urls);

        expect(urls.size).toBe(0);
    });

    it('handles very large nested objects without stack overflow', () => {
        const urls = new Set<string>();
        // Create a deeply nested structure (50 levels deep)
        let deep: Record<string, unknown> = { page_profile_uri: 'https://facebook.com/profile/deep' };
        for (let i = 0; i < 50; i++) {
            deep = { child: deep };
        }

        extractProfileUrls(deep, urls);

        expect(urls.has('https://facebook.com/profile/deep')).toBe(true);
    });

    it('extracts URLs from mixed array and object branches', () => {
        const urls = new Set<string>();
        const data = {
            root: { page_profile_uri: 'https://facebook.com/profile/root' },
            groups: [
                {
                    members: [
                        { page_profile_uri: 'https://facebook.com/profile/member1' },
                    ],
                },
            ],
            standalone: { page_profile_uri: 'https://facebook.com/profile/standalone' },
        };

        extractProfileUrls(data, urls);

        expect(urls.size).toBe(3);
    });
});
