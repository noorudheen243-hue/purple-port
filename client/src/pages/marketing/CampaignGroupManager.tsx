import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Plus, Trash2, Edit2, Loader2, Link as LinkIcon, AlertCircle, Eye } from 'lucide-react';
import { GroupDetailWindow } from './GroupDetailWindow';

interface MarketingGroup {
    id: string;
    name: string;
    _count?: {
        campaigns: number;
        leads: number;
    };
}

interface CampaignGroupManagerProps {
    clientId: string;
}

export const CampaignGroupManager: React.FC<CampaignGroupManagerProps> = ({ clientId }) => {
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<MarketingGroup | null>(null);

    const { data: groups, isLoading } = useQuery<MarketingGroup[]>({
        queryKey: ['marketing-groups', clientId],
        queryFn: async () => (await api.get(`/marketing/groups?clientId=${clientId}`)).data,
        enabled: !!clientId
    });

    const createMutation = useMutation({
        mutationFn: (name: string) => api.post('/marketing/groups', { name, client_id: clientId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marketing-groups'] });
            setIsCreating(false);
            setNewName('');
            setCreateError(null);
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.error || error?.message || 'Failed to create group';
            if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('already exists')) {
                setCreateError(`A group named "${newName}" already exists for this client.`);
            } else {
                setCreateError(msg);
            }
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, name }: { id: string, name: string }) => api.put(`/marketing/groups/${id}`, { name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marketing-groups'] });
            setEditingId(null);
            setEditError(null);
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.error || error?.message || 'Failed to update group';
            setEditError(msg);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/marketing/groups/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marketing-groups'] });
        }
    });

    const handleCreate = () => {
        if (!newName.trim()) return;
        if (!clientId) {
            setCreateError('Please select a client first before creating a group.');
            return;
        }
        setCreateError(null);
        createMutation.mutate(newName);
    };

    const handleUpdate = (id: string) => {
        if (!editName.trim()) return;
        setEditError(null);
        updateMutation.mutate({ id, name: editName });
    };

    if (!clientId) {
        return (
            <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-gray-500">Select a client to manage campaign groups.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-purple-500" />
                    Campaign Groups
                </h3>
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    title="Create New Group"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {isCreating && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-2">
                        <input
                            autoFocus
                            type="text"
                            value={newName}
                            onChange={(e) => { setNewName(e.target.value); setCreateError(null); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            placeholder="Group Name (e.g., Lead Gen 2026)"
                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <button
                            onClick={handleCreate}
                            disabled={createMutation.isPending}
                            className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                        </button>
                        <button
                            onClick={() => { setIsCreating(false); setCreateError(null); }}
                            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                    {createError && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {createError}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <div className="col-span-full py-12 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                ) : groups?.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-dashed">
                        No groups created yet. Organize your campaigns into logical categories.
                    </div>
                ) : (
                    groups?.map((group: MarketingGroup) => (
                        <div
                            key={group.id}
                            onClick={() => !editingId && setSelectedGroup(group)}
                            className={`p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all group relative cursor-pointer ${editingId === group.id ? 'cursor-default' : 'hover:border-purple-300'}`}
                        >
                            <div className="flex justify-between items-start">
                                {editingId === group.id ? (
                                    <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex gap-2">
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editName}
                                                onChange={(e) => { setEditName(e.target.value); setEditError(null); }}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdate(group.id)}
                                                className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
                                            />
                                            <button onClick={() => handleUpdate(group.id)} disabled={updateMutation.isPending} className="text-purple-600 font-bold text-xs whitespace-nowrap">
                                                {updateMutation.isPending ? '...' : 'Save'}
                                            </button>
                                            <button onClick={() => { setEditingId(null); setEditError(null); }} className="text-gray-400 text-xs">X</button>
                                        </div>
                                        {editError && editingId === group.id && (
                                            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />{editError}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                                            {group.name}
                                            <Eye className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-all" />
                                        </h4>
                                        <div className="mt-2 flex items-center gap-3 text-xs font-medium text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                {group._count?.campaigns || 0} Campaigns
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                {group._count?.leads || 0} Leads
                                            </span>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => {
                                            setEditingId(group.id);
                                            setEditName(group.name);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-purple-600 rounded"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Delete this group? Related campaigns will be unassigned but not deleted.')) {
                                                deleteMutation.mutate(group.id);
                                            }
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedGroup && (
                <GroupDetailWindow 
                    group={selectedGroup} 
                    clientId={clientId} 
                    onClose={() => setSelectedGroup(null)} 
                />
            )}
        </div>
    );
};
