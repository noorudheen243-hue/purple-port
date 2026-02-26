import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils';
import { KeyRound, Loader2, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Navigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';

const StaffCredentialManager = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [newPassword, setNewPassword] = useState('');
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);

    const { data: staffList, isLoading } = useQuery({
        queryKey: ['staff'],
        queryFn: async () => (await api.get('/team/staff')).data
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
            await api.patch(`/users/reset-password/${userId}`, { newPassword: password });
        },
        onSuccess: (data: any, variables: any) => {
            setIsResetModalOpen(false);
            setNewPassword('');
            setSelectedStaff(null);
            alert(`Password reset successfully for ${selectedStaff?.user?.full_name}`);
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message || err.message;
            alert("Failed to reset password: " + msg);
        }
    });

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }
        setResetLoading(true);
        try {
            await resetPasswordMutation.mutateAsync({ userId: selectedStaff.user.id, password: newPassword });
        } finally {
            setResetLoading(false);
        }
    };

    const { user } = useAuthStore();

    if (isLoading) return <div className="p-8 text-center flex flex-col items-center gap-2">
        <Loader2 className="animate-spin text-primary" />
        <span>Loading staff list...</span>
    </div>;

    // Strict Access Control
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEVELOPER_ADMIN')) {
        return <Navigate to="/dashboard" replace />;
    }

    const filteredStaff = staffList?.filter((staff: any) =>
        staff.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Team Credential Management</h2>
                    <p className="text-muted-foreground">Securely reset passwords for your team members.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                        placeholder="Search team..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredStaff?.map((staff: any) => (
                                <tr key={staff.id} className="hover:bg-gray-50/30">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
                                                {staff.user.avatar_url ? (
                                                    <img src={getAssetUrl(staff.user.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    staff.user.full_name.charAt(0)
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{staff.user.full_name}</div>
                                                <div className="text-[10px] text-gray-500">{staff.department}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{staff.user.email}</td>
                                    <td className="px-6 py-4 text-gray-600">{staff.user.role}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => {
                                                setSelectedStaff(staff);
                                                setIsResetModalOpen(true);
                                            }}
                                        >
                                            <KeyRound size={14} />
                                            Reset Password
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reset Password Modal */}
            <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Enter a new password for <strong>{selectedStaff?.user?.full_name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">New Password</label>
                            <Input
                                type="password"
                                placeholder="Enter at least 6 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResetModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleResetPassword} disabled={resetLoading}>
                            {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Update Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StaffCredentialManager;
