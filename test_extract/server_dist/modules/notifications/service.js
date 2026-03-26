"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyAdmins = exports.markAllAsRead = exports.markNotificationAsRead = exports.getUserNotifications = exports.createNotification = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const socket_1 = __importDefault(require("../../socket"));
const createNotification = (userId, type, message, link) => __awaiter(void 0, void 0, void 0, function* () {
    const notification = yield prisma_1.default.notification.create({
        data: {
            user_id: userId,
            type,
            message,
            link
        }
    });
    // Real-time Push
    socket_1.default.emitToUser(userId, 'notification', notification);
    return notification;
});
exports.createNotification = createNotification;
const getUserNotifications = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.notification.findMany({
        where: { user_id: userId },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
});
exports.getUserNotifications = getUserNotifications;
const markNotificationAsRead = (id, userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.notification.update({
        where: { id, user_id: userId },
        data: { read: true }
    });
});
exports.markNotificationAsRead = markNotificationAsRead;
const markAllAsRead = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.notification.updateMany({
        where: { user_id: userId, read: false },
        data: { read: true }
    });
});
exports.markAllAsRead = markAllAsRead;
// Notify All Admins/Managers
const notifyAdmins = (type, message, link) => __awaiter(void 0, void 0, void 0, function* () {
    // Find all users with administrative roles
    const admins = yield prisma_1.default.user.findMany({
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
        yield prisma_1.default.notification.createMany({
            data: notifications
        });
        // Real-time Push to each admin
        notifications.forEach(n => {
            socket_1.default.emitToUser(n.user_id, 'notification', n);
        });
    }
});
exports.notifyAdmins = notifyAdmins;
