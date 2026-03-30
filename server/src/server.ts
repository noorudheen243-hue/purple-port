import 'dotenv/config';
import app from './app';
// import cors from 'cors'; // cors handled in app.ts
import { syncBiometrics, BiometricDaemon } from './modules/attendance/biometric.service';
import { initAIEngine } from './cron/aiNotificationEngine';
import { waEngine } from './modules/whatsapp/WhatsAppEngine';

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
    
    // 1. Initialize WhatsApp Engine immediately (High Priority)
    console.log('[Server] Auto-starting WhatsApp Engine...');
    waEngine.initialize().catch(err => {
        console.warn('[Server] WhatsApp Engine auto-init failed (non-critical):', err?.message);
    });

    // 2. Initialize Biometrics (May be slow/long-running)
    try {
        await BiometricDaemon.start();
    } catch (err: any) {
        console.warn('[Server] BiometricDaemon failed to start:', err.message);
    }

    // 3. Initialize AI Engine
    initAIEngine();
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

