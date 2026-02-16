import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import {
    User, Settings, Shield, LogOut, Key, Database, RefreshCw,
    AlertCircle, FileDown, Upload, Wrench, X, Eye, EyeOff, Check, Trash2,
    Mail, Lock, Download, AlertTriangle
} from "lucide-react";
import clsx from 'clsx';
import { SystemToolsTab } from '../settings/SystemToolsTab';

// --- Types ---
interface ProfileSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- Schema: My Profile ---
const profileSchema = z.object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal('')),
});
type ProfileFormData = z.infer<typeof profileSchema>;

// --- Component: Profile Tab ---
const MyProfileTab = ({ user, onClose }: { user: any, onClose: () => void }) => {
    const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            full_name: user?.full_name || '',
            email: user?.email || '',
            password: ''
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: ProfileFormData) => {
            const payload: any = { full_name: data.full_name, email: data.email };
            if (data.password) payload.password = data.password;
            return await api.patch(`/users/${user?.id}`, payload);
        },
        onSuccess: () => {
            alert("Profile updated successfully");
            onClose();
            window.location.reload();
        },
        onError: (err: any) => alert(err.message || "Failed to update profile")
    });

    return (
        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-muted-foreground" size={18} />
                            <input {...register('full_name')} className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-purple-200 outline-none" />
                        </div>
                        {errors.full_name && <p className="text-red-500 text-xs">{errors.full_name.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
                            <input {...register('email')} className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-purple-200 outline-none" />
                        </div>
                        {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-orange-50 dark:bg-orange-950/10 p-4 rounded-lg border border-orange-100 dark:border-orange-900/50">
                        <label className="text-sm font-medium text-orange-900 dark:text-orange-200 mb-2 block">Change Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-orange-400" size={18} />
                            <input type="password" {...register('password')} placeholder="Leave blank to keep current" className="w-full pl-10 pr-4 py-2 border border-orange-200 dark:border-orange-800 rounded-lg bg-white dark:bg-background text-foreground focus:ring-2 focus:ring-orange-200 outline-none" />
                        </div>
                        <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-2">Only enter if you wish to change it.</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
                <button type="submit" disabled={updateMutation.isPending} className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 shadow-sm transition-all hover:shadow-md flex items-center gap-2">
                    {updateMutation.isPending ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
};

// --- Component: Team Credentials Tab ---
const TeamCredentialsTab = () => {
    const { data: users, isLoading, refetch } = useQuery({
        queryKey: ['users', 'credentials'], // Unique key to avoid cache collision with dropdowns
        queryFn: async () => (await api.get('/users?include_hidden=true')).data
    });

    const [editingUser, setEditingUser] = useState<any>(null);
    const [newPass, setNewPass] = useState("");
    const [showPass, setShowPass] = useState(false);

    const resetMutation = useMutation({
        mutationFn: async () => {
            if (!newPass) throw new Error("Password cannot be empty");
            return await api.patch(`/users/${editingUser.id}`, { password: newPass });
        },
        onSuccess: () => {
            alert(`Password updated for ${editingUser.full_name}`);
            setEditingUser(null);
            setNewPass("");
        },
        onError: (err: any) => alert(err.message)
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/users/${id}`),
        onSuccess: () => {
            alert("User deleted successfully.");
            refetch();
        },
        onError: (err: any) => alert("Failed to delete user: " + (err.response?.data?.message || err.message))
    });

    const handleDelete = (user: any) => {
        if (window.confirm(`Are you sure you want to PERMANENTLY delete ${user.full_name}?\n\nThis action cannot be undone.`)) {
            deleteMutation.mutate(user.id);
        }
    };

    if (isLoading) return <div className="p-4 text-center">Loading users...</div>;

    return (
        <div className="space-y-4 pt-2 h-full flex flex-col">
            {!editingUser ? (
                <div className="flex-1 overflow-y-auto border border-border rounded-lg shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted sticky top-0 z-10">
                            <tr>
                                <th className="p-3 font-medium text-foreground">Name</th>
                                <th className="p-3 font-medium text-foreground">Email</th>
                                <th className="p-3 font-medium text-foreground">Role</th>
                                <th className="p-3 font-medium text-right text-foreground">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users?.map((u: any) => (
                                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-3 font-medium text-foreground flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                            {u.full_name.charAt(0)}
                                        </div>
                                        {u.full_name}
                                    </td>
                                    <td className="p-3 text-muted-foreground">{u.email}</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-md text-xs font-semibold">{u.role}</span></td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditingUser(u)} className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium text-xs border border-purple-200 dark:border-purple-800 px-3 py-1.5 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                                                Reset Password
                                            </button>

                                            {u.role !== 'DEVELOPER_ADMIN' && (
                                                <button
                                                    onClick={() => handleDelete(u)}
                                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium text-xs border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-md flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-background p-6 rounded-lg border border-border shadow-md animate-in fade-in max-w-lg mx-auto mt-10">
                    <h3 className="font-bold text-foreground text-lg mb-2">Reset Password for <span className="text-primary">{editingUser.full_name}</span></h3>
                    <p className="text-sm text-muted-foreground mb-6">Enter a new secure password. This action cannot be undone.</p>

                    <div className="relative mb-6">
                        <input
                            type={showPass ? "text" : "password"}
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            className="w-full p-3 pl-4 border border-input bg-background rounded-lg focus:ring-2 focus:ring-primary outline-none text-foreground"
                            placeholder="New Password"
                            autoFocus
                        />
                        <button onClick={() => setShowPass(!showPass)} type="button" className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground">
                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setEditingUser(null)} className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors">Cancel</button>
                        <button onClick={() => resetMutation.mutate()} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium shadow-sm">
                            Update Password
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Main Modal ---
const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'DEVELOPER_ADMIN';
    const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'tools'>('profile');

    // Reset tab on close
    useEffect(() => { if (!isOpen) setActiveTab('profile'); }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl bg-background p-0 overflow-hidden h-[85vh] flex flex-col text-foreground">

                {/* Header / Title Area */}
                <div className="p-6 border-b border-border flex justify-between items-center bg-card">
                    <div>
                        <DialogTitle className="text-xl font-bold">Settings</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">Manage your account and system preferences.</p>
                    </div>
                    {/* Close button is handled by DialogContent's default X, but we can have custom if needed */}
                </div>

                {/* Top Navigation Tabs */}
                <div className="w-full bg-muted/40 border-b border-border px-6 flex items-center gap-1 overflow-x-auto shrink-0 touch-pan-x">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={clsx("relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                            activeTab === 'profile'
                                ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <User size={16} /> My Profile
                    </button>

                    {isAdmin && (
                        <>
                            <button
                                onClick={() => setActiveTab('team')}
                                className={clsx("relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                                    activeTab === 'team'
                                        ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                <Shield size={16} /> Team Credentials
                            </button>

                            <button
                                onClick={() => setActiveTab('tools')}
                                className={clsx("relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                                    activeTab === 'tools'
                                        ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                <Wrench size={16} /> System Tools
                            </button>
                        </>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-background/50">
                    <div className="max-w-6xl mx-auto h-full">
                        {activeTab === 'profile' && <MyProfileTab user={user} onClose={onClose} />}
                        {activeTab === 'team' && isAdmin && <TeamCredentialsTab />}
                        {activeTab === 'tools' && isAdmin && <SystemToolsTab />}
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
};

export default ProfileSettingsModal;
