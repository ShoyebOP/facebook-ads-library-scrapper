// --- Standalone daemon management script (no yargs dependency) ---

import fs from 'fs';
import path from 'node:path';
import { readPid, isProcessRunning, removePidFile } from './daemon.js';
import { createLogger } from './logger.js';

// --- Constants (D-07, D-11) ---

export const PID_FILE = '.daemon.pid';
export const LOG_FILE = '.daemon.log';

// --- Resolve file paths relative to optional baseDir ---

export function resolveDaemonPaths(baseDir?: string): { pidFile: string, logFile: string } {
    if (baseDir) {
        return {
            pidFile: path.join(baseDir, PID_FILE),
            logFile: path.join(baseDir, LOG_FILE),
        };
    }
    return { pidFile: PID_FILE, logFile: LOG_FILE };
}

// --- Actions ---

export async function handleStop(options?: { pidFile?: string }): Promise<void> {
    const pidPath = options?.pidFile ?? PID_FILE;
    const pid = readPid(pidPath);

    if (!pid) {
        console.log('Daemon not running (no PID file)');
        return;
    }

    if (!isProcessRunning(pid)) {
        console.log(`Daemon not running (stale PID ${pid}), removing PID file`);
        removePidFile(pidPath);
        return;
    }

    console.log(`Stopping daemon (PID: ${pid})...`);
    process.kill(pid, 'SIGTERM');

    // Poll for process exit (200ms intervals, 5s max)
    const maxAttempts = 25;
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        if (!isProcessRunning(pid)) {
            removePidFile(pidPath);
            console.log('Daemon stopped');
            return;
        }
    }

    // Process still running after timeout
    console.log(`Warning: daemon process still running after stop signal (PID: ${pid})`);
}

export function handleStatus(options?: { pidFile?: string }): void {
    const pidPath = options?.pidFile ?? PID_FILE;
    const pid = readPid(pidPath);

    if (!pid) {
        console.log('Daemon not running');
        return;
    }

    if (isProcessRunning(pid)) {
        console.log(`Daemon running (PID: ${pid})`);
    } else {
        console.log(`Daemon not running (stale PID ${pid})`);
        removePidFile(pidPath);
    }
}

export function handleLogs(options?: { logFile?: string }): void {
    const logPath = options?.logFile ?? LOG_FILE;

    if (!fs.existsSync(logPath)) {
        console.log('No daemon log file found');
        return;
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    if (content.trim()) {
        console.log(content);
    } else {
        console.log('Daemon log file is empty');
    }
}

// --- Parse --base-dir from argv ---

function parseBaseDir(argv: string[]): string | undefined {
    const idx = argv.indexOf('--base-dir');
    if (idx !== -1 && idx + 1 < argv.length) {
        return argv[idx + 1];
    }
    return undefined;
}

// --- Main entry point ---

async function main(): Promise<void> {
    const action = process.argv[2];

    if (!action || !['stop', 'status', 'logs'].includes(action)) {
        console.error('Usage: bun daemon-actions <stop|status|logs>');
        process.exit(1);
    }

    const baseDir = parseBaseDir(process.argv.slice(3));
    const paths = resolveDaemonPaths(baseDir);

    switch (action) {
        case 'stop':
            await handleStop({ pidFile: paths.pidFile });
            break;
        case 'status':
            handleStatus({ pidFile: paths.pidFile });
            break;
        case 'logs':
            handleLogs({ logFile: paths.logFile });
            break;
    }
}

if (import.meta.main) {
    main();
}
