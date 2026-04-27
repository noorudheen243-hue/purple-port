import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    X, Loader2, Trash2, Users, Target, Phone, Mail, MapPin, 
    Facebook, ExternalLink, Check, AlertCircle, PlusCircle,
    TrendingUp, MousePointer2, Wallet, Zap, MessageSquare,
    ChevronRight, ArrowRight, ShieldCheck, Filter, Search,
    ThumbsUp, ThumbsDown, Edit3, Trash, Calendar, Globe,
    ChevronDown, PlayCircle, PauseCircle, Archive, StopCircle
} from 'lucide-react';
import { format, subDays } from 'date-fns';

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

const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(val);
};

export const GroupDetailWindow: React.FC<GroupDetailWindowProps> = ({ group, clientId, onClose }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'summary' | 'campaigns' | 'leads'>('summary');
    const [leadView, setLeadView] = useState<'list' | 'add'>('list');
    
    // Filtering State
    const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [overviewStatus, setOverviewStatus] = useState<string>('RUNNING'); // RUNNING, PAUSED, ARCHIVED, STOPPED, ALL
    const [campaignSearch, setCampaignSearch] = useState('');
    const [syncing, setSyncing] = useState(false);

    // Quick Lead Form State
    const [leadForm, setLeadForm] = useState({
        name: '', phone: '', email: '', location: '', quality: 'MEDIUM', status: 'NEW'
    });

    // Follow up Editor state
    const [followUpLeadId, setFollowUpLeadId] = useState<string | null>(null);
    const [followUpForm, setFollowUpForm] = useState({ notes: '', status: 'CONTACTED', channel: 'Call', otherChannel: '' });

    // Performance Metrics Query
    const { data: metricsRes, isLoading: metricsLoading } = useQuery({
        queryKey: ['group-metrics', group.id, fromDate, toDate],
        queryFn: async () => {
            const res = await api.get(`/marketing/metrics?clientId=${clientId}&groupId=${group.id}&from=${fromDate}&to=${toDate}&status=all`);
            return res.data;
        }
    });

    // Leads Query
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

    const deleteLeadMutation = useMutation({
        mutationFn: (leadId: string) => api.delete(`/marketing/leads/${leadId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group-leads'] });
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

    const followUpMutation = useMutation({
        mutationFn: (data: any) => api.post('/marketing/leads/follow-up', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group-leads'] });
            // Keep window open if wanted, but user can close manually. We reset local form state.
            setFollowUpForm({ notes: '', status: 'CONTACTED', channel: 'Call', otherChannel: '' });
        }
    });

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.post('/marketing/sync', { clientId, daysBack: 35 });
            queryClient.invalidateQueries({ queryKey: ['group-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['group-leads'] });
        } catch (err) {
            console.error('Manual sync failed:', err);
            alert('Refresh failed. Please check your connection.');
        } finally {
            setSyncing(false);
        }
    };

    const campaignRes = metricsRes?.campaigns || [];
    const summary = metricsRes?.summary || { impressions: 0, clicks: 0, spend: 0, conversions: 0, reach: 0, results: 0 };
    
    // Derived Active Count
    const activeCampaigns = campaignRes.filter((c: any) => c.status === 'ACTIVE' || c.status === 'ENABLED');
    const runningCount = activeCampaigns.length;

    // Filtered Breakdown List
    const filteredBreakdown = campaignRes.filter((c: any) => {
        if (overviewStatus === 'ALL') return true;
        if (overviewStatus === 'RUNNING') return c.status === 'ACTIVE' || c.status === 'ENABLED';
        if (overviewStatus === 'PAUSED') return c.status === 'PAUSED';
        if (overviewStatus === 'ARCHIVED') return c.status === 'ARCHIVED';
        if (overviewStatus === 'STOPPED') return c.status === 'STOPPED' || c.status === 'COMPLETED';
        return true;
    });

    return (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in fade-in duration-300">
            {/* Header - Light Redesign */}
            <div className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
                        <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{group.name}</h1>
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded border border-purple-200 uppercase tracking-widest">Command Center</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {metricsLoading ? 'Analyzing Performance...' : `Monitoring ${campaignRes.length} Campaigns | Integrated with Meta & CRM`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Custom Date Range Selection */}
                    <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 px-2 border-r border-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-purple-500" />
                            <input 
                                type="date" 
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="bg-transparent text-[10px] font-black uppercase text-slate-700 outline-none cursor-pointer hover:text-purple-600 transition-colors"
                                title="Start Date"
                            />
                        </div>
                        <div className="flex items-center gap-2 px-2">
                            <input 
                                type="date" 
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="bg-transparent text-[10px] font-black uppercase text-slate-700 outline-none cursor-pointer hover:text-purple-600 transition-colors"
                                title="End Date"
                            />
                        </div>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button onClick={() => setActiveTab('summary')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'summary' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Overview</button>
                        <button onClick={() => setActiveTab('campaigns')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'campaigns' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Portfolio</button>
                        <button onClick={() => setActiveTab('leads')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'leads' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Intelligence</button>
                    </div>
                    
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-slate-200">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Workspace - Light Theme */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeTab === 'summary' && (
                    <div className="max-w-[1600px] mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Metrics Grid - 5 Items */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                            {[
                                { label: 'Running Ads', value: runningCount, icon: PlayCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'Total Reach', value: summary.reach?.toLocaleString() || '0', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Combined Clicks', value: summary.clicks?.toLocaleString() || '0', icon: MousePointer2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                { label: 'Amount Invested', value: formatINR(summary.spend || 0), icon: Wallet, color: 'text-teal-600', bg: 'bg-teal-50' },
                                { label: 'Records Synced', value: summary.results?.toLocaleString() || '0', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${stat.bg} ${stat.color}`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <div className="text-3xl font-black text-slate-900 mb-1 tracking-tighter">{stat.value}</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Performance Highlights */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-center mb-8 relative z-10">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-purple-600" /> Performance Breakdown
                                    </h3>
                                    {/* Status Filters */}
                                    <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                        {['RUNNING', 'PAUSED', 'STOPPED', 'ALL'].map(s => (
                                            <button 
                                                key={s}
                                                onClick={() => setOverviewStatus(s)}
                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${overviewStatus === s ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 relative z-10">
                                    {metricsLoading ? (
                                        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
                                    ) : filteredBreakdown.length === 0 ? (
                                        <div className="py-20 text-center">
                                            <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No campaigns match the "{overviewStatus}" filter for the selected range.</p>
                                        </div>
                                    ) : (
                                        filteredBreakdown.map((c: any) => (
                                            <div key={c.id} className="p-6 bg-slate-50/50 rounded-3xl flex items-center justify-between border border-slate-100 hover:bg-slate-50 hover:border-slate-300 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                                                        {c.platform === 'meta' ? <Facebook className="w-6 h-6 text-blue-500" /> : <GoogleIcon />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-slate-900 uppercase tracking-tight">{c.name}</span>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'ACTIVE' || c.status === 'ENABLED' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.objective || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-12 text-[11px] font-black uppercase tracking-widest">
                                                    <div className="text-right">
                                                        <div className="text-slate-400 text-[9px] mb-1">Efficiency</div>
                                                        <div className="text-purple-600">{formatINR(c.metrics?.results > 0 ? (c.metrics.spend / c.metrics.results) : 0)}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-slate-400 text-[9px] mb-1">Total Spend</div>
                                                        <div className="text-slate-900">{formatINR(c.metrics?.spend || 0)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl shadow-purple-200">
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black text-white uppercase leading-tight mb-4 tracking-tighter">Financial <br/> Summary <br/> Performance</h3>
                                    <p className="text-purple-100/90 text-xs mb-10 font-medium leading-relaxed">Aggregated performance data for the selected date range ({format(new Date(fromDate), 'MMM d')} - {format(new Date(toDate), 'MMM d')}).</p>
                                    <button 
                                        onClick={handleSync}
                                        disabled={syncing}
                                        className="bg-white text-purple-700 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-all flex items-center gap-3 shadow-xl disabled:opacity-50"
                                    >
                                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        {syncing ? 'Syncing...' : 'Refresh Data'} <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <Zap className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 group-hover:scale-110 group-hover:rotate-12 transition-transform" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'campaigns' && (
                    <div className="max-w-[1600px] mx-auto animate-in slide-in-from-bottom-4 duration-500">
                         <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl">
                            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Detailed Analytics Portfolio</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cross-Platform Metrics for {format(new Date(fromDate), 'MMM d')} - {format(new Date(toDate), 'MMM d, yyyy')}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                     <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-200 flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-purple-600/20 transition-all">
                                        <Search className="w-3.5 h-3.5 text-slate-400" />
                                        <input 
                                            type="text"
                                            placeholder="Search campaigns..."
                                            className="bg-transparent text-[10px] font-black uppercase text-slate-700 outline-none w-48 placeholder:text-slate-300"
                                            value={campaignSearch}
                                            onChange={(e) => setCampaignSearch(e.target.value)}
                                        />
                                     </div>
                                     <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-200 flex items-center gap-3 shadow-sm">
                                        <Filter className="w-3.5 h-3.5 text-purple-500" />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Live Integration Active</span>
                                     </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[1500px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-white z-20 border-r border-slate-100">Campaign</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget (Daily)</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Spent</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest">Results</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-purple-600 uppercase tracking-widest">CPR</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-indigo-600 uppercase tracking-widest">CPC</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-amber-600 uppercase tracking-widest">Leads</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reach</th>
                                            <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Impressions</th>
                                            <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Control</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 italic-none">
                                        {metricsLoading ? (
                                            <tr><td colSpan={11} className="py-24 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-purple-600" /></td></tr>
                                        ) : campaignRes.length === 0 ? (
                                            <tr><td colSpan={11} className="py-24 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Zero Campaigns Bound to this Group for this Period</td></tr>
                                        ) : (
                                            campaignRes.filter((c: any) => c.name.toLowerCase().includes(campaignSearch.toLowerCase())).map((c: any) => (
                                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-10 py-8 sticky left-0 bg-white z-10 border-r border-slate-100">
                                                        <div className="flex items-center gap-4 min-w-[300px]">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200">
                                                                {c.platform === 'meta' ? <Facebook className="w-5 h-5 text-blue-500" /> : <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{c.name}</div>
                                                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{c.platform} Analytics Profile</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-8">
                                                        <span className={`text-[9px] font-black px-3 py-1 rounded-lg border ${
                                                            c.status === 'ACTIVE' || c.status === 'ENABLED' 
                                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' 
                                                                : 'bg-slate-100 text-slate-500 border-slate-200'
                                                        }`}>
                                                            {c.status === 'ACTIVE' || c.status === 'ENABLED' ? 'RUNNING' : c.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-8 font-black text-slate-700">{formatINR(c.budget || 0)}</td>
                                                    <td className="px-6 py-8 font-black text-slate-900 text-sm">{formatINR(c.metrics?.spend || 0)}</td>
                                                    <td className="px-6 py-8 font-black text-emerald-600">{ (c.metrics?.results || 0).toLocaleString() }</td>
                                                    <td className="px-6 py-8 font-black text-purple-600">{formatINR(c.metrics?.results > 0 ? (c.metrics.spend / c.metrics.results) : 0)}</td>
                                                    <td className="px-6 py-8 font-black text-indigo-600">{formatINR(c.metrics?.conversations > 0 ? (c.metrics.spend / c.metrics.conversations) : 0)}</td>
                                                    <td className="px-6 py-8">
                                                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
                                                            <span className="text-xs font-black text-amber-600">{c.leadsCount || 0}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-8 text-slate-500 font-bold">{(c.metrics?.reach || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-8 text-slate-500 font-bold">{(c.metrics?.impressions || 0).toLocaleString()}</td>
                                                    <td className="px-10 py-8 text-right">
                                                        <button 
                                                            onClick={() => {
                                                                if(window.confirm('Are you sure you want to unassign this campaign from this group?')) {
                                                                    unassignMutation.mutate(c.id);
                                                                }
                                                            }}
                                                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-2xl transition-all shadow-sm"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                         </div>
                    </div>
                )}

                {activeTab === 'leads' && (
                    <div className="max-w-[1600px] mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Leads Tab Refinement - Consistent Light Mode */}
                         <div className="flex gap-4">
                            <button onClick={() => setLeadView('list')} className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-md ${leadView === 'list' ? 'bg-slate-900 text-white shadow-slate-200' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-900'}`}>CRM Records</button>
                            <button onClick={() => setLeadView('add')} className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-md ${leadView === 'add' ? 'bg-purple-600 text-white shadow-purple-100' : 'bg-white border border-slate-200 text-slate-500 hover:text-purple-600'}`}>New Registration</button>
                        </div>

                        {leadView === 'add' ? (
                            <div className="max-w-4xl mx-auto bg-white border border-slate-200 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                                <Users className="absolute top-10 right-10 w-40 h-40 text-slate-50 opacity-10" />
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-10 relative z-10">Manual Intelligence Intake</h3>
                                <form className="space-y-8 relative z-10" onSubmit={(e) => { e.preventDefault(); addLeadMutation.mutate(leadForm); }}>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity Name <span className="text-red-500">*</span></label>
                                            <input className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all" placeholder="John Doe" value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} required />
                                        </div>
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Contact <span className="text-red-500">*</span></label>
                                            <input className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all" placeholder="+91 ..." value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} required />
                                        </div>
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email (Optional)</label>
                                            <input className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all" placeholder="name@example.com" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} />
                                        </div>
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location / Hub (Optional)</label>
                                            <input className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all" placeholder="City, Area..." value={leadForm.location} onChange={e => setLeadForm({...leadForm, location: e.target.value})} />
                                        </div>
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Quality Score</label>
                                            <select className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black uppercase outline-none focus:ring-2 focus:ring-purple-600 transition-all" value={leadForm.quality} onChange={e => setLeadForm({...leadForm, quality: e.target.value})}>
                                                <option value="HIGH">High Potency</option>
                                                <option value="MEDIUM">Standard</option>
                                                <option value="LOW">Low Interest</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pipeline Entry Status</label>
                                            <select className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black uppercase outline-none focus:ring-2 focus:ring-purple-600 transition-all" value={leadForm.status} onChange={e => setLeadForm({...leadForm, status: e.target.value})}>
                                                <option value="NEW">Newly Registered</option>
                                                <option value="CONTACTED">1. Contacted</option>
                                                <option value="QUALIFIED">Validated</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" disabled={addLeadMutation.isPending} className="w-full py-6 bg-purple-600 text-white font-black uppercase tracking-[0.3em] rounded-[2rem] shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50">
                                        {addLeadMutation.isPending ? 'Syncing...' : 'Commit to Database'}
                                    </button>
                                </form>
                            </div>
                        ) : (
                             <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-xl">
                                <div className="p-0 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left min-w-[1300px]">
                                        <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-200">
                                            <tr>
                                                <th className="px-8 py-6">Timeline</th>
                                                <th className="px-8 py-6">Profile</th>
                                                <th className="px-8 py-6">Follow-up</th>
                                                <th className="px-8 py-6">Intelligence</th>
                                                <th className="px-8 py-6 text-center">Engagement</th>
                                                <th className="px-10 py-6 text-right">Portfolio Control</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                                            {leadsLoading ? (
                                                <tr><td colSpan={6} className="py-24 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-purple-600" /></td></tr>
                                            ) : leads?.length === 0 ? (
                                                <tr><td colSpan={6} className="py-24 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Zero Records Available</td></tr>
                                            ) : (
                                                leads.map((lead: any) => (
                                                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-all group">
                                                        <td className="px-8 py-8">
                                                            <div className="text-xs text-slate-900 uppercase tracking-tighter">{format(new Date(lead.date), 'MMM dd, yyyy')}</div>
                                                            <div className="flex items-center gap-2 mt-1.5 grow font-black">
                                                                <span className={`text-[8px] px-2 py-0.5 rounded-md ${lead.source === 'AUTO' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{lead.source}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-8">
                                                            <div className="font-black text-slate-900 text-sm uppercase tracking-tight">{lead.name || 'Anonymous Personal'}</div>
                                                            <div className="text-[11px] text-slate-400 mt-1">{lead.phone || lead.email || 'No contact...'}</div>
                                                            {lead.location && <div className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1 uppercase tracking-widest"><MapPin className="w-2 h-2" /> {lead.location}</div>}
                                                        </td>
                                                        <td className="px-8 py-8">
                                                            <div className="flex items-center gap-3">
                                                                <div 
                                                                    onClick={() => setFollowUpLeadId(lead.id)}
                                                                    className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black text-slate-700 uppercase cursor-pointer hover:bg-slate-200 transition-colors flex items-center gap-2"
                                                                >
                                                                    {lead.follow_ups?.length || 0} History
                                                                </div>
                                                                <button 
                                                                    onClick={() => {
                                                                        setFollowUpLeadId(lead.id);
                                                                    }}
                                                                    className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md shadow-purple-100"
                                                                >
                                                                    <PlusCircle className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-8">
                                                            <div className="flex flex-col gap-1.5">
                                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase w-fit border ${lead.quality === 'HIGH' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : lead.quality === 'LOW' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                                    {lead.quality} Potential
                                                                </span>
                                                                <span className="text-[10px] font-black text-slate-900 uppercase opacity-60">
                                                                    {lead.status}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-8 text-center">
                                                            <div className="flex items-center justify-center gap-4">
                                                                <button onClick={() => feedbackMutation.mutate({ id: lead.id, feedback: lead.feedback === 'POSITIVE' ? null : 'POSITIVE' })} className={`w-11 h-11 rounded-2xl transition-all border flex items-center justify-center shadow-sm ${lead.feedback === 'POSITIVE' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-500'}`}><ThumbsUp className="w-5 h-5" /></button>
                                                                <button onClick={() => feedbackMutation.mutate({ id: lead.id, feedback: lead.feedback === 'NEGATIVE' ? null : 'NEGATIVE' })} className={`w-11 h-11 rounded-2xl transition-all border flex items-center justify-center shadow-sm ${lead.feedback === 'NEGATIVE' ? 'bg-red-600 text-white border-red-500' : 'bg-white border-slate-200 text-slate-400 hover:text-red-500'}`}><ThumbsDown className="w-5 h-5" /></button>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-8 text-right">
                                                            <div className="flex items-center justify-end gap-3">
                                                                <button 
                                                                    onClick={() => {
                                                                        if(window.confirm('IRREVERSIBLE: Are you sure you want to delete this intelligence record and all its data?')) {
                                                                            deleteLeadMutation.mutate(lead.id);
                                                                        }
                                                                    }}
                                                                    className="w-10 h-10 bg-white text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all border border-slate-100 hover:border-red-200"
                                                                >
                                                                    <Trash className="w-4 h-4 mx-auto" />
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

            {/* Follow up Overlay - Refactored for History + New Entry */}
            {followUpLeadId && (
                <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl h-[80vh] rounded-[3.5rem] flex overflow-hidden shadow-2xl animate-in zoom-in-95 border border-slate-200">
                        {/* History Timeline Side */}
                        <div className="w-1/2 bg-slate-50 border-r border-slate-100 p-12 overflow-y-auto custom-scrollbar">
                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-10">Follow-up Intelligence Trail</h4>
                            <div className="space-y-10 relative">
                                <div className="absolute left-4 top-2 bottom-0 w-0.5 bg-slate-200" />
                                {leads?.find((l: any) => l.id === followUpLeadId)?.follow_ups?.length > 0 ? (
                                    leads.find((l: any) => l.id === followUpLeadId).follow_ups.map((f: any, i: number) => (
                                        <div key={f.id} className="relative pl-12">
                                            <div className="absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full bg-purple-600 border-4 border-white shadow-sm" />
                                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(f.date), 'MMM dd, HH:mm')}</span>
                                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[8px] font-black rounded uppercase">{f.channel}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-700 font-bold leading-relaxed">{f.notes}</p>
                                                <div className="mt-3 pt-3 border-t border-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    Status: {f.status}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border border-slate-200 mx-auto mb-4">
                                            <Mail className="w-6 h-6 text-slate-200" />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No history recorded yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* New Entry Side */}
                        <div className="flex-1 p-12 relative overflow-y-auto">
                            <button onClick={() => setFollowUpLeadId(null)} className="absolute top-8 right-8 w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 border border-slate-200 transition-colors"><X className="w-6 h-6" /></button>
                            
                            <div className="mb-10">
                                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Initiate Follow-up</h4>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Update Intelligence Records</p>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Interaction Notes</label>
                                    <textarea className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-slate-900 font-bold outline-none h-48 focus:ring-2 focus:ring-purple-600 transition-all resize-none" placeholder="Details of the interaction..." value={followUpForm.notes} onChange={e => setFollowUpForm({...followUpForm, notes: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Channel Medium</label>
                                        <select className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black uppercase tracking-widest outline-none appearance-none cursor-pointer" value={followUpForm.channel} onChange={e => setFollowUpForm({...followUpForm, channel: e.target.value})}>
                                            <option value="Call">1. Call</option>
                                            <option value="WhatsApp">2. WhatsApp</option>
                                            <option value="E-mail">3. E-mail</option>
                                            <option value="Messenger/Message">4. Messenger/Message</option>
                                            <option value="Other">5. Other Channels (Specify)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">New Pipeline Status</label>
                                        <select className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black uppercase tracking-widest outline-none appearance-none cursor-pointer" value={followUpForm.status} onChange={e => setFollowUpForm({...followUpForm, status: e.target.value})}>
                                            <option value="CONTACTED">1. Contacted</option>
                                            <option value="WIN_CLOSED">2. Win-Closed</option>
                                            <option value="LOST_CLOSED">3. Lost-Closed</option>
                                            <option value="NO_RESPONSE">4. No Response</option>
                                            <option value="WAITING_REPLAY">5. Waiting to Replay</option>
                                        </select>
                                    </div>
                                </div>

                                {followUpForm.channel === 'Other' && (
                                    <div className="space-y-2.5 animate-in slide-in-from-top-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Specify Channel</label>
                                        <input className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-purple-600 transition-all" placeholder="Enter channel name..." value={followUpForm.otherChannel} onChange={e => setFollowUpForm({...followUpForm, otherChannel: e.target.value})} />
                                    </div>
                                )}

                                <button 
                                    onClick={() => {
                                        const finalChannel = followUpForm.channel === 'Other' ? followUpForm.otherChannel : followUpForm.channel;
                                        followUpMutation.mutate({ 
                                            leadId: followUpLeadId, 
                                            status: followUpForm.status,
                                            notes: followUpForm.notes,
                                            channel: finalChannel || 'Other'
                                        });
                                    }} 
                                    className="w-full py-6 bg-purple-600 text-white font-black uppercase tracking-[0.3em] rounded-3xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                    disabled={followUpMutation.isPending || (followUpForm.channel === 'Other' && !followUpForm.otherChannel)}
                                >
                                    {followUpMutation.isPending ? 'Committing...' : 'Submit Intelligence Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Application Branding Footer */}
            <div className="h-10 bg-white border-t border-slate-200 flex items-center justify-between px-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">
                <div className="flex gap-10">
                    <span>Purple Port v2.7</span>
                    <span className="text-slate-200">|</span>
                    <span>Cluster: PRM-LIVE</span>
                </div>
                <div className="flex gap-10">
                    <span className="text-purple-600/40">AI Engine Isolated</span>
                    <span>© 2026 ANTIGRAVITY</span>
                </div>
            </div>
        </div>
    );
};
