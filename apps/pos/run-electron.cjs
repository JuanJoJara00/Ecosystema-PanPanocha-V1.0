const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const mainJsPath = path.join(__dirname, 'dist-electron', 'main.js');
const mainCjsPath = path.join(__dirname, 'dist-electron', 'main.cjs');

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if port 5173 is ready
function checkPort(port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(300); // 300ms timeout
        socket.on('connect', () => {
            socket.destroy();
            resolve(true); // Connected!
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });
        // Try localhost (let Node resolve IPv4/IPv6)
        socket.connect(port);
    });
}

async function start() {
    console.log('[Run-Electron] Starting...');

    // 1. Wait for Vite (Port 5173)
    console.log('[Run-Electron] Waiting for Vite on port 5173...');
    let attempts = 0;
    while (attempts < 20) { // 10 seconds timeout (reduced from 30)
        if (await checkPort(5173)) {
            console.log('[Run-Electron] Vite is ready!');
            break;
        }
        await wait(500);
        attempts++;
        if (attempts % 4 === 0) process.stdout.write('.');
    }

    if (attempts >= 60) {
        console.error('[Run-Electron] Timeout waiting for Vite. Starting anyway...');
    }

    // 2. Wait for main.js from tsc
    console.log(`[Run-Electron] Waiting for ${mainJsPath}...`);
    while (!fs.existsSync(mainJsPath)) {
        await wait(500);
    }
    console.log(`[Run-Electron] Found ${mainJsPath}`);

    // 3. Rename to .cjs (Optional now, but kept for main entry) and enforce CommonJS
    await wait(500);
    try {
        const content = fs.readFileSync(mainJsPath, 'utf8');
        fs.writeFileSync(mainCjsPath, content);
        console.log('[Run-Electron] Created main.cjs');

        // FORCE CommonJS for all files in dist-electron
        fs.writeFileSync(
            path.join(__dirname, 'dist-electron', 'package.json'),
            JSON.stringify({ type: 'commonjs' }, null, 2)
        );
        console.log('[Run-Electron] Created dist-electron/package.json (CommonJS)');

    } catch (e) {
        console.error('[Run-Electron] Error preparing files', e);
    }

    // 4. Start Electron
    console.log('[Run-Electron] Launching Electron...');

    // Determine electron command
    const electronCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

    const electron = spawn(electronCmd, ['electron', '.'], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, FORCE_COLOR: '1' }
    });

    electron.on('close', (code) => {
        console.log(`[Run-Electron] Electron exited with code ${code}`);
        process.exit(code);
    });
}

start();
