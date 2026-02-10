import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Swal from 'sweetalert2';

interface ClearTasksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ClearanceStats {
    tasks: number;
    dependencies: number;
    assets: number;
    comments: number;
    timeLogs: number;
    notifications: number;
}

const ClearTasksModal: React.FC<ClearTasksModalProps> = ({ isOpen, onClose }) => {
    const [password, setPassword] = useState('');
    const [confirmChecked, setConfirmChecked] = useState(false);
    const queryClient = useQueryClient();

    // Fetch stats about what will be deleted
    const { data: stats, isLoading: statsLoading } = useQuery<ClearanceStats>({
        queryKey: ['task-clearance-stats'],
        queryFn: async () => {
            const response = await api.get('/tasks/bulk/stats');
            return response.data;
        },
        enabled: isOpen
    });

    // Mutation to clear all tasks
    const clearMutation = useMutation({
        mutationFn: async () => {
            const response = await api.post('/tasks/bulk/clear-all', { password });
            return response.data;
        },
        onSuccess: (data) => {
            // Invalidate all task-related queries
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task-board'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['executive-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['manager-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['team-performance'] });
            queryClient.invalidateQueries({ queryKey: ['task-reports'] });
            queryClient.invalidateQueries({ queryKey: ['productivity-reports'] });
            queryClient.invalidateQueries({ queryKey: ['user-activity'] });
            queryClient.invalidateQueries({ queryKey: ['time-logs'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['client-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['campaign-tasks'] });

            Swal.fire({
                icon: 'success',
                title: 'Tasks Cleared',
                text: data.message,
                confirmButtonColor: '#10b981'
            });

            onClose();
            setPassword('');
            setConfirmChecked(false);
        },
        onError: (error: any) => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to clear tasks',
                confirmButtonColor: '#ef4444'
            });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!confirmChecked) {
            Swal.fire({
                icon: 'warning',
                title: 'Confirmation Required',
                text: 'Please check the confirmation checkbox',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        if (!password.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Password Required',
                text: 'Please enter your password to confirm',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        // Final confirmation
        Swal.fire({
            title: 'Are you absolutely sure?',
            html: `
                <p class="text-red-600 font-bold">This will permanently delete ALL task data!</p>
                <p class="mt-2">This action CANNOT be undone.</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, clear all tasks',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                clearMutation.mutate();
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border-2 border-red-500">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-red-500/30 bg-red-500/10">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-red-500" size={24} />
                        <h2 className="text-xl font-semibold text-foreground">Clear All Tasks</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-muted rounded-full transition-colors"
                        disabled={clearMutation.isPending}
                    >
                        <X size={20} className="text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Warning Message */}
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                        <h3 className="font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                            <AlertTriangle size={20} />
                            DANGER: Irreversible Action
                        </h3>
                        <p className="text-sm text-foreground/80">
                            This action will <strong>permanently delete ALL task-related data</strong> from the system.
                            This includes all tasks regardless of status (planned, in-progress, completed), and cannot be undone.
                        </p>
                    </div>

                    {/* Impact Summary */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-foreground mb-3">What will be deleted:</h3>
                        {statsLoading ? (
                            <div className="text-sm text-muted-foreground">Loading statistics...</div>
                        ) : stats ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-foreground">{stats.tasks}</div>
                                    <div className="text-sm text-muted-foreground">Tasks</div>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-foreground">{stats.comments}</div>
                                    <div className="text-sm text-muted-foreground">Comments</div>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-foreground">{stats.assets}</div>
                                    <div className="text-sm text-muted-foreground">Assets/Files</div>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-foreground">{stats.timeLogs}</div>
                                    <div className="text-sm text-muted-foreground">Time Logs</div>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-foreground">{stats.dependencies}</div>
                                    <div className="text-sm text-muted-foreground">Dependencies</div>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-foreground">{stats.notifications}</div>
                                    <div className="text-sm text-muted-foreground">Notifications</div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Affected Areas */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-foreground mb-3">Affected areas:</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            <li>All Dashboards (Executive, Manager, Team Performance)</li>
                            <li>My Tasks</li>
                            <li>Task Board</li>
                            <li>Task Reports & Analytics</li>
                            <li>User Activity History</li>
                            <li>Client Task Lists</li>
                            <li>Campaign Task Lists</li>
                        </ul>
                    </div>

                    {/* Confirmation Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Confirmation Checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={confirmChecked}
                                onChange={(e) => setConfirmChecked(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                disabled={clearMutation.isPending}
                            />
                            <span className="text-sm text-foreground">
                                I understand that this action is <strong>permanent and cannot be undone</strong>.
                                All task data will be permanently deleted from the system.
                            </span>
                        </label>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Enter your password to confirm:
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Your password"
                                disabled={clearMutation.isPending}
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t bg-muted/30">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium bg-muted text-foreground hover:bg-muted/80 rounded-md transition-colors"
                        disabled={clearMutation.isPending}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!confirmChecked || !password.trim() || clearMutation.isPending}
                        className="px-6 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={16} />
                        {clearMutation.isPending ? 'Clearing...' : 'Clear All Tasks'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClearTasksModal;
