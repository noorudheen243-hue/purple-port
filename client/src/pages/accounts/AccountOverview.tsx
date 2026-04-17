import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { formatCurrency } from '../../utils/format';
import { ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { ArrowUpRight, ArrowDownLeft, Wallet, DollarSign, Calendar, PlusCircle, FileText, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    const gross_income = (opening_balance || 0) + (income || 0);

    const barData = [
        { name: 'Summary', Gross: gross_income, Net: income || 0, Expense: expense || 0, Balance: net_profit || 0 }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Financial Overview</h1>
                    <p className="text-sm text-muted-foreground">Detailed financial performance and asset tracking</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Link to="/dashboard/accounts/new" className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all">
                            <PlusCircle className="w-4 h-4" /> Record Transaction
                        </Link>
                        <Link to="/dashboard/accounts/statement" className="flex items-center gap-2 px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-50 transition-all">
                            <FileText className="w-4 h-4" /> Account Statement
                        </Link>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="bg-blue-50/50 border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-blue-900 tracking-wider">Opening Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-blue-700">₹{(opening_balance || 0).toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>

                <Card className="bg-green-50/50 border-green-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-green-900 tracking-wider">Net Income ({month_name})</CardTitle>
                        <ArrowDownLeft className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-green-700">₹{(income || 0).toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50 border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-emerald-900 tracking-wider">Gross Income</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-emerald-700">₹{gross_income.toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>

                <Card className="bg-red-50/50 border-red-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-red-900 tracking-wider">Expenses ({month_name})</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-red-700">₹{(expense || 0).toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>

                <Card className="bg-indigo-50/50 border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-indigo-900 tracking-wider">Month Balance</CardTitle>
                        <DollarSign className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-lg font-bold ${net_profit >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
                            ₹{(net_profit || 0).toLocaleString('en-IN')}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50/50 border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">Cash & Bank</CardTitle>
                        <Wallet className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-amber-700">₹{(cash_bank_balance || 0).toLocaleString('en-IN')}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            Cashflow Performance Analysis
                            <span className="text-xs font-normal text-muted-foreground">(Comparative view of Gross vs Net vs Expense)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[450px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                                <RechartsTooltip formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Gross" fill="#10b981" radius={[4, 4, 0, 0]} name="Gross Income">
                                    <LabelList dataKey="Gross" position="top" formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} className="fill-emerald-800 text-[10px] font-bold" />
                                </Bar>
                                <Bar dataKey="Net" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Net Income">
                                    <LabelList dataKey="Net" position="top" formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} className="fill-blue-800 text-[10px] font-bold" />
                                </Bar>
                                <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense">
                                    <LabelList dataKey="Expense" position="top" formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} className="fill-red-800 text-[10px] font-bold" />
                                </Bar>
                                <Bar dataKey="Balance" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Month Balance">
                                    <LabelList dataKey="Balance" position="top" formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} className="fill-purple-800 text-[10px] font-bold" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AccountOverview;
