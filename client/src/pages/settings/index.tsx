import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from '@/lib/api';
import { Shield, Lock, CheckCircle2, AlertCircle, Users, Banknote, Database, LayoutDashboard, Wrench, HardDriveDownload } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Swal from 'sweetalert2';
import SystemRoleManagement from '../team/SystemRoleManagement';
import PayrollSettings from '../payroll/PayrollSettings';
import DataSync from '../admin/DataSync';
import BackupRestore from '../admin/BackupRestore';
import { ROLES } from '../../utils/roles';

const SettingsPage = () => {
    const { user } = useAuthStore();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const isDevAdmin = user?.role === ROLES.DEVELOPER_ADMIN;

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: "New passwords don't match" });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: "Password must be at least 6 characters" });
            return;
        }

        try {
            setLoading(true);
            await api.post('/auth/change-password', {
                currentPassword,
                newPassword
            });
            setMessage({ type: 'success', text: "Password changed successfully!" });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || "Failed to change password"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">Manage your account and system preferences.</p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="bg-muted p-1 rounded-lg">
                    <TabsTrigger value="profile" className="flex items-center gap-2">
                        <Lock size={16} /> My Security
                    </TabsTrigger>
                    {isDevAdmin && (
                        <TabsTrigger value="system" className="flex items-center gap-2">
                            <Shield size={16} /> System Control
                        </TabsTrigger>
                    )}
                    {(isDevAdmin || user?.role === ROLES.ADMIN) && (
                        <TabsTrigger value="maintenance" className="flex items-center gap-2">
                            <Wrench size={16} /> Maintenance
                        </TabsTrigger>
                    )}
                    {(isDevAdmin || user?.role === ROLES.ADMIN) && (
                        <TabsTrigger value="backup" className="flex items-center gap-2">
                            <HardDriveDownload size={16} /> Backup &amp; Restore
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* TAB 1: PROFILE SECURITY */}
                <TabsContent value="profile">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-purple-600" />
                                    Change Password
                                </CardTitle>
                                <CardDescription>
                                    Update your password to keep your account secure.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    {message && (
                                        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                            }`}>
                                            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                            {message.text}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="current">Current Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="current"
                                                type="password"
                                                className="pl-9"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new">New Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="new"
                                                type="password"
                                                className="pl-9"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm">Confirm New Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="confirm"
                                                type="password"
                                                className="pl-9"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" disabled={loading} className="w-full">
                                        {loading ? "Updating..." : "Change Password"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB 2: SYSTEM MAINTENANCE (ADMIN & DEV) */}
                {(isDevAdmin || user?.role === ROLES.ADMIN) && (
                    <TabsContent value="maintenance">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-orange-700">
                                    <AlertCircle className="h-5 w-5" />
                                    System Maintenance
                                </CardTitle>
                                <CardDescription>
                                    Perform critical system operations to ensure application health.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                                    <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                                        <Database size={18} />
                                        Clear Application Cache
                                    </h3>
                                    <p className="text-sm text-orange-700 mb-4">
                                        Use this if you are experiencing synchronization issues, missing features after an update, or display errors.
                                        This will force a reload of the application and clear local data.
                                    </p>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            Swal.fire({
                                                title: 'Clear System Cache?',
                                                text: "This will clear local storage, session data, and force a hard reload. You may be logged out.",
                                                icon: 'warning',
                                                showCancelButton: true,
                                                confirmButtonColor: '#d33',
                                                cancelButtonColor: '#3085d6',
                                                confirmButtonText: 'Yes, Clear & Reload'
                                            }).then((result) => {
                                                if (result.isConfirmed) {
                                                    // Clear Local Storage (Except maybe theme?)
                                                    const theme = localStorage.getItem('theme');
                                                    localStorage.clear();
                                                    if (theme) localStorage.setItem('theme', theme);

                                                    // Session Storage
                                                    sessionStorage.clear();

                                                    // Force Reload
                                                    let timerInterval: any;
                                                    Swal.fire({
                                                        title: 'Clearing Cache...',
                                                        html: 'Reloading system in <b></b> milliseconds.',
                                                        timer: 1500,
                                                        timerProgressBar: true,
                                                        didOpen: () => {
                                                            Swal.showLoading();
                                                            const b = Swal.getHtmlContainer()?.querySelector('b');
                                                            timerInterval = setInterval(() => {
                                                                if (b) b.textContent = String(Swal.getTimerLeft());
                                                            }, 100);
                                                        },
                                                        willClose: () => {
                                                            clearInterval(timerInterval);
                                                        }
                                                    }).then(() => {
                                                        window.location.reload();
                                                    });
                                                }
                                            })
                                        }}
                                    >
                                        Clear Cache & Reload
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* TAB: BACKUP & RESTORE (ADMIN & DEV ADMIN) */}
                {(isDevAdmin || user?.role === ROLES.ADMIN) && (
                    <TabsContent value="backup">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <HardDriveDownload className="h-5 w-5 text-violet-600" />
                                    Backup &amp; Restore
                                </CardTitle>
                                <CardDescription>
                                    Save a complete backup of all application data, uploads, and settings to disk.
                                    Restore any previous backup with one click.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <BackupRestore />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* TAB 3: SYSTEM CONTROL (DEV ADMIN ONLY) */}
                {isDevAdmin && (
                    <TabsContent value="system" className="space-y-6">
                        <div className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-4 mb-6 flex gap-3 text-yellow-800 text-sm">
                            <Shield className="h-5 w-5 shrink-0" />
                            <p><strong>System Control Zone:</strong> Changes made here affect the entire system structure. Use with caution.</p>
                        </div>

                        <Tabs defaultValue="roles" className="w-full">
                            <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 mb-6 h-auto">
                                <TabsTrigger value="roles" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none pb-2 px-4 font-medium">
                                    <Users className="w-4 h-4 mr-2" />
                                    Role Management
                                </TabsTrigger>
                                <TabsTrigger value="payroll" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none pb-2 px-4 font-medium">
                                    <Banknote className="w-4 h-4 mr-2" />
                                    Payroll Config
                                </TabsTrigger>
                                <TabsTrigger value="sync" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none pb-2 px-4 font-medium">
                                    <Database className="w-4 h-4 mr-2" />
                                    Data Sync
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="roles" className="mt-0">
                                <SystemRoleManagement />
                            </TabsContent>
                            <TabsContent value="payroll" className="mt-0">
                                <PayrollSettings />
                            </TabsContent>
                            <TabsContent value="sync" className="mt-0">
                                <DataSync />
                            </TabsContent>
                        </Tabs>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
};

export default SettingsPage;
