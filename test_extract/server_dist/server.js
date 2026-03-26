"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
// import cors from 'cors'; // cors handled in app.ts
const biometric_service_1 = require("./modules/attendance/biometric.service");
const PORT = process.env.PORT || 4001;
const prisma_1 = __importDefault(require("./utils/prisma"));
// Biometric service might keep socket open, so we don't strictly close it here as it closes after sync, 
// but we ensure process exits cleanly.
const http_1 = __importDefault(require("http"));
const socket_1 = __importDefault(require("./socket"));
const server = http_1.default.createServer(app_1.default);
// Initialize Socket.IO
socket_1.default.initialize(server, [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4001',
    'http://72.61.246.22',
    'http://66.116.224.221',
    process.env.CLIENT_URL || ''
].filter(Boolean));
const runningServer = server.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Server running on port ${PORT}`);
    // Start Biometric Management Service (Heartbeat + Auto-Sync)
    biometric_service_1.BiometricDaemon.start();
}));
const shutdown = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('--- Stopping Server ---');
    runningServer.close(() => {
        console.log('HTTP Server closed.');
    });
    try {
        yield prisma_1.default.$disconnect();
        console.log('Database disconnected.');
    }
    catch (e) {
        console.error('Error disconnecting DB:', e);
    }
    process.exit(0);
});
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
