// --- Daemon mode with PID management, flock locking, and signal handlers ---

import { fork } from 'child_process';
import fs from 'fs';
import lockfile from 'proper-lockfile';
import type { Logger } from 'pino';

// --- Constants (D-07, D-08, D-11) ---

export const PID_FILE = '.daemon.pid';
export const LOG_FILE = '.daemon.log';

// --- PID file operations (D-07, D-08) ---

export function writePid(pid: number, filePath?: string): void {
    fs.writeFileSync(filePath ?? PID_FILE, String(pid));
}

export function readPid(filePath?: string): number | null {
    const resolvedPath = filePath ?? PID_FILE;
    if (!fs.existsSync(resolvedPath)) return null;
    const content = fs.readFileSync(resolvedPath, 'utf-8').trim();
    return content ? parseInt(content, 10) : null;
}

export function removePidFile(filePath?: string): void {
    try {
        fs.unlinkSync(filePath ?? PID_FILE);
    } catch {
        // Ignore if file doesn't exist
    }
}

// --- Process check (D-05) ---

export function isProcessRunning(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

// --- Acquire PID lock (D-09) ---

async function acquirePidLock(): Promise<() => Promise<void>> {
    // Create PID file if it doesn't exist
    if (!fs.existsSync(PID_FILE)) {
        fs.writeFileSync(PID_FILE, '');
    }
    return lockfile.lock(PID_FILE, {
        retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 },
        realpath: false,
    });
}

// --- Start daemon (D-01, D-04, D-06, D-09, D-12) ---

export async function startDaemon(
    query: string,
    argv: string[],
    logger: Logger,
): Promise<number> {
    // D-09: Acquire lock on PID file
    const release = await acquirePidLock();

    try {
        // D-06: Check if daemon already running
        const existingPid = readPid();
        if (existingPid && isProcessRunning(existingPid)) {
            throw new Error(`Daemon already running (PID: ${existingPid})`);
        }

        // D-12: Clear daemon log on start
        fs.writeFileSync(LOG_FILE, '');

        // D-04: Fork detached child process with env marker to prevent infinite fork
        const child = fork(process.argv[1], argv, {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
            env: { ...process.env, SCRAPER_DAEMON_CHILD: '1' },
        });

        // D-12: Pipe child stdout/stderr to log file
        const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
        child.stdout?.pipe(logStream);
        child.stderr?.pipe(logStream);

        // D-04: Write PID and release lock
        writePid(child.pid!);
        child.unref();

        logger.info(`Daemon started (PID: ${child.pid})`);
        return child.pid!;
    } finally {
        await release();
    }
}

// --- Stop daemon (D-05) ---

export async function stopDaemon(logger: Logger): Promise<void> {
    const pid = readPid();

    if (!pid) {
        logger.warn('No PID file found, daemon may not be running');
        return;
    }

    if (!isProcessRunning(pid)) {
        logger.warn(`Process ${pid} not running, removing stale PID file`);
        removePidFile();
        return;
    }

    // D-05: Send SIGTERM
    logger.info(`Sending SIGTERM to daemon (PID: ${pid})`);
    process.kill(pid, 'SIGTERM');
    removePidFile();
    logger.info('Daemon stopped');
}

// --- Shutdown handler (D-04, D-10) ---

interface DaemonShutdownDeps {
    saveState: () => void;
    cleanup: () => Promise<void>;
    logger: Logger;
}

export function setupDaemonShutdown(deps: DaemonShutdownDeps): void {
    let shuttingDown = false;

    const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;

        deps.logger.info(`Received ${signal}, shutting down...`);

        try {
            deps.saveState();
        } catch (error) {
            deps.logger.error(
                { err: error },
                'Failed to save state during shutdown',
            );
        }

        try {
            await deps.cleanup();
        } catch (error) {
            deps.logger.error(
                { err: error },
                'Failed to cleanup during shutdown',
            );
        }

        // D-10: Delete PID file on clean exit
        removePidFile();

        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
