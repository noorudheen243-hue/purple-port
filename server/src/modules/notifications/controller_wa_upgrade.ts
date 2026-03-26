import { Request, Response } from 'express';
import prisma from '../../utils/prisma';
import axios from 'axios';

// ... other controller functions (getMyNotifications, etc)

export const sendTestWhatsApp = async (req: Request, res: Response) => {
    try {
        const { phoneNumber, message } = req.body;
        
        // Fetch real gateway config from DB
        const settings = await prisma.systemSetting.findMany({
            where: { key: { in: ['WHATSAPP_API_URL', 'WHATSAPP_API_TOKEN', 'WHATSAPP_ENABLED'] } }
        });
        
        const config = settings.reduce((acc: any, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {});

        const trackingId = `WA-LIVE-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        if (config.WHATSAPP_ENABLED === 'true' && config.WHATSAPP_API_URL && config.WHATSAPP_API_TOKEN) {
            console.log(`[WA LIVE GATEWAY] Attempting real dispatch via ${config.WHATSAPP_API_URL}`);
            
            // Format for UltraMsg (common) or generic POST.
            // Using common param names: to, body, token
            try {
                await axios.post(config.WHATSAPP_API_URL, {
                    to: phoneNumber,
                    body: message,
                    token: config.WHATSAPP_API_TOKEN,
                    // Fallback names for other providers
                    phone: phoneNumber,
                    message: message,
                    msg: message,
                    apikey: config.WHATSAPP_API_TOKEN
                }, { timeout: 10000 });
                
                return res.json({ 
                    success: true, 
                    tracking_id: trackingId,
                    status: 'DELIVERED',
                    gateway: 'LIVE_API_DISPATCH',
                    message: "Real message successfully handed off to your WhatsApp provider." 
                });
            } catch (apiErr: any) {
                console.error("[WA LIVE GATEWAY] API Error:", apiErr.message);
                return res.status(500).json({ success: false, message: "Gateway API rejected the request. Check your URL/Token." });
            }
        }

        // Fallback to Mock
        console.log(`[WA MOCK LAYER] [${trackingId}] Target: ${phoneNumber} | Msg: ${message}`);
        res.json({ 
            success: true, 
            tracking_id: trackingId,
            status: 'SIMULATED',
            gateway: 'INTERNAL_MOCK_ENGINE',
            message: "Credentials missing. Message logged to server console only." 
        });
        
    } catch (err: any) {
        res.status(500).json({ message: "Backend error during Trial Dispatch." });
    }
}

// ... rest of the controller (updateAIRule, etc)
