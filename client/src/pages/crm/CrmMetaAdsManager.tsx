import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    Megaphone, Layers, Image as ImageIcon, Plus, Power, 
    RefreshCw, Filter, Search, Settings, Calendar,
    BarChart3, Clock, Loader2, Link2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Swal from 'sweetalert2';

interface CrmMetaAdsManagerProps {
    clientId: string;
}

export const CrmMetaAdsManager: React.FC<CrmMetaAdsManagerProps> = ({ clientId }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'campaigns' | 'adsets' | 'ads'>('campaigns');
    
    // Account Selection
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');

    // Context IDs
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '',
        objective: 'OUTCOME_LEADS',
        status: 'PAUSED',
        daily_budget: '500' // Default 500
    });

    // 1. Fetch available connected accounts
    const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
        queryKey: ['meta-accounts', clientId],
        queryFn: async () => {
            const { data } = await api.get('/marketing/crm/external/meta-manager/accounts', { params: { clientId } });
            return data;
        },
        enabled: !!clientId
    });

    // Auto-select first account
    React.useEffect(() => {
        if (accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts, selectedAccountId]);

    // 2. Fetch Campaigns
    const { data: campaigns = [], isLoading: isLoadingCampaigns, refetch: refetchCampaigns } = useQuery({
        queryKey: ['meta-campaigns', clientId, selectedAccountId],
        queryFn: async () => {
            const { data } = await api.get('/marketing/crm/external/meta-manager/campaigns', { 
                params: { clientId, accountId: selectedAccountId } 
            });
            return data;
        },
        enabled: !!selectedAccountId
    });

    // 3. Fetch Ad Sets
    const { data: adSets = [], isLoading: isLoadingAdSets, refetch: refetchAdSets } = useQuery({
        queryKey: ['meta-adsets', clientId, selectedAccountId, selectedCampaignId],
        queryFn: async () => {
            const { data } = await api.get(`/marketing/crm/external/meta-manager/campaigns/${selectedCampaignId}/adsets`, { 
                params: { clientId, accountId: selectedAccountId } 
            });
            return data;
        },
        enabled: !!selectedAccountId && !!selectedCampaignId && activeTab === 'adsets'
    });

    // 4. Fetch Ads
    const { data: ads = [], isLoading: isLoadingAds, refetch: refetchAds } = useQuery({
        queryKey: ['meta-ads', clientId, selectedAccountId, selectedAdSetId],
        queryFn: async () => {
            const { data } = await api.get(`/marketing/crm/external/meta-manager/adsets/${selectedAdSetId}/ads`, { 
                params: { clientId, accountId: selectedAccountId } 
            });
            return data;
        },
        enabled: !!selectedAccountId && !!selectedAdSetId && activeTab === 'ads'
    });

    // --- Mutations ---
    
    // Toggle Status
    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, status, type }: { id: string, status: string, type: string }) => {
            const newStatus = status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
            return api.put(`/marketing/crm/external/meta-manager/${id}/status`, {
                clientId, accountId: selectedAccountId, status: newStatus
            });
        },
        onSuccess: (_, variables) => {
            if (variables.type === 'campaign') refetchCampaigns();
            if (variables.type === 'adset') refetchAdSets();
            if (variables.type === 'ad') refetchAds();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Status updated', showConfirmButton: false, timer: 1500 });
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || err.message, 'error');
        }
    });

    // Create Campaign
    const createCampaignMutation = useMutation({
        mutationFn: async (payload: any) => {
            return api.post('/marketing/crm/external/meta-manager/campaigns', { ...payload, clientId, accountId: selectedAccountId });
        },
        onSuccess: () => {
            setIsCreateModalOpen(false);
            refetchCampaigns();
            Swal.fire('Success', 'Campaign created successfully.', 'success');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || err.message, 'error');
        }
    });

    // --- Handlers ---
    const handleStatusToggle = (id: string, currentStatus: string, type: 'campaign'|'adset'|'ad') => {
        toggleStatusMutation.mutate({ id, status: currentStatus, type });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createCampaignMutation.mutate({
            name: createForm.name,
            objective: createForm.objective,
            status: createForm.status
        });
    };

    const navigateToAdSets = (campaignId: string) => {
        setSelectedCampaignId(campaignId);
        setActiveTab('adsets');
    };

    const navigateToAds = (adSetId: string) => {
        setSelectedAdSetId(adSetId);
        setActiveTab('ads');
    };

    if (isLoadingAccounts) {
        return <div className="p-12 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
    }

    if (accounts.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <Link2 className="w-12 h-12 text-slate-400 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700">No Meta Account Connected</h3>
                    <p className="text-slate-500 mt-2 mb-6">Please connect a Meta Ad Account in the Integrations tab to use the Ads Manager.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Control Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger className="w-[280px] bg-slate-50 border-slate-200 font-semibold text-slate-800 h-10">
                            <SelectValue placeholder="Select Ad Account" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map((acc: any) => (
                                <SelectItem key={acc.id} value={acc.id} className="font-medium">
                                    {acc.name || acc.id} <span className="text-slate-400 text-xs">({acc.id})</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('campaigns')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'campaigns' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <Megaphone className="w-4 h-4" /> Campaigns
                        </button>
                        <button 
                            onClick={() => { if(selectedCampaignId) setActiveTab('adsets'); }}
                            disabled={!selectedCampaignId}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'adsets' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:text-slate-900'} ${!selectedCampaignId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Layers className="w-4 h-4" /> Ad Sets
                        </button>
                        <button 
                            onClick={() => { if(selectedAdSetId) setActiveTab('ads'); }}
                            disabled={!selectedAdSetId}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'ads' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:text-slate-900'} ${!selectedAdSetId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <ImageIcon className="w-4 h-4" /> Ads
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-10 text-slate-600 font-bold border-slate-200 hover:bg-slate-50" onClick={() => {
                        if (activeTab === 'campaigns') refetchCampaigns();
                        if (activeTab === 'adsets') refetchAdSets();
                        if (activeTab === 'ads') refetchAds();
                    }}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                    <Button className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Create
                    </Button>
                </div>
            </div>

            {/* Breadcrumb Navigation if deep */}
            {(activeTab === 'adsets' || activeTab === 'ads') && (
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-white p-3 rounded-lg border border-slate-200">
                    <button onClick={() => setActiveTab('campaigns')} className="hover:text-indigo-600">Campaigns</button>
                    <span>/</span>
                    {activeTab === 'ads' && (
                        <>
                            <button onClick={() => setActiveTab('adsets')} className="hover:text-indigo-600">Ad Sets</button>
                            <span>/</span>
                            <span className="text-slate-800">Ads</span>
                        </>
                    )}
                    {activeTab === 'adsets' && <span className="text-slate-800">Ad Sets</span>}
                </div>
            )}

            {/* Content Table */}
            <Card className="border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 w-16 text-center">Status</th>
                                <th className="px-4 py-3">{activeTab === 'campaigns' ? 'Campaign Name' : activeTab === 'adsets' ? 'Ad Set Name' : 'Ad Name'}</th>
                                {activeTab === 'campaigns' && <th className="px-4 py-3">Objective</th>}
                                {activeTab === 'campaigns' && <th className="px-4 py-3">Budget</th>}
                                <th className="px-4 py-3 text-right">Results</th>
                                <th className="px-4 py-3 text-right">Reach</th>
                                <th className="px-4 py-3 text-right">Amount Spent</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {/* Campaigns Tab */}
                            {activeTab === 'campaigns' && isLoadingCampaigns && <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>}
                            {activeTab === 'campaigns' && !isLoadingCampaigns && campaigns.map((item: any) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 group cursor-pointer" onClick={(e) => {
                                    // Prevent navigation if clicking status switch
                                    if ((e.target as HTMLElement).closest('.status-switch')) return;
                                    navigateToAdSets(item.id);
                                }}>
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                            className={`status-switch w-10 h-5 rounded-full relative transition-colors focus:outline-none ${item.effective_status === 'ACTIVE' || item.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-300'}`}
                                            onClick={() => handleStatusToggle(item.id, item.status, 'campaign')}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${item.effective_status === 'ACTIVE' || item.status === 'ACTIVE' ? 'translate-x-5' : ''}`}></span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-indigo-600 group-hover:text-indigo-800">{item.name}</td>
                                    <td className="px-4 py-3 text-slate-600 text-xs">{item.objective?.replace('OUTCOME_', '') || 'N/A'}</td>
                                    <td className="px-4 py-3 text-slate-600 font-medium">{item.daily_budget ? `₹${(item.daily_budget / 100).toLocaleString()}/day` : 'Using Ad Set Budget'}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-800">{item.insights?.results || '-'}</td>
                                    <td className="px-4 py-3 text-right text-slate-600">{item.insights?.reach?.toLocaleString() || '-'}</td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-800">{item.insights?.spend ? `₹${item.insights.spend}` : '-'}</td>
                                </tr>
                            ))}

                            {/* Ad Sets Tab */}
                            {activeTab === 'adsets' && isLoadingAdSets && <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>}
                            {activeTab === 'adsets' && !isLoadingAdSets && adSets.map((item: any) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 group cursor-pointer" onClick={(e) => {
                                    if ((e.target as HTMLElement).closest('.status-switch')) return;
                                    navigateToAds(item.id);
                                }}>
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                            className={`status-switch w-10 h-5 rounded-full relative transition-colors focus:outline-none ${item.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-300'}`}
                                            onClick={() => handleStatusToggle(item.id, item.status, 'adset')}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${item.status === 'ACTIVE' ? 'translate-x-5' : ''}`}></span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-indigo-600 group-hover:text-indigo-800">{item.name}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-800">-</td>
                                    <td className="px-4 py-3 text-right text-slate-600">-</td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-800">-</td>
                                </tr>
                            ))}

                            {/* Ads Tab */}
                            {activeTab === 'ads' && isLoadingAds && <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>}
                            {activeTab === 'ads' && !isLoadingAds && ads.map((item: any) => (
                                <tr key={item.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                            className={`status-switch w-10 h-5 rounded-full relative transition-colors focus:outline-none ${item.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-300'}`}
                                            onClick={() => handleStatusToggle(item.id, item.status, 'ad')}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${item.status === 'ACTIVE' ? 'translate-x-5' : ''}`}></span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-3">
                                        {item.creative?.thumbnail_url ? (
                                            <img src={item.creative.thumbnail_url} className="w-10 h-10 rounded-md object-cover border border-slate-200" alt="Ad Creative" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                                <ImageIcon className="w-5 h-5" />
                                            </div>
                                        )}
                                        {item.name}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-800">-</td>
                                    <td className="px-4 py-3 text-right text-slate-600">-</td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-800">-</td>
                                </tr>
                            ))}

                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Create Campaign Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New Campaign</DialogTitle>
                        <DialogDescription>
                            Set up the foundation for your new Meta Ads campaign. You can configure detailed ad sets and ads in the Meta Ads Manager directly later.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="campaignName" className="font-bold">Campaign Name</Label>
                            <Input 
                                id="campaignName" 
                                placeholder="e.g. Q3 Lead Gen - Real Estate" 
                                value={createForm.name}
                                onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="objective" className="font-bold">Campaign Objective</Label>
                            <Select 
                                value={createForm.objective} 
                                onValueChange={(val) => setCreateForm({...createForm, objective: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OUTCOME_LEADS">Leads (Forms, Messages, Calls)</SelectItem>
                                    <SelectItem value="OUTCOME_TRAFFIC">Traffic (Link Clicks, Landing Page Views)</SelectItem>
                                    <SelectItem value="OUTCOME_ENGAGEMENT">Engagement (Messages, Likes, Comments)</SelectItem>
                                    <SelectItem value="OUTCOME_SALES">Sales (Conversions, Catalog Sales)</SelectItem>
                                    <SelectItem value="OUTCOME_AWARENESS">Awareness (Reach, Impressions)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status" className="font-bold">Initial Status</Label>
                            <Select 
                                value={createForm.status} 
                                onValueChange={(val) => setCreateForm({...createForm, status: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PAUSED">Paused (Draft)</SelectItem>
                                    <SelectItem value="ACTIVE">Active (Publish immediately)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createCampaignMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                                {createCampaignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Create Campaign
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CrmMetaAdsManager;
