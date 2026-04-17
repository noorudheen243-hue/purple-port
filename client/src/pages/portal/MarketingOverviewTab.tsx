import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import api from '../../lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import {
    LineChart,
    Search,
    Globe,
    Megaphone,
    Activity,
    Clock,
    BarChart3,
    AlertCircle,
    TrendingUp,
    Users
} from 'lucide-react';

interface MarketingOverviewProps {
    clientId: string;
}

const META_METRICS_PRESETS = [
    { value: 'performance', label: 'Performance (Default)' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'messaging', label: 'Messaging engagement' },
    { value: 'setup', label: 'Setup' },
];

const MarketingOverviewTab: React.FC<MarketingOverviewProps> = ({ clientId }) => {
    // Current Month Boundaries
    const today = new Date();
    const [dateFrom, setDateFrom] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
    const [dateTo, setDateTo] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
    const [activeSubTab, setActiveSubTab] = useState('meta');
    const [metaPreset, setMetaPreset] = useState('performance');

    // Fetch Meta Logs
    const { data: metaLogs, isLoading: isMetaLoading } = useQuery({
        queryKey: ['tracking-meta-overview', clientId, dateFrom, dateTo],
        queryFn: async () => {
            const params = new URLSearchParams({ clientId });
            if (dateFrom) params.append('startDate', dateFrom);
            if (dateTo) params.append('endDate', dateTo);
            return (await api.get(`/client-portal/tracking/meta-ads?${params.toString()}`)).data;
        },
        enabled: !!clientId && activeSubTab === 'meta'
    });

    // Overview Aggregations
    const aggregatedMeta = useMemo(() => {
        if (!metaLogs) return { active: 0, closed: 0, totalSpend: 0, totalBudget: 0, totalResults: 0, totalImpressions: 0 };
        
        let active = 0;
        let closed = 0;
        let totalSpend = 0;
        let totalResults = 0;
        let totalImpressions = 0;
        let totalBudget = 0; // if tracked

        metaLogs.forEach((log: any) => {
            if (log.status === 'ACTIVE') active++;
            else closed++;
            
            totalSpend += parseFloat(log.spend || 0);
            
            let resJson: any = {};
            try {
                resJson = typeof log.results_json === 'string' ? JSON.parse(log.results_json) : (log.results_json || {});
            } catch (e) { }

            totalResults += parseInt(resJson?.results || resJson?.leads || 0);
            totalImpressions += parseInt(resJson?.impressions || 0);
            totalBudget += parseFloat(resJson?.budget || 0); // Approx if available
        });

        return { active, closed, totalSpend, totalBudget, totalResults, totalImpressions };
    }, [metaLogs]);

    const costPerResult = aggregatedMeta.totalResults > 0 ? (aggregatedMeta.totalSpend / aggregatedMeta.totalResults) : 0;
    const cpm = aggregatedMeta.totalImpressions > 0 ? (aggregatedMeta.totalSpend / (aggregatedMeta.totalImpressions / 1000)) : 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full md:w-auto">
                    <TabsList className="bg-gray-100 p-1 flex">
                        <TabsTrigger value="meta" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold rounded-lg px-4 py-2">
                            <Megaphone size={16} /> Meta Ads
                        </TabsTrigger>
                        <TabsTrigger value="google" className="flex items-center gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white font-bold rounded-lg px-4 py-2">
                            <Search size={16} /> Google Ads
                        </TabsTrigger>
                        <TabsTrigger value="seo" className="flex items-center gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-bold rounded-lg px-4 py-2">
                            <Globe size={16} /> SEO
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">From</span>
                        <Input type="date" className="h-9 w-36 font-bold text-sm bg-gray-50 focus:bg-white transition-colors border-gray-200" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">To</span>
                        <Input type="date" className="h-9 w-36 font-bold text-sm bg-gray-50 focus:bg-white transition-colors border-gray-200" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Content Switch */}
            {activeSubTab === 'meta' && (
                <div className="space-y-6">
                    {/* Aggregation Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Section 1: Campaigns */}
                        <Card className="border-none shadow-md overflow-hidden bg-gradient-to-br from-indigo-50 to-white">
                            <CardContent className="p-6">
                                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Activity size={14} /> Section 1: Campaigns Overview
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-100 flex flex-col justify-center items-center text-center">
                                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                                            <TrendingUp size={20} />
                                        </div>
                                        <div className="text-2xl font-black text-gray-900">{aggregatedMeta.active}</div>
                                        <div className="text-xs font-bold text-gray-500 uppercase mt-1">Active Campaigns</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-100 flex flex-col justify-center items-center text-center">
                                        <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-2">
                                            <Clock size={20} />
                                        </div>
                                        <div className="text-2xl font-black text-gray-900">{aggregatedMeta.closed}</div>
                                        <div className="text-xs font-bold text-gray-500 uppercase mt-1">Paused / Closed</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section 2: Spend */}
                        <Card className="border-none shadow-md overflow-hidden bg-gradient-to-br from-emerald-50 to-white">
                            <CardContent className="p-6">
                                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <BarChart3 size={14} /> Section 2: Spend & Efficiency
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-white rounded-xl p-3 shadow-sm border border-emerald-100 text-center">
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Budgeted</div>
                                        <div className="text-sm font-black text-gray-800">₹{aggregatedMeta.totalBudget.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 shadow-sm border border-emerald-100 text-center">
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Monthly Spend</div>
                                        <div className="text-sm font-black text-emerald-600">₹{aggregatedMeta.totalSpend.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 shadow-sm border border-emerald-100 text-center">
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Cost Per Result</div>
                                        <div className="text-sm font-black text-gray-800">₹{costPerResult.toFixed(2)}</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 shadow-sm border border-emerald-100 text-center">
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-1">CPM</div>
                                        <div className="text-sm font-black text-gray-800">₹{cpm.toFixed(2)}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section 3: Results Table */}
                    <Card className="border-none shadow-md overflow-hidden">
                        <div className="bg-gray-50 border-b border-gray-100 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                <Users size={16} className="text-blue-500" /> Section 3: Campaign Results
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500">Key Metrics:</span>
                                <select 
                                    className="h-9 px-3 rounded-lg border-gray-200 bg-white font-bold text-sm shadow-sm focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                    value={metaPreset}
                                    onChange={(e) => setMetaPreset(e.target.value)}
                                >
                                    {META_METRICS_PRESETS.map(preset => (
                                        <option key={preset.value} value={preset.value}>{preset.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto min-h-[300px]">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 whitespace-nowrap">Campaign Name</TableHead>
                                        <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-center whitespace-nowrap">Status</TableHead>
                                        {/* Dynamic Columns Based on Preset */}
                                        {metaPreset === 'performance' && (
                                            <>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">Results</TableHead>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">Reach</TableHead>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">Impressions</TableHead>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">Cost Per Result</TableHead>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">Amount Spent</TableHead>
                                            </>
                                        )}
                                        {metaPreset === 'engagement' && (
                                            <>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">Post Reactions</TableHead>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">Link Clicks</TableHead>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">Page Engagement</TableHead>
                                            </>
                                        )}
                                        {metaPreset === 'delivery' && (
                                            <>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">Reach</TableHead>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">Frequency</TableHead>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">CPM</TableHead>
                                            </>
                                        )}
                                        {metaPreset === 'setup' && (
                                            <>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-center whitespace-nowrap">Objective</TableHead>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-center whitespace-nowrap">Start Date</TableHead>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-center whitespace-nowrap">End Date</TableHead>
                                            </>
                                        )}
                                        {metaPreset === 'messaging' && (
                                            <>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">Messaging Connections</TableHead>
                                                <TableHead className="font-bold text-xs uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">Cost per Msg</TableHead>
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isMetaLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-64 text-center text-gray-400">
                                                <Activity className="animate-spin h-8 w-8 mx-auto mb-2 opacity-50" />
                                                Loading Overview Data...
                                            </TableCell>
                                        </TableRow>
                                    ) : !metaLogs || metaLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-64 text-center text-gray-500">
                                                <AlertCircle className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                                                <p className="font-bold">No Data Found for Date Range</p>
                                                <p className="text-xs text-gray-400">Try adjusting your From/To filters, or sync campaigns.</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        metaLogs.map((log: any) => {
                                            let res: any = {};
                                            try { res = typeof log.results_json === 'string' ? JSON.parse(log.results_json) : (log.results_json || {}); } catch (e) { }
                                            
                                            const cpr = res.results > 0 ? (parseFloat(log.spend || 0) / res.results) : 0;
                                            const logCpm = res.impressions > 0 ? (parseFloat(log.spend || 0) / (res.impressions / 1000)) : 0;
                                            const cpmMessage = res.messaging_conversations > 0 ? (parseFloat(log.spend || 0) / res.messaging_conversations) : 0;

                                            return (
                                                <TableRow key={log.id} className="hover:bg-blue-50/30 transition-colors">
                                                    <TableCell>
                                                        <span className="font-bold text-sm text-gray-900">{log.campaign_name || 'Unnamed Campaign'}</span>
                                                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{log.platform || 'META'}</div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${log.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                            {log.status}
                                                        </span>
                                                    </TableCell>

                                                    {/* Dynamic Values */}
                                                    {metaPreset === 'performance' && (
                                                        <>
                                                            <TableCell className="text-right">
                                                                <div className="font-bold text-gray-800">{res.results?.toLocaleString() || 0}</div>
                                                                {res.results_type && res.results_type !== 'Results' && (
                                                                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{res.results_type}</div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium text-gray-600">{res.reach?.toLocaleString() || 0}</TableCell>
                                                            <TableCell className="text-right font-medium text-gray-600">{res.impressions?.toLocaleString() || 0}</TableCell>
                                                            <TableCell className="text-right font-medium text-gray-500">₹{cpr.toFixed(2)}</TableCell>
                                                            <TableCell className="text-right font-bold text-gray-800">₹{parseFloat(log.spend || 0).toLocaleString()}</TableCell>
                                                        </>
                                                    )}
                                                    {metaPreset === 'engagement' && (
                                                        <>
                                                            <TableCell className="text-right font-medium text-gray-600">{res.post_reactions || 'N/A'}</TableCell>
                                                            <TableCell className="text-right font-medium text-gray-600">{res.clicks || 'N/A'}</TableCell>
                                                            <TableCell className="text-right font-medium text-gray-600">{res.engagement || 'N/A'}</TableCell>
                                                        </>
                                                    )}
                                                    {metaPreset === 'delivery' && (
                                                        <>
                                                            <TableCell className="text-right font-medium text-gray-600">{res.reach?.toLocaleString() || 0}</TableCell>
                                                            <TableCell className="text-right font-medium text-gray-600">{res.frequency?.toFixed(2) || 'N/A'}</TableCell>
                                                            <TableCell className="text-right font-medium text-gray-600">₹{logCpm.toFixed(2)}</TableCell>
                                                        </>
                                                    )}
                                                    {metaPreset === 'setup' && (
                                                        <>
                                                            <TableCell className="text-center font-bold text-[10px] text-gray-500 uppercase tracking-widest">{log.objective || 'N/A'}</TableCell>
                                                            <TableCell className="text-center font-medium text-xs text-gray-600">{log.startDate ? format(new Date(log.startDate), 'dd MMM yyyy') : '--'}</TableCell>
                                                            <TableCell className="text-center font-medium text-xs text-gray-600">{log.endDate ? format(new Date(log.endDate), 'dd MMM yyyy') : 'No End Date'}</TableCell>
                                                        </>
                                                    )}
                                                    {metaPreset === 'messaging' && (
                                                        <>
                                                            <TableCell className="text-right font-bold text-gray-800">{res.messaging_conversations || 'N/A'}</TableCell>
                                                            <TableCell className="text-right font-medium text-gray-600">₹{cpmMessage.toFixed(2)}</TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            )}

            {/* Empty States for Google and SEO (as Placeholders) */}
            {(activeSubTab === 'google' || activeSubTab === 'seo') && (
                <div className="bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 p-20 flex flex-col items-center justify-center text-center animate-in fade-in">
                    <Activity size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-700">Detailed Analytics Under Construction</h3>
                    <p className="text-gray-400 mt-2">Extended metric presets for {activeSubTab === 'google' ? 'Google Ads' : 'SEO'} will be available shortly.</p>
                </div>
            )}
        </div>
    );
};

export default MarketingOverviewTab; 
