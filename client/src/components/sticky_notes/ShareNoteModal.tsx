
import React, { useState, useEffect } from 'react';
import { useStickyStore } from '../../store/stickyStore';
import { StickyNote } from '../../types/sticky';
import api from '../../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Users, X, UserPlus, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface Props {
    note: StickyNote;
    isOpen: boolean;
    onClose: () => void;
}

interface User {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
}

export const ShareNoteModal = ({ note, isOpen, onClose }: Props) => {
    const { shareNote, removeShare } = useStickyStore();
    const { user: currentUser } = useAuthStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchAllUsers();
            setSearchTerm('');
        }
    }, [isOpen]);

    const fetchAllUsers = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/users');
            setAllUsers(res.data);
            setUsers(res.data.slice(0, 5)); // Show initial 5
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!searchTerm) {
            setUsers(allUsers.slice(0, 5));
        } else {
            setUsers(allUsers.filter(u =>
                u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
            ));
        }
    }, [searchTerm, allUsers]);

    const handleShare = async (userId: string, role: 'EDITOR' | 'VIEWER') => {
        await shareNote(note.id, userId, role);
    };

    const handleRemoveShare = async (userId: string) => {
        await removeShare(note.id, userId);
    };

    const isSharedWith = (userId: string) => note.permissions?.find(p => p.user_id === userId);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Note</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Access List */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Who has access</h4>
                        <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar border rounded p-2">
                            {/* Owner */}
                            <div className="flex items-center justify-between text-sm p-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                        {note.user?.full_name?.charAt(0) || "O"}
                                    </div>
                                    <span>{note.user?.full_name} (Owner)</span>
                                </div>
                            </div>

                            {/* Shared Users */}
                            {note.permissions?.map(p => (
                                <div key={p.user_id} className="flex items-center justify-between text-sm p-1 hover:bg-black/5 rounded group">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                                            {p.user?.full_name?.charAt(0) || "U"}
                                        </div>
                                        <span>{p.user?.full_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground bg-gray-100 px-1 rounded">{p.role}</span>
                                        {currentUser?.id === note.user_id && (
                                            <button
                                                onClick={() => handleRemoveShare(p.user_id)}
                                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Search & Add */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Add people</h4>
                        <Input
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                            {users.filter(u => u.id !== currentUser?.id && u.id !== note.user_id && !isSharedWith(u.id)).map(user => (
                                <div key={user.id} className="flex items-center justify-between p-2 hover:bg-black/5 rounded text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                            {user.full_name.charAt(0)}
                                        </div>
                                        <span>{user.full_name}</span>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => handleShare(user.id, 'EDITOR')}>
                                        Share
                                    </Button>
                                </div>
                            ))}
                            {searchTerm && users.length === 0 && (
                                <div className="text-center text-sm text-muted-foreground py-2">No users found</div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={onClose} variant="secondary">Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
