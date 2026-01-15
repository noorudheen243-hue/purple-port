import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { formatCurrency } from '../../utils/format';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownLeft, Wallet, DollarSign } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AccountOverview = () => {
    const { data: overview, isLoading } = useQuery({
        queryKey: ['financialOverview'],
        queryFn: async () => (await api.get('/accounting/reports/overview')).data
    });

    if (isLoading) return <div>Loading Overview...</div>;

    const { income, expense, net_profit, cash_bank_balance, expense_pie_data } = overview || {};

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Financial Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-900">Total Income</CardTitle>
                        <ArrowDownLeft className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">₹{(income || 0).toLocaleString('en-IN')}</div>
                        <p className="text-xs text-green-600/80">Revenue generated</p>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-900">Total Expenses</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">₹{(expense || 0).toLocaleString('en-IN')}</div>
                        <p className="text-xs text-red-600/80">Operating costs</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900">Net Profit</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${net_profit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                            ₹{(net_profit || 0).toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-blue-600/80">Income - Expenses</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-amber-900">Cash & Bank</CardTitle>
                        <Wallet className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-700">₹{(cash_bank_balance || 0).toLocaleString('en-IN')}</div>
                        <p className="text-xs text-amber-600/80">Liquid Assets</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Expense Breakdown</CardTitle></CardHeader>
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
                            <div className="flex items-center justify-center h-full text-muted-foreground">No expense data available</div>
                        )}
                    </CardContent>
                </Card>

                {/* Placeholder for Income vs Expense Bar Chart if needed */}
                <Card>
                    <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">Common reporting tasks.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <a href="/dashboard/accounts/statement" className="block p-4 border rounded hover:bg-slate-50">
                                <h3 className="font-semibold">Generate Statement</h3>
                                <p className="text-xs text-muted-foreground">Download Ledger PDFs</p>
                            </a>
                            <a href="/dashboard/accounts/new" className="block p-4 border rounded hover:bg-slate-50">
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
