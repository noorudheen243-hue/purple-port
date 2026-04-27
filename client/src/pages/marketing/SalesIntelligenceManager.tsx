import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import AISalesDashboard from './AISalesDashboard';
import SalesPipelinePage from './SalesPipelinePage';
import { MarketingDashboard } from './MarketingDashboard';
import { MetaAdsManager } from './MetaAdsManager';
import MetaReportsTab from './MetaReportsTab';
import TeamspaceManager from './TeamspaceManager';
import { 
    Zap, KanbanSquare, Target, 
    BarChart3, FileText, Users, 
    ChevronDown, LayoutGrid, Sparkles,
    Megaphone, Search, LineChart, Globe, Terminal, Activity,
    TrendingUp, ExternalLink, Calendar, Plus, RefreshCw, Filter, ArrowRight
} from 'lucide-react';

const SalesIntelligenceManager = ({ embeddedClientId }: { embeddedClientId?: string }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'pipeline' | 'campaigns' | 'reports' | 'analytics' | 'teamspace'>('dashboard');
    const [selectedClientId, setSelectedClientId] = useState<string>(embeddedClientId || '');

    // Sync selectedClientId if embeddedClientId changes
    useEffect(() => {
        if (embeddedClientId !== undefined) {
            setSelectedClientId(embeddedClientId);
        }
    }, [embeddedClientId]);

    const isEmbedded = embeddedClientId !== undefined;

    // Fetch available clients for global selector - ONLY ACTIVE
    const { data: clients, isLoading: clientsLoading } = useQuery({
        queryKey: ['clients-active'],
        queryFn: async () => (await api.get('/clients?status=ACTIVE')).data
    });

    const tabs = [
        { id: 'dashboard', name: 'AI Dashboard', icon: Sparkles, color: 'text-purple-600' },
        { id: 'pipeline', name: 'Sales Pipeline', icon: KanbanSquare, color: 'text-blue-600' },
        { id: 'campaigns', name: 'Campaigns', icon: Target, color: 'text-orange-600' },
        { id: 'reports', name: 'Reports', icon: FileText, color: 'text-indigo-600' },
        { id: 'analytics', name: 'Analytics', icon: BarChart3, color: 'text-green-600' },
        { id: 'teamspace', name: 'Teamspace', icon: Users, color: 'text-pink-600' },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[#fcfcfd]">
            {/* Superior Header with Global Filter - Hidden if Embedded */}
            {!isEmbedded && (
                <div className="bg-white border-b border-gray-100 px-8 py-6 sticky top-0 z-30 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-purple-600 rounded-lg">
                                    <Zap className="w-5 h-5 text-white fill-white" />
                                </div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Sales Intelligence</h1>
                            </div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Command & Control Center</p>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative group flex-1 md:flex-none">
                                <select
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(e.target.value)}
                                    className="appearance-none w-full md:w-72 bg-gray-50 border-2 border-gray-100 hover:border-purple-200 px-6 py-3 rounded-2xl text-sm font-black text-gray-700 outline-none transition-all cursor-pointer shadow-sm"
                                >
                                    <option value="">{clientsLoading ? 'Loading Clients...' : '— Global View (All Clients) —'}</option>
                                    {clients?.map((client: any) => (
                                        <option key={client.id} value={client.id}>
                                            {client.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform group-hover:scale-110" />
                            </div>
                            <div className="hidden lg:flex items-center gap-2 px-4 py-3 bg-purple-50 rounded-2xl border border-purple-100">
                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                                <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest">System Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Navigation Tabs */}
                    <div className="flex items-center gap-1 mt-8 overflow-x-auto no-scrollbar pb-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-black transition-all whitespace-nowrap ${
                                    activeTab === tab.id 
                                    ? 'bg-gray-900 text-white shadow-xl shadow-gray-200 scale-[1.02]' 
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                                }`}
                            >
                                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
                                {tab.name}
                                {activeTab === tab.id && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Embedded Sub-navigation Tabs (If Embedded) */}
            {isEmbedded && (
                <div className="px-8 pt-4 pb-2 border-b border-gray-100 bg-white/50">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    activeTab === tab.id 
                                    ? 'bg-[#2c185a] text-white shadow-md' 
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                                }`}
                            >
                                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Content Viewport */}
            <div className="flex-1 p-8">
                <div className="max-w-[1600px] mx-auto h-full">
                    {activeTab === 'dashboard' && (
                        <div className="animate-in fade-in duration-500">
                            <AISalesDashboard clientId={selectedClientId} />
                        </div>
                    )}
                    
                    {activeTab === 'pipeline' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <SalesPipelinePage clientId={selectedClientId} />
                        </div>
                    )}

                    {activeTab === 'campaigns' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full">
                            <CampaignInsightsList clientId={selectedClientId} />
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden p-8">
                            <MetaReportsTab />
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                            <MarketingDashboard />
                        </div>
                    )}

                    {activeTab === 'teamspace' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full">
                            <TeamspaceManager clientId={selectedClientId} />
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
};

const CampaignInsightsList = ({ clientId }: { clientId: string }) => {
    // 1. Fetch Meta Ads
    const { data: metaLogs } = useQuery({
        queryKey: ['tracking-meta', clientId],
        queryFn: async () => (await api.get(`/client-portal/tracking/meta-ads?clientId=${clientId}`)).data,
        enabled: !!clientId
    });

    // 2. Fetch Google Ads
    const { data: googleLogs } = useQuery({
        queryKey: ['tracking-google', clientId],
        queryFn: async () => (await api.get(`/client-portal/tracking/google-ads?clientId=${clientId}`)).data,
        enabled: !!clientId
    });

    // 3. Fetch SEO
    const { data: seoLogs } = useQuery({
        queryKey: ['tracking-seo', clientId],
        queryFn: async () => (await api.get(`/client-portal/tracking/seo?clientId=${clientId}`)).data,
        enabled: !!clientId
    });

    if (!clientId) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2rem] border border-gray-100 shadow-sm border-dashed">
                <Target size={48} className="text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-900">No Client Selected</h3>
                <p className="text-gray-500">Please select a client to view their synchronized campaigns.</p>
            </div>
        );
    }

    const Section = ({ title, icon: Icon, color, logs, type }: { title: string; icon: any; color: string; logs: any[]; type: string }) => (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-${color}-50 text-${color}-600`}>
                        <Icon size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">{title}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Active Records: {logs?.length || 0}</p>
                    </div>
                </div>
                <div className="h-[1px] flex-1 mx-8 bg-gray-100 opacity-50"></div>
            </div>

            {logs && logs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {logs.map((log) => (
                        <div key={log.id} className="group bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-gray-900 truncate uppercase tracking-tight group-hover:text-purple-600 transition-colors">
                                        {log.campaign_name || log.project_name || log.title || `Record #${log.id.substring(0,6)}`}
                                    </h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 mt-1">
                                        <Calendar size={10} /> {new Date(log.date || log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-${color}-50 text-${color}-600 border border-${color}-100`}>
                                    {log.status || 'Active'}
                                </div>
                            </div>

                            {log.group && (
                                <div className="mb-4 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-2">
                                    <Target size={12} className="text-amber-500" />
                                    <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Group: {log.group.name}</span>
                                </div>
                            )}
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {log.spend !== undefined && (
                                        <div className="bg-gray-50 p-3 rounded-2xl">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Spend</p>
                                            <p className="text-sm font-black text-gray-900">₹{Number(log.spend).toLocaleString()}</p>
                                        </div>
                                    )}
                                    {log.objective && (
                                        <div className="bg-gray-50 p-3 rounded-2xl">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Objective</p>
                                            <p className="text-sm font-black text-gray-900">{log.objective}</p>
                                        </div>
                                    )}
                                    {log.organic_traffic !== undefined && (
                                        <div className="bg-gray-50 p-3 rounded-2xl">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Traffic</p>
                                            <p className="text-sm font-black text-gray-900">{Number(log.organic_traffic).toLocaleString()}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-4">
                                    <div className="flex items-center gap-2">
                                        <Activity size={12} className="text-purple-400" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sync Active</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all transform group-hover:rotate-45">
                                        <ArrowRight size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-12 text-center bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No {title} Found</p>
                    <p className="text-xs text-gray-400 mt-1">Campaigns added in Manage Service will appear here.</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="p-4 animate-in fade-in duration-700 h-full">
            <div className="mb-10">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    Verified Campaigns
                    <div className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-full border border-green-100 flex items-center gap-1.5 animate-pulse">
                        <Activity size={12} /> Sync On
                    </div>
                </h2>
                <p className="text-gray-500 font-medium mt-1">Consolidated view of all active service records from Manage Services dashboard.</p>
            </div>

            <Section title="Meta Campaigns" icon={Megaphone} color="blue" logs={metaLogs} type="meta" />
            <Section title="Google Ads" icon={Search} color="red" logs={googleLogs} type="google" />
            <Section title="SEO Performance" icon={Globe} color="green" logs={seoLogs} type="seo" />
        </div>
    );
};

export default SalesIntelligenceManager;
