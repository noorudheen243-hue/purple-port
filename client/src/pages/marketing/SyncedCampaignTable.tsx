import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Facebook, Loader2, Filter, ChevronRight, CheckCircle2, AlertCircle, Users, Check } from 'lucide-react';
import { format } from 'date-fns';

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

interface SyncedCampaignTableProps {
    clientId: string;
    fromDate: string;
    toDate: string;
    onViewLeads: (campaignId: string) => void;
}

export const SyncedCampaignTable: React.FC<SyncedCampaignTableProps> = ({ clientId, fromDate, toDate, onViewLeads }) => {
    const queryClient = useQueryClient();
    const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
    const [assigningCampaigns, setAssigningCampaigns] = useState<string[]>([]);
    const [isAssigning, setIsAssigning] = useState(false);
    const [targetGroupId, setTargetGroupId] = useState('');

    const { data: groups } = useQuery({
        queryKey: ['marketing-groups', clientId],
        queryFn: async () => (await api.get(`/marketing/groups?clientId=${clientId}`)).data,
        enabled: !!clientId
    });

    const { data: campaigns, isLoading } = useQuery({
        queryKey: ['synced-campaigns', clientId, fromDate, toDate],
        queryFn: async () => {
             const res = await api.get(`/marketing/metrics?clientId=${clientId}&from=${fromDate}&to=${toDate}&status=all`);
             // Group metrics by campaign
             const campaignMap: Record<string, any> = {};
             
             // Base campaigns from summary — include createdAt and group
             (res.data.campaigns || []).forEach((c: any) => {
                 campaignMap[c.id] = {
                     ...c,
                     metrics: { spend: 0, results: 0, impressions: 0, reach: 0, clicks: 0, leads: c._count?.leads || 0 }
                 };
             });

             // Add metrics from rows
             (res.data.data || []).forEach((m: any) => {
                 const id = m.campaignId;
                 if (campaignMap[id]) {
                     campaignMap[id].metrics.spend += m.spend || 0;
                     campaignMap[id].metrics.results += m.results || 0;
                     campaignMap[id].metrics.impressions += m.impressions || 0;
                     campaignMap[id].metrics.reach += m.reach || 0;
                     campaignMap[id].metrics.clicks += m.clicks || 0;
                 }
             });

             return Object.values(campaignMap);
        },
        enabled: !!clientId
    });

    const assignMutation = useMutation({
        mutationFn: (data: { groupId: string, campaignIds: string[] }) => api.post('/marketing/groups/assign', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['synced-campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['marketing-groups'] });
            setAssigningCampaigns([]);
            setIsAssigning(false);
        }
    });

    const filteredCampaigns = campaigns?.filter(c => {
        if (selectedGroupId === 'all') return true;
        if (selectedGroupId === 'unassigned') return !c.group_id;
        return c.group_id === selectedGroupId;
    }) || [];

    const handleSelectCampaign = (id: string) => {
        setAssigningCampaigns(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleBulkAssign = () => {
        if (!targetGroupId || assigningCampaigns.length === 0) return;
        assignMutation.mutate({ groupId: targetGroupId, campaignIds: assigningCampaigns });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-purple-600">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-medium animate-pulse">Loading campaigns...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <Filter className="w-4 h-4 text-purple-500" />
                    </div>
                    <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-0 outline-none cursor-pointer"
                    >
                        <option value="all">All Campaigns</option>
                        <option value="unassigned">Unassigned Only</option>
                        {groups?.map((g: any) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                </div>

                {assigningCampaigns.length > 0 && (
                    <div className="flex items-center gap-3 animate-in slide-in-from-right-4">
                        <span className="text-xs font-bold text-purple-600 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                            {assigningCampaigns.length} Selected
                        </span>
                        <select
                            value={targetGroupId}
                            onChange={(e) => setTargetGroupId(e.target.value)}
                            className="text-xs font-semibold py-1.5 px-3 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="">-- Assign to Group --</option>
                            {groups?.map((g: any) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleBulkAssign}
                            disabled={!targetGroupId || assignMutation.isPending}
                            className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 shadow-sm transition-all"
                        >
                            {assignMutation.isPending ? 'Updating...' : 'Apply Assignment'}
                        </button>
                    </div>
                )}
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/30 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                                <th className="px-6 py-5 w-10">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        onChange={(e) => {
                                            if (e.target.checked) setAssigningCampaigns(filteredCampaigns.map(c => c.id));
                                            else setAssigningCampaigns([]);
                                        }}
                                    />
                                </th>
                                <th className="px-6 py-5">Campaign & Status</th>
                                <th className="px-6 py-5">Started</th>
                                <th className="px-6 py-5">Platform / Group</th>
                                <th className="px-6 py-5 text-right">Spend</th>
                                <th className="px-6 py-5 text-right">Results</th>
                                <th className="px-6 py-5 text-right">Leads</th>
                                <th className="px-6 py-5 text-right">Cost/Lead</th>
                                <th className="px-6 py-5">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                            {filteredCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                                        No campaigns found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredCampaigns.map((camp) => {
                                    const costPerLead = camp.metrics.leads > 0 ? camp.metrics.spend / camp.metrics.leads : 0;
                                    const isSelected = assigningCampaigns.includes(camp.id);
                                    const isActive = ['ACTIVE', 'Active', 'ENABLED'].includes(camp.status);
                                    const startedDate = camp.createdAt
                                        ? format(new Date(camp.createdAt), 'dd MMM yyyy')
                                        : '—';

                                    return (
                                        <tr key={camp.id} className={`group text-sm transition-colors hover:bg-purple-50/20 dark:hover:bg-purple-900/5 ${isSelected ? 'bg-purple-50/30 dark:bg-purple-900/10' : ''}`}>
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => handleSelectCampaign(camp.id)}
                                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                />
                                            </td>
                                            {/* Campaign Name + Status */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 transition-colors">{camp.name}</span>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        {isActive ? (
                                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                        ) : (
                                                            <AlertCircle className="w-3 h-3 text-gray-400" />
                                                        )}
                                                        <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                                            {camp.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Started Date */}
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">{startedDate}</span>
                                            </td>
                                            {/* Platform / Group */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        {camp.platform === 'meta' ? <Facebook className="w-3.5 h-3.5 text-blue-600" /> : <GoogleIcon />}
                                                        <span className="text-xs font-semibold capitalize text-gray-500">{camp.platform}</span>
                                                    </div>
                                                    {camp.group ? (
                                                        <div className="flex items-center gap-1">
                                                            <Check className="w-3 h-3 text-green-600 flex-shrink-0" strokeWidth={3} />
                                                            <span className="text-xs font-bold text-green-600">
                                                                {camp.group.name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-medium text-gray-400 italic">No Group</span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Spend */}
                                            <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                                                {"₹"}{Math.round(camp.metrics.spend).toLocaleString()}
                                            </td>
                                            {/* Results */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-purple-600">{camp.metrics.results.toLocaleString()}</span>
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold">{camp.objective || 'Results'}</span>
                                                </div>
                                            </td>
                                            {/* Leads */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span className="font-bold text-blue-600">{camp.metrics.leads}</span>
                                                    <Users className="w-3.5 h-3.5 text-blue-400" />
                                                </div>
                                            </td>
                                            {/* Cost / Lead */}
                                            <td className="px-6 py-4 text-right">
                                                {costPerLead > 0 ? (
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">
                                                        {"₹"}{costPerLead.toFixed(1)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>
                                            {/* Actions */}
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => onViewLeads(camp.id)}
                                                    className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-purple-600 transition-all shadow-sm hover:shadow"
                                                    title="View Leads"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

interface SyncedCampaignTableProps {
    clientId: string;
    fromDate: string;
    toDate: string;
    onViewLeads: (campaignId: string) => void;
}

export const SyncedCampaignTable: React.FC<SyncedCampaignTableProps> = ({ clientId, fromDate, toDate, onViewLeads }) => {
    const queryClient = useQueryClient();
    const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
    const [assigningCampaigns, setAssigningCampaigns] = useState<string[]>([]);
    const [isAssigning, setIsAssigning] = useState(false);
    const [targetGroupId, setTargetGroupId] = useState('');

    const { data: groups } = useQuery({
        queryKey: ['marketing-groups', clientId],
        queryFn: async () => (await api.get(`/marketing/groups?clientId=${clientId}`)).data,
        enabled: !!clientId
    });

    const { data: campaigns, isLoading } = useQuery({
        queryKey: ['synced-campaigns', clientId, fromDate, toDate],
        queryFn: async () => {
             const res = await api.get(`/marketing/metrics?clientId=${clientId}&from=${fromDate}&to=${toDate}&status=all`);
             // Group metrics by campaign
             const campaignMap: Record<string, any> = {};
             
             // Base campaigns from summary
             (res.data.campaigns || []).forEach((c: any) => {
                 campaignMap[c.id] = {
                     ...c,
                     metrics: { spend: 0, results: 0, impressions: 0, reach: 0, clicks: 0, leads: c._count?.leads || 0 }
                 };
             });

             // Add metrics from rows
             (res.data.data || []).forEach((m: any) => {
                 const id = m.campaignId;
                 if (campaignMap[id]) {
                     campaignMap[id].metrics.spend += m.spend || 0;
                     campaignMap[id].metrics.results += m.results || 0;
                     campaignMap[id].metrics.impressions += m.impressions || 0;
                     campaignMap[id].metrics.reach += m.reach || 0;
                     campaignMap[id].metrics.clicks += m.clicks || 0;
                 }
             });

             return Object.values(campaignMap);
        },
        enabled: !!clientId
    });

    const assignMutation = useMutation({
        mutationFn: (data: { groupId: string, campaignIds: string[] }) => api.post('/marketing/groups/assign', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['synced-campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['marketing-groups'] });
            setAssigningCampaigns([]);
            setIsAssigning(false);
        }
    });

    const filteredCampaigns = campaigns?.filter(c => {
        if (selectedGroupId === 'all') return true;
        if (selectedGroupId === 'unassigned') return !c.group_id;
        return c.group_id === selectedGroupId;
    }) || [];

    const handleSelectCampaign = (id: string) => {
        setAssigningCampaigns(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleBulkAssign = () => {
        if (!targetGroupId || assigningCampaigns.length === 0) return;
        assignMutation.mutate({ groupId: targetGroupId, campaignIds: assigningCampaigns });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-purple-600">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-medium animate-pulse">Analyzing campaign performance...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <Filter className="w-4 h-4 text-purple-500" />
                    </div>
                    <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-0 outline-none cursor-pointer"
                    >
                        <option value="all">All Campaigns</option>
                        <option value="unassigned">Unassigned Only</option>
                        {groups?.map((g: any) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                </div>

                {assigningCampaigns.length > 0 && (
                    <div className="flex items-center gap-3 animate-in slide-in-from-right-4">
                        <span className="text-xs font-bold text-purple-600 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                            {assigningCampaigns.length} Selected
                        </span>
                        <select
                            value={targetGroupId}
                            onChange={(e) => setTargetGroupId(e.target.value)}
                            className="text-xs font-semibold py-1.5 px-3 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="">-- Assign to Group --</option>
                            {groups?.map((g: any) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleBulkAssign}
                            disabled={!targetGroupId || assignMutation.isPending}
                            className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 shadow-sm transition-all"
                        >
                            {assignMutation.isPending ? 'Updating...' : 'Apply Assignment'}
                        </button>
                    </div>
                )}
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/30 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                                <th className="px-6 py-5 w-10">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        onChange={(e) => {
                                            if (e.target.checked) setAssigningCampaigns(filteredCampaigns.map(c => c.id));
                                            else setAssigningCampaigns([]);
                                        }}
                                    />
                                </th>
                                <th className="px-6 py-5">Campaign & Status</th>
                                <th className="px-6 py-5">Platform / Group</th>
                                <th className="px-6 py-5 text-right">Spend</th>
                                <th className="px-6 py-5 text-right">Results</th>
                                <th className="px-6 py-5 text-right">Leads</th>
                                <th className="px-6 py-5 text-right">Cost/Lead</th>
                                <th className="px-6 py-5">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                            {filteredCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                                        No campaigns found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredCampaigns.map((camp) => {
                                    const costPerLead = camp.metrics.leads > 0 ? camp.metrics.spend / camp.metrics.leads : 0;
                                    const isSelected = assigningCampaigns.includes(camp.id);
                                    const isActive = ['ACTIVE', 'Active', 'ENABLED'].includes(camp.status);

                                    return (
                                        <tr key={camp.id} className={`group text-sm transition-colors hover:bg-purple-50/20 dark:hover:bg-purple-900/5 ${isSelected ? 'bg-purple-50/30 dark:bg-purple-900/10' : ''}`}>
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => handleSelectCampaign(camp.id)}
                                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 transition-colors">{camp.name}</span>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        {isActive ? (
                                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                        ) : (
                                                            <AlertCircle className="w-3 h-3 text-gray-400" />
                                                        )}
                                                        <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                                            {camp.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        {camp.platform === 'meta' ? <Facebook className="w-3.5 h-3.5 text-blue-600" /> : <GoogleIcon />}
                                                        <span className="text-xs font-semibold capitalize text-gray-500">{camp.platform}</span>
                                                    </div>
                                                    {camp.group ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 w-fit">
                                                            {camp.group.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-medium text-gray-400 italic">No Group</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                                                {"\u20B9"}{Math.round(camp.metrics.spend).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-purple-600">{camp.metrics.results.toLocaleString()}</span>
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold">{camp.objective || 'Results'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span className="font-bold text-blue-600">{camp.metrics.leads}</span>
                                                    <Users className="w-3.5 h-3.5 text-blue-400" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {costPerLead > 0 ? (
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">
                                                        {"\u20B9"}{costPerLead.toFixed(1)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => onViewLeads(camp.id)}
                                                    className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-purple-600 transition-all shadow-sm hover:shadow"
                                                    title="View Leads Performance"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
