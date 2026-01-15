import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { RefreshCw, TrendingUp, DollarSign, Target, MousePointer, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

interface CampaignStat {
    date: string;
    campaignId: string;
    campaignName: string;
    clientName: string;
    spend: number;
    revenue: number;
    roas: number;
    impressions: number;
    clicks: number;
    conversions: number;
}

const ROIDashboard = () => {
    // State
    const [selectedClient, setSelectedClient] = useState<string>('ALL');
    const [syncing, setSyncing] = useState(false);

    // Fetch Clients
    const { data: clients } = useQuery({
        queryKey: ['clients-list'],
        queryFn: async () => {
            const { data } = await api.get('/clients');
            return data;
        }
    });

    // Fetch Stats
    const { data: stats = [], isLoading, refetch } = useQuery({
        queryKey: ['ads-stats'],
        queryFn: async () => {
            const { data } = await api.get('/ad-intelligence/stats');
            return data as CampaignStat[];
        }
    });

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.post('/ad-intelligence/sync');
            await refetch();
            alert("Data synced successfully from Ad Platforms!");
        } catch (error) {
            alert("Sync failed. Check console.");
            console.error(error);
        } finally {
            setSyncing(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading Intelligence...</div>;

    // Filter Stats
    const filteredStats = selectedClient === 'ALL'
        ? stats
        : stats.filter(s => s.clientName === clients?.find((c: any) => c.id === selectedClient)?.name);
    // Note: strictly, stats should return clientId, but interface shows clientName. 
    // Ideally we filter by name if that's what we have, or match ID if backend provides it.
    // Looking at backend `getAggregatedStats`: it maps `clientName`. It does NOT return `clientId`.
    // So I will filter by Client Name mapping from the selected ID.

    const selectedClientName = clients?.find((c: any) => c.id === selectedClient)?.name;
    const finalStats = selectedClient === 'ALL' ? stats : stats.filter(s => s.clientName === selectedClientName);

    // Aggregates
    const totalSpend = finalStats.reduce((sum, s) => sum + s.spend, 0);
    const totalRevenue = finalStats.reduce((sum, s) => sum + s.revenue, 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const totalConversions = finalStats.reduce((sum, s) => sum + s.conversions, 0);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Ad Intelligence & ROI</h1>
                    <p className="text-muted-foreground">Track performance across all connected Meta accounts.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                        <SelectTrigger className="w-[200px] bg-white">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Filter by Client" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Clients</SelectItem>
                            {clients?.map((client: any) => (
                                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-all ${syncing ? 'animate-pulse' : ''}`}
                    >
                        <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
                        {syncing ? 'Syncing...' : 'Sync'}
                    </button>
                </div>
            </div>

            <Tabs defaultValue="campaigns" className="space-y-6">
                <TabsList className="bg-white border">
                    <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                    <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                {/* CAMPAIGNS TAB */}
                <TabsContent value="campaigns">
                    {/* Matrix Cards (Re-used for Campaigns view as header) */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Spend</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{totalSpend.toLocaleString('en-IN')}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Impressions</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                    {finalStats.reduce((sum, s) => sum + s.impressions, 0).toLocaleString()}
                                </h3>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Clicks</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                    {finalStats.reduce((sum, s) => sum + s.clicks, 0).toLocaleString()}
                                </h3>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Avg CTR</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                    {(finalStats.reduce((sum, s) => sum + (s.clicks / s.impressions || 0), 0) / (finalStats.length || 1) * 100).toFixed(2)}%
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-800">Campaign Performance</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Campaign</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Spend</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Impressions</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Clicks</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {finalStats.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No campaigns found.</td></tr>
                                    ) : finalStats.map((stat, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{stat.campaignName}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{stat.clientName}</td>
                                            <td className="px-6 py-4 text-sm text-right font-mono">₹{stat.spend.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm text-right">{stat.impressions.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm text-right">{stat.clicks.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm text-right"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Active</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* ROI TAB */}
                <TabsContent value="roi">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                                    <h3 className="text-2xl font-bold text-green-600 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</h3>
                                </div>
                                <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="text-green-600" size={24} /></div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Avg. ROAS</p>
                                    <h3 className={`text-2xl font-bold mt-1 ${avgRoas >= 2 ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {avgRoas.toFixed(2)}x
                                    </h3>
                                </div>
                                <div className="p-2 bg-yellow-50 rounded-lg"><Target className="text-yellow-600" size={24} /></div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Conversions</p>
                                    <h3 className="text-2xl font-bold text-blue-600 mt-1">{totalConversions}</h3>
                                </div>
                                <div className="p-2 bg-blue-50 rounded-lg"><MousePointer className="text-blue-600" size={24} /></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-800">ROI Breakdown</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Campaign</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Spend</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Revenue</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">ROAS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {finalStats.map((stat, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{stat.campaignName}</td>
                                            <td className="px-6 py-4 text-sm text-right font-mono">₹{stat.spend.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm text-right font-mono text-green-700">₹{stat.revenue.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className={`font-bold ${stat.roas >= 4 ? 'text-green-600' : stat.roas >= 2 ? 'text-blue-600' : 'text-red-600'}`}>
                                                        {stat.roas.toFixed(1)}x
                                                    </span>
                                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className={`h-full ${stat.roas >= 4 ? 'bg-green-500' : stat.roas >= 2 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${Math.min((stat.roas / 5) * 100, 100)}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* REPORTS TAB */}
                <TabsContent value="reports">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reports</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12 text-muted-foreground">
                                <p>Select a Client to generate detailed Ad Performance Reports.</p>
                                <div className="mt-4 flex justify-center gap-4">
                                    <button className="px-4 py-2 bg-secondary rounded hover:bg-secondary/80">Download PDF Report</button>
                                    <button className="px-4 py-2 bg-secondary rounded hover:bg-secondary/80">Export to Excel</button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
};

export default ROIDashboard;
