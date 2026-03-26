import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils'; // Ensure correct import path
import { Shield, Loader2, Trash2, UserCheck, UserX } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Navigate } from 'react-router-dom';

const SystemRoleManagement = () => {
    const queryClient = useQueryClient();
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const { data: staffList, isLoading } = useQuery({
        queryKey: ['staff', 'all'],
        queryFn: async () => (await api.get('/team/staff', { params: { include_relieved: 'true', include_hidden: 'true' } })).data
    });

    const updateStaffMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            await api.patch(`/team/staff/${id}`, data);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            setUpdatingId(null);
            if (variables.data.status) {
                alert(`User status updated to ${variables.data.status}!`);
            } else {
                alert("Role updated successfully!");
            }
        },
        onError: (err: any) => {
            setUpdatingId(null);
            const msg = err.response?.data?.message;
            alert("Failed to update: " + (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : (msg || err.message)));
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/team/staff/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            alert("User deleted completely from the application!");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message;
            alert("Failed to delete user: " + (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : (msg || err.message)));
        }
    });

    const handleRoleChange = (id: string, newRole: string) => {
        if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
        setUpdatingId(id);
        updateStaffMutation.mutate({ id, data: { role: newRole } });
    };

    const handleStatusChange = (id: string, newStatus: string) => {
        const msg = newStatus === 'RELIEVED' 
            ? "Marking this user as 'Relieved' will remove them from the team list, disable task management access, and inactivate their ledger account. Proceed?"
            : "Marking this user as 'Active' will restore all access. Proceed?";
        
        if (!window.confirm(msg)) return;
        setUpdatingId(id);
        updateStaffMutation.mutate({ id, data: { status: newStatus } });
    };

    const handleDeleteUser = (id: string, name: string) => {
        if (!window.confirm(`CRITICAL: Are you sure you want to COMPLETELY REMOVE "${name}" from the application? This action cannot be undone and may affect historical records.`)) return;
        deleteUserMutation.mutate(id);
    };

    const roles = [
        { value: 'ADMIN', label: 'Admin (Full Access)' },
        { value: 'MANAGER', label: 'Manager (Team & Reports)' },
        { value: 'MARKETING_EXEC', label: 'Marketing Exec' },
        { value: 'CREATIVE_DESIGNER', label: 'Designer' },
        { value: 'WEB_SEO_EXECUTIVE', label: 'Web & SEO Specialist' },
        { value: 'DM_EXECUTIVE', label: 'DM Executive' }
    ];

    const { user } = useAuthStore();

    if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline-block mr-2" /> Loading all users...</div>;

    // Strict Access Control
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEVELOPER_ADMIN')) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="p-4 md:p-6 w-full space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">System Role Management</h2>
                    <p className="text-muted-foreground">Manage access levels, roles, and employment status for all system users.</p>
                </div>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {staffList?.map((staff: any) => (
                                <tr key={staff.id} className={`hover:bg-gray-50/30 ${staff.user.status === 'RELIEVED' ? 'opacity-60 bg-gray-50/50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
                                                {staff.user.avatar_url ? (
                                                    <img src={getAssetUrl(staff.user.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    staff.user.full_name?.charAt(0) || '?'
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                                    {staff.user.full_name}
                                                    {staff.user.status === 'RELIEVED' && <span className="text-[10px] bg-gray-200 text-gray-600 px-1 rounded">Relieved</span>}
                                                </div>
                                                <div className="text-xs text-gray-500">{staff.user.email}</div>
                                                <div className="text-[10px] text-gray-400 font-mono uppercase">{staff.staff_number}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                            {staff.department?.replace('_', ' ') || 'GENERAL'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Shield size={14} className={(staff.user.role === 'ADMIN' || staff.user.role === 'DEVELOPER_ADMIN') ? 'text-purple-600' : 'text-gray-400'} />
                                            <select
                                                className="bg-transparent border-none text-xs font-medium focus:ring-0 p-0 cursor-pointer"
                                                value={staff.user.role}
                                                onChange={(e) => handleRoleChange(staff.id, e.target.value)}
                                                disabled={updatingId === staff.id}
                                            >
                                                {roles.map(role => (
                                                    <option key={role.value} value={role.value}>
                                                        {role.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {staff.user.status === 'RELIEVED' ? <UserX size={14} className="text-red-600" /> : <UserCheck size={14} className="text-green-600" />}
                                            <select
                                                className={`text-[11px] font-bold py-1 px-3 rounded-full border-none focus:ring-0 cursor-pointer shadow-sm transition-colors ${
                                                    staff.user.status === 'RELIEVED' 
                                                    ? 'bg-red-500 text-white hover:bg-red-600' 
                                                    : 'bg-green-500 text-white hover:bg-green-600'
                                                }`}
                                                value={staff.user.status || 'ACTIVE'}
                                                onChange={(e) => handleStatusChange(staff.id, e.target.value)}
                                                disabled={updatingId === staff.id}
                                            >
                                                <option value="ACTIVE" className="bg-white text-gray-900 font-normal">Active</option>
                                                <option value="RELIEVED" className="bg-white text-gray-900 font-normal">Relieved</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            {updatingId === staff.id ? (
                                                <Loader2 className="animate-spin text-primary" size={18} />
                                            ) : (
                                                <button
                                                    onClick={() => handleDeleteUser(staff.id, staff.user.full_name)}
                                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {staffList?.length === 0 && (
                <div className="text-center p-12 bg-gray-50 border rounded-lg border-dashed">
                    <p className="text-gray-500">No users found.</p>
                </div>
            )}
        </div>
    );
};

export default SystemRoleManagement;
