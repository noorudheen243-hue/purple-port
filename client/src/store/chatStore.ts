import { create } from 'zustand';
import api from '../lib/api';
import socketService from '../services/socketService';

interface User {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
}

interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    sender: Partial<User>;
    type: string;
    content: string;
    file_url?: string;
    file_name?: string;
    createdAt: string;
}

interface Conversation {
    id: string;
    type: 'DIRECT' | 'GROUP' | 'CHANNEL';
    name?: string;
    participants: { user: User, role: string }[];
    lastMessage?: Message;
    unreadCount: number;
    updatedAt: string;
}

interface ChatState {
    conversations: Conversation[];
    activeConversationId: string | null;
    activeConversation: Conversation | null;
    messages: Message[];
    isLoading: boolean;
    onlineUsers: string[];

    // Actions
    fetchConversations: () => Promise<void>;
    selectConversation: (id: string) => Promise<void>;
    deselectConversation: () => void;
    openDirectConversation: (conversation: Conversation) => Promise<void>;
    sendMessage: (content: string, type?: string, file?: File) => Promise<void>;
    receiveMessage: (message: Message) => void;
    setOnlineUsers: (users: string[]) => void;
    updateUserStatus: (userId: string, status: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    conversations: [],
    activeConversationId: null,
    activeConversation: null,
    messages: [],
    isLoading: false,
    onlineUsers: [],

    fetchConversations: async () => {
        set({ isLoading: true });
        try {
            const { data } = await api.get('/chat/conversations');
            set({ conversations: data, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch conversations', error);
            set({ isLoading: false });
        }
    },

    selectConversation: async (id: string) => {
        const { conversations } = get();
        const conversation = conversations.find(c => c.id === id) || null;

        // Reset unread count locally
        const updatedConversations = conversations.map(c =>
            c.id === id ? { ...c, unreadCount: 0 } : c
        );
        set({
            activeConversationId: id,
            activeConversation: { ...conversation!, unreadCount: 0 },
            conversations: updatedConversations,
            isLoading: true
        });

        // Join Room via Socket
        // Ensure socket is connected (usually done in Layout)
        socketService.emit('join_conversation', id);

        try {
            const { data } = await api.get(`/chat/conversations/${id}/messages`);

            // Allow Mark Read on Backend too
            api.post(`/chat/conversations/${id}/read`);

            set({ messages: data, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch messages', error);
            set({ isLoading: false });
        }
    },

    deselectConversation: () => {
        set({ activeConversationId: null, activeConversation: null });
    },

    openDirectConversation: async (conversation: Conversation) => {
        const { conversations } = get();
        // Check if exists
        let exists = conversations.find(c => c.id === conversation.id);

        let newConversations = conversations;
        if (!exists) {
            // Add if missing
            // Ensure defaults if missing from backend raw response
            const safeConv: Conversation = {
                ...conversation,
                unreadCount: conversation.unreadCount || 0,
                lastMessage: conversation.lastMessage || undefined,
                updatedAt: conversation.updatedAt || new Date().toISOString()
            };
            newConversations = [safeConv, ...conversations];
            set({ conversations: newConversations });
        }

        // Now select it
        get().selectConversation(conversation.id);
    },

    sendMessage: async (content: string, type = 'TEXT', file?: File) => {
        const { activeConversationId } = get();
        if (!activeConversationId) return;

        let fileData = null;
        if (file) {
            // Upload file first
            const formData = new FormData();
            formData.append('file', file);
            // formData.append('path', 'chat'); // If upload API supports path

            // Assume upload API returns url, name, size, type
            // const uploadRes = await api.post('/upload', formData);
            // fileData = uploadRes.data;
        }

        try {
            // Optimistic UI update could be added here
            const { data } = await api.post('/chat/messages', {
                conversationId: activeConversationId,
                content,
                type,
                fileData
            });

            // Manually append if socket is slow/fails
            // Check if already added by socket (race condition handling)
            const { messages: currentMessages } = get();
            if (!currentMessages.some(m => m.id === data.id)) {
                get().receiveMessage(data);
            }
        } catch (error) {
            console.error('Failed to send message', error);
            alert("Failed to send message. Please check connection.");
        }
    },

    receiveMessage: (message: Message) => {
        const { activeConversationId, messages, conversations } = get();

        // If message belongs to active chat, append it
        if (message.conversation_id === activeConversationId) {
            // Deduplication: Check if message ID already exists
            if (!messages.some(m => m.id === message.id)) {
                set({ messages: [...messages, message] });
            }
        }

        // Update last message in conversation list
        const updatedConversations = conversations.map(c => {
            if (c.id === message.conversation_id) {
                return {
                    ...c,
                    lastMessage: message,
                    updatedAt: new Date().toISOString(),
                    unreadCount: (c.id !== activeConversationId) ? c.unreadCount + 1 : c.unreadCount
                };
            }
            return c;
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        set({ conversations: updatedConversations });
    },

    setOnlineUsers: (users) => set({ onlineUsers: users }),

    updateUserStatus: (userId, status) => {
        const { onlineUsers } = get();
        if (status === 'ONLINE') {
            if (!onlineUsers.includes(userId)) set({ onlineUsers: [...onlineUsers, userId] });
        } else {
            set({ onlineUsers: onlineUsers.filter(id => id !== userId) });
        }
    }
}));
