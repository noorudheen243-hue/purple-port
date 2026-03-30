import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { execSync } from 'child_process';
import path from 'path';
import qrcode from 'qrcode';

export class WhatsAppEngine {
    private static instance: WhatsAppEngine;
    private client: Client | null = null;
    public status: 'DISCONNECTED' | 'INITIALIZING' | 'CONNECTED' | 'QR_READY' | 'FAILED' = 'DISCONNECTED';
    public qrDataUrl: string | null = null;
    public connectedNumber: string | null = null;

    private constructor() {}

    public static getInstance(): WhatsAppEngine {
        if (!WhatsAppEngine.instance) {
            WhatsAppEngine.instance = new WhatsAppEngine();
        }
        return WhatsAppEngine.instance;
    }

    public async initialize() {
        if (this.status === 'INITIALIZING' || this.status === 'CONNECTED') {
            console.log(`[WhatsApp Engine] Skip init: Status is ${this.status}`);
            return;
        }
        
        console.log('[WhatsApp Engine] Initializing V12 (Chrome Stable Force)...');
        this.status = 'INITIALIZING';

        // Set a timeout to prevent permanent "INITIALIZING" state
        const initTimeout = setTimeout(() => {
            if (this.status === 'INITIALIZING') {
                console.error('[WhatsApp Engine] Initialization timed out after 120s. Resetting...');
                this.hardReset();
            }
        }, 120000);

        try {
            const dataPath = process.platform === 'linux' ? '/var/www/purple-port/server/.wwebjs_auth' : './.wwebjs_auth';
            const chromePath = process.platform === 'linux' ? '/usr/bin/google-chrome-stable' : undefined;

            console.log(`[WhatsApp Engine] Launching browser at: ${chromePath || 'Default'}`);

            this.client = new Client({
                authStrategy: new LocalAuth({ 
                    clientId: 'session',
                    dataPath: dataPath 
                }),
                puppeteer: {
                    executablePath: chromePath,
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                        '--disable-software-rasterizer',
                        '--disable-extensions',
                        '--disable-features=IsolateOrigins,site-per-process',
                        '--hide-scrollbars',
                        '--mute-audio',
                        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                    ],
                }
            });

            this.client.on('qr', async (qr: string) => {
                clearTimeout(initTimeout);
                try {
                    this.qrDataUrl = await qrcode.toDataURL(qr);
                } catch (e) {
                    this.qrDataUrl = qr;
                }
                this.status = 'QR_READY';
                console.log('[WhatsApp Engine] QR Code received and converted to data URL.');
            });

            this.client.on('ready', () => {
                clearTimeout(initTimeout);
                this.status = 'CONNECTED';
                this.qrDataUrl = null;
                this.connectedNumber = this.client?.info.wid.user || null;
                console.log('[WhatsApp Engine] SUCCESS: Connected as', this.connectedNumber);
            });

            this.client.on('authenticated', () => {
                console.log('[WhatsApp Engine] Authentication successful.');
            });

            this.client.on('auth_failure', (msg) => {
                console.error('[WhatsApp Engine] Auth failure:', msg);
                this.hardReset();
            });

            this.client.on('disconnected', (reason) => {
                console.warn('[WhatsApp Engine] Client disconnected:', reason);
                this.status = 'DISCONNECTED';
            });

            console.log('[WhatsApp Engine] Starting client initialization...');
            await this.client.initialize();
            console.log('[WhatsApp Engine] Browser process started.');

        } catch (err: any) {
            console.error('[WhatsApp Engine] Failed to initialize V12:', err.stack || err.message);
            this.status = 'FAILED';
            clearTimeout(initTimeout);
        }
    }

    private async hardReset() {
        console.log('[WhatsApp Engine] Hard reset triggered.');
        this.status = 'DISCONNECTED';
        this.qrDataUrl = null;
        if (this.client) {
            try { 
                await this.client.destroy(); 
            } catch (e) {}
            this.client = null;
        }
        if (process.platform === 'linux') {
            try { execSync('pkill -f chrome || true'); } catch (e) {}
        }
        // Wait 15 seconds before retry
        setTimeout(() => this.initialize(), 15000);
    }

    public async logout() {
        if (!this.client) return;
        try {
            await this.client.logout();
            await this.client.destroy();
        } catch (e) {}
        this.status = 'DISCONNECTED';
        this.client = null;
        this.qrDataUrl = null;
    }

    private formatNumber(phone: string): string {
        let clean = phone.replace(/\D/g, '');
        if (clean.length === 10) clean = '91' + clean;
        return `${clean}@c.us`;
    }

    public async sendText(phone: string, text: string): Promise<boolean> {
        if (this.status !== 'CONNECTED' || !this.client) {
            console.log('[WhatsApp Engine] Send aborted: Not connected.');
            return false;
        }
        try {
            const jid = this.formatNumber(phone);
            await this.client.sendMessage(jid, text);
            return true;
        } catch (error: any) {
            console.error(`[WhatsApp Engine] Send error:`, error.message);
            if (error.message.includes('detached Frame') || error.message.includes('Target closed')) {
                this.hardReset();
            }
            return false;
        }
    }

    public async sendDocument(phone: string, filePath: string, filename: string): Promise<boolean> {
        if (this.status !== 'CONNECTED' || !this.client) return false;
        try {
            const jid = this.formatNumber(phone);
            const media = MessageMedia.fromFilePath(filePath);
            await this.client.sendMessage(jid, media, { caption: filename });
            return true;
        } catch (e) { return false; }
    }
}

export const waEngine = WhatsAppEngine.getInstance();
