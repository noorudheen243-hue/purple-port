import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { formatCurrency } from '../../utils/format';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownLeft, Wallet, DollarSign, Calendar } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 3 }, (_, i) => (currentYear - i).toString());

const AccountOverview = () => {
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    const { data: overview, isLoading } = useQuery({
        queryKey: ['financialOverview', selectedMonth, selectedYear],
        queryFn: async () => (await api.get('/accounting/reports/overview', {
            params: { month: selectedMonth, year: selectedYear }
        })).data
    });

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Financial Data...</div>;

    const { income, expense, net_profit, cash_bank_balance, opening_balance, month_name, expense_pie_data } = overview || {};

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Financial Overview</h1>
                    <p className="text-sm text-muted-foreground">Detailed financial performance and asset tracking</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(m => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="h-4 w-[1px] bg-border mx-1" />
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px] border-none shadow-none focus:ring-0">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => (
                                <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="bg-blue-50/50 border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-blue-900 tracking-wider">Opening Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-blue-700">₹{(opening_balance || 0).toLocaleString('en-IN')}</div>
                        <p className="text-[10px] text-blue-600/80">Prev. Month Closing</p>
                    </CardContent>
                </Card>

                <Card className="bg-green-50/50 border-green-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-green-900 tracking-wider">Income ({month_name})</CardTitle>
                        <ArrowDownLeft className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-green-700">₹{(income || 0).toLocaleString('en-IN')}</div>
                        <p className="text-[10px] text-green-600/80">Monthly Revenue</p>
                    </CardContent>
                </Card>

                <Card className="bg-red-50/50 border-red-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-red-900 tracking-wider">Expenses ({month_name})</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-red-700">₹{(expense || 0).toLocaleString('en-IN')}</div>
                        <p className="text-[10px] text-red-600/80">Monthly Outflow</p>
                    </CardContent>
                </Card>

                <Card className="bg-indigo-50/50 border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-indigo-900 tracking-wider">Month Balance</CardTitle>
                        <DollarSign className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-xl font-bold ${net_profit >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
                            ₹{(net_profit || 0).toLocaleString('en-IN')}
                        </div>
                        <p className="text-[10px] text-indigo-600/80">Income - Expense</p>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50/50 border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">Cash & Bank</CardTitle>
                        <Wallet className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-amber-700">₹{(cash_bank_balance || 0).toLocaleString('en-IN')}</div>
                        <p className="text-[10px] text-amber-600/80">Net Liquidity</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Expense Breakdown
                            <span className="text-xs font-normal text-muted-foreground">(for selected period)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {expense_pie_data?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={expense_pie_data}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {expense_pie_data.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                <p>No expense data available for this month</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">Frequently used accounting operations.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <a href="/dashboard/accounts/statement" className="block p-4 border rounded hover:bg-slate-50 transition-colors">
                                <h3 className="font-semibold">Generate Statement</h3>
                                <p className="text-xs text-muted-foreground">Download Ledger PDFs</p>
                            </a>
                            <a href="/dashboard/accounts/new" className="block p-4 border rounded hover:bg-slate-50 transition-colors">
                                <h3 className="font-semibold">Record Transaction</h3>
                                <p className="text-xs text-muted-foreground">Add Income/Expense</p>
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AccountOverview;
