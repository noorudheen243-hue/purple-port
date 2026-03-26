import React, { useState } from 'react';
import { TrendingUp, ArrowLeft, Users, Briefcase, LayoutTemplate, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// Inner views
import DMSummaryCards from './digital-marketing/DMSummaryCards';
import DMSelectClient from './digital-marketing/DMSelectClient';
import DMMyTasks from './digital-marketing/DMMyTasks';
import DMTaskBoard from './digital-marketing/DMTaskBoard';
import MarketingDashboard from '../marketing/MarketingDashboard';

const DigitalMarketingTaskManager = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('select-client');

    // Period Selection State
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth().toString());
    const [year, setYear] = useState(now.getFullYear().toString());

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dm-dashboard-stats', month, year],
        queryFn: async () => {
            const res = await api.get(`/tasks/stats?view=digital-marketing&month=${month}&year=${year}`);
            return res.data;
        },
        refetchInterval: 30000
    });

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

    return (
        <div className="space-y-4 pb-8 max-w-[1600px] mx-auto px-4 sm:px-6">
            {/* Page Header - More Compact */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard/tasks/manager')}
                        className="p-2.5 rounded-xl hover:bg-gray-100 transition-all text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200"
                        title="Back to Task Manager"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                            <TrendingUp size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                                Digital Marketing
                            </h1>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
                                Performance Dashboard
                            </p>
                        </div>
                    </div>
                </div>

                {/* Period Selectors */}
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100 self-start lg:self-center">
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-indigo-600">
                        <Calendar size={18} />
                    </div>
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[140px] bg-white border-none shadow-none focus:ring-0 font-bold text-gray-700 capitalize">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                            {months.map((m, i) => (
                                <SelectItem key={i} value={i.toString()} className="font-medium">
                                    {m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="h-4 w-px bg-gray-200" />

                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[100px] bg-white border-none shadow-none focus:ring-0 font-bold text-gray-700">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                            {years.map(y => (
                                <SelectItem key={y} value={y} className="font-medium">
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Top Level Summary KPIs */}
            <DMSummaryCards stats={stats} isLoading={isLoading} />

            {/* Primary Tab Navigation - Sequentially Colored */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">

                    <div className="px-6 pt-2 pb-0 border-b border-gray-200 bg-gray-50/30">
                        <TabsList className="bg-transparent gap-4 h-auto p-0 flex justify-start w-full overflow-x-auto scrollbar-hide">
                            <TabsTrigger
                                value="select-client"
                                className="px-4 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:text-yellow-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-gray-500 hover:text-yellow-600 transition-all flex items-center gap-2 text-sm uppercase tracking-wider"
                            >
                                <Users size={18} />
                                Select Client
                            </TabsTrigger>
                            <TabsTrigger
                                value="my-task"
                                className="px-4 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-gray-500 hover:text-purple-600 transition-all flex items-center gap-2 text-sm uppercase tracking-wider"
                            >
                                <Briefcase size={18} />
                                My Activity Log
                            </TabsTrigger>
                            <TabsTrigger
                                value="task-board"
                                className="px-4 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:text-yellow-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-gray-500 hover:text-yellow-600 transition-all flex items-center gap-2 text-sm uppercase tracking-wider"
                            >
                                <LayoutTemplate size={18} />
                                Team Activity Log
                            </TabsTrigger>
                            <TabsTrigger
                                value="marketing-performance"
                                className="px-4 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-gray-500 hover:text-indigo-600 transition-all flex items-center gap-2 text-sm uppercase tracking-wider"
                            >
                                <TrendingUp size={18} />
                                Marketing Performance
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-4 sm:p-6 bg-white min-h-[600px]">
                        <TabsContent value="select-client" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-300 focus-visible:outline-none">
                            <DMSelectClient />
                        </TabsContent>

                        <TabsContent value="my-task" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-300 focus-visible:outline-none">
                            <DMMyTasks month={month} year={year} />
                        </TabsContent>

                        <TabsContent value="task-board" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-300 focus-visible:outline-none">
                            <DMTaskBoard month={month} year={year} />
                        </TabsContent>

                        <TabsContent value="marketing-performance" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-300 focus-visible:outline-none">
                            <MarketingDashboard />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
};

export default DigitalMarketingTaskManager;
