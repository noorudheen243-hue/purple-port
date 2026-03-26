"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class SocketService {
    constructor() {
        this.io = null;
        // Map to track connected users: userId -> Set<socketId>
        this.userSockets = new Map();
    }
    static getInstance() {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }
    initialize(httpServer, allowedOrigins) {
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: allowedOrigins,
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: 60000,
        });
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error'));
            }
            jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err)
                    return next(new Error('Authentication error'));
                socket.user = decoded;
                next();
            });
        });
        this.io.on('connection', (socket) => {
            var _a;
            if (!socket.user)
                return;
            const userId = socket.user.id;
            console.log(`[Socket] User connected: ${socket.user.name} (${userId})`);
            // Add to User Map
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            (_a = this.userSockets.get(userId)) === null || _a === void 0 ? void 0 : _a.add(socket.id);
            // Broadcast User Online Status
            socket.broadcast.emit('user_status', { userId, status: 'ONLINE' });
            // Handle Join Room (Conversation)
            socket.on('join_conversation', (conversationId) => {
                var _a;
                socket.join(conversationId);
                console.log(`[Socket] User ${(_a = socket.user) === null || _a === void 0 ? void 0 : _a.name} joined conversation ${conversationId}`);
            });
            // Handle Typing Indicator
            socket.on('typing', (data) => {
                var _a, _b;
                socket.to(data.conversationId).emit('typing', {
                    userId: (_a = socket.user) === null || _a === void 0 ? void 0 : _a.id,
                    conversationId: data.conversationId,
                    isTyping: data.isTyping,
                    name: (_b = socket.user) === null || _b === void 0 ? void 0 : _b.name // Optional helper
                });
            });
            // Handle Disconnect
            socket.on('disconnect', () => {
                const userSockets = this.userSockets.get(userId);
                if (userSockets) {
                    userSockets.delete(socket.id);
                    if (userSockets.size === 0) {
                        this.userSockets.delete(userId);
                        // Broadcast Offline
                        socket.broadcast.emit('user_status', { userId, status: 'OFFLINE' });
                    }
                }
                console.log(`[Socket] User disconnected: ${userId}`);
            });
        });
        console.log('[Socket] Socket.IO Initialized');
    }
    getIO() {
        if (!this.io) {
            throw new Error('Socket.IO not initialized!');
        }
        return this.io;
    }
    emitToRoom(roomId, event, data) {
        if (this.io) {
            this.io.to(roomId).emit(event, data);
        }
    }
    emitToUser(userId, event, data) {
        // Emit to all sockets for this user (multi-device)
        const sockets = this.userSockets.get(userId);
        if (sockets && this.io) {
            sockets.forEach(socketId => {
                var _a;
                (_a = this.io) === null || _a === void 0 ? void 0 : _a.to(socketId).emit(event, data);
            });
        }
    }
}
exports.default = SocketService.getInstance();
