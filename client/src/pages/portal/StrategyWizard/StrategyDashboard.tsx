import React from 'react';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { 
    TrendingUp, 
    Users, 
    Target, 
    Calendar, 
    Lightbulb, 
    BarChart3, 
    ArrowRight,
    Download,
    History,
    Save,
    RefreshCw,
    Eye
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import api from '../../../lib/api';
import Swal from 'sweetalert2';

interface DashboardProps {
    strategy: any;
    onReset: () => void;
    onSaveSuccess?: () => void;
    isSaved?: boolean;
}

const StrategyDashboard: React.FC<DashboardProps> = ({ strategy, onReset, onSaveSuccess, isSaved }) => {
    const { output, assumptions, versions } = strategy || {};
    
    if (!output) return (
        <div className="p-12 text-center">
            <p className="text-gray-500 font-bold">No strategy generated yet.</p>
            <Button onClick={onReset} className="mt-4">Go to Wizard</Button>
        </div>
    );

    const handleSaveVersion = async () => {
        const clientName = strategy.input?.business_name || "Client";
        const dateStr = new Date().toLocaleDateString();
        const defaultName = `${clientName} - Strategy (${dateStr})`;

        const { value: name } = await Swal.fire({
            title: 'Save Strategy',
            input: 'text',
            inputLabel: 'Strategy Name',
            inputValue: defaultName,
            showCancelButton: true,
            confirmButtonText: 'Save Strategy',
            confirmButtonColor: '#4f46e5'
        });

        if (name) {
            try {
                // Ensure we use the correct clientId from input or output
                const targetClientId = strategy.output?.clientId || strategy.input?.clientId;
                if (!targetClientId) throw new Error("Client ID missing in strategy data");

                await api.post(`/marketing/strategy/${targetClientId}/versions`, { name });
                
                Swal.fire({
                    icon: 'success',
                    title: 'Strategy Saved',
                    text: 'Strategy has been archived successfully.',
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });

                if (onSaveSuccess) onSaveSuccess();
            } catch (err: any) {
                console.error("Save Error:", err);
                Swal.fire('Error', err.message || 'Failed to save version', 'error');
            }
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Badge className="bg-indigo-600 text-white hover:bg-indigo-700 h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Data-Driven Strategy v1.0
                    </Badge>
                    {!isSaved && (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-600 h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border-2">
                            Not Saved
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleSaveVersion} className="rounded-xl h-10 gap-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold px-5 transition-all hover:scale-105 active:scale-95">
                        <Save size={16} /> Save Final Strategy
                    </Button>
                    <Button variant="outline" onClick={() => window.open(`/strategy/report/${strategy.id || strategy.output?.id}`, '_blank')} className="rounded-xl h-10 gap-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold px-5">
                        <Eye size={16} /> Open Executive Report
                    </Button>
                    <Button variant="outline" onClick={onReset} className="rounded-xl h-10 gap-2 text-gray-500 font-bold">
                        <RefreshCw size={16} /> Re-Calculate
                    </Button>
                </div>
            </div>

            {/* Brand Positioning */}
            <div className="relative p-8 rounded-[2rem] bg-gradient-to-br from-[#2c185a] to-[#1a0f35] text-white overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Lightbulb size={120} />
                </div>
                <div className="relative z-10 space-y-4 max-w-2xl">
                    <h3 className="text-yellow-400 text-xs font-black uppercase tracking-[0.3em]">Core Brand Positioning</h3>
                    <p className="text-3xl font-black leading-tight">
                        "{output.positioning}"
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Channel Mix */}
                <Card className="lg:col-span-2 border-none shadow-xl shadow-indigo-50/50 rounded-[2rem] overflow-hidden">
                    <CardContent className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <TrendingUp className="text-indigo-600" size={20} /> Recommended Channel Mix
                            </h4>
                        </div>
                        <div className="space-y-6">
                            {output.channel_mix?.map((item: any, idx: number) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <span className="text-sm font-black text-gray-900">{item.channel}</span>
                                            <p className="text-[10px] text-gray-500 font-medium">{item.reason}</p>
                                        </div>
                                        <span className="text-sm font-black text-indigo-600">{item.weight}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-600 rounded-full transition-all duration-1000" 
                                            style={{ width: `${item.weight}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* KPI Targets */}
                <Card className="border-none shadow-xl shadow-pink-50/50 rounded-[2rem] overflow-hidden bg-white">
                    <CardContent className="p-8 space-y-6">
                        <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <Target className="text-pink-500" size={20} /> Success Benchmarks
                        </h4>
                        <div className="space-y-4">
                            {output.kpi_targets?.map((kpi: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-2xl bg-pink-50/50 border border-pink-100 space-y-1">
                                    <span className="text-[10px] uppercase font-black text-pink-600 tracking-wider font-bold">{kpi.metric}</span>
                                    <div className="flex justify-between items-center text-gray-900">
                                        <span className="text-xl font-black">{kpi.target}</span>
                                        <Badge variant="outline" className="bg-white text-gray-500 border-gray-200 text-[9px] h-5">{kpi.benchmark}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Funnel Model */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Est. Impressions', value: output.funnel_model?.impressions, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-100' },
                    { label: 'Est. Monthly Leads', value: output.funnel_model?.leads, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
                    { label: 'Est. Sales/Units', value: output.funnel_model?.sales, icon: Target, color: 'text-purple-600', bg: 'bg-purple-100' },
                    { label: 'Est. Revenue', value: `₹${output.funnel_model?.revenue?.toLocaleString()}`, icon: TrendingUp, color: 'text-[#2c185a]', bg: 'bg-[#2c185a]/10' }
                ].map((stat, idx) => (
                    <Card key={idx} className="border-none shadow-lg shadow-gray-100 rounded-3xl">
                        <CardContent className="p-6 text-center space-y-3">
                            <div className={`${stat.bg} ${stat.color} w-10 h-10 rounded-xl flex items-center justify-center mx-auto`}>
                                <stat.icon size={20} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
                                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Execution Plan */}
            <Card className="border-none shadow-2xl shadow-indigo-50/50 rounded-[2rem] overflow-hidden">
                <CardHeader className="p-8 border-b border-gray-50 bg-gray-50/30">
                    <CardTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <Calendar className="text-indigo-600" size={24} /> 4-Week Execution Roadmap
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-gray-50">
                        {output.execution_plan?.map((phase: any, idx: number) => (
                            <div key={idx} className="p-8 hover:bg-indigo-50/20 transition-colors">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="md:w-32 flex-shrink-0">
                                        <Badge className="bg-[#2c185a] text-white py-1 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                            {phase.week}
                                        </Badge>
                                        <p className="text-xs font-black text-gray-400 mt-2">{phase.phase}</p>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        {phase.tasks?.map((task: string, tIdx: number) => (
                                            <div key={tIdx} className="flex items-start gap-2 text-gray-700 font-medium">
                                                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 mt-0.5">
                                                    <ArrowRight size={12} />
                                                </div>
                                                <span className="text-sm">{task}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Assumptions */}
            <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100">
                <h5 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                    <History size={18} className="text-gray-400" /> Strategic Assumptions Used
                </h5>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {assumptions?.map((ass: any, idx: number) => (
                        <li key={idx} className="text-xs text-gray-500 font-medium flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                            {ass.assumption_text}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default StrategyDashboard;
