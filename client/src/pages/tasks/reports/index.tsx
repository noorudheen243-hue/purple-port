import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, BarChart3, Calendar, Users, Building2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths } from 'date-fns';

type StatItem = {
    name: string;
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    rate: number;
};

const TaskReports = () => {
    const [view, setView] = useState<'staff' | 'department' | 'client'>('staff');
    const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('month');

    // Calculate Date Range based on Period
    const getDateRange = () => {
        const now = new Date();
        switch (period) {
            case 'today':
                return { start: new Date().toISOString(), end: new Date().toISOString() };
            case 'week':
                return { start: startOfWeek(now).toISOString(), end: endOfWeek(now).toISOString() };
            case 'month':
                return { start: startOfMonth(now).toISOString(), end: endOfMonth(now).toISOString() };
            case 'year':
                return { start: startOfYear(now).toISOString(), end: endOfYear(now).toISOString() };
            default:
                return { start: '', end: '' }; // All time
        }
    };

    const { start, end } = getDateRange();

    const { data: stats, isLoading } = useQuery<StatItem[]>({
        queryKey: ['task-stats', view, period],
        queryFn: async () => (await api.get('/tasks/stats', {
            params: { view, start, end }
        })).data
    });

    // Helper for Export CSV
    const downloadCSV = () => {
        if (!stats) return;
        const headers = ["Name", "Total Tasks", "Completed", "Pending", "Overdue", "Completion Rate (%)"];
        const rows = stats.map(s => [s.name, s.total, s.completed, s.pending, s.overdue, s.rate].join(","));
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `task_report_${view}_${period}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Task Reports</h2>
                    <p className="text-muted-foreground">Generate reports by Staff, Department, or Client.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
                        <SelectTrigger className="w-[150px]">
                            <Calendar className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={view} onValueChange={(val: any) => setView(val)}>
                        <SelectTrigger className="w-[180px]">
                            {view === 'staff' && <Users className="mr-2 h-4 w-4" />}
                            {view === 'department' && <Building2 className="mr-2 h-4 w-4" />}
                            {view === 'client' && <Building2 className="mr-2 h-4 w-4" />} {/* Reusing Icon */}
                            <SelectValue placeholder="Report Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="staff">Staff Wise</SelectItem>
                            <SelectItem value="department">Department Wise</SelectItem>
                            <SelectItem value="client">Client Wise</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={downloadCSV}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : stats?.reduce((acc, curr) => acc + curr.total, 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <BarChart3 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : stats?.reduce((acc, curr) => acc + curr.completed, 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <BarChart3 className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : stats?.reduce((acc, curr) => acc + curr.pending, 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                        <BarChart3 className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : stats?.reduce((acc, curr) => acc + curr.overdue, 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Detailed Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Name</TableHead>
                                <TableHead className="text-right">Total Tasks</TableHead>
                                <TableHead className="text-right">Completed</TableHead>
                                <TableHead className="text-right">Pending</TableHead>
                                <TableHead className="text-right text-red-500">Overdue</TableHead>
                                <TableHead className="text-right">Completion Rate</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">
                                        Loading reports...
                                    </TableCell>
                                </TableRow>
                            ) : stats?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">
                                        No data found for this period.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stats?.map((item) => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right">{item.total}</TableCell>
                                        <TableCell className="text-right text-green-600 font-medium">{item.completed}</TableCell>
                                        <TableCell className="text-right text-yellow-600">{item.pending}</TableCell>
                                        <TableCell className="text-right text-red-600 font-medium">{item.overdue}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${item.rate >= 80 ? 'bg-green-500' : item.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${item.rate}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs w-8">{item.rate}%</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default TaskReports;
