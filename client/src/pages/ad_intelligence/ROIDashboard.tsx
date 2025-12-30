import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { RefreshCw, TrendingUp, DollarSign, Target, MousePointer } from 'lucide-react';

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
    const [stats, setStats] = useState<CampaignStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/ad-intelligence/stats');
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch ROI stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.post('/ad-intelligence/sync');
            // Refresh stats after sync
            await fetchStats();
            alert("Data synced successfully from Ad Platforms!");
        } catch (error) {
            alert("Sync failed. Check console.");
            console.error(error);
        } finally {
            setSyncing(false);
        }
    };

    if (loading) return <div>Loading Intelligence...</div>;

    // Aggregates
    const totalSpend = stats.reduce((sum, s) => sum + s.spend, 0);
    const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const totalConversions = stats.reduce((sum, s) => sum + s.conversions, 0);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Ad Intelligence & ROI</h1>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-all ${syncing ? 'animate-pulse' : ''}`}
                >
                    <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
                    {syncing ? 'Syncing...' : 'Sync Ad Data'}
                </button>
            </div>

            {/* Matrix Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Ad Spend (30d)</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{totalSpend.toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <DollarSign className="text-gray-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                            <h3 className="text-2xl font-bold text-green-600 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <TrendingUp className="text-green-600" size={24} />
                        </div>
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
                        <div className="p-2 bg-yellow-50 rounded-lg">
                            <Target className="text-yellow-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Conversions</p>
                            <h3 className="text-2xl font-bold text-blue-600 mt-1">{totalConversions}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <MousePointer className="text-blue-600" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Campaign Table with Visual Bars */}
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
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Revenue</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">ROAS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stats.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No data found. Try clicking "Sync Ad Data".
                                    </td>
                                </tr>
                            ) : stats.map((stat, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{stat.campaignName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{stat.clientName}</td>
                                    <td className="px-6 py-4 text-sm text-right font-mono">₹{stat.spend.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-right font-mono text-green-700">₹{stat.revenue.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className={`font-bold ${stat.roas >= 4 ? 'text-green-600' : stat.roas >= 2 ? 'text-blue-600' : 'text-red-600'}`}>
                                                {stat.roas.toFixed(1)}x
                                            </span>
                                            {/* Mini Bar */}
                                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${stat.roas >= 4 ? 'bg-green-500' : stat.roas >= 2 ? 'bg-blue-500' : 'bg-red-500'}`}
                                                    style={{ width: `${Math.min((stat.roas / 5) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ROIDashboard;
