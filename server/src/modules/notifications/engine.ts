import prisma from '../../utils/prisma';
import { sendWhatsAppMessage } from './whatsapp.service';
import { createNotification as createInAppNotification } from './service';

export const sendSmartNotification = async (
    userId: string,
    category: string, // ATTENDANCE, TASKS, PAYROLL, REQUESTS, MEETINGS
    title: string,
    message: string,
    link?: string
) => {
    // 1. Check User Preferences
    let appEnabled = true;
    let waEnabled = true;

    const prefs = await prisma.userNotificationPreference.findUnique({
        where: {
            user_id_category: {
                user_id: userId,
                category: category
            }
        }
    });

    if (prefs) {
        appEnabled = prefs.app_enabled;
        waEnabled = prefs.whatsapp_enabled;
    }

    // 2. Deliver In-App Notice
    if (appEnabled) {
        try {
            await createInAppNotification(userId, category, message, link);
            await prisma.notificationLog.create({
                data: {
                    user_id: userId,
                    channel: 'APP',
                    message,
                    status: 'SENT'
                }
            });
        } catch(e: any) {
            await prisma.notificationLog.create({
                data: { user_id: userId, channel: 'APP', message, status: 'FAILED', error_message: e.message }
            });
        }
    }

    // 3. Deliver WhatsApp Notice
    if (waEnabled) {
        const success = await sendWhatsAppMessage(userId, message);
        await prisma.notificationLog.create({
            data: {
                user_id: userId,
                channel: 'WHATSAPP',
                message,
                status: success ? 'SENT' : 'FAILED'
            }
        });
    }

    return true;
};
