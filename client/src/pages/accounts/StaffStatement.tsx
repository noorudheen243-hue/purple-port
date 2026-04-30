import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';
import { UserCheck, Calendar, Download, Printer, ArrowLeft } from 'lucide-react';

const StaffStatement = ({ ledgerId, onBack }: { ledgerId: string, onBack: () => void }) => {
    const [dateRange, setDateRange] = useState({ 
        start: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-01-01'), 
        end: format(new Date(), 'yyyy-MM-dd') 
    });

    const { data: statementResult, isLoading } = useQuery({
        queryKey: ['staff-statement', ledgerId, dateRange],
        queryFn: async () => (await api.post('/accounting/unified/reports/statement', {
            ledger_id: ledgerId,
            start_date: dateRange.start,
            end_date: dateRange.end
        })).data
    });

    const { data: ledgers } = useQuery({
        queryKey: ['unified-ledgers', 'USER'],
        queryFn: async () => (await api.get('/accounting/unified/ledgers?type=USER')).data
    });

    const ledger = ledgers?.find((l: any) => l.id === ledgerId);

    if (isLoading) return <div className="p-20 text-center font-bold text-slate-400">Loading Staff Statement...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors">
                    <ArrowLeft className="w-5 h-5" /> Back to Staff List
                </button>
                <div className="flex gap-3">
                    <button className="p-3 border rounded-xl hover:bg-slate-50"><Printer className="w-5 h-5" /></button>
                    <button className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
                        <Download className="w-4 h-4" /> Download PDF
                    </button>
                </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border shadow-2xl printable-area">
                <div className="flex justify-between items-start mb-12 border-b-2 border-slate-50 pb-8">
                    <div className="flex items-center gap-6">
                        <div className="bg-purple-600 text-white p-5 rounded-[2rem]">
                            <UserCheck className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{ledger?.ledger_name}</h2>
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-1">Personal Staff Ledger</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Opening Balance</span>
                            <span className="text-lg font-black text-slate-800">{formatCurrency(statementResult?.openingBalance || 0)}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">Period: {format(new Date(dateRange.start), 'dd/MM/yy')} - {format(new Date(dateRange.end), 'dd/MM/yy')}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                                <th className="px-6 py-4 text-left rounded-tl-2xl">Date</th>
                                <th className="px-6 py-4 text-left">Type</th>
                                <th className="px-6 py-4 text-left">Description</th>
                                <th className="px-6 py-4 text-right">Credit (+)</th>
                                <th className="px-6 py-4 text-right">Debit (-)</th>
                                <th className="px-6 py-4 text-right rounded-tr-2xl">Running Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {statementResult?.transactions.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="px-6 py-5 font-bold text-slate-500">{format(new Date(tx.date), 'dd MMM yyyy')}</td>
                                    <td className="px-6 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                            tx.sub_type === 'Salary' ? 'bg-emerald-100 text-emerald-700' :
                                            tx.sub_type === 'Advance' ? 'bg-rose-100 text-rose-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {tx.sub_type || (tx.transaction_type === 'INCOME' ? 'Incentive' : 'Payment')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 font-bold text-slate-800">{tx.description}</td>
                                    <td className="px-6 py-5 text-right font-black text-emerald-600">
                                        {tx.transaction_type === 'INCOME' ? formatCurrency(tx.amount) : '—'}
                                    </td>
                                    <td className="px-6 py-5 text-right font-black text-rose-600">
                                        {tx.transaction_type === 'EXPENSE' ? formatCurrency(tx.amount) : '—'}
                                    </td>
                                    <td className="px-6 py-5 text-right font-black text-slate-900 bg-slate-50/20">
                                        {formatCurrency(tx.running_balance)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-12 bg-slate-900 rounded-[3rem] p-10 text-white flex justify-between items-center shadow-2xl shadow-slate-300">
                    <div className="flex gap-12">
                        <div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Earnings</p>
                            <h4 className="text-2xl font-black">{formatCurrency(statementResult?.totalIncome || 0)}</h4>
                        </div>
                        <div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Payments</p>
                            <h4 className="text-2xl font-black">{formatCurrency(statementResult?.totalExpense || 0)}</h4>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest mb-1 text-right">Net Payable / Balance</p>
                        <h4 className="text-4xl font-black text-white">{formatCurrency(statementResult?.closingBalance || 0)}</h4>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffStatement;
