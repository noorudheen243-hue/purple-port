import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { User, Mail, Lock, Shield, Database, Download, Upload, RefreshCw, Eye, EyeOff, AlertTriangle } from 'lucide-react';
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
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <div className="relative">
                    <User className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input {...register('full_name')} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-200 outline-none" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input {...register('email')} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-200 outline-none" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">New Password (Optional)</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input type="password" {...register('password')} placeholder="Leave blank to keep current" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-200 outline-none" />
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
        queryKey: ['users'],
        queryFn: async () => (await api.get('/users')).data
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
                <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="p-3 font-medium">Name</th>
                                <th className="p-3 font-medium">Email</th>
                                <th className="p-3 font-medium">Role</th>
                                <th className="p-3 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users?.map((u: any) => (
                                <tr key={u.id} className="border-t hover:bg-gray-50/50">
                                    <td className="p-3 font-medium">{u.full_name}</td>
                                    <td className="p-3 text-gray-500">{u.email}</td>
                                    <td className="p-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">{u.role}</span></td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => setEditingUser(u)} className="text-purple-600 hover:text-purple-800 font-medium text-xs border border-purple-200 px-3 py-1 rounded">
                                            Reset Password
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-orange-50 p-6 rounded-lg border border-orange-100 animate-in fade-in">
                    <h3 className="font-bold text-orange-900 mb-2">Reset Password for {editingUser.full_name}</h3>
                    <p className="text-sm text-orange-800 mb-4">Enter a new secure password. This action cannot be undone.</p>

                    <div className="relative mb-4">
                        <input
                            type={showPass ? "text" : "password"}
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            className="w-full p-2 border border-orange-200 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                            placeholder="New Password"
                        />
                        <button onClick={() => setShowPass(!showPass)} type="button" className="absolute right-2 top-2.5 text-orange-400 hover:text-orange-600">
                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setEditingUser(null)} className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm">Cancel</button>
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
                <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 hover:bg-white hover:shadow-md transition-all text-center">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Download size={24} />
                    </div>
                    <h3 className="font-bold text-gray-900">Export Local Data</h3>
                    <p className="text-xs text-gray-500 mt-2 mb-4">Download complete JSON dump (Users, Clients, Campaigns, Settings) + Uploads as ZIP.</p>
                    <button onClick={handleDownload} className="w-full py-2 bg-white border border-gray-300 font-medium text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                        <Download size={16} /> Download Backup
                    </button>
                </div>

                {/* Import */}
                <div className="border border-red-200 rounded-xl p-6 bg-red-50/50 hover:bg-red-50 hover:shadow-md transition-all text-center">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload size={24} />
                    </div>
                    <h3 className="font-bold text-red-900">Import to VPS</h3>
                    <p className="text-xs text-red-600/80 mt-2 mb-4">Overwrite current environment with uploaded ZIP. <b>Irreversible!</b></p>

                    <div className="space-y-3">
                        <input
                            type="file"
                            accept=".zip"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-100 file:text-red-700 hover:file:bg-red-200"
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

            <div className="flex items-start gap-3 bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-xs text-yellow-800">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>
                    <b>Warning:</b> Importing data will completely replace the current database.
                    Ensure you have a backup of the target environment before proceeding.
                    This feature is intended for syncing <b>Local Development → Production VPS</b>.
                </p>
            </div>
        </div>
    );
};

// --- Main Modal ---
const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN';
    const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'sync'>('profile');

    // Reset tab on close
    useEffect(() => { if (!isOpen) setActiveTab('profile'); }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-white p-0 overflow-hidden h-[600px] flex flex-col md:flex-row">

                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-1">
                    <h2 className="text-lg font-bold text-gray-800 px-3 mb-4">Settings</h2>

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={clsx("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeTab === 'profile' ? "bg-white text-purple-700 shadow-sm ring-1 ring-gray-200" : "text-gray-600 hover:bg-gray-100"
                        )}
                    >
                        <User size={18} /> My Profile
                    </button>

                    {isAdmin && (
                        <>
                            <div className="my-2 border-t border-gray-200 mx-2" />
                            <h3 className="text-xs font-bold text-gray-400 uppercase px-3 mb-1">Admin Zone</h3>

                            <button
                                onClick={() => setActiveTab('team')}
                                className={clsx("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    activeTab === 'team' ? "bg-white text-purple-700 shadow-sm ring-1 ring-gray-200" : "text-gray-600 hover:bg-gray-100"
                                )}
                            >
                                <Shield size={18} /> Team Credentials
                            </button>

                            <button
                                onClick={() => setActiveTab('sync')}
                                className={clsx("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    activeTab === 'sync' ? "bg-white text-purple-700 shadow-sm ring-1 ring-gray-200" : "text-gray-600 hover:bg-gray-100"
                                )}
                            >
                                <Database size={18} /> Data Sync
                            </button>
                        </>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 overflow-y-auto">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        {activeTab === 'profile' && "My Profile"}
                        {activeTab === 'team' && "Team Credentials"}
                        {activeTab === 'sync' && "Environment Data Sync"}
                    </h2>

                    {activeTab === 'profile' && <MyProfileTab user={user} onClose={onClose} />}
                    {activeTab === 'team' && isAdmin && <TeamCredentialsTab />}
                    {activeTab === 'sync' && isAdmin && <DataSyncTab />}
                </div>

            </DialogContent>
        </Dialog>
    );
};

export default ProfileSettingsModal;
