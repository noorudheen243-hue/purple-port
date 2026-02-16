import 'dotenv/config';
import app from './app';
// import cors from 'cors'; // cors handled in app.ts
import { syncBiometrics } from './modules/attendance/biometric.service';

const PORT = process.env.PORT || 4001;

import prisma from './utils/prisma';
// Biometric service might keep socket open, so we don't strictly close it here as it closes after sync, 
// but we ensure process exits cleanly.

import http from 'http';
import SocketService from './socket';

const server = http.createServer(app);

// Initialize Socket.IO
SocketService.initialize(server, [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4001',
    'http://72.61.246.22',
    'http://66.116.224.221',
    process.env.CLIENT_URL || ''
].filter(Boolean));

const runningServer = server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    // Auto-Run Biometric Sync on Startup (Non-blocking)
    // syncBiometrics().catch(err => console.error('Startup Sync Error:', err));
});

const shutdown = async () => {
    console.log('--- Stopping Server ---');
    runningServer.close(() => {
        console.log('HTTP Server closed.');
    });

    try {
        await prisma.$disconnect();
        console.log('Database disconnected.');
    } catch (e) {
        console.error('Error disconnecting DB:', e);
    }

    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

