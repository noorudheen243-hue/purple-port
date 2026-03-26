import React, { useState } from 'react';
import { Settings, Phone, Bell, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

const CATEGORIES = [
    { id: 'TASKS', label: 'Task Management', desc: 'Assignments, deadlines, delays' },
    { id: 'ATTENDANCE', label: 'Attendance', desc: 'Warnings, patterns, approvals' },
    { id: 'PAYROLL', label: 'Payroll', desc: 'Salary processing reminders' },
    { id: 'REQUESTS', label: 'Leave / HR Requests', desc: 'Leaves, Regularisation' },
    { id: 'MEETINGS', label: 'Meetings', desc: 'MoM Followups, reminders' }
];

export const SmartNotificationPreferences = () => {
    const queryClient = useQueryClient();
    
    const { data: preferences = [], isLoading } = useQuery({
        queryKey: ['smartPreferences'],
        queryFn: async () => {
            const res = await api.get('/notifications/preferences');
            return res.data;
        }
    });

    const updatePrefMutation = useMutation({
        mutationFn: async ({ category, app_enabled, whatsapp_enabled }: any) => {
            await api.post('/notifications/preferences', { category, app_enabled, whatsapp_enabled });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['smartPreferences'] });
        }
    });

    const handleToggle = (categoryId: string, type: 'app' | 'wa', currentPrefs: any[]) => {
        const existing = currentPrefs.find(p => p.category === categoryId) || { app_enabled: true, whatsapp_enabled: true };
        
        updatePrefMutation.mutate({
            category: categoryId,
            app_enabled: type === 'app' ? !existing.app_enabled : existing.app_enabled,
            whatsapp_enabled: type === 'wa' ? !existing.whatsapp_enabled : existing.whatsapp_enabled
        });
    };

    if (isLoading) return <div className="p-6 text-center text-sm text-gray-500">Loading AI preferences...</div>;

    return (
        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2 mb-2">
                    <Settings className="text-blue-600" /> AI Smart Notification Delivery
                </h3>
                <p className="text-sm text-blue-800/80 leading-relaxed">
                    The AI Engine monitors your tasks, attendance, and meetings. Choose how you want to receive these predictive alerts, escalations, and insights.
                </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-5 py-3.5 font-semibold text-gray-700">Alert Category</th>
                            <th className="px-5 py-3.5 font-semibold text-gray-700 text-center">In-App Alerts</th>
                            <th className="px-5 py-3.5 font-semibold text-gray-700 text-center">WhatsApp Messages</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {CATEGORIES.map(cat => {
                            const pref = preferences.find((p: any) => p.category === cat.id) || { app_enabled: true, whatsapp_enabled: true };
                            
                            return (
                                <tr key={cat.id} className="hover:bg-gray-50/50 transition">
                                    <td className="px-5 py-4">
                                        <p className="font-bold text-gray-800">{cat.label}</p>
                                        <p className="text-xs text-gray-500">{cat.desc}</p>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <button 
                                            onClick={() => handleToggle(cat.id, 'app', preferences)}
                                            className={`p-2 rounded-full transition-colors ${pref.app_enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}
                                        >
                                            {pref.app_enabled ? <CheckCircle2 size={24} /> : <Bell size={24} />}
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <button 
                                            onClick={() => handleToggle(cat.id, 'wa', preferences)}
                                            className={`p-2 flex items-center justify-center mx-auto rounded-full transition-colors ${pref.whatsapp_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                                        >
                                            {pref.whatsapp_enabled ? <CheckCircle2 size={24} /> : <Phone size={24} />}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-center text-gray-400">Note: User preferences override system delivery configurations but critical security alerts cannot be suppressed.</p>
        </div>
    );
};
