import React, { useEffect, useState, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import {
    Send, Paperclip, Search, MoreVertical,
    Check, CheckCheck, Smile, Plus, Image as ImageIcon, FileText,
    Mic, Video as VideoIcon, X, Maximize2, Minimize2
} from 'lucide-react';
import { format } from 'date-fns';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Reusing types/logic from ChatLayout but adapted for Popup
interface Contact {
    id: string;
    name: string;
    avatar?: string;
    type: 'STAFF' | 'CLIENT';
    subtext?: string;
}

export const ChatPopup = ({ onClose }: { onClose: () => void }) => {
    const { user } = useAuthStore();
    const {
        conversations,
        activeConversation,
        messages,
        fetchConversations,
        selectConversation,
        openDirectConversation,
        sendMessage
    } = useChatStore();

    const [inputText, setInputText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);

    // New Chat State
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [contactSearch, setContactSearch] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, activeConversation]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleOpenNewChat = async () => {
        setShowNewChatModal(true);
        // Fetch Users and Clients
        try {
            // Use generic error handling if this fails
            const [usersRes, clientsRes] = await Promise.all([
                api.get('/users'),
                api.get('/clients')
            ]);

            const staffContacts: Contact[] = usersRes.data.map((u: any) => ({
                id: u.id,
                name: u.full_name,
                avatar: u.avatar_url,
                type: 'STAFF',
                subtext: u.role
            })).filter((u: any) => u.id !== user?.id);

            const clientContacts: Contact[] = clientsRes.data.map((c: any) => ({
                id: c.id,
                name: c.name,
                avatar: c.logo_url,
                type: 'CLIENT',
                subtext: c.client_code
            }));

            const allContacts = [...staffContacts, ...clientContacts];
            setContacts(allContacts);
            setFilteredContacts(allContacts);

        } catch (err) {
            console.error("Failed to load contacts", err);
            alert("Could not load contacts list. Please check connection.");
        }
    };

    const handleSearchContact = (query: string) => {
        setContactSearch(query);
        if (!query) setFilteredContacts(contacts);
        else {
            setFilteredContacts(contacts.filter(c =>
                c.name.toLowerCase().includes(query.toLowerCase()) ||
                c.subtext?.toLowerCase().includes(query.toLowerCase())
            ));
        }
    };

    const startNewChat = async (contact: Contact) => {
        try {
            const res = await api.post('/chat/conversations', {
                type: 'DIRECT',
                participantIds: [contact.id]
            });

            // Robustly open the chat
            await openDirectConversation(res.data);

            // Refresh list in background
            fetchConversations();

            setShowNewChatModal(false);
        } catch (err: any) {
            console.error("Failed to start chat", err);
            alert(`Failed to start chat: ${err.response?.data?.message || err.message}`);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim()) return;

        await sendMessage(inputText);
        setInputText('');
        setShowEmojiPicker(false);
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setInputText(prev => prev + emojiData.emoji);
    };

    // Resize State
    const [size, setSize] = useState({ width: 900, height: 600 });
    const isResizingRef = useRef(false);

    const startResize = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizingRef.current = true;
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    };

    const handleResize = (e: MouseEvent) => {
        if (!isResizingRef.current) return;

        // Calculate new size based on mouse position relative to window dimensions (since it's bottom-right anchored)
        // Actually, easier to use movementX/Y but that accumulates error.
        // Let's rely on standard resizing.

        // Since fixed bottom-right:
        // Increasing width (mouse moves Left)
        // Increasing height (mouse moves Up)

        // Simplification: Let's assume user drags the Top-Left corner of the popup?
        // Or standard: Bottom-Right of the browser is anchor.
        // If we add a handle at Top-Left of popup:
        // New Width = Old Width - MouseDeltaX

        setSize(prev => ({
            width: Math.max(400, prev.width - e.movementX),
            height: Math.max(500, prev.height - e.movementY)
        }));
    };

    const stopResize = () => {
        isResizingRef.current = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            style={{ width: size.width, height: size.height }}
            className="fixed bottom-24 right-4 bg-[#f0f2f5] rounded-xl shadow-2xl z-[50] overflow-hidden flex border border-[#d1d7db] font-sans"
        >
            {/* Resize Handle (Top-Left Corner) */}
            <div
                onMouseDown={startResize}
                className="absolute top-0 left-0 w-6 h-6 cursor-nw-resize z-[100] group flex items-start justify-start p-1"
                title="Resize"
            >
                <div className="w-3 h-3 border-t-2 border-l-2 border-gray-400 group-hover:border-gray-600 rounded-tl-sm transition-colors" />
            </div>
            {/* Header / Top Bar (Green Strip for whole app) */}
            <div className="absolute top-0 w-full h-16 bg-[#00a884] -z-0"></div>

            {/* --- LEFT SIDEBAR --- */}
            <div className="w-[30%] flex flex-col bg-white border-r border-[#d1d7db] z-10 relative">
                {/* Header */}
                <div className="h-16 bg-[#f0f2f5] flex items-center justify-between px-3 border-b border-[#d1d7db]">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-300 cursor-pointer">
                        {user?.avatar_url
                            ? <img src={getAssetUrl(user.avatar_url)} className="w-full h-full object-cover" />
                            : <span className="flex items-center justify-center h-full text-gray-500 font-bold">{user?.full_name[0]}</span>
                        }
                    </div>
                    <div className="flex gap-3 text-[#54656f]">
                        <button onClick={handleOpenNewChat} title="New Chat"><Plus size={20} /></button>
                        <button><MoreVertical size={20} /></button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-2 border-b border-[#f0f2f5] bg-white">
                    <div className="bg-[#f0f2f5] rounded-lg px-3 py-1.5 flex items-center">
                        <Search size={16} className="text-[#54656f] mr-2" />
                        <input
                            type="text"
                            placeholder="Search"
                            className="bg-transparent border-none focus:ring-0 w-full text-sm placeholder:text-[#54656f]"
                        />
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {conversations.map(conv => {
                        const otherParticipant = conv.type === 'DIRECT'
                            ? conv.participants.find(p => p.user.id !== user?.id)?.user
                            : null;
                        const title = conv.name || otherParticipant?.full_name || 'Unknown';
                        const avatar = conv.type === 'DIRECT' ? otherParticipant?.avatar_url : null;
                        const isActive = activeConversation?.id === conv.id;

                        return (
                            <div
                                key={conv.id}
                                onClick={() => selectConversation(conv.id)}
                                className={`flex items-center px-3 py-3 cursor-pointer border-b border-[#f0f2f5] hover:bg-[#f5f6f6] ${isActive ? 'bg-[#f0f2f5]' : ''}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                    {avatar ? <img src={getAssetUrl(avatar)} className="w-full h-full object-cover" /> : <span className="text-gray-500 font-bold text-sm">{title[0]}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="text-[#111b21] font-normal text-md truncate">{title}</h3>
                                        {conv.lastMessage && (
                                            <span className="text-[10px] text-[#667781] whitespace-nowrap">
                                                {format(new Date(conv.lastMessage.createdAt), 'h:mm a')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-[#667781] truncate max-w-[120px]">
                                            {conv.lastMessage?.sender_id === user?.id && <span className="mr-1">You:</span>}
                                            {conv.lastMessage?.content}
                                        </p>
                                        {conv.unreadCount > 0 && (
                                            <span className="bg-[#25d366] text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* --- MAIN CHAT AREA --- */}
            {activeConversation ? (
                <div className="flex-1 flex flex-col relative bg-[#efeae2] z-10 w-[70%]">
                    {/* Header */}
                    <div className="h-16 bg-[#f0f2f5] border-b border-[#d1d7db] flex items-center justify-between px-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                                {activeConversation.name?.charAt(0) || activeConversation.participants.find(p => p.user.id !== user?.id)?.user.full_name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-[#111b21] font-medium text-sm">
                                    {activeConversation.name || activeConversation.participants.find(p => p.user.id !== user?.id)?.user.full_name}
                                </h3>
                                <div className="text-[10px] text-[#667781]">click for contact info</div>
                            </div>
                        </div>
                        <div className="flex gap-3 text-[#54656f] items-center">
                            <Search size={18} className="cursor-pointer" />
                            <MoreVertical size={18} className="cursor-pointer" />
                            <button onClick={onClose} className="hover:bg-red-100 p-1 rounded transition-colors text-red-500">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Chat Background Pattern */}
                    <div className="absolute inset-0 top-16 opacity-[0.4] pointer-events-none z-0" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}></div>

                    {/* Messages List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 z-10 custom-scrollbar relative">
                        {messages.map((msg, idx) => {
                            const isMe = msg.sender_id === user?.id;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1.5`}>
                                    <div className={`
                                        max-w-[75%] px-2.5 py-1.5 rounded-lg shadow-sm text-sm relative group
                                        ${isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}
                                    `}>
                                        <p className="text-[#111b21] whitespace-pre-wrap leading-relaxed pb-1.5 text-sm">
                                            {msg.content}
                                        </p>
                                        <div className="flex justify-end items-center gap-1 -mt-1">
                                            <span className="text-[9px] text-[#667781]">
                                                {format(new Date(msg.createdAt), 'h:mm a')}
                                            </span>
                                            {/* Read Receipt Logic */}
                                            {isMe && (
                                                <>
                                                    {/* We default to Single Grey tick. If read (has readBy?), Blue Double. */}
                                                    {/* Since backend 'read' logic needs tracking, we assume for now: */}
                                                    {/* If msg is older than lastRead, it's read. But for individual msg status, we need a field.*/}
                                                    {/* Assuming 'status' field or similar exists, or using simple logic for MVP */}
                                                    {/* User requested: Blue Double Tick ONLY if read. Otherwise Single Grey Tick. */}

                                                    {/* Since Message interface doesn't show status/readBy explicitly in the viewed file... */}
                                                    {/* We'll assume if it's in the list, it's at least Sent. */}
                                                    {/* If we don't have read status, we default to Single Grey Tick to be safe as per "otherwise only one tick". */}

                                                    {/* HOWEVER: To support "Blue Double Click" we need to know if it's read. */}
                                                    {/* The backend 'getConversations' updates 'unreadCount' for recipient. */}
                                                    {/* But sender needs to know if recipient read it. */}
                                                    {/* Let's look for a 'read' property or 'status' on Message? Not seen in store definition. */}
                                                    {/* Let's try to infer or use check for now. */}
                                                    {/* Wait, if I cannot verify read status, I should default to Grey Single Tick. */}
                                                    <Check size={12} className="text-[#8696a0]" />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="bg-[#f0f2f5] px-3 py-2 flex items-center gap-2 z-20">
                        <div className="flex gap-2 text-[#54656f] relative">
                            {/* Emoji Picker */}
                            <div className="relative">
                                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                                    <Smile size={24} />
                                </button>
                                {showEmojiPicker && (
                                    <div className="absolute bottom-12 left-0 z-50 shadow-2xl rounded-lg">
                                        <button
                                            className="absolute -top-8 right-0 bg-white rounded-full p-1 shadow-md hover:bg-red-50"
                                            onClick={() => setShowEmojiPicker(false)}
                                        >
                                            <X size={16} className="text-red-500" />
                                        </button>
                                        <EmojiPicker onEmojiClick={onEmojiClick} width={280} height={350} />
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setShowAttachMenu(!showAttachMenu)}>
                                <Paperclip size={24} />
                            </button>
                            <AnimatePresence>
                                {showAttachMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                        className="absolute bottom-12 left-2 flex flex-col gap-2 mb-2"
                                    >
                                        <button className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-600"><FileText size={18} /></button>
                                        <button className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-lg hover:bg-pink-600"><ImageIcon size={18} /></button>
                                        <button className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg hover:bg-purple-600"><VideoIcon size={18} /></button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="flex-1 bg-white rounded-lg px-3 py-1.5 flex items-center">
                            <input
                                type="text"
                                placeholder="Type a message"
                                className="w-full border-none focus:ring-0 outline-none focus:outline-none text-[#111b21] placeholder:text-[#54656f] text-sm"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        handleSend(e);
                                    }
                                }}
                            />
                        </div>
                        <button onClick={inputText.trim() ? handleSend : undefined} className="text-[#54656f]">
                            {inputText.trim() ? <Send size={24} /> : <Mic size={24} />}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] border-b-[6px] border-[#25d366] z-10 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500"><X size={24} /></button>
                    <div className="max-w-[250px] text-center">
                        <h2 className="text-[#41525d] text-xl font-light mb-2">WhatsApp Web</h2>
                        <p className="text-[#667781] text-xs">Send and receive messages without keeping your phone online.</p>
                        <div className="mt-6 flex items-center justify-center text-[#8696a0] text-[10px] gap-1">
                            Encrypted
                        </div>
                    </div>
                </div>
            )}

            {/* --- NEW CHAT POPUP (INSIDE) --- */}
            {showNewChatModal && (
                <div className="absolute inset-0 bg-white z-[60] flex flex-col">
                    <div className="bg-[#008069] h-[100px] flex items-end p-4 text-white gap-4">
                        <button onClick={() => setShowNewChatModal(false)}><X size={24} /></button>
                        <h2 className="font-semibold text-lg mb-1">New Chat</h2>
                    </div>
                    <div className="p-2 border-b">
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            className="w-full bg-[#f0f2f5] border-none rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-[#008069]"
                            value={contactSearch}
                            onChange={(e) => handleSearchContact(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="text-xs font-bold text-[#008069] px-4 py-3">CONTACTS</div>
                        {filteredContacts.map(contact => (
                            <div
                                key={contact.id}
                                onClick={() => startNewChat(contact)}
                                className="flex items-center gap-3 p-3 hover:bg-[#f5f6f6] cursor-pointer"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                                    {contact.avatar
                                        ? <img src={getAssetUrl(contact.avatar)} className="w-full h-full object-cover" />
                                        : <span className="text-gray-500 font-bold">{contact.name[0]}</span>}
                                </div>
                                <div className="border-b flex-1 pb-3 border-[#f0f2f5]">
                                    <h3 className="text-[#111b21] font-medium text-md">{contact.name}</h3>
                                    <p className="text-xs text-gray-500">{contact.subtext}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};
