// --- Standalone daemon management script (no yargs dependency) ---

import fs from 'fs';
import { readPid, isProcessRunning, removePidFile } from './daemon.js';
import { createLogger } from './logger.js';

// --- Constants (D-07, D-11) ---

export const PID_FILE = '.daemon.pid';
export const LOG_FILE = '.daemon.log';

// --- Actions ---

export function handleStop(): void {
    const pid = readPid();

    if (!pid) {
        console.log('Daemon not running (no PID file)');
        return;
    }

    if (!isProcessRunning(pid)) {
        console.log(`Daemon not running (stale PID ${pid}), removing PID file`);
        removePidFile();
        return;
    }

    console.log(`Stopping daemon (PID: ${pid})...`);
    process.kill(pid, 'SIGTERM');

    // Wait 2s then check if PID file was cleaned up
    setTimeout(() => {
        if (fs.existsSync(PID_FILE)) {
            console.log('Warning: PID file still exists after stop signal');
        } else {
            console.log('Daemon stopped');
        }
    }, 2000);
}

export function handleStatus(): void {
    const pid = readPid();

    if (!pid) {
        console.log('Daemon not running');
        return;
    }

    if (isProcessRunning(pid)) {
        console.log(`Daemon running (PID: ${pid})`);
    } else {
        console.log(`Daemon not running (stale PID ${pid})`);
        removePidFile();
    }
}

export function handleLogs(): void {
    if (!fs.existsSync(LOG_FILE)) {
        console.log('No daemon log file found');
        return;
    }

    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    if (content.trim()) {
        console.log(content);
    } else {
        console.log('Daemon log file is empty');
    }
}

// --- Main entry point ---

function main(): void {
    const action = process.argv[2];

    if (!action || !['stop', 'status', 'logs'].includes(action)) {
        console.error('Usage: bun daemon-actions <stop|status|logs>');
        process.exit(1);
    }

    switch (action) {
        case 'stop':
            handleStop();
            break;
        case 'status':
            handleStatus();
            break;
        case 'logs':
            handleLogs();
            break;
    }
}

if (import.meta.main) {
    main();
}
