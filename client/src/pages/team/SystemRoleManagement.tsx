import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils'; // Ensure correct import path
import { Shield, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Navigate } from 'react-router-dom';

const SystemRoleManagement = () => {
    const queryClient = useQueryClient();
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const { data: staffList, isLoading } = useQuery({
        queryKey: ['staff'],
        queryFn: async () => (await api.get('/team/staff')).data
    });

    const updateRoleMutation = useMutation({
        mutationFn: async ({ id, role }: { id: string; role: string }) => {
            await api.patch(`/team/staff/${id}`, { role });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            setUpdatingId(null);
            alert("Role updated successfully!");
        },
        onError: (err: any) => {
            setUpdatingId(null);
            const msg = err.response?.data?.message;
            alert("Failed to update role: " + (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : (msg || err.message)));
        }
    });

    const handleRoleChange = (id: string, newRole: string) => {
        if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
        setUpdatingId(id);
        updateRoleMutation.mutate({ id, role: newRole });
    };

    const roles = [
        { value: 'ADMIN', label: 'Admin (Full Access)' },
        { value: 'MANAGER', label: 'Manager (Team & Reports)' },
        { value: 'MARKETING_EXEC', label: 'Marketing Exec' },
        { value: 'CREATIVE_DESIGNER', label: 'Designer' },
        { value: 'WEB_SEO_EXECUTIVE', label: 'Web & SEO Specialist' }
    ];

    const { user } = useAuthStore();

    if (isLoading) return <div className="p-8 text-center">Loading staff list...</div>;

    // Strict Access Control
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEVELOPER_ADMIN')) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">System Role Management</h2>
                <p className="text-muted-foreground">Assign system access levels and roles to team members.</p>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Current Role</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {staffList?.map((staff: any) => (
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
                                                <div className="text-xs text-gray-500">{staff.designation}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{staff.user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                            {staff.department.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Shield size={14} className={(staff.user.role === 'ADMIN' || staff.user.role === 'DEVELOPER_ADMIN') ? 'text-purple-600' : 'text-gray-400'} />
                                            <span className={`font-medium ${(staff.user.role === 'ADMIN' || staff.user.role === 'DEVELOPER_ADMIN') ? 'text-purple-700' : 'text-gray-700'}`}>
                                                {staff.user.role}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {updatingId === staff.id ? (
                                            <div className="flex justify-end">
                                                <Loader2 className="animate-spin text-primary" size={18} />
                                            </div>
                                        ) : (
                                            <select
                                                className="bg-background border rounded-md text-xs py-1.5 px-2 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                                value={staff.user.role}
                                                onChange={(e) => handleRoleChange(staff.id, e.target.value)}
                                            >
                                                {roles.map(role => (
                                                    <option key={role.value} value={role.value}>
                                                        {role.label}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SystemRoleManagement;
