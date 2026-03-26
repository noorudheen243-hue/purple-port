import prisma from '../../utils/prisma';
import SocketService from '../../socket';

export const createNotification = async (
    userId: string,
    type: string,
    message: string,
    link?: string
) => {
    const notification = await prisma.notification.create({
        data: {
            user_id: userId,
            type,
            message,
            link
        }
    });

    // Real-time Push
    SocketService.emitToUser(userId, 'notification', notification);

    return notification;
};

export const getUserNotifications = async (userId: string) => {
    return await prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
};

export const markNotificationAsRead = async (id: string, userId: string) => {
    return await prisma.notification.update({
        where: { id, user_id: userId },
        data: { read: true }
    });
};

export const markAllAsRead = async (userId: string) => {
    return await prisma.notification.updateMany({
        where: { user_id: userId, read: false },
        data: { read: true }
    });
};
// Notify All Admins/Managers
export const notifyAdmins = async (type: string, message: string, link?: string) => {
    // Find all users with administrative roles
    const admins = await prisma.user.findMany({
        where: {
            role: {
                in: ['ADMIN', 'MANAGER', 'DEVELOPER_ADMIN']
            }
        },
        select: { id: true }
    });

    // Create notifications for all of them
    const notifications = admins.map(admin => ({
        user_id: admin.id,
        type,
        message,
        link,
        read: false,
        createdAt: new Date()
    }));

    if (notifications.length > 0) {
        await prisma.notification.createMany({
            data: notifications
        });

        // Real-time Push to each admin
        notifications.forEach(n => {
            SocketService.emitToUser(n.user_id, 'notification', n);
        });
    }
};
