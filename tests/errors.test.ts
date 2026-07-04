import { describe, it, expect, mock, beforeEach } from 'bun:test';

// --- Test withTimeout, classifyError, withRetry ---

describe('errors.ts', () => {
    describe('withTimeout', () => {
        it('resolves if promise completes before deadline', async () => {
            const { withTimeout } = await import('../src/errors');
            const result = await withTimeout(Promise.resolve('ok'), 1000);
            expect(result).toBe('ok');
        });

        it('rejects with "Timed out after Xms" if exceeded', async () => {
            const { withTimeout } = await import('../src/errors');
            const slow = new Promise<string>((resolve) =>
                setTimeout(() => resolve('late'), 500),
            );
            await expect(withTimeout(slow, 50)).rejects.toThrow(
                'Timed out after 50ms',
            );
        });
    });

    describe('classifyError', () => {
        it('returns "transient" for timeout errors', async () => {
            const { classifyError } = await import('../src/errors');
            expect(classifyError(new Error('Request timeout'))).toBe(
                'transient',
            );
        });

        it('returns "transient" for network errors', async () => {
            const { classifyError } = await import('../src/errors');
            expect(classifyError(new Error('Network failure'))).toBe(
                'transient',
            );
        });

        it('returns "transient" for ECONNREFUSED', async () => {
            const { classifyError } = await import('../src/errors');
            expect(classifyError(new Error('connect ECONNREFUSED'))).toBe(
                'transient',
            );
        });

        it('returns "browser" for browser errors', async () => {
            const { classifyError } = await import('../src/errors');
            expect(classifyError(new Error('Browser crashed'))).toBe('browser');
        });

        it('returns "browser" for target closed', async () => {
            const { classifyError } = await import('../src/errors');
            expect(
                classifyError(new Error('Target closed')),
            ).toBe('browser');
        });

        it('returns "extraction" for JSON parse errors', async () => {
            const { classifyError } = await import('../src/errors');
            expect(classifyError(new Error('JSON parse error'))).toBe(
                'extraction',
            );
        });

        it('returns "extraction" for unexpected token', async () => {
            const { classifyError } = await import('../src/errors');
            expect(
                classifyError(new Error('Unexpected token in JSON')),
            ).toBe('extraction');
        });

        it('returns "permanent" for other errors', async () => {
            const { classifyError } = await import('../src/errors');
            expect(classifyError(new Error('Invalid argument'))).toBe(
                'permanent',
            );
        });

        it('returns "permanent" for unknown error types', async () => {
            const { classifyError } = await import('../src/errors');
            expect(classifyError(new Error('Some random error'))).toBe(
                'permanent',
            );
        });
    });

    describe('withRetry', () => {
        it('calls fn at least once', async () => {
            const { withRetry } = await import('../src/errors');
            const fn = mock(() => Promise.resolve('ok'));
            const logger = { warn: mock(() => {}) } as any;
            const result = await withRetry(fn, { logger });
            expect(result).toBe('ok');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('retries on transient errors up to max retries', async () => {
            const { withRetry } = await import('../src/errors');
            let attempts = 0;
            const fn = mock(() => {
                attempts++;
                if (attempts < 3) {
                    return Promise.reject(new Error('timeout error'));
                }
                return Promise.resolve('ok');
            });
            const logger = { warn: mock(() => {}) } as any;
            const result = await withRetry(fn, {
                retries: 3,
                logger,
            });
            expect(result).toBe('ok');
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('throws immediately on permanent errors', async () => {
            const { withRetry } = await import('../src/errors');
            const fn = mock(() =>
                Promise.reject(new Error('Invalid argument')),
            );
            const logger = { warn: mock(() => {}) } as any;
            await expect(
                withRetry(fn, { retries: 3, logger }),
            ).rejects.toThrow('Invalid argument');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('logs attempt number and retries left', async () => {
            const { withRetry } = await import('../src/errors');
            let attempts = 0;
            const fn = mock(() => {
                attempts++;
                if (attempts < 2) {
                    return Promise.reject(new Error('network failure'));
                }
                return Promise.resolve('ok');
            });
            const logger = { warn: mock(() => {}) } as any;
            await withRetry(fn, { retries: 3, logger });
            expect(logger.warn).toHaveBeenCalled();
        });

        it('exhausts retries and throws last error', async () => {
            const { withRetry } = await import('../src/errors');
            const fn = mock(() =>
                Promise.reject(new Error('timeout')),
            );
            const logger = { warn: mock(() => {}) } as any;
            await expect(
                withRetry(fn, { retries: 2, logger }),
            ).rejects.toThrow('timeout');
            expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
        });
    });

    describe('setupShutdownHandler', () => {
        it('registers SIGINT listener', async () => {
            const { setupShutdownHandler } = await import('../src/errors');
            const originalOn = process.on;
            const listeners: Array<{ event: string; fn: Function }> = [];
            process.on = ((event: string, fn: Function) => {
                listeners.push({ event, fn });
                return process;
            }) as any;

            try {
                const saveUrls = mock(() => {});
                const browser = { close: mock(() => Promise.resolve()) } as any;
                setupShutdownHandler({ saveUrls, browser, logger: { info: mock(() => {}) } as any });

                const sigintListener = listeners.find((l) => l.event === 'SIGINT');
                expect(sigintListener).toBeDefined();
            } finally {
                process.on = originalOn;
            }
        });

        it('registers SIGTERM listener', async () => {
            const { setupShutdownHandler } = await import('../src/errors');
            const originalOn = process.on;
            const listeners: Array<{ event: string; fn: Function }> = [];
            process.on = ((event: string, fn: Function) => {
                listeners.push({ event, fn });
                return process;
            }) as any;

            try {
                const saveUrls = mock(() => {});
                const browser = { close: mock(() => Promise.resolve()) } as any;
                setupShutdownHandler({ saveUrls, browser, logger: { info: mock(() => {}) } as any });

                const sigtermListener = listeners.find((l) => l.event === 'SIGTERM');
                expect(sigtermListener).toBeDefined();
            } finally {
                process.on = originalOn;
            }
        });

        it('shutdown handler calls saveUrls before exit', async () => {
            const { setupShutdownHandler } = await import('../src/errors');
            const originalOn = process.on;
            const originalExit = process.exit;
            const listeners: Array<{ event: string; fn: Function }> = [];
            process.on = ((event: string, fn: Function) => {
                listeners.push({ event, fn });
                return process;
            }) as any;
            process.exit = (() => {}) as any;

            try {
                const saveUrls = mock(() => {});
                const browser = { close: mock(() => Promise.resolve()) } as any;
                setupShutdownHandler({ saveUrls, browser, logger: { info: mock(() => {}) } as any });

                const sigintListener = listeners.find((l) => l.event === 'SIGINT');
                expect(sigintListener).toBeDefined();

                // Call the shutdown handler
                await sigintListener!.fn();

                expect(saveUrls).toHaveBeenCalledTimes(1);
            } finally {
                process.on = originalOn;
                process.exit = originalExit;
            }
        });

        it('shutdown handler closes browser', async () => {
            const { setupShutdownHandler } = await import('../src/errors');
            const originalOn = process.on;
            const originalExit = process.exit;
            const listeners: Array<{ event: string; fn: Function }> = [];
            process.on = ((event: string, fn: Function) => {
                listeners.push({ event, fn });
                return process;
            }) as any;
            process.exit = (() => {}) as any;

            try {
                const saveUrls = mock(() => {});
                const browser = { close: mock(() => Promise.resolve()) } as any;
                setupShutdownHandler({ saveUrls, browser, logger: { info: mock(() => {}) } as any });

                const sigintListener = listeners.find((l) => l.event === 'SIGINT');
                await sigintListener!.fn();

                expect(browser.close).toHaveBeenCalledTimes(1);
            } finally {
                process.on = originalOn;
                process.exit = originalExit;
            }
        });

        it('shutdown handler prevents double-execution via shuttingDown flag', async () => {
            const { setupShutdownHandler } = await import('../src/errors');
            const originalOn = process.on;
            const originalExit = process.exit;
            const listeners: Array<{ event: string; fn: Function }> = [];
            process.on = ((event: string, fn: Function) => {
                listeners.push({ event, fn });
                return process;
            }) as any;
            process.exit = (() => {}) as any;

            try {
                const saveUrls = mock(() => {});
                const browser = { close: mock(() => Promise.resolve()) } as any;
                setupShutdownHandler({ saveUrls, browser, logger: { info: mock(() => {}) } as any });

                const sigintListener = listeners.find((l) => l.event === 'SIGINT');

                // Call shutdown twice
                await sigintListener!.fn();
                await sigintListener!.fn();

                // saveUrls should only be called once
                expect(saveUrls).toHaveBeenCalledTimes(1);
            } finally {
                process.on = originalOn;
                process.exit = originalExit;
            }
        });
    });
});

describe('browser.ts error handling', () => {
    it('launchBrowser uses withRetry for launch (source inspection)', async () => {
        const fs = await import('fs');
        const source = fs.readFileSync('src/browser.ts', 'utf-8');
        expect(source).toContain('withRetry');
    });

    it('launchBrowser logs error and re-throws on failure', async () => {
        const fs = await import('fs');
        const source = fs.readFileSync('src/browser.ts', 'utf-8');
        expect(source).toContain('catch (error)');
        expect(source).toContain('browserLogger.error');
        expect(source).toContain('throw error');
    });
});

describe('extractor.ts error handling', () => {
    it('extractor uses withTimeout for response.json()', async () => {
        const fs = await import('fs');
        const source = fs.readFileSync('src/extractor.ts', 'utf-8');
        expect(source).toContain('withTimeout');
    });

    it('extractor catches and logs extraction errors', async () => {
        const fs = await import('fs');
        const source = fs.readFileSync('src/extractor.ts', 'utf-8');
        expect(source).toContain('catch');
        expect(source).toContain('extractLogger');
    });
});