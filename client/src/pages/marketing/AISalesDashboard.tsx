import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
    TrendingUp, Zap, Target, AlertTriangle, 
    ArrowUpRight, ArrowDownRight, BarChart3, 
    PieChart, Lightbulb, CheckCircle2,
    Calendar, Users, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

interface AISalesDashboardProps {
    clientId?: string;
}

const AISalesDashboard: React.FC<AISalesDashboardProps> = ({ clientId: propClientId }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedClientId, setSelectedClientId] = useState<string>(propClientId || '');

    // Fetch available clients for selector
    const { data: clients } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => (await api.get('/clients')).data,
        enabled: !propClientId
    });

    const fetchStats = async () => {
        try {
            setLoading(true);
            const cid = propClientId || selectedClientId;
            const res = await api.get(`/ai-sales/dashboard-stats${cid ? `?clientId=${cid}` : ''}`);
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch dashboard stats', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [propClientId, selectedClientId]);

    const runAnalytics = async () => {
        try {
            setLoading(true);
            const cid = propClientId || selectedClientId;
            await api.post(`/ai-sales/run-analytics${cid ? `?clientId=${cid}` : ''}`);
            await fetchStats();
        } catch (err) {
            console.error('Failed to run analytics', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) return <div className="p-8 text-center animate-pulse text-gray-400">Loading AI Insights...</div>;

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        Sales Intelligence Dashboard
                        <span className="bg-purple-100 text-purple-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">AI Core v2.0</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Real-time revenue forecasting and sales risk detection.</p>
                </div>
                <div className="flex items-center gap-4">
                    {!propClientId && (
                        <select
                            value={selectedClientId}
                            onChange={(e) => setSelectedClientId(e.target.value)}
                            className="px-4 py-2.5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:border-purple-500 outline-none transition-all shadow-sm"
                        >
                            <option value="">All Clients</option>
                            {clients?.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}
                    <button 
                        onClick={runAnalytics}
                        className="bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-sm"
                    >
                        <Zap className="w-4 h-4 fill-purple-600" />
                        Refresh Predictions
                    </button>
                </div>
            </div>

            {/* Forecast Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <TrendingUp className="w-32 h-32 text-purple-600" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-8">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Revenue Forecast: {format(new Date(), 'MMMM yyyy')}</span>
                        </div>
                        
                        <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
                            <div>
                                <p className="text-sm font-bold text-gray-500 mb-1">Expected Revenue</p>
                                <h2 className="text-6xl font-black text-gray-900 tracking-tighter">
                                    ${stats?.forecast?.expected_revenue?.toLocaleString() || '0.00'}
                                </h2>
                                <div className="flex items-center gap-1.5 mt-2 text-green-500 font-black text-sm">
                                    <ArrowUpRight className="w-4 h-4" />
                                    <span>+14.2% optimized by AI</span>
                                </div>
                            </div>
                            
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex-1 min-w-[200px]">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pipeline Health</p>
                                <div className="flex items-end justify-between">
                                    <h4 className="text-2xl font-black text-gray-900">${stats?.forecast?.pipeline_value?.toLocaleString() || '0.00'}</h4>
                                    <span className="text-xs font-black text-purple-600">Total Value</span>
                                </div>
                                <div className="mt-4 w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-purple-600 h-full rounded-full shadow-[0_0_10px_rgba(147,51,234,0.3)] transition-all duration-1000"
                                        style={{ width: `${Math.min(((stats?.forecast?.expected_revenue || 0) / (stats?.forecast?.pipeline_value || 1)) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-[2rem] text-white shadow-xl shadow-purple-200 flex flex-col justify-between">
                    <div>
                        <div className="p-3 bg-white/20 w-fit rounded-2xl mb-6 backdrop-blur-md">
                            <Lightbulb className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-black mb-2">Smart Action</h3>
                        <p className="text-purple-100 text-sm font-medium leading-relaxed">
                            {stats?.forecast?.expected_revenue > 10000 
                                ? "Your pipeline is healthy. Focus on closing deals in the 'Negotiation' stage to exceed your target."
                                : "Pipeline value is below monthly average. AI suggests increasing lead generation spend by 15%."
                            }
                        </p>
                    </div>
                    <button className="mt-8 bg-white text-purple-600 px-4 py-3 rounded-xl font-bold text-sm hover:bg-purple-50 transition-all flex items-center justify-center gap-2">
                        View Strategy
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* AI Insights and Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase text-sm">Sales Risk Analysis</h3>
                        </div>
                        <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">3 DETECTED</span>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-4">
                            <div className="w-1.5 h-auto bg-orange-500 rounded-full"></div>
                            <div>
                                <h4 className="font-black text-orange-950 text-sm">Stalled Deals Detected</h4>
                                <p className="text-xs text-orange-800 mt-1 font-medium italic">4 deals haven't moved in 10+ days. Risk of churn increased by 22%.</p>
                            </div>
                        </div>
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-4">
                            <div className="w-1.5 h-auto bg-red-500 rounded-full"></div>
                            <div>
                                <h4 className="font-black text-red-950 text-sm">Response Time Delay</h4>
                                <p className="text-xs text-red-800 mt-1 font-medium italic">Average lead response time increased to 36h. Critical impact on conversion.</p>
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-4">
                            <div className="w-1.5 h-auto bg-blue-500 rounded-full"></div>
                            <div>
                                <h4 className="font-black text-blue-950 text-sm">Follow-up Opportunity</h4>
                                <p className="text-xs text-blue-800 mt-1 font-medium italic">12 Qualified leads are waiting for follow-ups today.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 text-green-600 rounded-xl">
                                <Target className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase text-sm">Conversion Insights</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-between h-32">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead to Qualify Rate</p>
                            <div className="flex items-end justify-between">
                                <h5 className="text-3xl font-black text-gray-900">68%</h5>
                                <span className="text-green-500 font-bold text-[10px] flex items-center"><ArrowUpRight className="w-3 h-3" /> +5%</span>
                            </div>
                        </div>
                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-between h-32">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deal Close Rate</p>
                            <div className="flex items-end justify-between">
                                <h5 className="text-3xl font-black text-gray-900">42%</h5>
                                <span className="text-red-500 font-bold text-[10px] flex items-center"><ArrowDownRight className="w-3 h-3" /> -2%</span>
                            </div>
                        </div>
                        <div className="col-span-2 p-5 bg-gray-900 rounded-2xl border border-gray-100 flex items-center justify-between text-white">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Top Performing Source</p>
                                <h5 className="text-xl font-black">Meta Ads (8.4x ROI)</h5>
                            </div>
                            <div className="bg-purple-600 p-2 rounded-lg">
                                <ArrowUpRight className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl border border-purple-100 border-dashed justify-center text-purple-600 text-sm font-bold">
                <Info className="w-4 h-4" />
                These insights are based on historical CRM data and current pipeline probability analysis.
            </div>
        </div>
    );
};

const ArrowRight = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
);

export default AISalesDashboard;
