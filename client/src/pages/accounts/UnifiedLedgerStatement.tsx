import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { Calendar as CalendarIcon, FileText, Download, Printer, Share2, Loader2, Info } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';

const UnifiedLedgerStatement = () => {
    const [selectedLedgerId, setSelectedLedgerId] = useState('');
    const [dateRange, setDateRange] = useState({ 
        start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-01'), 
        end: format(new Date(), 'yyyy-MM-dd') 
    });
    const [statementData, setStatementData] = useState<any[] | null>(null);

    const { data: ledgers } = useQuery({
        queryKey: ['unified-ledgers'],
        queryFn: async () => (await api.get('/accounting/unified/ledgers')).data
    });

    const generateMutation = useMutation({
        mutationFn: async () => {
            return api.post('/accounting/unified/reports/statement', {
                ledger_id: selectedLedgerId,
                start_date: dateRange.start,
                end_date: dateRange.end
            });
        },
        onSuccess: (res) => {
            setStatementData(res.data);
        },
        onError: (err: any) => alert("Failed to generate: " + err.message)
    });

    const selectedLedger = ledgers?.find((l: any) => l.id === selectedLedgerId);

    return (
        <div className="space-y-6">
            <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-4 no-print">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Select Unified Account</label>
                        <select
                            className="w-full bg-background border-2 rounded-lg px-4 py-2.5 focus:border-primary outline-none transition-all"
                            value={selectedLedgerId}
                            onChange={(e) => setSelectedLedgerId(e.target.value)}
                        >
                            <option value="">Choose Ledger...</option>
                            {ledgers?.map((l: any) => (
                                <option key={l.id} value={l.id}>{l.ledger_name} ({l.entity_type})</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">From Date</label>
                        <input
                            type="date"
                            className="w-full bg-background border-2 rounded-lg px-4 py-2.5 focus:border-primary outline-none"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">To Date</label>
                        <input
                            type="date"
                            className="w-full bg-background border-2 rounded-lg px-4 py-2.5 focus:border-primary outline-none"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        />
                    </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        <Info className="w-3.5 h-3.5 text-blue-500" />
                        Merged view includes historical transactions from legacy income/expense ledgers.
                    </div>
                    <button
                        onClick={() => generateMutation.mutate()}
                        disabled={!selectedLedgerId || generateMutation.isPending}
                        className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                    >
                        {generateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                        Generate Unified Statement
                    </button>
                </div>
            </div>

            {statementData && selectedLedger && (
                <div className="bg-white text-black p-8 rounded-2xl shadow-xl border printable-area">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-4 border-primary pb-6 mb-8">
                        <div>
                            <div className="flex items-center gap-4 mb-4">
                                <img src="/qix_logo.png" alt="Qix Ads" className="h-14 w-auto" />
                                <div className="h-10 w-[2px] bg-gray-200"></div>
                                <div className="text-xs font-black text-primary bg-primary/5 px-2 py-1 rounded">UNIFIED LEDGER SYSTEM</div>
                            </div>
                            <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Account Statement</h2>
                            <p className="text-xl font-bold text-gray-600 mt-1 uppercase tracking-tight">{selectedLedger.ledger_name}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Report Period</p>
                            <p className="font-bold">{format(new Date(dateRange.start), 'dd MMM yyyy')} — {format(new Date(dateRange.end), 'dd MMM yyyy')}</p>
                            <p className="text-xs text-gray-500">Generated on: {format(new Date(), 'PPpp')}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-900 text-white uppercase text-[10px] font-black tracking-widest">
                                    <th className="px-6 py-4 rounded-tl-lg">Date</th>
                                    <th className="px-6 py-4">Transaction Details</th>
                                    <th className="px-6 py-4">Reference</th>
                                    <th className="px-6 py-4 text-right">Income (+)</th>
                                    <th className="px-6 py-4 text-right">Expense (-)</th>
                                    <th className="px-6 py-4 text-right rounded-tr-lg">Running Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-gray-50">
                                {statementData.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold italic">No financial movements recorded for this period.</td></tr>
                                ) : (
                                    (() => {
                                        let runningBalance = 0; // Simplified for UI, server should ideally provide it or we calculate from op-bal
                                        return statementData.map((tx: any) => {
                                            const isIncome = tx.transaction_type === 'INCOME';
                                            runningBalance += isIncome ? tx.amount : -tx.amount;
                                            
                                            return (
                                                <tr key={tx.id} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="px-6 py-5 whitespace-nowrap font-bold text-gray-500">{format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                                                    <td className="px-6 py-5">
                                                        <div className="font-black text-gray-800 group-hover:text-primary transition-colors">{tx.description}</div>
                                                        {tx.isLegacy && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-black ml-1">LEGACY DATA</span>}
                                                    </td>
                                                    <td className="px-6 py-5 text-gray-400 font-mono text-xs">{tx.reference || '-'}</td>
                                                    <td className={`px-6 py-5 text-right font-mono font-black ${isIncome ? 'text-emerald-600' : 'text-gray-300'}`}>
                                                        {isIncome ? formatCurrency(tx.amount) : '—'}
                                                    </td>
                                                    <td className={`px-6 py-5 text-right font-mono font-black ${!isIncome ? 'text-rose-600' : 'text-gray-300'}`}>
                                                        {!isIncome ? formatCurrency(tx.amount) : '—'}
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-mono font-black text-gray-900 bg-gray-50/50">
                                                        {formatCurrency(runningBalance)}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Summary */}
                    <div className="mt-10 grid grid-cols-3 gap-6">
                         <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100">
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Income</p>
                             <p className="text-2xl font-black text-emerald-600">
                                {formatCurrency(statementData.filter((t:any) => t.transaction_type === 'INCOME').reduce((s:any, t:any) => s + t.amount, 0))}
                             </p>
                         </div>
                         <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100">
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Expense</p>
                             <p className="text-2xl font-black text-rose-600">
                                {formatCurrency(statementData.filter((t:any) => t.transaction_type === 'EXPENSE').reduce((s:any, t:any) => s + t.amount, 0))}
                             </p>
                         </div>
                         <div className="bg-primary p-6 rounded-2xl shadow-xl shadow-primary/20">
                             <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Net Period Movement</p>
                             <p className="text-2xl font-black text-white">
                                {formatCurrency(statementData.reduce((s:any, t:any) => s + (t.transaction_type === 'INCOME' ? t.amount : -t.amount), 0))}
                             </p>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UnifiedLedgerStatement;
