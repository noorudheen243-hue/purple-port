import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Loader2, AlertCircle, BarChart3, Users, Calendar, Layers } from 'lucide-react';

import { CampaignGroupManager } from './CampaignGroupManager';
import { SyncedCampaignTable } from './SyncedCampaignTable';
import { MetaLeads } from './MetaLeads';


const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

interface MarketingDashboardProps {
    externalClientId?: string;
}

export const MarketingDashboard: React.FC<MarketingDashboardProps> = ({ externalClientId }) => {
    const [metrics, setMetrics] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'performance' | 'leads' | 'groups'>('performance');

    const [platform, setPlatform] = useState<string>('all');
    const [error, setError] = useState<string | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string>(externalClientId || '');

    useEffect(() => {
        if (externalClientId !== undefined) {
            setSelectedClientId(externalClientId);
        }
    }, [externalClientId]);
    const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');
    const [syncing, setSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

    // Default: Current month 
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const firstDayOfMonthStr = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
    const [fromDate, setFromDate] = useState<string>(firstDayOfMonthStr);
    const [toDate, setToDate] = useState<string>(todayStr);

    // Fetch available clients - ONLY ACTIVE
    const { data: clients, isLoading: clientsLoading } = useQuery({
        queryKey: ['clients-active'],
        queryFn: async () => (await api.get('/clients?status=ACTIVE')).data
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
                    {!externalClientId && (
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
                    )}
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
            <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setView('performance')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center transition-all duration-200 shadow-sm border-2 ${view === 'performance'
                            ? 'bg-yellow-400 text-purple-900 border-purple-600'
                            : 'bg-yellow-50 text-purple-700 border-transparent hover:bg-yellow-100 hover:border-yellow-200'
                        }`}
                >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Campaigns
                </button>
                <button
                    onClick={() => setView('leads')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center transition-all duration-200 shadow-sm border-2 ${view === 'leads'
                            ? 'bg-yellow-400 text-purple-900 border-purple-600'
                            : 'bg-yellow-50 text-purple-700 border-transparent hover:bg-yellow-100 hover:border-yellow-200'
                        }`}
                >
                    <Users className="w-4 h-4 mr-2" />
                    Generated Leads
                </button>
                <button
                    onClick={() => setView('groups')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center transition-all duration-200 shadow-sm border-2 ${view === 'groups'
                            ? 'bg-yellow-400 text-purple-900 border-purple-600'
                            : 'bg-yellow-50 text-purple-700 border-transparent hover:bg-yellow-100 hover:border-yellow-200'
                        }`}
                >
                    <Layers className="w-4 h-4 mr-2" />
                    Campaign Groups
                </button>
            </div>


            {view === 'groups' && (
                <CampaignGroupManager clientId={selectedClientId} />
            )}


            {view === 'performance' ? (
                <SyncedCampaignTable
                    clientId={selectedClientId}
                    fromDate={fromDate}
                    toDate={toDate}
                    onViewLeads={() => setView('leads')}
                />
            ) : (
                <MetaLeads clientId={selectedClientId} fromDate={fromDate} toDate={toDate} />
            )}
        </div>
    );
};

export default MarketingDashboard;
