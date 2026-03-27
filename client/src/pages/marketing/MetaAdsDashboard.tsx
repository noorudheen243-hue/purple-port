import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    TrendingUp, TrendingDown, MessageSquare, MousePointer2, 
    Eye, Wallet, Target, Sparkles, AlertCircle, 
    ArrowUpRight, Info, ChevronUp, ChevronDown, Loader2
} from 'lucide-react';

interface MetaAdsDashboardProps {
    clientId: string;
    fromDate: string;
    toDate: string;
}

export const MetaAdsDashboard: React.FC<MetaAdsDashboardProps> = ({ clientId, fromDate, toDate }) => {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'spend',
        direction: 'desc'
    });

    // Fetch Metrics
    const { data: metricsData, isLoading: metricsLoading } = useQuery({
        queryKey: ['meta-metrics', clientId, fromDate, toDate],
        queryFn: async () => {
            const response = await api.get(`/marketing/metrics?clientId=${clientId}&platform=meta&from=${fromDate}&to=${toDate}`);
            return response.data;
        },
        enabled: !!clientId
    });

    // Fetch AI Tips
    const { data: aiTips, isLoading: tipsLoading } = useQuery({
        queryKey: ['ai-tips', clientId],
        queryFn: async () => {
            const response = await api.get(`/marketing/ai-tips?clientId=${clientId}`);
            return response.data;
        },
        enabled: !!clientId
    });

    if (!clientId) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select a Client</h3>
                <p className="text-gray-500 text-sm text-center max-w-xs mt-2">
                    Please select a client from the dropdown above to view their Meta Ads Performance Dashboard.
                </p>
            </div>
        );
    }

    if (metricsLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse font-medium">Analyzing Meta Performance...</p>
            </div>
        );
    }

    const summary = metricsData?.summary || {
        spend: 0, impressions: 0, clicks: 0, reach: 0, results: 0, conversations: 0
    };

    const metrics = metricsData?.data || [];
    
    // Derived Metrics
    const ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
    const cpm = summary.impressions > 0 ? (summary.spend / summary.impressions) * 1000 : 0;
    const costPerResult = summary.results > 0 ? summary.spend / summary.results : 0;

    // Group Campaign Data
    const campaignMap: Record<string, any> = {};
    metrics.forEach((m: any) => {
        const id = m.campaignId;
        if (!campaignMap[id]) {
            campaignMap[id] = {
                id,
                name: m.campaign?.name || 'Unknown',
                status: m.campaign?.status || 'Active',
                spend: 0,
                impressions: 0,
                clicks: 0,
                results: 0,
                conversations: 0,
                reach: 0
            };
        }
        campaignMap[id].spend += (m.spend || 0);
        campaignMap[id].impressions += (m.impressions || 0);
        campaignMap[id].clicks += (m.clicks || 0);
        campaignMap[id].results += (m.results || 0);
        campaignMap[id].conversations += (m.conversations || 0);
        campaignMap[id].reach += (m.reach || 0);
    });

    const campaignList = Object.values(campaignMap).map(c => ({
        ...c,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
        cpc: c.clicks > 0 ? c.spend / c.clicks : 0
    }));

    // Sorting
    const sortedCampaigns = [...campaignList].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Real-Time Metrics Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <MetricCard 
                    title="Ad Spend" 
                    value={`₹${summary.spend.toLocaleString()}`} 
                    icon={<Wallet className="w-5 h-5" />}
                    color="bg-purple-50 text-purple-600 border-purple-100"
                    description="Total budget spent"
                />
                <MetricCard 
                    title="Impressions" 
                    value={summary.impressions.toLocaleString()} 
                    icon={<Eye className="w-5 h-5" />}
                    color="bg-blue-50 text-blue-600 border-blue-100"
                    description="Total times ads seen"
                />
                <MetricCard 
                    title="Clicks" 
                    value={summary.clicks.toLocaleString()} 
                    icon={<MousePointer2 className="w-5 h-5" />}
                    color="bg-green-50 text-green-600 border-green-100"
                    description="Link/Ad clicks"
                />
                <MetricCard 
                    title="CTR" 
                    value={`${ctr.toFixed(2)}%`} 
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="bg-orange-50 text-orange-600 border-orange-100"
                    description="Click-through rate"
                />
                <MetricCard 
                    title="CPM" 
                    value={`₹${cpm.toFixed(0)}`} 
                    icon={<Target className="w-5 h-5" />}
                    color="bg-pink-50 text-pink-600 border-pink-100"
                    description="Cost per 1k views"
                />
                <MetricCard 
                    title="Conversations" 
                    value={summary.conversations.toLocaleString()} 
                    icon={<MessageSquare className="w-5 h-5" />}
                    color="bg-emerald-50 text-emerald-600 border-emerald-100"
                    description="Messaging starts"
                />
            </div>

            {/* AI Optimization Tips */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-indigo-500 rounded-lg text-white">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">AI Optimization Insights</h2>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Smart recommendations to boost your Meta Ads ROI</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tipsLoading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-32 bg-white/50 dark:bg-gray-800/50 animate-pulse rounded-xl" />)
                    ) : aiTips?.length > 0 ? (
                        aiTips.map((tip: any, idx: number) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">{tip.title}</h3>
                                        <TipBadge type={tip.type} />
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{tip.message}</p>
                                </div>
                                <div className="pt-3 border-t border-gray-50 dark:border-gray-700/50">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                        <ArrowUpRight className="w-3 h-3" />
                                        Recommended Action
                                    </div>
                                    <p className="text-xs text-gray-800 dark:text-gray-200 mt-1 font-medium italic">"{tip.actionable}"</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-8 text-center text-gray-500 text-sm italic">
                            No insights available for current performance data.
                        </div>
                    )}
                </div>
            </div>

            {/* Campaign Analysis Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Detailed Campaign Analysis</h2>
                        <p className="text-xs text-gray-500 mt-1">Sorting by top performers in the selected date range</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <span className="text-xs font-semibold text-gray-400 uppercase">Sort Mode:</span>
                         <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">{sortConfig.key} ({sortConfig.direction})</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                <th className="px-6 py-4 cursor-pointer hover:text-purple-600" onClick={() => requestSort('name')}>
                                    <div className="flex items-center gap-1">Campaign {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                                </th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-purple-600" onClick={() => requestSort('spend')}>
                                    <div className="flex items-center justify-end gap-1">Spend {sortConfig.key === 'spend' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                                </th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-purple-600" onClick={() => requestSort('impressions')}>
                                    <div className="flex items-center justify-end gap-1">Impr. {sortConfig.key === 'impressions' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                                </th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-purple-600" onClick={() => requestSort('clicks')}>
                                    <div className="flex items-center justify-end gap-1">Clicks {sortConfig.key === 'clicks' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                                </th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-purple-600" onClick={() => requestSort('ctr')}>
                                    <div className="flex items-center justify-end gap-1">CTR {sortConfig.key === 'ctr' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                                </th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-purple-600" onClick={() => requestSort('results')}>
                                    <div className="flex items-center justify-end gap-1">Results {sortConfig.key === 'results' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                                </th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:text-purple-600" onClick={() => requestSort('conversations')}>
                                    <div className="flex items-center justify-end gap-1">Conv. {sortConfig.key === 'conversations' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {sortedCampaigns.map((camp, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">{camp.name}</span>
                                            <span className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{camp.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-gray-200 text-sm">₹{camp.spend.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400 text-sm">{camp.impressions.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400 text-sm">{camp.clicks.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-sm">
                                        <span className={`font-bold ${camp.ctr > 1.5 ? 'text-green-600' : camp.ctr < 0.8 ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {camp.ctr.toFixed(2)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-purple-600 dark:text-purple-400 font-bold text-sm">{camp.results.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400 font-bold text-sm">{camp.conversations.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Subcomponents ---

const MetricCard: React.FC<{ 
    title: string; 
    value: string; 
    icon: React.ReactNode; 
    color: string; 
    description: string;
}> = ({ title, value, icon, color, description }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-xl ${color} shadow-sm group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
            </div>
        </div>
        <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
            <h4 className="text-xl font-extrabold text-gray-900 dark:text-white leading-none mb-2">{value}</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{description}</p>
        </div>
    </div>
);

const TipBadge: React.FC<{ type: string }> = ({ type }) => {
    switch (type) {
        case 'SUCCESS': return <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded uppercase">Efficiency</span>;
        case 'CRITICAL': return <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded uppercase">High Risk</span>;
        case 'WARNING': return <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-bold rounded uppercase">Action Req.</span>;
        default: return <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded uppercase">Insight</span>;
    }
};
