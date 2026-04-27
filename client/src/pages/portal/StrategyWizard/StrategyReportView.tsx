import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import { 
    Loader2, 
    TrendingUp, 
    Users, 
    Target, 
    Calendar, 
    Globe, 
    Compass, 
    BarChart3, 
    CheckCircle2, 
    Printer,
    ArrowLeft,
    Shield,
    Zap,
    Briefcase,
    Search
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';
import { format } from 'date-fns';

const StrategyReportView: React.FC = () => {
    const { id } = useParams();

    const { data, isLoading, error } = useQuery({
        queryKey: ['strategy-version', id],
        queryFn: async () => (await api.get(`/marketing/strategy/versions/${id}`)).data,
        enabled: !!id
    });

    if (isLoading) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Assembling Your Strategic Report...</p>
        </div>
    );

    if (error || !data?.version) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-10 text-center">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Strategy Not Found</h2>
            <p className="text-gray-500 mb-6">The strategy version you are looking for does not exist or has been removed.</p>
            <Button onClick={() => window.close()} className="rounded-xl">Close Window</Button>
        </div>
    );

    const version = data.version;
    const input = JSON.parse(version.input_snapshot || '{}');
    const outputRaw = JSON.parse(version.output_snapshot || '{}');
    
    // Safely parse nested output fields if they are strings
    const output = {
        ...outputRaw,
        channel_mix: typeof outputRaw.channel_mix === 'string' ? JSON.parse(outputRaw.channel_mix) : outputRaw.channel_mix,
        funnel_model: typeof outputRaw.funnel_model === 'string' ? JSON.parse(outputRaw.funnel_model) : outputRaw.funnel_model,
        kpi_targets: typeof outputRaw.kpi_targets === 'string' ? JSON.parse(outputRaw.kpi_targets) : outputRaw.kpi_targets,
        execution_plan: typeof outputRaw.execution_plan === 'string' ? JSON.parse(outputRaw.execution_plan) : outputRaw.execution_plan,
    };
    
    // Parse complex JSON fields
    const digitalPresence = JSON.parse(input.digital_presence || '{}');
    const icaData = JSON.parse(input.ica_data || '{}');
    const goalsData = JSON.parse(input.goals_json || '{}');
    const benchmarks = JSON.parse(version.industry_benchmarks || '{}');

    const handlePrint = () => window.print();

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Toolbar (Hidden on Print) */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 px-6 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => window.close()} className="text-gray-500 font-bold">
                        <ArrowLeft size={18} className="mr-2" /> Back
                    </Button>
                    <div className="h-4 w-px bg-gray-200" />
                    <h1 className="text-sm font-black text-[#2c185a] uppercase tracking-widest">
                        Strategic Marketing Blueprint <span className="text-gray-300 mx-2">|</span> {version.version_name}
                    </h1>
                </div>
                <Button onClick={handlePrint} className="bg-[#2c185a] hover:bg-black text-white font-black rounded-xl h-10 px-6 gap-2 shadow-lg shadow-indigo-100">
                    <Printer size={18} /> Print / Export PDF
                </Button>
            </div>

            {/* Report Content */}
            <div className="max-w-5xl mx-auto pt-32 pb-20 px-8">
                
                {/* COVER PAGE / HEADER */}
                <header className="mb-20 space-y-8 border-b-8 border-[#2c185a] pb-12">
                    <div className="flex justify-between items-start">
                        <div className="space-y-4">
                            <Badge className="bg-indigo-600 text-white rounded-full px-4 py-1 font-black text-[10px] uppercase tracking-[0.2em]">
                                High-Value Strategy Document
                            </Badge>
                            <h2 className="text-6xl font-black tracking-tighter text-[#2c185a] leading-[0.9]">
                                Marketing <br /> Blueprint
                            </h2>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Prepared For</p>
                            <p className="text-2xl font-black text-indigo-600">{input.business_name || version.client?.name}</p>
                            <p className="text-sm text-gray-500 font-bold mt-1">{input.location} • {input.industry}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-12 pt-8">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Issue Date</p>
                            <p className="font-bold">{format(new Date(version.createdAt), 'MMMM dd, yyyy')}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                            <Badge className="bg-green-100 text-green-700 border-none font-black text-[10px] uppercase">Active Strategy</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Document ID</p>
                            <p className="font-mono text-xs text-gray-400">{version.id.split('-')[0].toUpperCase()}</p>
                        </div>
                    </div>
                </header>

                {/* PHASE 1: THE FOUNDATION (INPUTS) */}
                <section className="mb-24 space-y-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Shield size={24} />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">Phase 1: The Foundation</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Primary Business Data */}
                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 border-b pb-2">Business Identification</h4>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Industry</p>
                                    <p className="font-bold text-gray-700">{input.industry}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Business Age</p>
                                    <p className="font-bold text-gray-700">{JSON.parse(input.business_age || '{}').category || 'Growing'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Focus Channels</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {JSON.parse(input.services_json || '[]').map((s: string) => (
                                            <Badge key={s} variant="outline" className="bg-gray-50 border-gray-100 text-gray-600 uppercase text-[9px] font-black">{s}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Digital Footprint */}
                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 border-b pb-2">Digital Footprint</h4>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Active Channels</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(digitalPresence.channels || {}).map(([key, val]) => val ? (
                                            <div key={key} className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                <span className="capitalize">{key}</span>
                                            </div>
                                        ) : null)}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100">
                                        <p className="text-[10px] font-black text-green-700 uppercase mb-1">Core Strengths</p>
                                        <p className="text-xs text-gray-600 leading-relaxed font-medium">{digitalPresence.strengths || 'N/A'}</p>
                                    </div>
                                    <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100">
                                        <p className="text-[10px] font-black text-red-700 uppercase mb-1">Primary Weaknesses</p>
                                        <p className="text-xs text-gray-600 leading-relaxed font-medium">{digitalPresence.weaknesses || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PHASE 2: MARKET & ICA */}
                <section className="mb-24 space-y-12">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <Zap size={24} />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">Phase 2: Market Intelligence</h3>
                    </div>

                    <div className="space-y-12">
                        {/* Market Benchmarks Visualized */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Avg. CPL', value: `₹${JSON.parse(version.industry_benchmarks || '{}').avg_cpl || '0'}`, icon: Briefcase },
                                { label: 'Conv. Rate', value: `${JSON.parse(version.industry_benchmarks || '{}').conversion_rate || '0'}%`, icon: Target },
                                { label: 'Target CAC', value: `₹${JSON.parse(version.industry_benchmarks || '{}').cac || '0'}`, icon: TrendingUp },
                                { label: 'Cust. LTV', value: `₹${JSON.parse(version.industry_benchmarks || '{}').ltv || '0'}`, icon: Users },
                            ].map((b, i) => (
                                <div key={i} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col items-center text-center">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{b.label}</p>
                                    <p className="text-2xl font-black text-gray-900">{b.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* ICA Deep Dive */}
                        <div className="p-10 rounded-[3rem] bg-[#2c185a] text-white space-y-8 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-10 opacity-5">
                                <Users size={200} />
                            </div>
                            <div className="relative z-10">
                                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-6">Ideal Customer Avatar (ICA)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-indigo-300 uppercase">Demographics</p>
                                        <div className="space-y-2 text-sm font-bold opacity-80">
                                            <p>Gender: {icaData.gender?.join(', ') || 'Any'}</p>
                                            <p>Age Range: {icaData.age_range || 'Any'}</p>
                                            <p>Income: {icaData.income_level || 'Any'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-indigo-300 uppercase">Pain Points</p>
                                        <div className="flex flex-wrap gap-2">
                                            {icaData.pain_points?.map((p: string) => (
                                                <Badge key={p} className="bg-indigo-500/30 text-white border-indigo-400/30 text-[10px]">{p}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-indigo-300 uppercase">Digital Behaviour</p>
                                        <div className="flex flex-wrap gap-2">
                                            {icaData.digital_behaviour?.map((p: string) => (
                                                <Badge key={p} className="bg-pink-500/30 text-white border-pink-400/30 text-[10px]">{p}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PHASE 3: STRATEGIC OUTCOME (OUTPUT) */}
                <section className="mb-24 space-y-12">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-600">
                            <Target size={24} />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">Phase 3: Strategic Blueprint</h3>
                    </div>

                    <div className="space-y-12">
                        {/* Positioning Statement Card */}
                        <div className="p-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[3rem] text-white shadow-2xl shadow-indigo-200">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-100 mb-6">Master Positioning Statement</h4>
                            <p className="text-3xl font-black leading-tight italic">
                                "{output.positioning}"
                            </p>
                        </div>

                        {/* Channel Mix Visual (Horizontal Bar) */}
                        <div className="space-y-6">
                            <h4 className="text-sm font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                                <TrendingUp size={18} className="text-indigo-600" /> Channel Mix Allocation
                            </h4>
                            <div className="space-y-6 p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                                {output.channel_mix?.map((item: any, i: number) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black uppercase text-gray-700">{item.channel}</span>
                                            <span className="text-xs font-black text-indigo-600">{item.weight}%</span>
                                        </div>
                                        <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${item.weight}%` }} />
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold tracking-tight italic">Strategic Role: {item.reason}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Funnel Model & KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             {/* Funnel Visualization */}
                             <div className="p-8 bg-gray-900 text-white rounded-[2.5rem] space-y-8">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Projected Funnel Model</h4>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Top of Funnel (Impressions)', value: output.funnel_model?.impressions, width: '100%', bg: 'bg-indigo-500' },
                                        { label: 'Middle of Funnel (Leads)', value: output.funnel_model?.leads, width: '70%', bg: 'bg-indigo-600' },
                                        { label: 'Bottom of Funnel (Sales)', value: output.funnel_model?.sales, width: '40%', bg: 'bg-indigo-700' },
                                    ].map((f, i) => (
                                        <div key={i} className="flex flex-col items-center gap-2">
                                            <div className={`${f.bg} h-12 rounded-lg flex items-center justify-center transition-all`} style={{ width: f.width }}>
                                                <span className="font-black text-sm">{f.value?.toLocaleString()}</span>
                                            </div>
                                            <p className="text-[9px] font-black uppercase text-gray-500">{f.label}</p>
                                        </div>
                                    ))}
                                    <div className="pt-4 border-t border-gray-800 text-center">
                                        <p className="text-2xl font-black text-indigo-400">₹{output.funnel_model?.revenue?.toLocaleString()}</p>
                                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Est. Monthly Revenue</p>
                                    </div>
                                </div>
                             </div>

                             {/* Success Benchmarks */}
                             <div className="space-y-6">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900">Primary Success KPIs</h4>
                                <div className="space-y-4">
                                    {output.kpi_targets?.map((kpi: any, i: number) => (
                                        <div key={i} className="p-5 rounded-2xl border-2 border-gray-50 flex justify-between items-center hover:border-indigo-100 transition-colors">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase">{kpi.metric}</p>
                                                <p className="text-xl font-black text-gray-900">{kpi.target}</p>
                                            </div>
                                            <Badge variant="outline" className="bg-gray-50 border-gray-100 text-gray-400 font-black text-[9px] h-6 uppercase">{kpi.benchmark}</Badge>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    </div>
                </section>

                {/* PHASE 4: EXECUTION ROADMAP */}
                <section className="mb-24 space-y-12 page-break-before">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                            <Calendar size={24} />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">Phase 4: Execution Roadmap</h3>
                    </div>

                    <div className="relative">
                        <div className="absolute left-6 top-0 bottom-0 w-1 bg-gray-100 rounded-full" />
                        <div className="space-y-12">
                            {output.execution_plan?.map((phase: any, i: number) => (
                                <div key={i} className="relative pl-20">
                                    <div className="absolute left-0 top-0 w-12 h-12 rounded-2xl bg-white border-4 border-indigo-600 flex items-center justify-center z-10">
                                        <span className="font-black text-indigo-600 text-sm">{i+1}</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <Badge className="bg-[#2c185a] text-white text-[10px] font-black uppercase px-3 py-1 mb-2">{phase.week}</Badge>
                                            <h4 className="text-xl font-black text-gray-900">{phase.phase}</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {phase.tasks?.map((task: string, ti: number) => (
                                                <div key={ti} className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl">
                                                    <div className="mt-1 flex-shrink-0">
                                                        <CheckCircle2 size={16} className="text-indigo-400" />
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-600">{task}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="pt-20 border-t border-gray-100 flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white rotate-12 mb-4">
                        <Zap size={24} fill="currentColor" />
                    </div>
                    <p className="text-sm font-black text-[#2c185a] uppercase tracking-[0.4em]">QIX Intelligence</p>
                    <p className="text-xs text-gray-400 font-bold">Confidential Strategic Marketing Audit • {new Date().getFullYear()}</p>
                </footer>
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .page-break-before { page-break-before: always; }
                    body { background: white !important; }
                    .bg-gray-50 { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; }
                    .bg-indigo-600 { background-color: #4f46e5 !important; -webkit-print-color-adjust: exact; }
                    .bg-[#2c185a] { background-color: #2c185a !important; -webkit-print-color-adjust: exact; }
                    .text-white { color: white !important; -webkit-print-color-adjust: exact; }
                    .text-indigo-600 { color: #4f46e5 !important; -webkit-print-color-adjust: exact; }
                }
            ` }} />
        </div>
    );
};

export default StrategyReportView;
