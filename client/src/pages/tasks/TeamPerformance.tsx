
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

interface TeamPerformanceProps {
    defaultDept?: string;
}

const TeamPerformance = ({ defaultDept = 'ALL' }: TeamPerformanceProps) => {
    // --- State ---
    const [filterDept, setFilterDept] = useState(defaultDept);
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
                                <th className="px-4 py-3 pl-6">Rank</th>
                                <th className="px-4 py-3">Staff Name</th>
                                <th className="px-4 py-3 text-center">Graphic Design (1pt)</th>
                                <th className="px-4 py-3 text-center">Video Editing (2pts)</th>
                                <th className="px-4 py-3 text-center">Copy writing (1pt)</th>
                                <th className="px-4 py-3 text-center">Strategy (1pt)</th>
                                <th className="px-4 py-3 text-center">Development (10pts)</th>
                                <th className="px-4 py-3 text-center">Content Shooting (2pts)</th>
                                <th className="px-4 py-3 text-center text-primary font-bold">Total Marks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {isLoading ? (
                                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Loading analytics...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No data found for selected filters.</td></tr>
                            ) : (
                                (() => {
                                    // 1. Map data to include the calculated marks
                                    const mappedData = filteredData.map(staff => {
                                        // The backend taskTypes keys might be different depending on how you've set them up in your DB.
                                        // Assuming exact matches here, or mapping common string values:
                                        const getCount = (types: string[]) => types.reduce((sum, type) => sum + (staff.taskTypes[type] || 0), 0);

                                        const graphicDesign = getCount(['GRAPHIC', 'Graphic Design', 'GRAPHIC_DESIGN', 'Graphic_Design', 'Design']);
                                        const videoEditing = getCount(['VIDEO', 'Video Editing', 'VIDEO_EDITING', 'Video_Editing', 'Video']);
                                        const copyWriting = getCount(['COPY', 'Copy writing', 'COPY_WRITING', 'Copywriting', 'Content Writing']);
                                        const strategy = getCount(['STRATEGY', 'Strategy']);
                                        const development = getCount(['DEV', 'Development', 'DEVELOPMENT', 'Web Development', 'App Development']);
                                        const contentShooting = getCount(['CONTENT_SHOOTING', 'Content shooting', 'Content Shooting', 'Shooting']);

                                        // Total marks calculation based on user criteria
                                        const totalMarks = (graphicDesign * 1) + (videoEditing * 2) + (copyWriting * 1) + (strategy * 1) + (development * 10) + (contentShooting * 2);

                                        return {
                                            ...staff,
                                            graphicDesign,
                                            videoEditing,
                                            copyWriting,
                                            strategy,
                                            development,
                                            contentShooting,
                                            totalMarks
                                        };
                                    });

                                    // 2. Sort by totalMarks descending
                                    const sortedData = mappedData.sort((a, b) => b.totalMarks - a.totalMarks);

                                    // 3. Render
                                    return sortedData.map((staff, index) => (
                                        <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                                            {/* Rank */}
                                            <td className="px-4 py-3 pl-6 font-bold text-gray-700">
                                                #{index + 1}
                                            </td>

                                            {/* Staff Info */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
                                                        {staff.avatar ? (
                                                            <img src={getAssetUrl(staff.avatar)} alt={staff.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            staff.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{staff.name}</div>
                                                        <div className="text-[10px] text-muted-foreground">{staff.designation}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Metrics Columns */}
                                            <td className="px-4 py-3 text-center text-gray-600">{staff.graphicDesign > 0 ? staff.graphicDesign : '-'}</td>
                                            <td className="px-4 py-3 text-center text-gray-600">{staff.videoEditing > 0 ? staff.videoEditing : '-'}</td>
                                            <td className="px-4 py-3 text-center text-gray-600">{staff.copyWriting > 0 ? staff.copyWriting : '-'}</td>
                                            <td className="px-4 py-3 text-center text-gray-600">{staff.strategy > 0 ? staff.strategy : '-'}</td>
                                            <td className="px-4 py-3 text-center text-gray-600">{staff.development > 0 ? staff.development : '-'}</td>
                                            <td className="px-4 py-3 text-center text-gray-600">{staff.contentShooting > 0 ? staff.contentShooting : '-'}</td>

                                            {/* Total Marks */}
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                                    {staff.totalMarks}
                                                </span>
                                            </td>
                                        </tr>
                                    ));
                                })()
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default TeamPerformance;
