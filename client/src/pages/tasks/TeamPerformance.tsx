
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils';
import { Filter, Search, Calendar, AlertTriangle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

// --- Types ---
interface TeamMetric {
    id: string;
    name: string;
    role: string;
    designation: string;
    department: string;
    avatar: string | null;
    metrics: {
        total: number;
        completed: number;
        pending: number;
        review: number;
        rework: number;
        reworkRate: number;
        slaBreaches: number;
    };
    time: {
        estimated: number;
        actual: number;
    };
    taskTypes: Record<string, number>;
    productivityScore: number;
}

const TeamPerformance = () => {
    // --- State ---
    const [filterDept, setFilterDept] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState('THIS_MONTH'); // MOCK: For UI selection

    // --- Query ---
    const { data: performanceData, isLoading, error } = useQuery<TeamMetric[]>({
        queryKey: ['team-performance', filterDept, dateRange],
        queryFn: async () => {
            const params: any = {};
            if (filterDept !== 'ALL') params.department = filterDept;

            // Mock Date Range Logic (In real app, pass actual dates)
            const now = new Date();
            if (dateRange === 'THIS_MONTH') {
                params.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                params.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
            }

            return (await api.get('/analytics/team-performance', { params })).data;
        }
    });

    // --- Derived Data ---
    const filteredData = useMemo(() => {
        if (!performanceData) return [];
        return performanceData.filter(staff => {
            const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                staff.designation.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [performanceData, searchTerm]);

    // --- Render Helpers ---
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getReworkBadge = (rate: number, count: number) => {
        if (count === 0) return <span className="text-gray-400 text-xs">No Rework</span>;
        const color = rate > 10 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700';
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${color}`}>
                <AlertCircle size={10} /> {count} ({rate}%)
            </span>
        );
    };

    if (error) return <div className="p-8 text-center text-red-500">Failed to load performance data.</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Team Performance Analytics</h2>
                    <p className="text-muted-foreground">Task-based performance insights and productivity scores.</p>
                </div>
                {/* Global Actions if needed */}
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Search staff..."
                            className="w-full pl-10 pr-4 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter size={18} className="text-muted-foreground" />
                        <select
                            className="bg-background border rounded-md px-3 py-2 text-sm focus:outline-none w-full md:w-40"
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                        >
                            <option value="ALL">All Departments</option>
                            <option value="CREATIVE">Creative</option>
                            <option value="MARKETING">Marketing</option>
                            <option value="WEB">Web & SEO</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Calendar size={18} className="text-muted-foreground" />
                        <select
                            className="bg-background border rounded-md px-3 py-2 text-sm focus:outline-none w-full md:w-40"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                        >
                            <option value="THIS_MONTH">This Month</option>
                            <option value="LAST_MONTH">Last Month</option>
                            <option value="ALL_TIME">All Time</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Main Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/75 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="px-4 py-3 pl-6 w-[250px]">Staff Member</th>
                                <th className="px-4 py-3">Task Volume</th>
                                <th className="px-4 py-3">Quality & Rework</th>
                                <th className="px-4 py-3">Efficiency (Hrs)</th>
                                <th className="px-4 py-3">Task Focus</th>
                                <th className="px-4 py-3 text-right pr-6">Productivity Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading analytics...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No data found for selected filters.</td></tr>
                            ) : (
                                filteredData.map((staff) => (
                                    <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                                        {/* 1. Staff Info */}
                                        <td className="px-4 py-3 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm overflow-hidden">
                                                    {staff.avatar ? (
                                                        <img src={getAssetUrl(staff.avatar)} alt={staff.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        staff.name.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{staff.name}</div>
                                                    <div className="text-xs text-muted-foreground">{staff.designation} · {staff.department}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 2. Task Volume */}
                                        <td className="px-4 py-3 align-top pt-4">
                                            <div className="space-y-1.5 w-[140px]">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-green-600">{staff.metrics.completed} Done</span>
                                                    <span className="text-gray-500">{staff.metrics.total} Total</span>
                                                </div>
                                                {/* Progress Bar */}
                                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full"
                                                        style={{ width: `${staff.metrics.total > 0 ? (staff.metrics.completed / staff.metrics.total) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                <div className="flex gap-2 text-[10px] text-gray-400">
                                                    <span>{staff.metrics.pending} Pending</span>
                                                    <span>•</span>
                                                    <span>{staff.metrics.review} In Review</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 3. Quality */}
                                        <td className="px-4 py-3 align-top pt-4">
                                            <div className="flex flex-col gap-1.5">
                                                {getReworkBadge(staff.metrics.reworkRate, staff.metrics.rework)}

                                                {staff.metrics.slaBreaches > 0 ? (
                                                    <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                                                        <AlertTriangle size={12} /> {staff.metrics.slaBreaches} SLA Breaches
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-green-600 flex items-center gap-1">
                                                        <CheckCircle size={10} /> SLA On Track
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* 4. Efficiency */}
                                        <td className="px-4 py-3 align-top pt-4">
                                            <div className="text-xs space-y-1 text-gray-600">
                                                <div className="flex items-center gap-1" title="Estimated Time">
                                                    <Clock size={12} className="text-gray-400" /> Est: <span className="font-medium text-gray-900">{staff.time.estimated}h</span>
                                                </div>
                                                <div className="flex items-center gap-1" title="Actual Time">
                                                    <Clock size={12} className="text-blue-400" /> Act: <span className="font-medium text-gray-900">{staff.time.actual}h</span>
                                                </div>
                                                {/* Efficiency Indicator */}
                                                {staff.time.actual > 0 && (
                                                    <div className={`text-[10px] font-medium ${staff.time.actual > staff.time.estimated ? 'text-red-500' : 'text-green-600'}`}>
                                                        {Math.round((staff.time.estimated / staff.time.actual) * 100)}% Efficiency
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* 5. Task Focus (Top 2 types) */}
                                        <td className="px-4 py-3 align-top pt-4">
                                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                {Object.entries(staff.taskTypes)
                                                    .sort(([, a], [, b]) => b - a)
                                                    .slice(0, 3)
                                                    .map(([type, count]) => (
                                                        <span key={type} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] border">
                                                            {type}: {count}
                                                        </span>
                                                    ))
                                                }
                                                {Object.keys(staff.taskTypes).length === 0 && <span className="text-xs text-gray-400">-</span>}
                                            </div>
                                        </td>

                                        {/* 6. Productivity Score */}
                                        <td className="px-4 py-3 align-top pt-3 text-right pr-6">
                                            <div className="flex flex-col items-end">
                                                <span className={`text-2xl font-bold ${getScoreColor(staff.productivityScore)}`}>
                                                    {staff.productivityScore}
                                                </span>
                                                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Score</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default TeamPerformance;
