import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    BarChart3, 
    PieChart, 
    ArrowUpRight, 
    ArrowDownRight,
    Target,
    Activity,
    Layers,
    Calendar,
    TrendingUp,
    TrendingDown,
    ShieldCheck
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';

const UnifiedReportOverview = () => {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = React.useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = React.useState(now.getFullYear());

    const { data: summary, isLoading } = useQuery({
        queryKey: ['unified-analytics-summary', selectedMonth, selectedYear],
        queryFn: async () => (await api.get('/accounting/unified/reports/summary', {
            params: { month: selectedMonth, year: selectedYear }
        })).data,
        refetchInterval: 30000 
    });

    if (isLoading) return <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Compiling Analytics Matrix...</div>;

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Financial Intelligence</h2>
                    <p className="text-slate-500 font-medium">100% Synced real-time analytics across the unified ecosystem.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border-2 border-slate-100 p-2 rounded-2xl shadow-sm">
                        <Calendar className="w-4 h-4 text-purple-500 ml-2" />
                        <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-transparent outline-none font-bold text-slate-700 text-sm pr-4"
                        >
                            {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                        <div className="w-px h-4 bg-slate-200 mx-2"></div>
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-transparent outline-none font-bold text-slate-700 text-sm pr-2"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Live Sync Active</span>
                    </div>
                </div>
            </div>

            {/* Main Financial Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Opening Balance */}
                <div className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group transition-all hover:border-slate-200">
                    <div className="relative z-10">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Opening Balance</p>
                        <h3 className="text-3xl font-black mt-2 text-slate-900 tracking-tighter">{formatCurrency(summary?.openingBalance || 0)}</h3>
                        <p className="text-slate-400 text-[9px] mt-4 font-bold uppercase tracking-widest italic">Prev. Month Closing Balance</p>
                    </div>
                </div>

                {/* 2. Net Income (Current Month) */}
                <div className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group transition-all hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50">
                    <ArrowUpRight className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-50 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Net Income (Current)</p>
                        <h3 className="text-3xl font-black mt-2 text-emerald-600 tracking-tighter">{formatCurrency(summary?.netIncome || 0)}</h3>
                        <p className="text-slate-400 text-[9px] mt-4 font-bold uppercase tracking-widest italic">Total Incoming this period</p>
                    </div>
                </div>

                {/* 3. Net Expenses (Current Month) */}
                <div className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group transition-all hover:border-rose-200 hover:shadow-lg hover:shadow-rose-50">
                    <ArrowDownRight className="absolute -right-4 -bottom-4 w-24 h-24 text-rose-50 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Net Expenses (Current)</p>
                        <h3 className="text-3xl font-black mt-2 text-rose-600 tracking-tighter">{formatCurrency(summary?.netExpense || 0)}</h3>
                        <p className="text-slate-400 text-[9px] mt-4 font-bold uppercase tracking-widest italic">Total Outgoing this period</p>
                    </div>
                </div>

                {/* 4. Gross Income */}
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden transition-all hover:scale-[1.02]">
                    <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 rotate-12" />
                    <div className="relative z-10">
                        <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Gross Income</p>
                        <h3 className="text-3xl font-black mt-2 tracking-tighter">{formatCurrency(summary?.grossIncome || 0)}</h3>
                        <p className="text-white/40 text-[9px] mt-4 font-bold uppercase tracking-widest italic">Income + Opening Balance</p>
                    </div>
                </div>

                {/* 5. Month Balance */}
                <div className={`p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden transition-all hover:scale-[1.02] ${summary?.monthBalance >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-100' : 'bg-gradient-to-br from-orange-500 to-rose-600 shadow-rose-100'}`}>
                    <Activity className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 rotate-12" />
                    <div className="relative z-10">
                        <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Month Balance</p>
                        <h3 className="text-3xl font-black mt-2 tracking-tighter">{formatCurrency(summary?.monthBalance || 0)}</h3>
                        <p className="text-white/40 text-[9px] mt-4 font-bold uppercase tracking-widest italic">Income - Expenses (Net)</p>
                    </div>
                </div>

                {/* 6. Cash & Bank Balance */}
                <div className="bg-gradient-to-br from-purple-600 to-indigo-800 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden transition-all hover:scale-[1.02] border-b-4 border-yellow-400">
                    <Layers className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 rotate-12" />
                    <div className="relative z-10">
                        <p className="text-yellow-400 text-[10px] font-black uppercase tracking-widest">Cash & Bank Balance</p>
                        <h3 className="text-4xl font-black mt-2 tracking-tighter">{formatCurrency(summary?.cashBankBalance || 0)}</h3>
                        <p className="text-white/50 text-[9px] mt-4 font-bold uppercase tracking-widest italic">Total Liquidity Snapshot</p>
                    </div>
                </div>
            </div>

            {/* Distribution Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-[2.5rem] p-10 border-2 border-slate-50 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                            <PieChart className="w-6 h-6 text-purple-600" /> Revenue Distribution
                        </h3>
                    </div>
                    <div className="space-y-6">
                        {summary?.revenueDistribution?.map((row: any, i: number) => (
                            <DistributionRow 
                                key={i} 
                                label={row.label} 
                                value={formatCurrency(row.value)} 
                                percentage={(row.value / (summary.totalIncome || 1)) * 100} 
                                color={['bg-purple-600', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500', 'bg-slate-400'][i]} 
                            />
                        ))}
                        {(!summary?.revenueDistribution || summary.revenueDistribution.length === 0) && (
                            <p className="text-center py-10 text-slate-300 font-bold italic">No revenue data available.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-10 border-2 border-slate-50 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                            <BarChart3 className="w-6 h-6 text-rose-500" /> Top Expense Categories
                        </h3>
                    </div>
                    <div className="space-y-6">
                        {summary?.expenseDistribution?.map((row: any, i: number) => (
                            <DistributionRow 
                                key={i} 
                                label={row.label} 
                                value={formatCurrency(row.value)} 
                                percentage={(row.value / (summary.totalExpense || 1)) * 100} 
                                color={['bg-rose-600', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-slate-400'][i]} 
                            />
                        ))}
                        {(!summary?.expenseDistribution || summary.expenseDistribution.length === 0) && (
                            <p className="text-center py-10 text-slate-300 font-bold italic">No expense data available.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DistributionRow = ({ label, value, percentage, color }: any) => (
    <div className="space-y-3">
        <div className="flex justify-between items-end">
            <span className="text-sm font-black text-slate-700 tracking-tight">{label}</span>
            <span className="text-sm font-black text-slate-900">{value}</span>
        </div>
        <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border-2 border-white shadow-inner p-1">
            <div 
                className={`h-full ${color} rounded-full transition-all duration-1000 shadow-sm shadow-black/5`} 
                style={{ width: `${Math.max(percentage, 2)}%` }}
            ></div>
        </div>
        <p className="text-[9px] font-black text-slate-300 text-right uppercase tracking-widest">{percentage.toFixed(1)}% of total</p>
    </div>
);

export default UnifiedReportOverview;
