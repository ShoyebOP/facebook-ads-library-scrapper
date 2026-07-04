// --- GraphQL response extraction ---

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
