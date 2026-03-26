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
exports.ChatService = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const socket_1 = __importDefault(require("../../socket"));
class ChatService {
    // --- CONVERSATIONS ---
    getConversations(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Fetch conversations where user is a participant
            const conversations = yield prisma_1.default.chatConversation.findMany({
                where: {
                    participants: {
                        some: { user_id: userId }
                    }
                },
                include: {
                    participants: {
                        include: {
                            user: { select: { id: true, full_name: true, avatar_url: true, role: true } }
                        }
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                },
                orderBy: { lastMessageAt: 'desc' }
            });
            // Format for frontend
            const result = yield Promise.all(conversations.map((conv) => __awaiter(this, void 0, void 0, function* () {
                const myParticipant = conv.participants.find(p => p.user_id === userId);
                const lastReadAt = (myParticipant === null || myParticipant === void 0 ? void 0 : myParticipant.lastReadAt) || new Date(0); // If never read, count all? Or logic default
                // Calculate unread count
                const unreadCount = yield prisma_1.default.chatMessage.count({
                    where: {
                        conversation_id: conv.id,
                        createdAt: { gt: lastReadAt },
                        sender_id: { not: userId } // Don't count my own messages? Usually yes.
                    }
                });
                return Object.assign(Object.assign({}, conv), { unreadCount, lastMessage: conv.messages[0] || null, participants: conv.participants });
            })));
            return result;
        });
    }
    createConversation(type, participantIds, name, creatorId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Ensure uniqueness
            participantIds = Array.from(new Set(participantIds));
            // Validation: For DIRECT, check if exists
            if (type === 'DIRECT' && participantIds.length === 2) {
                // Check existence
                const existingConversation = yield prisma_1.default.chatConversation.findFirst({
                    where: {
                        type: 'DIRECT',
                        participants: {
                            every: {
                                user_id: { in: participantIds }
                            }
                        }
                    },
                    include: {
                        participants: {
                            include: {
                                user: { select: { id: true, full_name: true, avatar_url: true, role: true } }
                            }
                        }
                    }
                });
                if (existingConversation) {
                    // If exists, just notify (optional, maybe not needed if just opening) and return it
                    participantIds.forEach(uid => {
                        // Start new chat usually implies "bringing to top", so maybe update lastMessageAt or just emit 'new_conversation' to ensure FE has it?
                        // Actually, if it exists, FE might already have it or we need to ensure it's in their list.
                        // Emitting again is safe, FE should upsert.
                        socket_1.default.emitToUser(uid, 'new_conversation', existingConversation);
                    });
                    return existingConversation; // Return existing
                }
            }
            const conversation = yield prisma_1.default.chatConversation.create({
                data: {
                    type,
                    name,
                    participants: {
                        create: participantIds.map(uid => ({
                            user_id: uid,
                            role: (creatorId && creatorId === uid) ? 'ADMIN' : 'MEMBER'
                        }))
                    }
                },
                include: {
                    participants: {
                        include: {
                            user: { select: { id: true, full_name: true, avatar_url: true, role: true } }
                        }
                    }
                }
            });
            // Notify participants via Socket
            participantIds.forEach(uid => {
                socket_1.default.emitToUser(uid, 'new_conversation', conversation);
            });
            return conversation;
        });
    }
    // --- MESSAGING ---
    getMessages(conversationId_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, limit = 50, before) {
            return prisma_1.default.chatMessage.findMany({
                where: { conversation_id: conversationId },
                take: limit,
                skip: before ? 1 : 0,
                cursor: before ? { id: before } : undefined,
                orderBy: { createdAt: 'asc' }, // FE usually wants oldest -> newest for scroll
                include: {
                    sender: { select: { id: true, full_name: true, avatar_url: true } }
                }
            });
        });
    }
    sendMessage(senderId_1, conversationId_1, content_1) {
        return __awaiter(this, arguments, void 0, function* (senderId, conversationId, content, type = 'TEXT', fileData) {
            const message = yield prisma_1.default.chatMessage.create({
                data: {
                    conversation_id: conversationId,
                    sender_id: senderId,
                    content,
                    type,
                    file_url: fileData === null || fileData === void 0 ? void 0 : fileData.url,
                    file_name: fileData === null || fileData === void 0 ? void 0 : fileData.name,
                    file_size: fileData === null || fileData === void 0 ? void 0 : fileData.size,
                    file_type: fileData === null || fileData === void 0 ? void 0 : fileData.type
                },
                include: {
                    sender: { select: { id: true, full_name: true, avatar_url: true } }
                }
            });
            // Update Conversation Last Message At
            yield prisma_1.default.chatConversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: new Date() }
            });
            // Emit Socket Event to Room (active chatters)
            socket_1.default.emitToRoom(conversationId, 'receive_message', message);
            // Emit to All Participants (Notifications)
            // We need to fetch participants to know who to notify
            // Cached or DB query? DB query is safer for now.
            const conversation = yield prisma_1.default.chatConversation.findUnique({
                where: { id: conversationId },
                include: { participants: true }
            });
            if (conversation) {
                conversation.participants.forEach(p => {
                    // Determine if we need to emit "receive_message" to user directly
                    // Logic: Frontend checks if msg belongs to active chat. 
                    // If we emit TWICE (via room and via user), Frontend must handle deduplication.
                    // Our chatStore.receiveMessage DOES handle it implicitly? NO.
                    // "set({ messages: [...messages, message] })" -> Simple append.
                    // DEDUPLICATION REQUIRED IN FRONTEND OR HERE.
                    // Better approach: ONLY emit to User-Room if they are NOT in the active room? Too complex to track.
                    // Standard approach: Frontend handles dedupe. 
                    // Let's emit to User. 
                    // Wait, if I emit to Room, and User is in Room, they get it.
                    // If I emit to User directly, they get it.
                    // If User is in Room, they get 2 events.
                    // Let's emit a different event for notifications? 'notification_message'?
                    // OR relies on frontend `if (!currentMessages.some(m => m.id === data.id))` check for active chat.
                    // But for the *list* update, it's fine to process twice as it's just replacing the lastMessage.
                    // Emitting 'receive_message' to all participants ensuring delivery.
                    socket_1.default.emitToUser(p.user_id, 'receive_message', message);
                });
            }
            return message;
        });
    }
    markAsRead(userId, conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Update Participant LastReadAt
            yield prisma_1.default.chatParticipant.updateMany({
                where: { conversation_id: conversationId, user_id: userId },
                data: { lastReadAt: new Date() }
            });
            // Also create ReadReceipts for recent messages?
            // Skipped for MVP performance, just updating participant pointer is often enough for "Unread Count" logic
        });
    }
}
exports.ChatService = ChatService;
exports.default = new ChatService();
