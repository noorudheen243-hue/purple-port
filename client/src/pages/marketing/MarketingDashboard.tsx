import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Loader2, AlertCircle, Facebook, BarChart3, Users, Calendar } from 'lucide-react';
import { Sparkles, LayoutDashboard, FileText, Settings, Layers } from 'lucide-react';
import { CampaignGroupManager } from './CampaignGroupManager';
import { SyncedCampaignTable } from './SyncedCampaignTable';
import { MetaLeads } from './MetaLeads';
import { MetaAdsDashboard } from './MetaAdsDashboard';
import { MetaAdsManager } from './MetaAdsManager';
import MetaReportsTab from './MetaReportsTab';

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export const MarketingDashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'performance' | 'leads' | 'meta-dashboard' | 'meta-manager' | 'meta-reports' | 'groups'>('performance');
    const [platform, setPlatform] = useState<string>('all');
    const [error, setError] = useState<string | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');
    const [syncing, setSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

    // Default: Current month 
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const firstDayOfMonthStr = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
    const [fromDate, setFromDate] = useState<string>(firstDayOfMonthStr);
    const [toDate, setToDate] = useState<string>(todayStr);

    // Fetch available clients
    const { data: clients, isLoading: clientsLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => (await api.get('/clients')).data
    });

    const fetchMetrics = async (from?: string, to?: string) => {
        // No longer returning early if !selectedClientId to support "All Clients"
        setLoading(true);
        setError(null);
        try {
            const fromStr = from || fromDate;
            const toStr = to || toDate;

            const fromDt = new Date(fromStr);
            const toDt = new Date(toStr);
            // Set end of day for `to`
            toDt.setHours(23, 59, 59, 999);

            const platformParam = platform !== 'all' ? `&platform=${platform}` : '';
            const clientParam = selectedClientId ? `clientId=${selectedClientId}` : '';

            const statusParam = `&status=${statusFilter}`;
            const response = await api.get(
                `/marketing/metrics?${clientParam}&from=${fromDt.toISOString()}&to=${toDt.toISOString()}${platformParam}${statusParam}`
            );

            // Format dates for chart
            const chartData = response.data.data.map((m: any) => ({
                ...m,
                displayDate: format(new Date(m.date), 'MMM dd')
            }));

            setMetrics(chartData);
            setSummary({ ...response.data.summary, allCampaigns: response.data.campaigns });
        } catch (err: any) {
            console.error('Error fetching marketing metrics:', err);
            if (err.response?.status === 403) {
                setError('Marketing Tracking is currently disabled.');
            } else {
                setError('Failed to load marketing data.');
            }
            setMetrics([]);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setSyncSuccess(null);
        setError(null);
        try {
            await api.post('/marketing/sync');
            setSyncSuccess('Data sync completed');
            fetchMetrics(fromDate, toDate);
            // Hide notification after 5 seconds
            setTimeout(() => setSyncSuccess(null), 5000);
        } catch (err) {
            console.error('Manual sync failed:', err);
            setError('Sync failed. Please check your connection.');
        } finally {
            setSyncing(false);
        }
    };

    const handleApplyFilter = () => {
        fetchMetrics(fromDate, toDate);
    };

    const handleResetToCurrentMonth = () => {
        const newFrom = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
        const newTo = todayStr;
        setFromDate(newFrom);
        setToDate(newTo);
        fetchMetrics(newFrom, newTo);
    };

    useEffect(() => {
        fetchMetrics(fromDate, toDate);
    }, [platform, selectedClientId, fromDate, toDate, statusFilter]);


    const dateRangeLabel = fromDate && toDate
        ? `${format(new Date(fromDate), 'MMM d, yyyy')} – ${format(new Date(toDate), 'MMM d, yyyy')}`
        : 'This Month';

    return (
        <div className="p-4 md:p-6 w-full space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Marketing Performance</h1>
                    <p className="text-gray-500 text-sm mt-1">Unified insights from Meta and Google Ads</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Client Selector */}
                    <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="flex-1 md:w-56 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                    >
                        <option value="">{clientsLoading ? 'Loading clients...' : '-- Select Client --'}</option>
                        {clients?.map((client: any) => (
                            <option key={client.id} value={client.id}>
                                {client.name}
                            </option>
                        ))}
                    </select>
                    {/* Platform Selector */}
                    <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="flex-1 md:w-40 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    >
                        <option value="all">All Platforms</option>
                        <option value="meta">Meta Ads</option>
                        <option value="google">Google Ads</option>
                    </select>
                    <button
                        className={`px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors whitespace-nowrap flex items-center gap-2 ${syncing ? 'opacity-70 cursor-not-allowed' : ''}`}
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        {syncing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Syncing...
                            </>
                        ) : (
                            'Force Sync Data'
                        )}
                    </button>
                </div>
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-wrap items-end gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    Date Range
                </div>
                <div className="flex flex-wrap items-end gap-3 flex-1">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">From</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">To</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                        />
                    </div>
                    <button
                        onClick={handleApplyFilter}
                        className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                    >
                        Apply Filter
                    </button>
                    <button
                        onClick={handleResetToCurrentMonth}
                        className="px-4 py-2 text-sm text-purple-600 dark:text-purple-400 font-semibold border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                        Current Month
                    </button>

                    <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden md:block"></div>

                    {/* Status Toggle Buttons */}
                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${statusFilter === 'active' 
                                ? 'bg-white dark:bg-gray-800 text-purple-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${statusFilter === 'all' 
                                ? 'bg-white dark:bg-gray-800 text-purple-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            All
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-md flex items-start shadow-sm animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0" />
                    <p className="text-sm text-yellow-700 font-medium">{error}</p>
                </div>
            )}

            {syncSuccess && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded-md flex items-start shadow-sm animate-in fade-in slide-in-from-top-2">
                    <BarChart3 className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                    <p className="text-sm text-green-700 font-medium">{syncSuccess}</p>
                </div>
            )}

            {/* View Toggle */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
                <button
                    onClick={() => setView('meta-dashboard')}
                    className={`py-3 px-6 text-sm font-medium flex items-center border-b-2 transition-all whitespace-nowrap ${view === 'meta-dashboard'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-900/10'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    <Sparkles className={`w-4 h-4 mr-2 ${view === 'meta-dashboard' ? 'animate-pulse text-purple-500' : ''}`} />
                    Performance Dashboard
                </button>
                <button
                    onClick={() => setView('meta-manager')}
                    className={`py-3 px-6 text-sm font-medium flex items-center border-b-2 transition-all whitespace-nowrap ${view === 'meta-manager'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-900/10'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Meta Ads Manager
                </button>
                <button
                    onClick={() => setView('performance')}
                    className={`py-3 px-6 text-sm font-medium flex items-center border-b-2 transition-colors whitespace-nowrap ${view === 'performance'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Performance Overview
                </button>
                <button
                    onClick={() => setView('leads')}
                    className={`py-3 px-6 text-sm font-medium flex items-center border-b-2 transition-colors whitespace-nowrap ${view === 'leads'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    <Users className="w-4 h-4 mr-2" />
                    Generated Leads
                </button>
                <button
                    onClick={() => setView('groups')}
                    className={`py-3 px-6 text-sm font-medium flex items-center border-b-2 transition-colors whitespace-nowrap ${view === 'groups'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    <Layers className="w-4 h-4 mr-2" />
                    Campaign Groups
                </button>
            </div>

            {view === 'groups' && (
                <CampaignGroupManager clientId={selectedClientId} />
            )}

            {view === 'meta-manager' && (
                <MetaAdsManager clientId={selectedClientId} />
            )}

            {view === 'meta-dashboard' && (
                <MetaAdsDashboard 
                    clientId={selectedClientId} 
                    fromDate={fromDate} 
                    toDate={toDate} 
                />
            )}

            {view === 'meta-reports' && (
                <MetaReportsTab />
            )}

            {view === 'performance' ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <div className="p-5 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl transition-all hover:shadow-md">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">Total Spend</p>
                             <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {"\u20B9"}{summary?.spend?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
                            </p>
                        </div>
                        <div className="p-5 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl transition-all hover:shadow-md">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">Total Impressions</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {summary?.impressions?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="p-5 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl transition-all hover:shadow-md">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">Total Reach</p>
                            <p className="text-2xl font-bold text-orange-500">
                                {summary?.reach?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="p-5 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl transition-all hover:shadow-md">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">Total Clicks</p>
                            <p className="text-2xl font-bold text-green-600">
                                {summary?.clicks?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="p-5 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl transition-all hover:shadow-md">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">Total Results</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {summary?.results?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="p-5 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl transition-all hover:shadow-md">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">Conversions</p>
                            <p className="text-2xl font-bold text-pink-600">
                                {summary?.conversions?.toLocaleString() || 0}
                            </p>
                        </div>
                    </div>

                    {/* Main Chart */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl mt-6 p-6">
                        <h2 className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-200">
                            Traffic Trend
                            <span className="ml-2 text-sm font-normal text-purple-500">({dateRangeLabel})</span>
                        </h2>
                        {loading ? (
                            <div className="flex justify-center items-center h-64 text-purple-600">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : metrics.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                <p className="font-medium">No data available for selected period</p>
                                <p className="text-sm mt-1">Try adjusting the date range or click "Force Sync Data".</p>
                            </div>
                        ) : (
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metrics} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="displayDate"
                                            stroke="#9ca3af"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={10}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            stroke="#9ca3af"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            stroke="#9ca3af"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                        />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                            itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                                        />
                                        <Area
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="impressions"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorImpressions)"
                                            name="Impressions"
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                                        />
                                        <Area
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="clicks"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorClicks)"
                                            name="Clicks"
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Replace the old table with SyncedCampaignTable */}
                    <div className="mt-8">
                        <SyncedCampaignTable 
                            clientId={selectedClientId} 
                            fromDate={fromDate} 
                            toDate={toDate} 
                            onViewLeads={(campId) => {
                                // Potentially set a filter for the leads view in the future
                                setView('leads');
                            }}
                        />
                    </div>
                </>
            ) : (
                <MetaLeads clientId={selectedClientId} fromDate={fromDate} toDate={toDate} />
            )}
        </div>
    );
};

export default MarketingDashboard;
