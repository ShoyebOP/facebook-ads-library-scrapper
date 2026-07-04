// --- Error handling and retry ---

// --- Helper: run a promise with a timeout ---

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
        ),
    ]);
}
