import { Request, Response } from 'express';
import { waEngine } from './WhatsAppEngine';

export async function getStatus(req: Request, res: Response) {
    res.json({
        status: waEngine.status,
        qrUrl: waEngine.qrDataUrl,
        connectedNumber: waEngine.connectedNumber || (waEngine as any).client?.info?.wid?.user
    });
}

export async function requestInitialization(req: Request, res: Response) {
    if (waEngine.status === 'DISCONNECTED' || waEngine.status === 'QR_READY') {
        // Kick off the init process. It handles existing cache gracefully.
        waEngine.initialize();
        res.json({ message: 'Initialization started' });
    } else {
        res.json({ message: 'WhatsApp Engine is already initializing or connected.' });
    }
}

export async function logout(req: Request, res: Response) {
    await waEngine.logout();
    res.json({ message: 'Logged out successfully' });
}
