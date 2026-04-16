import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    Calendar, 
    FileText, 
    Download, 
    Printer, 
    TrendingUp, 
    TrendingDown, 
    Landmark, 
    Wallet 
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';
import { 
    format, 
    startOfWeek, 
    endOfWeek, 
    startOfMonth, 
    endOfMonth, 
    startOfYear, 
    endOfYear, 
    subDays 
} from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AccountReports = () => {
    const [period, setPeriod] = useState('monthly');
    const [reportType, setReportType] = useState('INCOME');
    const [customRange, setCustomRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    // Calculate dates based on period
    const getDates = () => {
        const now = new Date();
        switch (period) {
            case 'weekly':
                return { start: format(startOfWeek(now), 'yyyy-MM-dd'), end: format(endOfWeek(now), 'yyyy-MM-dd') };
            case 'monthly':
                const mStart = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
                const mEnd = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);
                return { start: format(mStart, 'yyyy-MM-dd'), end: format(mEnd, 'yyyy-MM-dd') };
            case 'yearly':
                const yStart = new Date(parseInt(selectedYear), 0, 1);
                const yEnd = new Date(parseInt(selectedYear), 11, 31);
                return { start: format(yStart, 'yyyy-MM-dd'), end: format(yEnd, 'yyyy-MM-dd') };
            default:
                return customRange;
        }
    };

    const dates = getDates();

    const { data: transactions, isLoading } = useQuery({
        queryKey: ['financialReports', dates, reportType],
        queryFn: async () => {
            const res = await api.get('/accounting/transactions', {
                params: {
                    start_date: dates.start,
                    end_date: dates.end,
                    account_type: reportType,
                    limit: 1000 // Large limit for reports
                }
            });
            return res.data;
        }
    });

    const totalAmount = transactions?.reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0;

    const handlePrint = () => window.print();

    const handleDownloadPDF = () => {
        if (!transactions) return;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`${reportType.charAt(0) + reportType.slice(1).toLowerCase()} Report`, 14, 22);
        doc.setFontSize(11);
        doc.text(`Period: ${formatDate(dates.start)} to ${formatDate(dates.end)}`, 14, 30);
        doc.text(`Total ${reportType}: ${formatCurrency(totalAmount)}`, 14, 36);

        const tableColumn = ["Date", "Description", "Ref", "Type", "Amount"];
        const tableRows = transactions.map((tx: any) => [
            formatDate(tx.date),
            tx.description,
            tx.reference || '-',
            tx.type,
            formatCurrency(tx.amount)
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
        });

        doc.save(`${reportType}_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="no-print space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h1 className="text-2xl font-bold">Financial Reports</h1>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted transition-colors">
                            <Printer className="w-4 h-4" /> Print
                        </button>
                        <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-3 py-2 bg-purple-900 text-yellow-400 rounded-md hover:bg-purple-800 transition-colors shadow-sm">
                            <Download className="w-4 h-4" /> Export PDF
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-card p-4 rounded-xl border shadow-sm">
                    {/* Report Type */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Report Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'INCOME', label: 'Income', icon: TrendingUp, color: 'text-green-600' },
                                { id: 'EXPENSE', label: 'Expense', icon: TrendingDown, color: 'text-red-600' },
                                { id: 'BANK', label: 'Bank', icon: Landmark, color: 'text-blue-600' },
                                { id: 'CASH', label: 'Cash', icon: Wallet, color: 'text-amber-600' },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setReportType(t.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                                        reportType === t.id 
                                        ? 'bg-purple-900 border-purple-900 text-white' 
                                        : 'bg-white border-transparent hover:border-purple-200 text-slate-600'
                                    }`}
                                >
                                    <t.icon className={`w-4 h-4 ${reportType === t.id ? 'text-yellow-400' : t.color}`} />
                                    <span className="text-sm font-medium">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Period Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Time Period</label>
                        <select 
                            className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                        >
                            <option value="weekly">This Week</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {/* Conditional Filters */}
                    {period === 'monthly' && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Select Month</label>
                            <div className="flex gap-2">
                                <select 
                                    className="flex-1 bg-background border rounded-lg px-3 py-2 text-sm"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            {format(new Date(2000, i, 1), 'MMMM')}
                                        </option>
                                    ))}
                                </select>
                                <select 
                                    className="w-24 bg-background border rounded-lg px-3 py-2 text-sm"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                >
                                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {period === 'custom' && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Date Range</label>
                            <div className="flex gap-2">
                                <input 
                                    type="date" 
                                    className="flex-1 bg-background border rounded-lg px-3 py-2 text-sm"
                                    value={customRange.start}
                                    onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                                />
                                <input 
                                    type="date" 
                                    className="flex-1 bg-background border rounded-lg px-3 py-2 text-sm"
                                    value={customRange.end}
                                    onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Report Content */}
            <div className="space-y-6 printable-area">
                {/* Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-purple-900 p-6 rounded-2xl text-white shadow-lg overflow-hidden relative">
                        <div className="relative z-10">
                            <p className="text-purple-200 text-sm font-bold uppercase tracking-widest mb-1">Total {reportType}</p>
                            <h3 className="text-4xl font-black text-yellow-400 font-mono">
                                {formatCurrency(totalAmount)}
                            </h3>
                            <p className="text-purple-300 text-[10px] mt-2 italic">
                                period: {formatDate(dates.start)} - {formatDate(dates.end)}
                            </p>
                        </div>
                        <FileText className="absolute -right-4 -bottom-4 w-32 h-32 text-purple-800 opacity-50" />
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-600" />
                            Transaction Details
                        </h4>
                        <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-1 rounded-full uppercase">
                            {transactions?.length || 0} Records
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">Reference</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 animate-pulse">Fetching records...</td></tr>
                                ) : transactions?.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No transactions found for this period.</td></tr>
                                ) : (
                                    transactions?.map((tx: any) => (
                                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium">{formatDate(tx.date)}</td>
                                            <td className="px-6 py-4 text-slate-600 max-w-md">
                                                <div className="font-bold text-slate-800">{tx.description}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="text-[10px] text-slate-400">{tx.debit_ledgers} ➞ {tx.credit_ledgers}</div>
                                                    {tx.nature && tx.nature !== 'GENERAL' && (
                                                        <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded uppercase">
                                                            {tx.nature.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-500 uppercase">{tx.reference || '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                    tx.type === 'RECEIPT' || tx.type === 'INCOME' ? 'bg-green-100 text-green-700' : 
                                                    tx.type === 'PAYMENT' || tx.type === 'EXPENSE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono">
                                                {formatCurrency(tx.amount)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .printable-area { padding: 0 !important; }
                    body { background: white !important; }
                }
            `}</style>
        </div>
    );
};

export default AccountReports;
