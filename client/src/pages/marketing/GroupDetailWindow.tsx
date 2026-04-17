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
    const summary = metricsRes?.summary || { impressions: 0, clicks: 0, spend: 0, conversions: 0, reach: 0, results: 0 };

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
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            {metricsLoading ? 'Analyzing Performance...' : `Monitoring ${campaignRes.length} Group Campaigns & ${leads?.length || 0} Intelligence Leads`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-950 p-1 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setActiveTab('summary')}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'summary' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            Overview
                        </button>
                        <button 
                            onClick={() => setActiveTab('campaigns')}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'campaigns' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            Portfolio
                        </button>
                        <button 
                            onClick={() => setActiveTab('leads')}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'leads' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            Leads
                        </button>
                    </div>
                    <div className="h-8 w-[1px] bg-white/5 mx-2" />
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-xl transition-all border border-white/5">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent p-8">
                {activeTab === 'summary' && (
                    <div className="max-w-[1600px] mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Combined Reach', value: summary.reach?.toLocaleString() || '0', icon: Users, color: 'text-blue-400' },
                                { label: 'Combined Clicks', value: summary.clicks?.toLocaleString() || '0', icon: MousePointer2, color: 'text-purple-400' },
                                { label: 'Total Invested', value: `$${(summary.spend || 0).toLocaleString()}`, icon: Wallet, color: 'text-green-400' },
                                { label: 'Generated Leads', value: leads?.length || 0, icon: Zap, color: 'text-amber-400' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-gray-900/40 border border-white/5 p-8 rounded-[2rem] backdrop-blur-md group hover:bg-gray-800/60 transition-all">
                                    <div className={`w-12 h-12 rounded-2xl bg-gray-950 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${stat.color}`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <div className="text-3xl font-black text-white mb-1 tracking-tighter">{stat.value}</div>
                                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Performance Highlights */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-gray-900/40 border border-white/5 rounded-[2.5rem] p-10 backdrop-blur-md">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-purple-400" /> Performance Breakdown
                                </h3>
                                <div className="space-y-4">
                                    {metricsLoading ? (
                                        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
                                    ) : campaignRes.length === 0 ? (
                                        <div className="py-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">No active campaigns in this group context.</div>
                                    ) : (
                                        campaignRes.map((c: any) => (
                                            <div key={c.id} className="p-6 bg-black/20 rounded-3xl flex items-center justify-between border border-white/5 hover:bg-black/30 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center group-hover:bg-purple-600/20 transition-colors">
                                                        {c.platform === 'meta' ? <Facebook className="w-6 h-6 text-blue-500" /> : <GoogleIcon />}
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-white block mb-0.5 uppercase tracking-tight">{c.name}</span>
                                                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{c.objective || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-12 text-[11px] font-black uppercase tracking-widest">
                                                    <div className="text-right">
                                                        <div className="text-gray-500 text-[9px] mb-1">Efficiency (CPR)</div>
                                                        <div className="text-purple-400">${c.metrics?.results > 0 ? (c.metrics.spend / c.metrics.results).toFixed(2) : '0.00'}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-gray-500 text-[9px] mb-1">Spend</div>
                                                        <div className="text-white">${c.metrics?.spend?.toLocaleString() || '0'}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-gray-500 text-[9px] mb-1">Records</div>
                                                        <div className="text-emerald-500">{c.leadsCount || 0}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl shadow-purple-900/20">
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black text-white uppercase leading-tight mb-4 tracking-tighter">AI-Enabled <br/> Group Sync <br/> Active</h3>
                                    <p className="text-purple-100/80 text-xs mb-10 font-medium leading-relaxed">Cross-referencing Meta insights with internal CRM records to identify the highest performing channels.</p>
                                    <button className="bg-white text-purple-700 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-all flex items-center gap-3 shadow-xl">
                                        Refresh Engine <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <Zap className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 group-hover:scale-110 group-hover:rotate-12 transition-transform" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'campaigns' && (
                    <div className="max-w-[1600px] mx-auto animate-in slide-in-from-bottom-4 duration-500">
                         <div className="bg-gray-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
                            <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl">
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Detailed Analytics Portfolio</h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Cross-Platform Metrics & Attribution</p>
                                </div>
                                <div className="flex items-center gap-4">
                                     <div className="flex items-center gap-3 bg-gray-950/60 px-5 py-2.5 rounded-2xl border border-white/5">
                                        <Filter className="w-3.5 h-3.5 text-purple-400" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Client Sync: {format(new Date(), 'HH:mm')}</span>
                                     </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[1500px]">
                                    <thead>
                                        <tr className="bg-black/40 border-b border-white/5">
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest sticky left-0 bg-gray-900/90 backdrop-blur-md z-20 border-r border-white/5">Campaign Identification</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Budget (Daily)</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Amount Spent</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-emerald-400 uppercase tracking-widest">Results</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-purple-400 uppercase tracking-widest">CPR</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest">CPC (SMS)</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-amber-400 uppercase tracking-widest">Leads</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Reach</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Impressions</th>
                                            <th className="px-10 py-6 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Termination</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {metricsLoading ? (
                                            <tr><td colSpan={11} className="py-24 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-purple-600" /></td></tr>
                                        ) : campaignRes.length === 0 ? (
                                            <tr><td colSpan={11} className="py-24 text-center text-gray-600 font-bold uppercase text-[10px] tracking-widest">Zero Campaigns Bound to this Group</td></tr>
                                        ) : (
                                            campaignRes.map((c: any) => {
                                                const spent = c.metrics?.spend || 0;
                                                const resCount = c.metrics?.results || 0;
                                                const msgCount = c.metrics?.conversations || 0;
                                                const cprValue = resCount > 0 ? (spent / resCount).toFixed(2) : '0.00';
                                                const cpcValue = msgCount > 0 ? (spent / msgCount).toFixed(2) : '0.00';
                                                
                                                return (
                                                    <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-10 py-8 sticky left-0 bg-gray-900/90 backdrop-blur-md z-10 border-r border-white/5">
                                                            <div className="flex items-center gap-4 min-w-[300px]">
                                                                <div className="w-10 h-10 rounded-xl bg-gray-950 flex items-center justify-center border border-white/5">
                                                                    {c.platform === 'meta' ? <Facebook className="w-5 h-5 text-blue-500" /> : <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[250px]">{c.name}</div>
                                                                    <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">Platform: {c.platform} | Obj: {c.objective?.substring(0,10)}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-8">
                                                            <span className={`text-[9px] font-black px-3 py-1 rounded-lg border ${
                                                                c.status === 'ACTIVE' || c.status === 'ENABLED' 
                                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                            }`}>
                                                                {c.status === 'ACTIVE' || c.status === 'ENABLED' ? 'RUNNING' : c.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-8">
                                                            <div className="text-xs font-black text-gray-300 tracking-tighter">${(c.budget || 0).toLocaleString()}</div>
                                                            <div className="text-[9px] text-gray-600 font-bold tracking-widest uppercase mt-1">Meta Allocated</div>
                                                        </td>
                                                        <td className="px-6 py-8">
                                                            <div className="text-sm font-black text-white tracking-tighter">${spent.toLocaleString()}</div>
                                                            <div className="text-[9px] text-gray-600 font-bold tracking-widest uppercase mt-1">Net Spend</div>
                                                        </td>
                                                        <td className="px-6 py-8">
                                                            <div className="text-sm font-black text-emerald-400 tracking-tighter">{resCount.toLocaleString()}</div>
                                                            <div className="text-[9px] text-emerald-900 font-black uppercase tracking-widest mt-1">Total Hits</div>
                                                        </td>
                                                        <td className="px-6 py-8">
                                                            <div className="text-xs font-black text-purple-400 tracking-tighter">${cprValue}</div>
                                                            <div className="text-[9px] text-purple-900 font-black uppercase tracking-widest mt-1">Ideal Efficiency</div>
                                                        </td>
                                                        <td className="px-6 py-8">
                                                            <div className="text-xs font-black text-indigo-400 tracking-tighter">${cpcValue}</div>
                                                            <div className="text-[9px] text-indigo-900 font-black uppercase tracking-widest mt-1">{msgCount} Messaged</div>
                                                        </td>
                                                        <td className="px-6 py-8">
                                                            <div className="w-10 h-10 rounded-full bg-amber-500/5 flex items-center justify-center border border-amber-500/10">
                                                                <span className="text-xs font-black text-amber-500">{c.leadsCount || 0}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-8">
                                                            <div className="text-[11px] font-bold text-gray-400 tracking-tighter">{(c.metrics?.reach || 0).toLocaleString()}</div>
                                                        </td>
                                                        <td className="px-6 py-8">
                                                            <div className="text-[11px] font-bold text-gray-400 tracking-tighter">{(c.metrics?.impressions || 0).toLocaleString()}</div>
                                                        </td>
                                                        <td className="px-10 py-8 text-right">
                                                            <button 
                                                                onClick={() => unassignMutation.mutate(c.id)}
                                                                className="p-3 bg-gray-950 border border-white/5 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                                                                title="Unassign from Group"
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
                    <div className="max-w-[1600px] mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Subtabs and Forms - Kept identical to previous but polished */}
                        <div className="flex gap-4">
                            <button onClick={() => setLeadView('list')} className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl ${leadView === 'list' ? 'bg-white text-gray-950 shadow-white/5' : 'bg-gray-900/40 border border-white/5 text-gray-500 hover:text-white'}`}>CRM Database</button>
                            <button onClick={() => setLeadView('add')} className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl ${leadView === 'add' ? 'bg-purple-600 text-white shadow-purple-500/20' : 'bg-gray-900/40 border border-white/5 text-gray-500 hover:text-purple-400'}`}>Manual Registration</button>
                        </div>

                        {leadView === 'add' ? (
                            <div className="max-w-3xl mx-auto bg-gray-900/60 backdrop-blur-3xl border border-white/5 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-5">
                                    <Users className="w-40 h-40 text-white" />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-10 relative z-10">Record Intelligence Asset</h3>
                                <form className="space-y-8 relative z-10" onSubmit={(e) => { e.preventDefault(); addLeadMutation.mutate(leadForm); }}>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Entity Name</label>
                                            <input className="w-full px-6 py-5 bg-gray-950 border border-white/5 rounded-[1.5rem] text-white font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all shadow-inner" placeholder="John Doe" value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} required />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Communication Channel</label>
                                            <input className="w-full px-6 py-5 bg-gray-950 border border-white/5 rounded-[1.5rem] text-white font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all shadow-inner" placeholder="+91 ..." value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Digital Address</label>
                                            <input className="w-full px-6 py-5 bg-gray-950 border border-white/5 rounded-[1.5rem] text-white font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all shadow-inner" placeholder="john@example.com" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Geographical Origin</label>
                                            <input className="w-full px-6 py-5 bg-gray-950 border border-white/5 rounded-[1.5rem] text-white font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all shadow-inner" placeholder="Dubai, UAE" value={leadForm.location} onChange={e => setLeadForm({...leadForm, location: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Interest Level</label>
                                            <select className="w-full px-6 py-5 bg-gray-950 border border-white/5 rounded-[1.5rem] text-white font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-purple-600 transition-all shadow-inner appearance-none cursor-pointer" value={leadForm.quality} onChange={e => setLeadForm({...leadForm, quality: e.target.value})}>
                                                <option value="HIGH">High Fidelity (Hot)</option>
                                                <option value="MEDIUM">Balanced Interest</option>
                                                <option value="LOW">Cold / Exploratory</option>
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Current Pipeline</label>
                                            <select className="w-full px-6 py-5 bg-gray-950 border border-white/5 rounded-[1.5rem] text-white font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-purple-600 transition-all shadow-inner appearance-none cursor-pointer" value={leadForm.status} onChange={e => setLeadForm({...leadForm, status: e.target.value})}>
                                                <option value="NEW">New Discovery</option>
                                                <option value="CONTACTED">Active Dialogue</option>
                                                <option value="QUALIFIED">Deep Verification</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" disabled={addLeadMutation.isPending} className="w-full py-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black uppercase tracking-[0.3em] rounded-[2rem] shadow-2xl shadow-purple-900/40 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50">
                                        {addLeadMutation.isPending ? 'Propagating Data...' : 'Commit to Intelligence Base'}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="bg-gray-900/40 backdrop-blur-md border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                                <div className="p-0 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left min-w-[1300px]">
                                        <thead className="bg-black/60 text-[10px] uppercase font-black text-gray-500 tracking-widest border-b border-white/5">
                                            <tr>
                                                <th className="px-8 py-6">Timeline / Source</th>
                                                <th className="px-8 py-6">Intelligence Profile</th>
                                                <th className="px-8 py-6">AI Evaluation</th>
                                                <th className="px-8 py-6">Origin Context</th>
                                                <th className="px-8 py-6">Health / Pipeline</th>
                                                <th className="px-8 py-6 text-center">Engagement</th>
                                                <th className="px-10 py-6 text-right">Portfolio Control</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 font-bold">
                                            {leadsLoading ? (
                                                <tr><td colSpan={7} className="py-24 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-purple-600" /></td></tr>
                                            ) : leads?.length === 0 ? (
                                                <tr><td colSpan={7} className="py-24 text-center text-gray-600 font-bold uppercase text-[10px] tracking-[0.2em]">Zero Records in this Group Namespace</td></tr>
                                            ) : (
                                                leads.map((lead: any) => (
                                                    <tr key={lead.id} className="hover:bg-white/5 transition-all group">
                                                        <td className="px-8 py-8">
                                                            <div className="text-xs text-white uppercase tracking-tighter">{format(new Date(lead.date), 'MMM dd, yyyy')}</div>
                                                            <div className="flex items-center gap-2 mt-1.5 grow">
                                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${lead.source === 'AUTO' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>{lead.source}</span>
                                                                <span className="text-[9px] text-gray-600 lowercase font-black">at {format(new Date(lead.date), 'HH:mm')}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-8">
                                                            <div className="font-black text-white text-sm uppercase tracking-tight">{lead.name || 'Anonymous Intelligence'}</div>
                                                            <div className="flex flex-col gap-1.5 mt-2">
                                                                <span className="text-[11px] text-gray-400 flex items-center gap-2 tracking-wide"><Phone className="w-3.5 h-3.5 text-gray-600" /> {lead.phone || 'N/A'}</span>
                                                                {lead.email && <span className="text-[11px] text-gray-500 flex items-center gap-2 tracking-wide"><Mail className="w-3.5 h-3.5 text-gray-600" /> {lead.email}</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-8">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center border border-white/5">
                                                                    <span className="text-xs font-black text-purple-400">{lead.aiScore?.score || '--'}</span>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[8px] uppercase text-gray-500 tracking-widest mb-1">AI Context</div>
                                                                    <div className="text-[10px] text-gray-400 lowercase max-w-[120px] truncate">{lead.aiScore?.reasoning || 'No analysis...'}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-8">
                                                            <div className="text-xs text-gray-200 flex items-center gap-2 max-w-[180px] truncate uppercase tracking-tighter">
                                                                <Target className="w-3.5 h-3.5 text-purple-500" /> {lead.marketingCampaign?.name || lead.campaign_name || 'Direct / CRM'}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-2 text-[9px] text-gray-500 font-black uppercase tracking-[0.1em]">
                                                                <Globe className="w-3.5 h-3.5 text-gray-600" /> {lead.location || 'Unknown'}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-8">
                                                            <div className="flex flex-col gap-2.5">
                                                                <span className={`w-fit px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${lead.quality === 'HIGH' ? 'bg-green-500/10 text-green-400 border-green-400/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : lead.quality === 'LOW' ? 'bg-red-500/10 text-red-400 border-red-400/20' : 'bg-blue-500/10 text-blue-400 border-blue-400/20'}`}>
                                                                    {lead.quality}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-600 uppercase font-black">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${lead.status === 'QUALIFIED' ? 'bg-green-500' : 'bg-gray-700'}`} /> {lead.status}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-8">
                                                            <div className="flex items-center justify-center gap-4">
                                                                <button onClick={() => feedbackMutation.mutate({ id: lead.id, feedback: lead.feedback === 'POSITIVE' ? null : 'POSITIVE' })} className={`w-12 h-12 rounded-2xl transition-all border flex items-center justify-center transform hover:scale-110 active:scale-90 ${lead.feedback === 'POSITIVE' ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] border-green-400' : 'bg-gray-950 border-white/5 text-gray-600 hover:text-green-500'}`}><ThumbsUp className="w-5 h-5" /></button>
                                                                <button onClick={() => feedbackMutation.mutate({ id: lead.id, feedback: lead.feedback === 'NEGATIVE' ? null : 'NEGATIVE' })} className={`w-12 h-12 rounded-2xl transition-all border flex items-center justify-center transform hover:scale-110 active:scale-90 ${lead.feedback === 'NEGATIVE' ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] border-red-400' : 'bg-gray-950 border-white/5 text-gray-600 hover:text-red-500'}`}><ThumbsDown className="w-5 h-5" /></button>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-8 text-right">
                                                            <div className="flex items-center justify-end gap-3">
                                                                <button onClick={() => setFollowUpLeadId(lead.id)} className="w-11 h-11 bg-purple-600/10 text-purple-500 hover:bg-purple-600 hover:text-white rounded-[1rem] transition-all border border-purple-500/10"><Edit3 className="w-5 h-5 mx-auto" /></button>
                                                                <button onClick={() => window.confirm('Permanently purge intelligence record?') && deleteLeadMutation.mutate(lead.id)} className="w-11 h-11 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-[1rem] transition-all border border-red-500/10"><Trash className="w-5 h-5 mx-auto" /></button>
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
                <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-gray-900 border border-white/5 w-full max-w-xl rounded-[4rem] p-12 shadow-2xl animate-in zoom-in-95 backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h4 className="text-2xl font-black text-white uppercase tracking-tighter">Status Progression</h4>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Lead Attribution & Pipeline Update</p>
                            </div>
                            <button onClick={() => setFollowUpLeadId(null)} className="w-12 h-12 bg-gray-950 rounded-2xl flex items-center justify-center text-gray-500 hover:text-red-500 border border-white/5 transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Internal Interaction Notes</label>
                                <textarea className="w-full px-6 py-5 bg-gray-950 border border-white/5 rounded-[2rem] text-white font-bold outline-none h-40 focus:ring-2 focus:ring-purple-600 transition-all custom-scrollbar" placeholder="Detail the latest intelligence gathered from the client..." value={followUpForm.notes} onChange={e => setFollowUpForm({...followUpForm, notes: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Pipeline Status</label>
                                    <select className="w-full px-6 py-5 bg-gray-950 border border-white/5 rounded-[2rem] text-white font-black uppercase tracking-widest outline-none appearance-none cursor-pointer" value={followUpForm.status} onChange={e => setFollowUpForm({...followUpForm, status: e.target.value})}>
                                        <option value="CONTACTED">Initiated Dialogue</option>
                                        <option value="QUALIFIED">Fidelity Confirmed</option>
                                        <option value="LOST">Pipeline Purged</option>
                                        <option value="CONVERTED">Closed / Win</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Interaction Medium</label>
                                    <select className="w-full px-6 py-5 bg-gray-950 border border-white/5 rounded-[2rem] text-white font-black uppercase tracking-widest outline-none appearance-none cursor-pointer" value={followUpForm.channel} onChange={e => setFollowUpForm({...followUpForm, channel: e.target.value})}>
                                        <option value="Phone Call">Cellular Link</option>
                                        <option value="WhatsApp">Encrypted Chat</option>
                                        <option value="Email">SMTP / IMAP</option>
                                        <option value="Direct Visit">On-Site Session</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={() => followUpMutation.mutate({ lead_id: followUpLeadId, ...followUpForm })} className="w-full py-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black uppercase tracking-[0.3em] rounded-[2.5rem] shadow-2xl hover:scale-[1.02] transition-all">Submit Progression Data</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Application Branding Footer */}
            <div className="h-10 bg-gray-900 border-t border-white/5 flex items-center justify-between px-10 text-[9px] font-black uppercase tracking-[0.4em] text-gray-600">
                <div className="flex gap-10">
                    <span>Cluster: QIX-PRM-2.7</span>
                    <span>Secure Architecture</span>
                </div>
                <div className="flex gap-10">
                    <span className="text-purple-600/60">AI Intelligence Mesh Active</span>
                    <span>© 2026 ANTIGRAVITY</span>
                </div>
            </div>
        </div>
    );
};
