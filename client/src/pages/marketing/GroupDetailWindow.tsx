import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    X, Loader2, Trash2, Users, Target, Phone, Mail, MapPin, 
    Facebook, ExternalLink, Check, AlertCircle, PlusCircle,
    TrendingUp, MousePointer2, Wallet, Zap, MessageSquare,
    ChevronRight, ArrowRight, ShieldCheck, Filter, Search,
    ThumbsUp, ThumbsDown, Edit3, Trash, Calendar, Globe
} from 'lucide-react';
import { format } from 'date-fns';

interface GroupDetailWindowProps {
    group: { id: string; name: string };
    clientId: string;
    onClose: () => void;
}

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export const GroupDetailWindow: React.FC<GroupDetailWindowProps> = ({ group, clientId, onClose }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'summary' | 'campaigns' | 'leads'>('summary');
    const [leadView, setLeadView] = useState<'list' | 'add'>('list');
    
    // Quick Lead Form State
    const [leadForm, setLeadForm] = useState({
        name: '', phone: '', email: '', location: '', quality: 'MEDIUM', status: 'NEW'
    });

    // Follow up Editor state
    const [followUpLeadId, setFollowUpLeadId] = useState<string | null>(null);
    const [followUpForm, setFollowUpForm] = useState({ notes: '', status: 'CONTACTED', channel: 'Phone Call' });

    // Fetch campaigns & metrics in this group
    const { data: metricsRes, isLoading: metricsLoading } = useQuery({
        queryKey: ['group-metrics', group.id],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0];
            const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
            const res = await api.get(`/marketing/metrics?clientId=${clientId}&groupId=${group.id}&from=${startOfYear}&to=${today}&status=all`);
            return res.data;
        }
    });

    // Fetch leads in this group
    const { data: leads, isLoading: leadsLoading } = useQuery({
        queryKey: ['group-leads', group.id],
        queryFn: async () => (await api.get(`/marketing/leads?clientId=${clientId}&groupId=${group.id}`)).data || []
    });

    const unassignMutation = useMutation({
        mutationFn: (campaignId: string) => api.post('/marketing/groups/unassign', { campaignId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['synced-campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['marketing-groups'] });
        }
    });

    const addLeadMutation = useMutation({
        mutationFn: (data: any) => api.post('/marketing/leads', { ...data, clientId, group_id: group.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group-leads'] });
            setLeadView('list');
            setLeadForm({ name: '', phone: '', email: '', location: '', quality: 'MEDIUM', status: 'NEW' });
        }
    });

    const feedbackMutation = useMutation({
        mutationFn: ({ id, feedback }: { id: string, feedback: string | null }) => 
            api.patch(`/marketing/leads/${id}/feedback`, { feedback }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-leads'] })
    });

    const deleteLeadMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/marketing/leads/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-leads'] })
    });

    const followUpMutation = useMutation({
        mutationFn: (data: any) => api.post('/marketing/leads/follow-up', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group-leads'] });
            setFollowUpLeadId(null);
            setFollowUpForm({ notes: '', status: 'CONTACTED', channel: 'Phone Call' });
        }
    });

    const campaignRes = metricsRes?.campaigns || [];
    const summary = metricsRes?.summary || { impressions: 0, clicks: 0, spend: 0, conversions: 0, results: 0 };

    return (
        <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col animate-in fade-in duration-300">
            {/* Navigation Header */}
            <div className="h-20 bg-gray-900 border-b border-white/5 flex items-center justify-between px-8">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-900/40">
                        <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black text-white uppercase tracking-tighter">{group.name}</h1>
                            <span className="bg-purple-500/10 text-purple-400 text-[10px] font-black px-2 py-0.5 rounded border border-purple-500/20 uppercase tracking-widest">Group Command Center</span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">Monitoring {campaignRes.length} campaigns and {leads?.length || 0} leads</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-950 p-1 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setActiveTab('summary')}
                            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'summary' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            Campaign Summary
                        </button>
                        <button 
                            onClick={() => setActiveTab('campaigns')}
                            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'campaigns' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            Campaigns
                        </button>
                        <button 
                            onClick={() => setActiveTab('leads')}
                            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'leads' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            Lead Management
                        </button>
                    </div>
                    <div className="h-8 w-[1px] bg-white/5 mx-2" />
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-xl transition-all border border-white/5">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 overflow-y-auto bg-gray-950 p-8">
                {activeTab === 'summary' && (
                    <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Total Reach', value: summary.reach || 0, icon: Users, color: 'blue' },
                                { label: 'CTR (Clicks)', value: summary.clicks || 0, icon: MousePointer2, color: 'purple' },
                                { label: 'Total Spend', value: `$${(summary.spend || 0).toLocaleString()}`, icon: Wallet, color: 'green' },
                                { label: 'Total Leads', value: leads?.length || 0, icon: Zap, color: 'orange' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-gray-900/50 border border-white/5 p-6 rounded-3xl backdrop-blur-sm group hover:border-purple-500/30 transition-all">
                                    <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                                    </div>
                                    <div className="text-2xl font-black text-white">{stat.value}</div>
                                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Performance Charts Placeholder & Table */}
                        <div className="grid grid-cols-3 gap-8">
                            <div className="col-span-2 bg-gray-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-purple-400" /> Group Performance Breakdown
                                </h3>
                                <div className="space-y-4">
                                    {metricsLoading ? (
                                        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
                                    ) : (
                                        campaignRes.map((c: any) => (
                                            <div key={c.id} className="p-4 bg-black/20 rounded-2xl flex items-center justify-between border border-white/5">
                                                <div className="flex items-center gap-4">
                                                    {c.platform === 'meta' ? <Facebook className="w-5 h-5 text-blue-500" /> : <GoogleIcon />}
                                                    <span className="font-bold text-gray-300">{c.name}</span>
                                                </div>
                                                <div className="flex gap-8 text-[10px] font-black uppercase text-gray-500">
                                                    <div>Status: <span className="text-green-500">{c.status}</span></div>
                                                    <div>Type: <span className="text-purple-400">{c.objective || 'N/A'}</span></div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-8 relative overflow-hidden group shadow-2xl shadow-purple-900/20">
                                <div className="relative z-10">
                                    <h3 className="text-lg font-black text-white uppercase leading-tight mb-4">Optimize your <br/> group budget with AI</h3>
                                    <p className="text-purple-100 text-xs mb-8 opacity-80">Our engine identifies which campaigns are yielding high-quality leads.</p>
                                    <button className="bg-white text-purple-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-2">
                                        Scan Analytics <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <ShieldCheck className="absolute -bottom-6 -right-6 w-40 h-40 text-white/10 group-hover:scale-110 transition-transform" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'campaigns' && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                         <div className="bg-gray-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
                            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Premium Campaign Portfolio</h3>
                                <div className="flex items-center gap-4">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase mr-4">Viewing {campaignRes.length} Group Campaigns</div>
                                    <button className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5 hover:text-purple-300">
                                        <PlusCircle className="w-4 h-4" /> Add More to Group
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[1400px]">
                                    <thead className="bg-black/40 text-[10px] uppercase font-black text-gray-500 tracking-widest border-b border-white/5 whitespace-nowrap">
                                        <tr>
                                            <th className="px-6 py-4 sticky left-0 bg-gray-900/90 z-10 backdrop-blur-sm">Campaign Name</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Budget</th>
                                            <th className="px-6 py-4">Total Spent</th>
                                            <th className="px-6 py-4">Results</th>
                                            <th className="px-6 py-4">CPR</th>
                                            <th className="px-6 py-4">CPC (Message)</th>
                                            <th className="px-6 py-4">Reach</th>
                                            <th className="px-6 py-4">Impressions</th>
                                            <th className="px-6 py-4 text-purple-400">Leads</th>
                                            <th className="px-6 py-4">Start / End Date</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {metricsLoading ? (
                                            <tr><td colSpan={12} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" /></td></tr>
                                        ) : campaignRes.length === 0 ? (
                                            <tr><td colSpan={12} className="py-20 text-center text-gray-600 font-bold uppercase text-xs">No Campaigns found in this group</td></tr>
                                        ) : (
                                            campaignRes.map((c: any) => {
                                                const spent = c.metrics?.spend || 0;
                                                const results = c.metrics?.results || 0;
                                                const conversations = c.metrics?.conversations || 0;
                                                const cpr = results > 0 ? (spent / results).toFixed(2) : '0.00';
                                                const cpc = conversations > 0 ? (spent / conversations).toFixed(2) : '0.00';
                                                
                                                return (
                                                    <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-4 sticky left-0 bg-gray-900/90 z-10 backdrop-blur-sm">
                                                            <div className="flex items-center gap-3">
                                                                {c.platform === 'meta' ? <Facebook className="w-4 h-4 text-blue-500" /> : <div className="w-4 h-4 bg-red-400 rounded-full" />}
                                                                <div>
                                                                    <div className="font-bold text-gray-200 text-xs w-64 truncate">{c.name}</div>
                                                                    <div className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">ID: {c.id.substring(0,8)} | {c.platform}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                                                                c.status === 'ACTIVE' || c.status === 'ENABLED' 
                                                                    ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                                                    : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                            }`}>
                                                                {c.status === 'ACTIVE' || c.status === 'ENABLED' ? 'RUNNING' : c.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-xs font-bold text-gray-400">${c.budget || 0}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-xs font-bold text-gray-200">${spent.toLocaleString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-xs font-black text-white">{results.toLocaleString()}</div>
                                                            <div className="text-[9px] text-gray-500 uppercase font-bold">{c.objective?.replace('_', ' ') || 'Results'}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-xs font-bold text-purple-400">${cpr}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-xs font-bold text-indigo-400">${cpc}</div>
                                                            <div className="text-[9px] text-gray-500 uppercase font-bold">{conversations} SMS</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-xs text-gray-300 font-bold">{(c.metrics?.reach || 0).toLocaleString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-xs text-gray-300 font-bold">{(c.metrics?.impressions || 0).toLocaleString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20 font-black text-center text-xs">
                                                                {c.leadsCount || 0}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-[10px] text-gray-300 font-bold">
                                                                {c.startDate ? format(new Date(c.startDate), 'MMM dd') : 'N/A'} - 
                                                                {c.ends ? format(new Date(c.ends), 'MMM dd') : 'Live'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button 
                                                                onClick={() => unassignMutation.mutate(c.id)}
                                                                className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                                                title="Remove from Group"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
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
                )}

                {activeTab === 'leads' && (
                    <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Subtabs for Lead Mgmt */}
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setLeadView('list')}
                                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${leadView === 'list' ? 'bg-white text-gray-950 shadow-xl' : 'bg-gray-900 border border-white/5 text-gray-500 hover:text-white'}`}
                            >
                                <span className="flex items-center gap-2"><Filter className="w-3 h-3" /> Generated Leads</span>
                            </button>
                            <button 
                                onClick={() => setLeadView('add')}
                                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${leadView === 'add' ? 'bg-purple-600 text-white shadow-xl' : 'bg-gray-900 border border-white/5 text-gray-500 hover:text-purple-400'}`}
                            >
                                <span className="flex items-center gap-2"><PlusCircle className="w-3 h-3" /> Add Incoming Lead</span>
                            </button>
                        </div>

                        {leadView === 'add' ? (
                            <div className="max-w-2xl mx-auto bg-gray-900 border border-white/5 p-10 rounded-[3rem] shadow-2xl">
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8">Record New Group Lead</h3>
                                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); addLeadMutation.mutate(leadForm); }}>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                                            <input className="w-full px-5 py-4 bg-gray-950 border border-white/5 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all" placeholder="John Doe" value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} required />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                                            <input className="w-full px-5 py-4 bg-gray-950 border border-white/5 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all" placeholder="+91 ..." value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email (Optional)</label>
                                            <input className="w-full px-5 py-4 bg-gray-950 border border-white/5 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all" placeholder="john@example.com" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Location / Country</label>
                                            <input className="w-full px-5 py-4 bg-gray-950 border border-white/5 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all" placeholder="Dubai, UAE" value={leadForm.location} onChange={e => setLeadForm({...leadForm, location: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Initial Quality</label>
                                            <select className="w-full px-5 py-4 bg-gray-950 border border-white/5 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all appearance-none" value={leadForm.quality} onChange={e => setLeadForm({...leadForm, quality: e.target.value})}>
                                                <option value="HIGH">High (Hot Lead)</option>
                                                <option value="MEDIUM">Medium (Interested)</option>
                                                <option value="LOW">Low (Exploratory)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Current Status</label>
                                            <select className="w-full px-5 py-4 bg-gray-950 border border-white/5 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all appearance-none" value={leadForm.status} onChange={e => setLeadForm({...leadForm, status: e.target.value})}>
                                                <option value="NEW">New Listing</option>
                                                <option value="CONTACTED">Initiated Contact</option>
                                                <option value="QUALIFIED">Qualified Lead</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" disabled={addLeadMutation.isPending} className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black uppercase tracking-widest rounded-3xl shadow-xl shadow-purple-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                                        {addLeadMutation.isPending ? 'Syncing...' : 'Register Group Lead'}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="bg-gray-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl relative">
                                <div className="p-0 overflow-x-auto">
                                    <table className="w-full text-left min-w-[1200px]">
                                        <thead className="bg-black/60 text-[10px] uppercase font-black text-gray-500 tracking-widest border-b border-white/5">
                                            <tr>
                                                <th className="px-6 py-5 whitespace-nowrap">Date / Source</th>
                                                <th className="px-6 py-5 whitespace-nowrap">Lead Information</th>
                                                <th className="px-6 py-5 whitespace-nowrap">AI Score</th>
                                                <th className="px-6 py-5 whitespace-nowrap">Campaign / Loc.</th>
                                                <th className="px-6 py-5 whitespace-nowrap">Quality / Status</th>
                                                <th className="px-6 py-5 whitespace-nowrap text-center">Feedback</th>
                                                <th className="px-6 py-5 whitespace-nowrap text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {leadsLoading ? (
                                                <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" /></td></tr>
                                            ) : leads?.length === 0 ? (
                                                <tr><td colSpan={7} className="py-20 text-center text-gray-600 font-bold uppercase text-xs">No leads registered for this group</td></tr>
                                            ) : (
                                                leads.map((lead: any) => (
                                                    <tr key={lead.id} className="hover:bg-white/5 transition-all group border-l-2 border-transparent hover:border-purple-600">
                                                        <td className="px-6 py-6">
                                                            <div className="font-bold text-gray-200 text-sm whitespace-nowrap">{format(new Date(lead.date), 'MMM dd, yyyy')}</div>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${lead.source === 'AUTO' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>{lead.source}</span>
                                                                <span className="text-[10px] text-gray-600 font-bold">@ {format(new Date(lead.date), 'HH:mm')}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className="font-black text-white text-sm capitalize">{lead.name || 'Unknown Lead'}</div>
                                                            <div className="flex flex-col gap-0.5 mt-1">
                                                                <span className="text-xs text-gray-400 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {lead.phone || 'N/A'}</span>
                                                                {lead.email && <span className="text-xs text-gray-500 flex items-center gap-1.5"><Mail className="w-3 h-3" /> {lead.email}</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6 font-bold text-purple-400">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                                                    <span className="text-xs">{lead.aiScore?.score || '--'}</span>
                                                                </div>
                                                                <div className="hidden lg:block">
                                                                    <div className="text-[8px] uppercase text-gray-500">Confidence</div>
                                                                    <div className="text-[10px] text-purple-600">{lead.aiScore?.reasoning?.substring(0, 15) || 'No Match'}...</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5 truncate max-w-[150px]">
                                                                <Target className="w-3 h-3 text-purple-500" /> {lead.marketingCampaign?.name || lead.campaign_name || 'Direct'}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 uppercase font-black">
                                                                <Globe className="w-3 h-3" /> {lead.location || 'Unknown'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className="flex flex-col gap-2">
                                                                <span className={`w-fit px-2 py-0.5 rounded text-[8px] font-black uppercase ${lead.quality === 'HIGH' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : lead.quality === 'LOW' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                                                    {lead.quality} Quality
                                                                </span>
                                                                <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                                                                    <MessageSquare className="w-3 h-3" /> {lead.status}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className="flex items-center justify-center gap-4">
                                                                <button 
                                                                    onClick={() => feedbackMutation.mutate({ id: lead.id, feedback: lead.feedback === 'POSITIVE' ? null : 'POSITIVE' })}
                                                                    className={`p-2 rounded-xl transition-all ${lead.feedback === 'POSITIVE' ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-800 text-gray-600 hover:text-green-500'}`}
                                                                >
                                                                    <ThumbsUp className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => feedbackMutation.mutate({ id: lead.id, feedback: lead.feedback === 'NEGATIVE' ? null : 'NEGATIVE' })}
                                                                    className={`p-2 rounded-xl transition-all ${lead.feedback === 'NEGATIVE' ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-800 text-gray-600 hover:text-red-500'}`}
                                                                >
                                                                    <ThumbsDown className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button 
                                                                    onClick={() => setFollowUpLeadId(lead.id)}
                                                                    className="p-2 bg-purple-600/10 text-purple-500 hover:bg-purple-600 hover:text-white rounded-xl transition-all"
                                                                >
                                                                    <Edit3 className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => window.confirm('Permanently delete lead?') && deleteLeadMutation.mutate(lead.id)}
                                                                    className="p-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                                                                >
                                                                    <Trash className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Follow up Overlay */}
            {followUpLeadId && (
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-white/5 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-xl font-black text-white uppercase tracking-tighter">Edit Follow-up Status</h4>
                            <button onClick={() => setFollowUpLeadId(null)} className="text-gray-500"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Follow-up Notes</label>
                                <textarea 
                                    className="w-full px-5 py-4 bg-gray-950 border border-white/5 rounded-2xl text-white font-bold outline-none h-32"
                                    placeholder="Brief summary of conversation..."
                                    value={followUpForm.notes} onChange={e => setFollowUpForm({...followUpForm, notes: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Update Status</label>
                                    <select className="w-full px-5 py-4 bg-gray-950 border border-white/5 rounded-2xl text-white font-bold" value={followUpForm.status} onChange={e => setFollowUpForm({...followUpForm, status: e.target.value})}>
                                        <option value="CONTACTED">Contacted</option>
                                        <option value="QUALIFIED">Qualified</option>
                                        <option value="LOST">Lost / Dead</option>
                                        <option value="CONVERTED">Closed / Signed</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Channel</label>
                                    <select className="w-full px-5 py-4 bg-gray-950 border border-white/5 rounded-2xl text-white font-bold" value={followUpForm.channel} onChange={e => setFollowUpForm({...followUpForm, channel: e.target.value})}>
                                        <option value="Phone Call">Phone Call</option>
                                        <option value="WhatsApp">WhatsApp</option>
                                        <option value="Email">Email</option>
                                        <option value="Direct Visit">Direct Visit</option>
                                    </select>
                                </div>
                            </div>
                            <button 
                                onClick={() => followUpMutation.mutate({ lead_id: followUpLeadId, ...followUpForm })}
                                className="w-full py-5 bg-purple-600 text-white font-black uppercase tracking-widest rounded-3xl hover:bg-purple-700 transition-all"
                            >
                                Save Progression Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Application Branding Footer */}
            <div className="h-10 bg-gray-900 border-t border-white/5 flex items-center justify-between px-8 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">
                <div className="flex gap-6">
                    <span>Architecture: QIXPORT 2.7</span>
                    <span>Region: UAE / Global</span>
                </div>
                <div className="flex gap-6">
                    <span className="text-purple-600">Secure AI Environment</span>
                    <span>Build: 17.04.2026</span>
                </div>
            </div>
        </div>
    );
};
