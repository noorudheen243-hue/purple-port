const { exec } = require('child_process');

const PORTS = [4001];

const execute = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                // If finding PID fails (e.g. no process), it returns error code 1 usually, which we treat as 'no process found'
                resolve({ stdout, stderr, error });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
};

const cleanPorts = async () => {
    console.log('--- PRE-FLIGHT CHECK: Cleaning Ports ---');

    for (const port of PORTS) {
        try {
            // Find PID
            const findCmd = `netstat -ano | findstr :${port}`;
            const { stdout } = await execute(findCmd);

            if (stdout) {
                const lines = stdout.trim().split('\n');
                const pids = new Set();

                lines.forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && pid !== '0') {
                        pids.add(pid);
                    }
                });

                if (pids.size > 0) {
                    console.log(`Port ${port} is busy. Killing processes: ${Array.from(pids).join(', ')}`);
                    for (const pid of pids) {
                        try {
                            const killCmd = `taskkill /F /PID ${pid}`;
                            await execute(killCmd);
                            console.log(`  - Killed PID ${pid}`);
                        } catch (err) {
                            console.log(`  - Failed to kill PID ${pid} (might be already gone)`);
                        }
                    }
                } else {
                    console.log(`Port ${port} is free (No valid PID found).`);
                }
            } else {
                console.log(`Port ${port} is free.`);
            }
        } catch (error) {
            console.log(`Error checking port ${port}:`, error.message);
        }
    }

    console.log('--- CLEANUP COMPLETE. Starting Server... ---');

    // Start the actual server
    const spawn = require('child_process').spawn;
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const server = spawn(command, ['ts-node-dev', '--respawn', '--transpile-only', 'src/server.ts'], { stdio: 'inherit', shell: true });

    server.on('close', (code) => {
        process.exit(code);
    });
};

cleanPorts();
