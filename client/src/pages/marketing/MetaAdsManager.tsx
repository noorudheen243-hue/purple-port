import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Loader2, AlertCircle, Plus, ChevronRight, Play, Pause, AlertTriangle } from 'lucide-react';
import { MetaAdCreationWizard } from './MetaAdCreationWizard';

interface MetaAdsManagerProps {
    clientId: string;
}

export const MetaAdsManager: React.FC<MetaAdsManagerProps> = ({ clientId }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'campaigns' | 'adsets' | 'ads'>('campaigns');
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // Fetch Meta Account connection status
    const { data: accountsData, isLoading: accountsLoading } = useQuery({
        queryKey: ['meta-accounts', clientId],
        queryFn: async () => {
            const res = await api.get(`/marketing/accounts?platform=meta${clientId ? `&clientId=${clientId}` : ''}`);
            return res.data;
        },
        enabled: true
    });

    const activeAccount = accountsData?.[0]; // Assume first connected account for MVP

    // Fetch Campaigns
    const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
        queryKey: ['meta-campaigns', activeAccount?.externalAccountId],
        queryFn: async () => {
            const res = await api.get(`/marketing/meta/manager/campaigns?accountId=${activeAccount.externalAccountId}`);
            return res.data;
        },
        enabled: !!activeAccount?.externalAccountId
    });

    // Fetch Ad Sets
    const { data: adSets = [], isLoading: adSetsLoading } = useQuery({
        queryKey: ['meta-adsets', selectedCampaignId, activeAccount?.externalAccountId],
        queryFn: async () => {
             const res = await api.get(`/marketing/meta/manager/adsets?campaignId=${selectedCampaignId}&accountId=${activeAccount.externalAccountId}`);
             return res.data;
        },
        enabled: activeTab === 'adsets' && !!selectedCampaignId && !!activeAccount?.externalAccountId
    });

    // Fetch Ads
    const { data: ads = [], isLoading: adsLoading } = useQuery({
        queryKey: ['meta-ads', selectedAdSetId, activeAccount?.externalAccountId],
        queryFn: async () => {
             const res = await api.get(`/marketing/meta/manager/ads?adSetId=${selectedAdSetId}&accountId=${activeAccount.externalAccountId}`);
             return res.data;
        },
        enabled: activeTab === 'ads' && !!selectedAdSetId && !!activeAccount?.externalAccountId
    });

    // Status Toggle Mutation
    const toggleStatusMutation = useMutation({
        mutationFn: async ({ objectId, status }: { objectId: string, status: 'ACTIVE' | 'PAUSED' }) => {
            await api.patch('/marketing/meta/manager/status', {
                objectId,
                accountId: activeAccount.externalAccountId,
                status
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`meta-${activeTab}`] });
        }
    });

    if (accountsLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>;
    }

    if (!activeAccount) {
        return (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Meta Account Connected</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    To use the Meta Ads Manager, please connect a Meta Business account in the Marketing integrations settings.
                </p>
            </div>
        );
    }

    const renderStatusBadge = (status: string, objectId: string) => {
        const isActive = status === 'ACTIVE';
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    toggleStatusMutation.mutate({ objectId, status: isActive ? 'PAUSED' : 'ACTIVE' });
                }}
                disabled={toggleStatusMutation.isPending}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isActive 
                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                }`}
            >
                {isActive ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                {isActive ? 'Active' : 'Paused'}
            </button>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Meta Ads Manager</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Account: {activeAccount.name}</p>
                </div>
                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all whitespace-nowrap"
                >
                    <Plus className="w-4 h-4" />
                    Create Campaign
                </button>
            </div>

            {/* Entity Navigation Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('campaigns')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'campaigns'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                    Campaigns
                </button>
                <button
                    onClick={() => setActiveTab('adsets')}
                    disabled={!selectedCampaignId}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        !selectedCampaignId ? 'opacity-50 cursor-not-allowed text-gray-400' :
                        activeTab === 'adsets'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                    1 Ad Set
                </button>
                <button
                    onClick={() => setActiveTab('ads')}
                    disabled={!selectedAdSetId}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        !selectedAdSetId ? 'opacity-50 cursor-not-allowed text-gray-400' :
                        activeTab === 'ads'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                    1 Ad
                </button>
            </div>

            {/* Table Area */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                
                {/* Campaigns View */}
                {activeTab === 'campaigns' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Off/On</th>
                                    <th className="px-6 py-4 font-semibold">Campaign Name</th>
                                    <th className="px-6 py-4 font-semibold">Objective</th>
                                    <th className="px-6 py-4 font-semibold">Budget</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {campaignsLoading ? (
                                    <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-600" /></td></tr>
                                ) : campaigns.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">No campaigns found.</td></tr>
                                ) : (
                                    campaigns.map((c: any) => (
                                        <tr 
                                            key={c.id} 
                                            onClick={() => { setSelectedCampaignId(c.id); setActiveTab('adsets'); }}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-6 py-4">{renderStatusBadge(c.status, c.id)}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                {c.name}
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            </td>
                                            <td className="px-6 py-4">{c.objective?.replace('OUTCOME_', '') || 'N/A'}</td>
                                            <td className="px-6 py-4 font-medium">{"\u20B9"}{((c.daily_budget || 0) / 100).toLocaleString()}/day</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Ad Sets View */}
                {activeTab === 'adsets' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Off/On</th>
                                    <th className="px-6 py-4 font-semibold">Ad Set Name</th>
                                    <th className="px-6 py-4 font-semibold">Optimization</th>
                                    <th className="px-6 py-4 font-semibold">Budget</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {adSetsLoading ? (
                                    <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-600" /></td></tr>
                                ) : adSets.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">No ad sets found in this campaign.</td></tr>
                                ) : (
                                    adSets.map((a: any) => (
                                        <tr 
                                            key={a.id} 
                                            onClick={() => { setSelectedAdSetId(a.id); setActiveTab('ads'); }}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-6 py-4">{renderStatusBadge(a.status, a.id)}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                {a.name}
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            </td>
                                            <td className="px-6 py-4">{a.optimization_goal || 'N/A'}</td>
                                            <td className="px-6 py-4 font-medium">{"\u20B9"}{((a.daily_budget || 0) / 100).toLocaleString()}/day</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Ads View */}
                {activeTab === 'ads' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Off/On</th>
                                    <th className="px-6 py-4 font-semibold">Ad Name</th>
                                    <th className="px-6 py-4 font-semibold">Preview</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {adsLoading ? (
                                    <tr><td colSpan={3} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-600" /></td></tr>
                                ) : ads.length === 0 ? (
                                    <tr><td colSpan={3} className="p-8 text-center text-gray-500">No ads found in this ad set.</td></tr>
                                ) : (
                                    ads.map((ad: any) => (
                                        <tr key={ad.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4">{renderStatusBadge(ad.status, ad.id)}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                {ad.name}
                                            </td>
                                            <td className="px-6 py-4">
                                                {ad.creative?.thumbnail_url ? (
                                                    <img src={ad.creative.thumbnail_url} alt={ad.name} className="h-10 w-10 object-cover rounded-md border" />
                                                ) : (
                                                    <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-md border flex items-center justify-center text-xs text-gray-400">No Img</div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isWizardOpen && (
                <MetaAdCreationWizard 
                    accountId={activeAccount.externalAccountId}
                    onClose={() => setIsWizardOpen(false)}
                    onSuccess={() => {
                        setIsWizardOpen(false);
                        queryClient.invalidateQueries({ queryKey: ['meta-campaigns'] });
                        setActiveTab('campaigns');
                    }}
                />
            )}
        </div>
    );
};
