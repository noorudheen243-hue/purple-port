
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, FileText, BarChart3, PieChart, Users, User } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Line, LineChart, CartesianGrid } from 'recharts';

const PayrollReports = () => {
    // State
    const [reportType, setReportType] = useState('TEAM'); // TEAM, INDIVIDUAL
    const [period, setPeriod] = useState('MONTHLY'); // MONTHLY, YEARLY
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
    const [selectedStaff, setSelectedStaff] = useState('');

    // Fetch Staff for Selector
    const { data: staffList = [] } = useQuery({
        queryKey: ['staff-list-reports'],
        queryFn: async () => {
            const res = await backend.get('/team/staff');
            return res.data;
        }
    });

    // Fetch Report Data
    const { data: reportData = [], isLoading, isError } = useQuery({
        queryKey: ['payroll-history', reportType, period, year, month, selectedStaff],
        queryFn: async () => {
            const params: any = { year };

            if (period === 'MONTHLY') {
                params.month = month;
            }

            if (reportType === 'INDIVIDUAL') {
                if (!selectedStaff) return []; // Don't fetch if no staff selected
                params.userId = selectedStaff;
            }

            const res = await backend.get('/payroll/history', { params });
            return res.data;
        },
        enabled: reportType === 'TEAM' || (reportType === 'INDIVIDUAL' && !!selectedStaff),
    });

    // Aggregations
    const calculateTotalPayout = () => reportData.reduce((sum: number, item: any) => sum + item.net_pay, 0);

    const getMonthlyAggregates = () => {
        // For Team Yearly: Aggregate strictly by month
        const aggs: Record<string, number> = {};
        reportData.forEach((item: any) => {
            const m = item.run.month;
            const monthName = new Date(0, m - 1).toLocaleString('default', { month: 'short' });
            aggs[monthName] = (aggs[monthName] || 0) + item.net_pay;
        });

        // Ensure all months sort order
        const months = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('default', { month: 'short' }));
        return months.map(m => ({ name: m, total: aggs[m] || 0 }));
    };

    const getIndividualAggregates = () => {
        // For User Yearly: List stats per month
        return reportData.map((item: any) => ({
            month: new Date(0, item.run.month - 1).toLocaleString('default', { month: 'short' }),
            basic: item.basic_salary,
            allowances: item.hra + item.allowances + item.conveyance_allowance + item.accommodation_allowance + item.incentives,
            deductions: item.lop_deduction + item.advance_salary + item.other_deductions,
            net: item.net_pay
        })).sort((a: any, b: any) => {
            const months: { [key: string]: number } = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
            return months[a.month] - months[b.month];
        });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">

            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Payroll Reports</h1>
                    <p className="text-muted-foreground">Generate comprehensive payment reports.</p>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    {/* Report Type Toggle */}
                    <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
                        <button
                            onClick={() => setReportType('TEAM')}
                            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${reportType === 'TEAM' ? 'bg-background text-foreground shadow' : ''}`}
                        >
                            Team
                        </button>
                        <button
                            onClick={() => setReportType('INDIVIDUAL')}
                            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${reportType === 'INDIVIDUAL' ? 'bg-background text-foreground shadow' : ''}`}
                        >
                            Individual
                        </button>
                    </div>

                    {/* Period */}
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                            <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Filters */}
                    {period === 'MONTHLY' && (
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <SelectItem key={m} value={m.toString()}>
                                        {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2026">2026</SelectItem>
                        </SelectContent>
                    </Select>

                    {reportType === 'INDIVIDUAL' && (
                        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select Staff" />
                            </SelectTrigger>
                            <SelectContent>
                                {staffList.map((s: any) => (
                                    <SelectItem key={s.user_id} value={s.user_id}>
                                        {s.user.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {/* ERROR STATE */}
            {reportType === 'INDIVIDUAL' && !selectedStaff && (
                <div className="text-center p-12 bg-white rounded-lg border border-dashed">
                    <User className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">Select a Staff Member</h3>
                    <p className="text-muted-foreground">Please select a staff member to view their individual payroll report.</p>
                </div>
            )}

            {isLoading && (selectedStaff || reportType === 'TEAM') && (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}

            {/* CONTENT */}
            {!isLoading && (selectedStaff || reportType === 'TEAM') && (
                <div className="space-y-6">

                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Payout</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{calculateTotalPayout().toLocaleString('en-IN')}</div>
                                <p className="text-xs text-muted-foreground">for selected period</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Records Found</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{reportData.length}</div>
                                <p className="text-xs text-muted-foreground">processed slips</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Average Payout</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    ₹{reportData.length ? Math.round(calculateTotalPayout() / reportData.length).toLocaleString('en-IN') : 0}
                                </div>
                                <p className="text-xs text-muted-foreground">per slip</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* TEAM YEARLY CHART */}
                    {reportType === 'TEAM' && period === 'YEARLY' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Monthly Payroll Cost Trend</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={getMonthlyAggregates()}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip formatter={(value: any) => `₹${(value || 0).toLocaleString('en-IN')}`} />
                                        <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Total Payout" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* INDIVIDUAL YEARLY CHART */}
                    {reportType === 'INDIVIDUAL' && period === 'YEARLY' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Salary Trend ({year})</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={getIndividualAggregates()}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip formatter={(value: any) => `₹${(value || 0).toLocaleString('en-IN')}`} />
                                        <Legend />
                                        <Line type="monotone" dataKey="net" stroke="#16a34a" strokeWidth={2} name="Net Pay" />
                                        <Line type="monotone" dataKey="basic" stroke="#64748b" name="Basic Salary" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* DATA TABLE */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Breakdown</CardTitle>
                            <CardDescription>
                                {reportType === 'TEAM'
                                    ? `All staff payroll for ${period === 'MONTHLY' ? `${new Date(0, parseInt(month) - 1).toLocaleString('default', { month: 'long' })} ${year}` : year}`
                                    : `Payroll history for selected staff in ${year}`
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Run Period</TableHead>
                                        {reportType === 'TEAM' && <TableHead>Staff Name</TableHead>}
                                        <TableHead>Designation</TableHead>
                                        <TableHead>Basic</TableHead>
                                        <TableHead>HRA</TableHead>
                                        <TableHead>Allowances</TableHead>
                                        <TableHead>Deductions</TableHead>
                                        <TableHead className="text-right font-bold">Net Pay</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                                No records found for this period.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        reportData.map((slip: any) => (
                                            <TableRow key={slip.id}>
                                                <TableCell>{new Date(0, slip.run.month - 1).toLocaleString('default', { month: 'short' })} {slip.run.year}</TableCell>
                                                {reportType === 'TEAM' && (
                                                    <TableCell className="font-medium">
                                                        {slip.user?.full_name}
                                                        <div className="text-xs text-muted-foreground">{slip.user?.staffProfile?.staff_number}</div>
                                                    </TableCell>
                                                )}
                                                <TableCell>{slip.user?.staffProfile?.designation || slip.designation || '-'}</TableCell>
                                                <TableCell>₹{slip.basic_salary.toLocaleString()}</TableCell>
                                                <TableCell>₹{slip.hra.toLocaleString()}</TableCell>
                                                <TableCell>₹{(slip.allowances + slip.conveyance_allowance + slip.accommodation_allowance + slip.incentives).toLocaleString()}</TableCell>
                                                <TableCell className="text-red-500">-₹{(slip.lop_deduction + slip.advance_salary + slip.other_deductions).toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-green-700">₹{slip.net_pay.toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${slip.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {slip.status}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                </div>
            )}
        </div>
    );
};

export default PayrollReports;
