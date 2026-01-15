import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthSocket extends Socket {
    user?: {
        id: string;
        role: string;
        name: string;
    };
}

class SocketService {
    private io: Server | null = null;
    private static instance: SocketService;

    // Map to track connected users: userId -> Set<socketId>
    private userSockets: Map<string, Set<string>> = new Map();

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public initialize(httpServer: HttpServer, allowedOrigins: string[]) {
        this.io = new Server(httpServer, {
            cors: {
                origin: allowedOrigins,
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: 60000,
        });

        this.io.use((socket: AuthSocket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error'));
            }
            jwt.verify(token, process.env.JWT_SECRET as string, (err: any, decoded: any) => {
                if (err) return next(new Error('Authentication error'));
                socket.user = decoded;
                next();
            });
        });

        this.io.on('connection', (socket: AuthSocket) => {
            if (!socket.user) return;
            const userId = socket.user.id;

            console.log(`[Socket] User connected: ${socket.user.name} (${userId})`);

            // Add to User Map
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)?.add(socket.id);

            // Broadcast User Online Status
            socket.broadcast.emit('user_status', { userId, status: 'ONLINE' });

            // Handle Join Room (Conversation)
            socket.on('join_conversation', (conversationId: string) => {
                socket.join(conversationId);
                console.log(`[Socket] User ${socket.user?.name} joined conversation ${conversationId}`);
            });

            // Handle Typing Indicator
            socket.on('typing', (data: { conversationId: string, isTyping: boolean }) => {
                socket.to(data.conversationId).emit('typing', {
                    userId: socket.user?.id,
                    conversationId: data.conversationId,
                    isTyping: data.isTyping,
                    name: socket.user?.name // Optional helper
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

    public getIO(): Server {
        if (!this.io) {
            throw new Error('Socket.IO not initialized!');
        }
        return this.io;
    }

    public emitToRoom(roomId: string, event: string, data: any) {
        if (this.io) {
            this.io.to(roomId).emit(event, data);
        }
    }

    public emitToUser(userId: string, event: string, data: any) {
        // Emit to all sockets for this user (multi-device)
        const sockets = this.userSockets.get(userId);
        if (sockets && this.io) {
            sockets.forEach(socketId => {
                this.io?.to(socketId).emit(event, data);
            });
        }
    }
}

export default SocketService.getInstance();
