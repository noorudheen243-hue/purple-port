import { app, BrowserWindow, Menu, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
const TARGET_URL = 'http://localhost:5173'; // Default Vite port, change if needed

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "Purple Port",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, '../icon.png'),
        autoHideMenuBar: true
    });

    // Remove default menu for cleaner look
    Menu.setApplicationMenu(null);

    const checkConnection = () => {
        const { net } = require('electron');
        const request = net.request(TARGET_URL);
        request.on('response', (response: any) => {
            console.log(`STATUS: ${response.statusCode}`);
            mainWindow?.loadURL(TARGET_URL);
        });
        request.on('error', (error: any) => {
            console.log('Connection failed, attempting to start server...', error);
            // Launch start_dev.bat if we are on localhost and connection failed
            if (TARGET_URL.includes('localhost')) {
                const child_process = require('child_process');

                // Search for start scripts. 
                // Priority 1: 'start_bundle.bat' in the same folder as the exe (Full Bundle Mode)
                // Priority 2: 'start_dev.bat' in development/production structure
                const possiblePaths = [
                    path.join(path.dirname(app.getPath('exe')), 'start_bundle.bat'), // Bundle mode
                    path.join(process.cwd(), 'start_dev.bat'),
                    path.join(path.dirname(app.getPath('exe')), 'start_dev.bat'),
                    path.join(path.dirname(app.getPath('exe')), '../start_dev.bat'),
                    path.join(__dirname, '../../start_dev.bat')
                ];

                let scriptPath = possiblePaths.find(p => require('fs').existsSync(p));

                if (scriptPath) {
                    console.log('Found start script:', scriptPath);
                    child_process.spawn('cmd.exe', ['/c', 'start', '""', scriptPath], {
                        detached: true,
                        stdio: 'ignore'
                    });
                    // Wait a bit and retry loading
                    setTimeout(() => mainWindow?.loadURL(TARGET_URL), 8000); // Increased timeout for full bundle start
                } else {
                    console.error('Start script not found in:', possiblePaths);
                    mainWindow?.loadFile(path.join(__dirname, '../src/offline.html'));
                }
            } else {
                mainWindow?.loadFile(path.join(__dirname, '../src/offline.html'));
            }
        });
        request.end();
    };

    checkConnection();

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Open external links in default browser
        if (!url.startsWith(TARGET_URL)) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Check for updates
    autoUpdater.checkForUpdatesAndNotify();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
});
autoUpdater.on('update-available', (info) => {
    console.log('Update available.', info);
});
autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available.', info);
});
autoUpdater.on('error', (err) => {
    console.log('Error in auto-updater. ' + err);
});
autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    console.log(log_message);
});
autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded');
    autoUpdater.quitAndInstall();
});
