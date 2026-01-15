import React, { useEffect, useState, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import {
    Send, Paperclip, Search, MoreVertical, Phone, Video,
    Check, CheckCheck, Smile, Plus, Image as ImageIcon, FileText,
    Mic, Video as VideoIcon, X
} from 'lucide-react';
import { format } from 'date-fns';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import api from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types for Contact Picker ---
interface Contact {
    id: string;
    name: string;
    avatar?: string;
    type: 'STAFF' | 'CLIENT';
    subtext?: string;
}

const ChatLayout = () => {
    const { user } = useAuthStore();
    const {
        conversations,
        activeConversation,
        messages,
        // isLoading, 
        // onlineUsers,
        fetchConversations,
        selectConversation,
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

    // --- New Chat Logic ---
    const handleOpenNewChat = async () => {
        setShowNewChatModal(true);
        // Fetch Users and Clients
        try {
            const [usersRes, clientsRes] = await Promise.all([
                api.get('/users'), // Assuming generic users list endpoint
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
        // Optimistic check: if conversation exists with this user, select it
        // For now, simpler to just create/find via API
        try {
            const res = await api.post('/chat/conversations', {
                type: 'DIRECT',
                participantIds: [contact.id]
            });
            await fetchConversations();
            selectConversation(res.data.id);
            setShowNewChatModal(false);
        } catch (err) {
            console.error("Failed to start chat", err);
        }
    };

    // --- Message Logic ---

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

    return (
        <div className="flex h-screen bg-[#d1d7db] overflow-hidden relative">
            <div className="absolute top-0 w-full h-32 bg-[#00a884] z-0"></div> {/* Green Header Background */}

            <div className="z-10 w-full h-full max-w-[1600px] mx-auto flex shadow-lg overflow-hidden bg-white xl:top-5 xl:h-[calc(100vh-40px)] xl:rounded-lg relative">

                {/* --- LEFT SIDEBAR --- */}
                <div className="w-[400px] flex flex-col bg-white border-r border-[#d1d7db]">
                    {/* Header */}
                    <div className="h-16 bg-[#f0f2f5] flex items-center justify-between px-4 border-b border-[#d1d7db]">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300">
                            {user?.avatar_url
                                ? <img src={user.avatar_url} className="w-full h-full object-cover" />
                                : <span className="flex items-center justify-center h-full text-gray-500 font-bold">{user?.full_name[0]}</span>
                            }
                        </div>
                        <div className="flex gap-4 text-[#54656f]">
                            <button onClick={handleOpenNewChat} title="New Chat">
                                <Plus size={24} />
                            </button>
                            <button><MoreVertical size={24} /></button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="p-2 border-b border-[#f0f2f5] bg-white">
                        <div className="bg-[#f0f2f5] rounded-lg px-4 py-2 flex items-center">
                            <Search size={20} className="text-[#54656f] mr-4" />
                            <input
                                type="text"
                                placeholder="Search or start new chat"
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
                                    <div className="w-12 h-12 rounded-full bg-gray-200 mr-3 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                        {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <span className="text-gray-500 font-bold text-lg">{title[0]}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline">
                                            <h3 className="text-[#111b21] font-normal text-lg truncate">{title}</h3>
                                            {conv.lastMessage && (
                                                <span className="text-xs text-[#667781] whitespace-nowrap">
                                                    {format(new Date(conv.lastMessage.createdAt), 'h:mm a')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm text-[#667781] truncate max-w-[200px]">
                                                {conv.lastMessage?.sender_id === user?.id && <span className="mr-1">You:</span>}
                                                {conv.lastMessage?.content}
                                            </p>
                                            {conv.unreadCount > 0 && (
                                                <span className="bg-[#25d366] text-white text-[10px] font-bold px-1.5 rounded-full min-w-[20px] h-5 flex items-center justify-center">
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
                    <div className="flex-1 flex flex-col relative bg-[#efeae2]">
                        {/* Chat Background Pattern Image/Overlay could go here */}
                        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}></div>

                        {/* Header */}
                        <div className="h-16 bg-[#f0f2f5] border-b border-[#d1d7db] flex items-center justify-between px-4 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                                    {activeConversation.name?.charAt(0) || activeConversation.participants.find(p => p.user.id !== user?.id)?.user.full_name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-[#111b21] font-medium">{activeConversation.name || activeConversation.participants.find(p => p.user.id !== user?.id)?.user.full_name}</h3>
                                    {/* Determine active status if possible */}
                                    <p className="text-xs text-[#667781]">click here for contact info</p>
                                </div>
                            </div>
                            <div className="flex gap-6 text-[#54656f]">
                                <Search size={22} className="cursor-pointer" />
                                <MoreVertical size={22} className="cursor-pointer" />
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-2 z-10 custom-scrollbar">
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender_id === user?.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
                                        <div className={`
                                        max-w-[65%] px-3 py-1.5 rounded-lg shadow-sm text-sm relative group
                                        ${isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}
                                    `}>
                                            {/* Optional Triangle for bubble using CSS borders, skipping for now for simplicity */}
                                            <p className="text-[#111b21] whitespace-pre-wrap leading-relaxed pb-2">
                                                {msg.content}
                                            </p>
                                            <div className="flex justify-end items-center gap-1 -mt-1.5">
                                                <span className="text-[10px] text-[#667781]">
                                                    {format(new Date(msg.createdAt), 'h:mm a')}
                                                </span>
                                                {isMe && <CheckCheck size={14} className="text-[#53bdeb]" />}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-4 z-20">
                            <div className="flex gap-4 text-[#54656f] relative">
                                {/* Emoji Picker */}
                                <div className="relative">
                                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                                        <Smile size={26} />
                                    </button>
                                    {showEmojiPicker && (
                                        <div className="absolute bottom-12 left-0 z-50 shadow-2xl rounded-lg">
                                            <button
                                                className="absolute -top-8 right-0 bg-white rounded-full p-1 shadow-md hover:bg-red-50"
                                                onClick={() => setShowEmojiPicker(false)}
                                            >
                                                <X size={16} className="text-red-500" />
                                            </button>
                                            <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} />
                                        </div>
                                    )}
                                </div>

                                {/* Attachments */}
                                <div className="relative">
                                    <button onClick={() => setShowAttachMenu(!showAttachMenu)}>
                                        <Paperclip size={26} />
                                    </button>
                                    <AnimatePresence>
                                        {showAttachMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                                className="absolute bottom-12 left-0 flex flex-col gap-3 mb-2"
                                            >
                                                <button className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-600" title="Document">
                                                    <FileText size={20} />
                                                </button>
                                                <button className="w-12 h-12 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-lg hover:bg-pink-600" title="Image">
                                                    <ImageIcon size={20} />
                                                </button>
                                                <button className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg hover:bg-purple-600" title="Video">
                                                    <VideoIcon size={20} />
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="flex-1 bg-white rounded-lg px-4 py-2 flex items-center">
                                <input
                                    type="text"
                                    placeholder="Type a message"
                                    className="w-full border-none focus:ring-0 text-[#111b21] placeholder:text-[#54656f]"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            handleSend(e);
                                        }
                                    }}
                                />
                            </div>

                            {inputText.trim() ? (
                                <button onClick={handleSend} className="text-[#54656f]">
                                    <Send size={26} />
                                </button>
                            ) : (
                                <button className="text-[#54656f]">
                                    <Mic size={26} />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] border-b-[6px] border-[#25d366]">
                        <div className="max-w-md text-center">
                            <h2 className="text-[#41525d] text-2xl font-light mb-4">WhatsApp Web (Native)</h2>
                            <p className="text-[#667781] text-sm">Send and receive messages without keeping your phone online.<br />Use WhatsApp on up to 4 linked devices and 1 phone.</p>
                            <div className="mt-8 flex items-center justify-center text-[#8696a0] text-xs gap-1">
                                <Lock size={12} /> End-to-end encrypted
                            </div>
                        </div>
                    </div>
                )}

                {/* --- NEW CHAT MODAL --- */}
                {showNewChatModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden"
                        >
                            {/* Wrapper for modal content to ensure it renders */}
                            <div className="bg-[#008069] p-4 text-white flex items-center gap-4">
                                <button onClick={() => setShowNewChatModal(false)}><X /></button>
                                <h2 className="font-semibold text-lg">New Chat</h2>
                            </div>
                            <div className="p-3 bg-white border-b">
                                <input
                                    type="text"
                                    placeholder="Search contacts..."
                                    className="w-full bg-[#f0f2f5] border-none rounded-lg px-4 py-2 focus:ring-1 focus:ring-[#008069]"
                                    value={contactSearch}
                                    onChange={(e) => handleSearchContact(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                <div className="text-xs font-bold text-[#008069] px-4 py-2">CONTACTS ON QIX</div>
                                {filteredContacts.length === 0 && <p className="text-center text-gray-400 mt-4">No contacts found</p>}
                                {filteredContacts.map(contact => (
                                    <div
                                        key={contact.id}
                                        onClick={() => startNewChat(contact)}
                                        className="flex items-center gap-3 p-3 hover:bg-[#f5f6f6] cursor-pointer rounded-lg"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                                            {contact.avatar
                                                ? <img src={contact.avatar} className="w-full h-full object-cover" />
                                                : <span className="text-gray-500 font-bold">{contact.name[0]}</span>}
                                        </div>
                                        <div>
                                            <h3 className="text-[#111b21] font-medium">{contact.name}</h3>
                                            <p className="text-xs text-gray-500">{contact.type} {contact.subtext ? `• ${contact.subtext}` : ''}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Simple lock icon for the empty state
const Lock = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-2.757-2.243-5-5-5zm-3 7V7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9zm3 8c-1.103 0-2-.897-2-2s.897-2 2-2 2 .897 2 2-.897 2-2 2z" />
    </svg>
)

export default ChatLayout;
