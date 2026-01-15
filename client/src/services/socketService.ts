import { io, Socket } from 'socket.io-client';

class SocketService {
    private socket: Socket | null = null;
    private static instance: SocketService;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public connect(token: string) {
        if (this.socket?.connected) return;

        const url = (import.meta as any).env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4001';

        this.socket = io(url, {
            auth: { token },
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('[Socket] Connected as ' + this.socket?.id);
        });

        this.socket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
        });

        this.socket.on('connect_error', (err) => {
            console.error('[Socket] Connection Error:', err);
        });
    }

    public disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    public getSocket(): Socket | null {
        return this.socket;
    }

    public emit(event: string, data: any) {
        this.socket?.emit(event, data);
    }

    public on(event: string, callback: (data: any) => void) {
        this.socket?.on(event, callback);
    }

    public off(event: string) {
        this.socket?.off(event);
    }
}

export default SocketService.getInstance();
