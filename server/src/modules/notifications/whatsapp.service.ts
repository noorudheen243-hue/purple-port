import prisma from '../../utils/prisma';
import axios from 'axios';

/**
 * Sends a WhatsApp TEXT message to a user by their user ID.
 * Priority: Custom WhatsApp Engine → DB Gateway Config → Mock fallback.
 */
export const sendWhatsAppMessage = async (userId: string, message: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { staffProfile: true }
        });

        if (!user) return false;
        
        const phone = user.staffProfile?.whatsapp_number || user.staffProfile?.personal_contact;
        if (!phone) return false;

        return await dispatchWhatsAppText(phone, message);
    } catch (e) {
        console.error('[WhatsApp Service] sendWhatsAppMessage error:', e);
        return false;
    }
};

/**
 * Core dispatcher — routes through the internal Custom WhatsApp Engine first,
 * falls back to the DB-configured API gateway (legacy UltraMsg / Meta Cloud), 
 * then falls back to mock logging.
 */
export const dispatchWhatsAppText = async (phone: string, message: string): Promise<boolean> => {
    // ── 1. Try Internal Custom Engine ──────────────────────────────────────
    try {
        const { waEngine } = await import('../whatsapp/WhatsAppEngine');
        if (waEngine.status === 'CONNECTED') {
            const sent = await waEngine.sendText(phone, message);
            if (sent) {
                console.log(`[WhatsApp] ✅ [Custom Engine] Sent to ${phone}`);
                return true;
            }
        }
    } catch (_) {
        // Engine not initialized yet — fall through to API gateway
    }

    // ── 2. Try DB-configured API Gateway (legacy) ───────────────────────────
    const settings = await prisma.systemSetting.findMany({
        where: { key: { in: ['WHATSAPP_API_URL', 'WHATSAPP_API_TOKEN', 'WHATSAPP_ENABLED'] } }
    });
    
    const config = settings.reduce((acc: any, s) => {
        acc[s.key] = s.value;
        return acc;
    }, {});

    if (config.WHATSAPP_ENABLED === 'true' && config.WHATSAPP_API_URL && config.WHATSAPP_API_TOKEN) {
        try {
            const apiEndpoint = config.WHATSAPP_API_URL;
            const headers: any = { 'Content-Type': 'application/json' };
            let body: any = {
                to: phone,
                body: message,
                token: config.WHATSAPP_API_TOKEN,
                phone: phone,
                message: message,
                apikey: config.WHATSAPP_API_TOKEN
            };

            if (apiEndpoint.includes('graph.facebook.com')) {
                headers['Authorization'] = `Bearer ${config.WHATSAPP_API_TOKEN}`;
                body = {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: phone,
                    type: 'text',
                    text: { preview_url: false, body: message }
                };
            }

            await axios.post(apiEndpoint, body, { headers, timeout: 10000 });
            console.log(`[WhatsApp] ✅ [API Gateway] Sent to ${phone}`);
            return true;
        } catch (err: any) {
            console.error('[WhatsApp] API Gateway failed:', err.message);
            // GET fallback for simple gateways
            if (!config.WHATSAPP_API_URL.includes('graph.facebook.com')) {
                try {
                    const gateUrl = new URL(config.WHATSAPP_API_URL);
                    gateUrl.searchParams.append('to', phone);
                    gateUrl.searchParams.append('body', message);
                    gateUrl.searchParams.append('token', config.WHATSAPP_API_TOKEN);
                    await axios.get(gateUrl.toString(), { timeout: 8000 });
                    return true;
                } catch (_) {}
            }
        }
    }

    // ── 3. Mock fallback ───────────────────────────────────────────────────
    console.log(`[WhatsApp - Mock] To ${phone}: "${message}"`);
    return true;
};
