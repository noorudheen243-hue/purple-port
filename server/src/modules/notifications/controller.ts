import { Request, Response } from 'express';
import * as notificationService from './service';
import prisma from '../../utils/prisma';
import axios from 'axios';
import { waEngine } from '../whatsapp/WhatsAppEngine';

export const getMyNotifications = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('Unauthorized');
        const notifications = await notificationService.getUserNotifications(req.user.id);
        res.json(notifications);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('Unauthorized');
        await notificationService.markNotificationAsRead(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAllRead = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('Unauthorized');
        await notificationService.markAllAsRead(req.user.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- SMART NOTIFICATION PREFERENCES & AI LOGS ---
export const getPreferences = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('Unauthorized');
        const prefs = await prisma.userNotificationPreference.findMany({
            where: { user_id: req.user.id }
        });
        res.json(prefs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updatePreferences = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('Unauthorized');
        const { category, app_enabled, whatsapp_enabled } = req.body;
        
        const pref = await prisma.userNotificationPreference.upsert({
            where: {
                user_id_category: { user_id: req.user.id, category }
            },
            update: { app_enabled, whatsapp_enabled },
            create: { user_id: req.user.id, category, app_enabled, whatsapp_enabled }
        });
        res.json(pref);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAILogs = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('Unauthorized');
        const logs = await prisma.aIAlertLog.findMany({
            where: { user_id: req.user.id, is_resolved: false },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const resolveAILog = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('Unauthorized');
        await prisma.aIAlertLog.update({
            where: { id: req.params.id },
            data: { is_resolved: true }
        });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- AI ALERT RULES (ADMIN) ---
export const getAIRules = async (req: Request, res: Response) => {
    try {
        let rules = await prisma.aINotificationRule.findMany({
            orderBy: { createdAt: 'asc' }
        });

        // AUTO-SEED IF EMPTY
        if (rules.length === 0) {
            console.log("🌱 Database: No AI Rules found. Seeding defaults...");
            const defaults = [
                { name: 'Task Overdue Level 1', trigger_type: 'TASK_DELAY', config_json: JSON.stringify({ threshold_days: 1 }), message_template: "Task '{task_name}' is pending beyond expected time. Please take action.", is_active: true },
                { name: 'Task Overdue Level 2 (Manager)', trigger_type: 'TASK_DELAY', config_json: JSON.stringify({ threshold_days: 3 }), message_template: "Urgent: '{task_name}' assigned to {staff_name} is delayed by {delay_days} days.", is_active: true },
                { name: 'Attendance Pattern Warning', trigger_type: 'ATTENDANCE_PATTERN', config_json: JSON.stringify({ threshold_count: 3, period_days: 7 }), message_template: "You have been marked late {late_count} times this week.", is_active: true },
                { name: 'Request Pending Alert', trigger_type: 'PENDING_REQUEST', config_json: JSON.stringify({ threshold_hours: 24 }), message_template: "A leave/regularization request by {staff_name} is pending for more than 24 hours.", is_active: true },
                { name: 'MoM Followup Alert', trigger_type: 'MEETING_FOLLOWUP', config_json: JSON.stringify({ threshold_hours: 24 }), message_template: "MoM for meeting '{meeting_title}' is pending over 24 hours.", is_active: true }
            ];

            await prisma.aINotificationRule.createMany({
                data: defaults
            });

            rules = await prisma.aINotificationRule.findMany();
        }

        res.json(rules);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const sendTestWhatsApp = async (req: Request, res: Response) => {
    try {
        const { phoneNumber, message } = req.body;
        
        const trackingId = `WA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        // ── PRIORITY 1: Use in-house WhatsApp Engine if connected ─────────────
        if (waEngine.status === 'CONNECTED') {
            console.log(`[WA ENGINE DISPATCH] Sending test to ${phoneNumber} via in-house engine`);
            const sent = await waEngine.sendText(phoneNumber, message);
            if (sent) {
                return res.json({
                    success: true,
                    tracking_id: trackingId,
                    status: 'DELIVERED',
                    gateway: 'QIX_INTERNAL_ENGINE',
                    message: 'Test message dispatched via in-house WhatsApp Engine.'
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: 'Engine is connected but failed to dispatch. Check server logs.'
                });
            }
        }

        // ── PRIORITY 2: Third-party Gateway API ───────────────────────────────
        const settings = await prisma.systemSetting.findMany({
            where: { key: { in: ['WHATSAPP_API_URL', 'WHATSAPP_API_TOKEN', 'WHATSAPP_ENABLED'] } }
        });
        
        const config = settings.reduce((acc: any, s: any) => {
            acc[s.key] = s.value;
            return acc;
        }, {});

        let apiEndpoint = config.WHATSAPP_API_URL || '';
        if (apiEndpoint.includes('ultramsg.com') && !apiEndpoint.endsWith('/messages/chat')) {
             apiEndpoint = apiEndpoint.replace(/\/+$/, '') + '/messages/chat';
        }

        if (config.WHATSAPP_ENABLED === 'true' && apiEndpoint && config.WHATSAPP_API_TOKEN) {
            console.log(`[WA LIVE GATEWAY] Attempting real dispatch via ${apiEndpoint}`);
            
            try {
                const headers: any = { 'Content-Type': 'application/json' };
                let body: any = {
                    to: phoneNumber,
                    body: message,
                    token: config.WHATSAPP_API_TOKEN,
                    phone: phoneNumber,
                    message: message,
                    apikey: config.WHATSAPP_API_TOKEN
                };

                // SPECIAL FORMAT FOR META CLOUD API
                if (apiEndpoint.includes('graph.facebook.com')) {
                    headers['Authorization'] = `Bearer ${config.WHATSAPP_API_TOKEN}`;
                    body = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: phoneNumber,
                        type: "text",
                        text: { preview_url: false, body: message }
                    };
                }

                const resData = await axios.post(apiEndpoint, body, { headers, timeout: 10000 });
                
                return res.json({ 
                    success: true, 
                    tracking_id: trackingId,
                    status: 'DELIVERED',
                    gateway: 'LIVE_API_DISPATCH',
                    details: resData.data, // PROVIDE REAL FEEDBACK
                    message: "Real message successfully handed off to your WhatsApp provider." 
                });
            } catch (apiErr: any) {
                console.error("[WA LIVE GATEWAY] API Error:", apiErr.response?.data || apiErr.message);
                
                // ATTEMPT GET FALLBACK (some simple gateways)
                try {
                    console.log("[WA LIVE GATEWAY] Attempting GET Fallback...");
                    const gateUrl = new URL(config.WHATSAPP_API_URL);
                    gateUrl.searchParams.append("to", phoneNumber);
                    gateUrl.searchParams.append("body", message);
                    gateUrl.searchParams.append("token", config.WHATSAPP_API_TOKEN);
                    const resGet = await axios.get(gateUrl.toString());

                    return res.json({ 
                        success: true, 
                        tracking_id: trackingId,
                        status: 'DELIVERED (GET)',
                        gateway: 'LIVE_GATEWAY_V1',
                        details: resGet.data,
                        message: "Real message sent via HTTP GET fallback." 
                    });
                } catch (getErr: any) {
                    return res.status(500).json({ 
                        success: false, 
                        message: "Gateway API rejected the request.",
                        error: apiErr.response?.data?.message || apiErr.message,
                        hint: "Ensure your URL ends with /messages/chat for UltraMsg or similar endpoints."
                    });
                }
            }
        }

        // ── PRIORITY 3: Simulated (no engine, no gateway config) ─────────────
        console.log(`[WA MOCK LAYER] [${trackingId}] Engine: ${waEngine.status} | Target: ${phoneNumber}`);
        res.json({ 
            success: true, 
            tracking_id: trackingId,
            status: 'SIMULATED',
            gateway: 'INTERNAL_MOCK_ENGINE',
            message: "Engine not connected and no Gateway API configured. Connect the WhatsApp Engine or add API credentials to dispatch real messages." 
        });
        
    } catch (err: any) {
        res.status(500).json({ message: "Backend failure during trial dispatch." });
    }
}


export const updateAIRule = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { trigger_type, is_active, config_json, message_template, name } = req.body;
        
        const rule = await prisma.aINotificationRule.upsert({
            where: { id: id || 'new-uuid' }, // This relies on client sending uuid or a fallback
            update: { trigger_type, is_active, config_json, message_template, name },
            create: { trigger_type, is_active, config_json, message_template, name }
        });
        res.json(rule);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const batchUpdateAIRules = async (req: Request, res: Response) => {
    try {
        const { rules } = req.body; // Array of rules
        const results = await Promise.all(
            rules.map((r: any) => prisma.aINotificationRule.upsert({
                where: { name: r.name },
                update: { trigger_type: r.trigger_type, is_active: r.is_active, config_json: r.config_json, message_template: r.message_template },
                create: { name: r.name, trigger_type: r.trigger_type, is_active: r.is_active, config_json: r.config_json, message_template: r.message_template }
            }))
        );
        res.json(results);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
