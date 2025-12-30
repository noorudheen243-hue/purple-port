import prisma from '../../utils/prisma';

export const createNotification = async (
    userId: string,
    type: string,
    message: string,
    link?: string
) => {
    return await prisma.notification.create({
        data: {
            user_id: userId,
            type,
            message,
            link
        }
    });
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
