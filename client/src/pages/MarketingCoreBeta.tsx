import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, AlertTriangle, PlayCircle, RefreshCw, BarChart2 } from 'lucide-react';
import * as betaService from '../services/marketingBeta.service';
import Swal from 'sweetalert2';
import api from '../lib/api';
import { useState } from 'react';

interface MarketingCoreBetaProps {
    externalClientId?: string;
}

export default function MarketingCoreBeta({ externalClientId }: MarketingCoreBetaProps = {}) {
    const queryClient = useQueryClient();
    const [selectedClient, setSelectedClient] = useState<string>(externalClientId || '');

    React.useEffect(() => {
        if (externalClientId !== undefined) {
            setSelectedClient(externalClientId);
            setSelectedGroup(''); // Reset group selection when client changes externally
        }
    }, [externalClientId]);
    const [selectedGroup, setSelectedGroup] = useState<string>('');

    const { data: clients = [] } = useQuery({
        queryKey: ['allClients'],
        queryFn: async () => {
            const res = await api.get('/clients');
            return res.data;
        }
    });

    const { data: groups = [] } = useQuery({
        queryKey: ['marketingGroupsBeta', selectedClient],
        queryFn: () => betaService.getGroups(selectedClient),
        enabled: !!selectedClient
    });

    const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
        queryKey: ['betaCampaigns', selectedClient, selectedGroup],
        queryFn: () => betaService.getCampaigns(selectedClient, selectedGroup),
        refetchInterval: 30000,
        enabled: !!selectedClient
    });

    const { data: insights = [], isLoading: loadingInsights } = useQuery({
        queryKey: ['betaInsights', selectedClient],
        queryFn: () => betaService.getInsights(selectedClient),
        refetchInterval: 30000,
        enabled: !!selectedClient
    });

    const { data: automations = [], isLoading: loadingAutomations } = useQuery({
        queryKey: ['betaAutomations', selectedClient],
        queryFn: () => betaService.getAutomations(selectedClient),
        refetchInterval: 30000,
        enabled: !!selectedClient
    });

    const syncMutation = useMutation({
        mutationFn: betaService.syncCampaigns,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['betaCampaigns'] });
            queryClient.invalidateQueries({ queryKey: ['betaInsights'] });
            queryClient.invalidateQueries({ queryKey: ['betaAutomations'] });
            Swal.fire({
                icon: 'success',
                title: 'Sync Complete',
                text: 'Safe sync executed against Beta Environment.',
                timer: 2000,
                showConfirmButton: false
            });
        },
        onError: (err: any) => {
            Swal.fire('Sync Failed', err.response?.data?.message || err.message, 'error');
        }
    });

    const handleSync = () => {
        syncMutation.mutate(selectedClient || undefined);
    };

    return (
        <div className="p-6 bg-purple-50/50 min-h-screen">
            <div className="mb-8 p-6 bg-gradient-to-r from-purple-700 to-indigo-800 rounded-3xl text-white flex justify-between items-center shadow-xl">
                <div>
                    <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                        <Zap className="text-yellow-400" />
                        Marketing Core (Beta)
                    </h1>
                    <p className="text-purple-200 font-medium tracking-wide">
                        Controlled Environment for Next-Gen AI & Automation Testing. All data isolated.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    {!externalClientId && (
                        <select
                            value={selectedClient}
                            onChange={(e) => {
                                setSelectedClient(e.target.value);
                                setSelectedGroup(''); // Reset group selection when client changes
                            }}
                            className="px-4 py-3 rounded-full text-purple-900 bg-white/90 border-0 focus:ring-4 focus:ring-purple-300 font-semibold min-w-[200px] shadow-sm cursor-pointer"
                        >
                            <option value="">Select a Client</option>
                            {clients.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}

                    <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        disabled={!selectedClient}
                        className="px-4 py-3 rounded-full text-purple-900 bg-white/90 border-0 focus:ring-4 focus:ring-purple-300 font-semibold min-w-[200px] shadow-sm cursor-pointer disabled:opacity-50"
                    >
                        <option value="">All Groups</option>
                        {groups.map((g: any) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleSync}
                        disabled={syncMutation.isPending || !selectedClient}
                        className="flex items-center gap-2 bg-yellow-400 text-purple-900 px-6 py-3 rounded-full font-bold shadow-[0_4px_0_#b4860b] hover:bg-yellow-300 hover:translate-y-[2px] hover:shadow-[0_2px_0_#b4860b] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={syncMutation.isPending ? 'animate-spin' : ''} />
                        {syncMutation.isPending ? 'Syncing...' : 'Sync Client Campaigns'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Campaigns Table */}
                <div className="col-span-1 lg:col-span-2">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 h-full">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <BarChart2 className="text-purple-600" />
                            Campaign Control (Isolated)
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-2 border-gray-100">
                                        <th className="pb-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">Campaign Name</th>
                                        <th className="pb-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">Status</th>
                                        <th className="pb-3 font-semibold text-gray-500 uppercase text-xs tracking-wider text-right">Spend</th>
                                        <th className="pb-3 font-semibold text-gray-500 uppercase text-xs tracking-wider text-right">Results</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!selectedClient ? (
                                        <tr><td colSpan={4} className="py-12 text-center text-gray-400 font-medium">Please select a client to view campaign data.</td></tr>
                                    ) : loadingCampaigns ? (
                                        <tr><td colSpan={4} className="py-8 text-center text-gray-400">Loading campaigns...</td></tr>
                                    ) : campaigns.filter((c: any) => c.status === 'ACTIVE').length === 0 ? (
                                        <tr><td colSpan={4} className="py-12 text-center text-gray-400 font-medium">No active campaigns found for this client.</td></tr>
                                    ) : (
                                        campaigns.filter((c: any) => c.status === 'ACTIVE').map((camp: any) => (
                                            <tr key={camp.id} className="border-b border-gray-50 hover:bg-purple-50/50 transition-colors">
                                                <td className="py-4 font-semibold text-gray-800">{camp.campaign_name}</td>
                                                <td className="py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700`}>
                                                        {camp.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-right font-mono font-medium text-purple-700">₹{camp.spend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                                                <td className="py-4 text-right font-mono font-bold text-gray-800">{camp.results}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* AI Insights Panel */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <AlertTriangle className="text-pink-500" />
                            AI Insights Panel
                        </h2>
                        
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {!selectedClient ? (
                                <p className="text-gray-400 text-center py-4">Select a client to see AI insights.</p>
                            ) : loadingInsights ? (
                                <p className="text-gray-400 text-center">Loading insights...</p>
                            ) : insights.length === 0 ? (
                                <p className="text-gray-400 text-center py-4 bg-gray-50 rounded-xl">All clear. No anomalies detected.</p>
                            ) : (
                                insights.map((insight: any) => (
                                    <div key={insight.id} className="p-4 bg-pink-50 border border-pink-100 rounded-2xl flex gap-3 items-start">
                                        <div className="mt-0.5 w-2 h-2 rounded-full bg-pink-500 flex-shrink-0 animate-pulse"></div>
                                        <div>
                                            <p className="text-sm font-semibold text-pink-900">{insight.message}</p>
                                            <p className="text-xs text-pink-600 mt-1 uppercase font-bold tracking-wider">{insight.type}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Automation Trigger Feed */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <PlayCircle className="text-blue-500" />
                            Automation Feed
                        </h2>

                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {!selectedClient ? (
                                <p className="text-gray-400 text-center py-4">Select a client to see automation feed.</p>
                            ) : loadingAutomations ? (
                                <p className="text-gray-400 text-center">Loading automations...</p>
                            ) : automations.length === 0 ? (
                                <p className="text-gray-400 text-center py-4 bg-gray-50 rounded-xl">No automations triggered recently.</p>
                            ) : (
                                automations.map((auto: any) => (
                                    <div key={auto.id} className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{auto.trigger_event}</span>
                                            <span className="text-[10px] text-blue-400">{new Date(auto.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-sm font-medium text-blue-900">{auto.action_suggested}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
