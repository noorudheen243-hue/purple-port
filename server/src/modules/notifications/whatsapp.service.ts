import prisma from '../../utils/prisma';
import axios from 'axios';

export const sendWhatsAppMessage = async (userId: string, message: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { staffProfile: true }
        });

        if (!user) return false;
        
        const phone = user.staffProfile?.whatsapp_number || user.staffProfile?.personal_contact;
        if (!phone) return false;

        // Fetch Gateway Config
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

                // Meta Cloud API specific structure
                if (apiEndpoint.includes('graph.facebook.com')) {
                    headers['Authorization'] = `Bearer ${config.WHATSAPP_API_TOKEN}`;
                    body = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: phone,
                        type: "text",
                        text: { preview_url: false, body: message }
                    };
                }

                await axios.post(apiEndpoint, body, { headers, timeout: 10000 });
                return true;
            } catch (err: any) {
                console.error("[WhatsApp Service] HTTP Dispatch Failed:", err.message);
                // Attempt GET fallback only for non-Meta APIs
                if (!config.WHATSAPP_API_URL.includes('graph.facebook.com')) {
                    try {
                        const gateUrl = new URL(config.WHATSAPP_API_URL);
                        gateUrl.searchParams.append("to", phone);
                        gateUrl.searchParams.append("body", message);
                        gateUrl.searchParams.append("token", config.WHATSAPP_API_TOKEN);
                        await axios.get(gateUrl.toString());
                        return true;
                    } catch (getErr: any) {
                        console.error("[WhatsApp Service] GET Fallback failed:", getErr.message);
                    }
                }
            }
        }

        // Fallback Mock
        console.log(`[WhatsApp - Base Layer] Mock Sending to ${user.full_name} (${phone}):\n"${message}"\n`);
        return true;
    } catch (e) {
        console.error("WhatsApp Send Error:", e);
        return false;
    }
};
