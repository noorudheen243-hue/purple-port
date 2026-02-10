import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { User, Mail, Lock, Shield, Database, Download, Upload, RefreshCw, Eye, EyeOff, AlertTriangle, Trash2, Wrench } from 'lucide-react';
import clsx from 'clsx';

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
        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4 pt-4">
            <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <div className="relative">
                    <User className="absolute left-3 top-3 text-muted-foreground" size={18} />
                    <input {...register('full_name')} className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-purple-200 outline-none" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
                    <input {...register('email')} className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-purple-200 outline-none" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">New Password (Optional)</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
                    <input type="password" {...register('password')} placeholder="Leave blank to keep current" className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-purple-200 outline-none" />
                </div>
            </div>
            <div className="flex justify-end pt-4">
                <button type="submit" disabled={updateMutation.isPending} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
};

// --- Component: Team Credentials Tab ---
const TeamCredentialsTab = () => {
    const { data: users, isLoading } = useQuery({
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

    if (isLoading) return <div className="p-4 text-center">Loading users...</div>;

    return (
        <div className="space-y-4 pt-2">
            {!editingUser ? (
                <div className="max-h-[400px] overflow-y-auto border border-border rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted sticky top-0">
                            <tr>
                                <th className="p-3 font-medium text-foreground">Name</th>
                                <th className="p-3 font-medium text-foreground">Email</th>
                                <th className="p-3 font-medium text-foreground">Role</th>
                                <th className="p-3 font-medium text-right text-foreground">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users?.map((u: any) => (
                                <tr key={u.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                                    <td className="p-3 font-medium text-foreground">{u.full_name}</td>
                                    <td className="p-3 text-muted-foreground">{u.email}</td>
                                    <td className="p-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded text-xs font-semibold">{u.role}</span></td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => setEditingUser(u)} className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium text-xs border border-purple-200 dark:border-purple-800 px-3 py-1 rounded">
                                            Reset Password
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-orange-50 dark:bg-orange-950/20 p-6 rounded-lg border border-orange-100 dark:border-orange-900 animate-in fade-in">
                    <h3 className="font-bold text-orange-900 dark:text-orange-200 mb-2">Reset Password for {editingUser.full_name}</h3>
                    <p className="text-sm text-orange-800 dark:text-orange-300 mb-4">Enter a new secure password. This action cannot be undone.</p>

                    <div className="relative mb-4">
                        <input
                            type={showPass ? "text" : "password"}
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            className="w-full p-2 border border-orange-200 dark:border-orange-800 bg-white dark:bg-black/20 rounded focus:ring-2 focus:ring-orange-500 outline-none text-foreground"
                            placeholder="New Password"
                        />
                        <button onClick={() => setShowPass(!showPass)} type="button" className="absolute right-2 top-2.5 text-orange-400 hover:text-orange-600">
                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setEditingUser(null)} className="px-4 py-2 bg-background border border-border rounded hover:bg-muted text-sm text-foreground">Cancel</button>
                        <button onClick={() => resetMutation.mutate()} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm font-medium">
                            Set New Password
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Component: Data Sync Tab ---
const DataSyncTab = () => {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);

    const handleDownload = async () => {
        // Use Fetch with credentials to allow cookie-based auth
        try {
            const response = await fetch(`${(import.meta as any).env.VITE_API_URL || 'http://localhost:4001/api'}/backup/export-json`, {
                credentials: 'include' // This sends the 'jwt' httpOnly cookie
            });
            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}));
                throw new Error(errJson.message || `Export failed: ${response.status} ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `full_backup_${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert("Export failed: " + err);
        }
    };

    const importMutation = useMutation({
        mutationFn: async () => {
            if (!file) throw new Error("Please select a file");
            const formData = new FormData();
            formData.append('file', file);
            return await api.post('/backup/import-json', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            alert("Sync Complete! The page will now reload.");
            window.location.reload();
        },
        onError: (err: any) => alert(err.message || "Import Failed")
    });

    return (
        <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export */}
                <div className="border border-border rounded-xl p-6 bg-muted/30 hover:bg-card hover:shadow-md transition-all text-center">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Download size={24} />
                    </div>
                    <h3 className="font-bold text-foreground">Export Local Data</h3>
                    <p className="text-xs text-muted-foreground mt-2 mb-4">Download complete JSON dump (Users, Clients, Campaigns, Settings) + Uploads as ZIP.</p>
                    <button onClick={handleDownload} className="w-full py-2 bg-background border border-border font-medium text-foreground rounded-lg hover:bg-muted flex items-center justify-center gap-2">
                        <Download size={16} /> Download Backup
                    </button>
                </div>

                {/* Import */}
                <div className="border border-red-200 dark:border-red-900 rounded-xl p-6 bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20 hover:shadow-md transition-all text-center">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload size={24} />
                    </div>
                    <h3 className="font-bold text-red-900 dark:text-red-200">Import to VPS</h3>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-2 mb-4">Overwrite current environment with uploaded ZIP. <b>Irreversible!</b></p>

                    <div className="space-y-3">
                        <input
                            type="file"
                            accept=".zip"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-100 dark:file:bg-red-900/30 file:text-red-700 dark:file:text-red-300 hover:file:bg-red-200"
                        />
                        <button
                            onClick={() => {
                                if (confirm("WARNING: This will overwrite ALL data on this server. Are you sure?")) {
                                    importMutation.mutate();
                                }
                            }}
                            disabled={!file || importMutation.isPending}
                            className="w-full py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {importMutation.isPending ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                            {importMutation.isPending ? 'Syncing...' : 'Upload & Sync'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900 text-xs text-yellow-800 dark:text-yellow-200">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>
                    <b>Warning:</b> Importing data will completely replace the current database.
                    Ensure you have a backup of the target environment before proceeding.
                    This feature is intended for syncing <b>Local Development → Production VPS</b>.
                </p>
            </div>

            <div className="border-t border-border pt-6 mt-6">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <RefreshCw size={18} className="text-muted-foreground" /> Maintenance & Migration
                </h3>
                <div className="border border-border rounded-xl p-6 bg-muted/30 flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-foreground">Sync Ledger Accounts</h4>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                            Auto-generates missing ledgers for existing Clients and Staff. Safe to run at any time (Idempotent).
                        </p>
                    </div>
                    <SyncLedgersButton />
                </div>
            </div>
        </div>
    );
};

const SyncLedgersButton = () => {
    const mutation = useMutation({
        mutationFn: async () => await api.post('/accounting/sync-ledgers'),
        onSuccess: (res) => alert(`Sync Complete: ${res.data.message}`),
        onError: (err: any) => alert("Sync Failed: " + err.message)
    });

    return (
        <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-4 py-2 bg-background border border-border text-foreground font-medium rounded-lg hover:bg-muted text-sm flex items-center gap-2"
        >
            {mutation.isPending ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            {mutation.isPending ? 'Syncing...' : 'Run Sync'}
        </button>
    );
};

// --- Component: Admin Tools Tab (System Cleanup) ---
const AdminToolsTab = () => {
    const cleanupMutation = useMutation({
        mutationFn: async () => await api.post('/system/cleanup-assets'),
        onSuccess: (res) => alert(res.data.message),
        onError: (err: any) => alert("Cleanup Failed: " + (err.response?.data?.message || err.message))
    });

    return (
        <div className="space-y-6 pt-2">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">
                        <Trash2 size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-red-900 dark:text-red-200">Clear Attachments & Temp Files</h3>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            Permanently deletes all uploaded assets (images, videos) from the server and clears the database asset records.
                            <br /><b>This action cannot be undone.</b>
                        </p>
                        <button
                            onClick={() => {
                                if (confirm("DANGER: Are you sure you want to delete ALL uploaded files? This is irreversible.")) {
                                    cleanupMutation.mutate();
                                }
                            }}
                            disabled={cleanupMutation.isPending}
                            className="mt-4 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 flex items-center gap-2"
                        >
                            {cleanupMutation.isPending ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                            {cleanupMutation.isPending ? 'Cleaning...' : 'Clear All Attachments'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Main Modal ---
const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'DEVELOPER_ADMIN';
    const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'sync' | 'tools'>('profile');

    // Reset tab on close
    useEffect(() => { if (!isOpen) setActiveTab('profile'); }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-background p-0 overflow-hidden h-[600px] flex flex-col md:flex-row text-foreground">

                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 bg-muted/30 border-r border-border p-4 flex flex-col gap-1">
                    <h2 className="text-lg font-bold text-foreground px-3 mb-4">Settings</h2>

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={clsx("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeTab === 'profile' ? "bg-background text-purple-700 dark:text-purple-400 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <User size={18} /> My Profile
                    </button>

                    {isAdmin && (
                        <>
                            <div className="my-2 border-t border-border mx-2" />
                            <h3 className="text-xs font-bold text-muted-foreground uppercase px-3 mb-1">Admin Zone</h3>

                            <button
                                onClick={() => setActiveTab('team')}
                                className={clsx("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    activeTab === 'team' ? "bg-background text-purple-700 dark:text-purple-400 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Shield size={18} /> Team Credentials
                            </button>

                            <button
                                onClick={() => setActiveTab('sync')}
                                className={clsx("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    activeTab === 'sync' ? "bg-background text-purple-700 dark:text-purple-400 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Database size={18} /> Data Sync
                            </button>

                            <button
                                onClick={() => setActiveTab('tools')}
                                className={clsx("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    activeTab === 'tools' ? "bg-background text-purple-700 dark:text-purple-400 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Wrench size={18} /> System Tools
                            </button>
                        </>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 overflow-y-auto">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                        {activeTab === 'profile' && "My Profile"}
                        {activeTab === 'team' && "Team Credentials"}
                        {activeTab === 'sync' && "Environment Data Sync"}
                        {activeTab === 'tools' && "System Tools"}
                    </h2>

                    {activeTab === 'profile' && <MyProfileTab user={user} onClose={onClose} />}
                    {activeTab === 'team' && isAdmin && <TeamCredentialsTab />}
                    {activeTab === 'sync' && isAdmin && <DataSyncTab />}
                    {activeTab === 'tools' && isAdmin && <AdminToolsTab />}
                </div>

            </DialogContent>
        </Dialog>
    );
};

export default ProfileSettingsModal;
