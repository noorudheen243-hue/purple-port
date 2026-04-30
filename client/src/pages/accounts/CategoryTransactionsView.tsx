import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    Loader2, 
    Printer, 
    ArrowLeft, 
    TrendingUp, 
    Calendar, 
    DollarSign, 
    Briefcase,
    Tag,
    Layers
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';

const CategoryTransactionsView: React.FC = () => {
    const { category } = useParams();

    const { data: transactions, isLoading, error } = useQuery({
        queryKey: ['category-transactions', category],
        queryFn: async () => (await api.get(`/accounting/unified/transactions/category/${category}`)).data,
        enabled: !!category
    });

    if (isLoading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Compiling Transaction Ledger...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Error Loading Data</h2>
            <p className="text-slate-500 mb-6">We couldn't retrieve the transactions for this category.</p>
            <Button onClick={() => window.close()} className="rounded-xl">Close Window</Button>
        </div>
    );

    // Group transactions by ledger name
    const groupedTransactions = transactions?.reduce((acc: any, tx: any) => {
        const ledgerName = tx.ledger?.ledger_name || 'Unlinked Ledger';
        if (!acc[ledgerName]) acc[ledgerName] = [];
        acc[ledgerName].push(tx);
        return acc;
    }, {});

    // Separate ledgers into main and entity groups
    const mainLedgers: any = {};
    const entityLedgers: any = {};

    if (groupedTransactions) {
        Object.entries(groupedTransactions).forEach(([ledgerName, txs]: [string, any]) => {
            const type = txs[0]?.ledger?.entity_type;
            const isMain = ['GENERAL', 'INTERNAL', 'BANK', 'CASH', 'EXPENSE', 'INCOME'].includes(type);
            
            if (isMain) mainLedgers[ledgerName] = txs;
            else entityLedgers[ledgerName] = txs;
        });
    }

    const totalAmount = transactions?.reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0;

    const isExpense = transactions && transactions.length > 0 && transactions[0].transaction_type === 'EXPENSE';
    const themeColor = isExpense ? 'rose' : 'emerald';
    const themeBadge = isExpense ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700';
    const themeText = isExpense ? 'text-rose-600' : 'text-emerald-600';

    const handlePrint = () => window.print();

    const LedgerSection = ({ name, txs, isSmall = false }: { name: string, txs: any[], isSmall?: boolean }) => {
        const ledgerTotal = txs.reduce((sum: number, tx: any) => sum + tx.amount, 0);
        return (
            <section key={name} className="space-y-4">
                <div className="flex justify-between items-end border-b-2 border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 ${isExpense ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} rounded-lg flex items-center justify-center`}>
                            <Briefcase size={16} />
                        </div>
                        <div>
                            <h3 className={`${isSmall ? 'text-sm' : 'text-lg'} font-black text-slate-900 tracking-tight leading-none`}>{name}</h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{txs.length} Entries</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`${isSmall ? 'text-sm' : 'text-md'} font-black text-slate-900`}>{formatCurrency(ledgerTotal)}</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/30">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {txs.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-white transition-colors group bg-white/50">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px]">
                                            <Calendar size={12} className="text-slate-300" />
                                            {format(new Date(tx.date), 'dd MMM, yy')}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-[11px] font-bold text-slate-700 leading-snug">{tx.description}</p>
                                        {tx.reference && <p className="text-[8px] font-black text-purple-400 uppercase mt-0.5">Ref: {tx.reference}</p>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-[11px] font-black text-slate-900">{formatCurrency(tx.amount)}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        );
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-purple-100 selection:text-purple-900">
            {/* Toolbar (Hidden on Print) */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50 px-6 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => window.close()} className="text-slate-500 font-bold">
                        <ArrowLeft size={18} className="mr-2" /> Back
                    </Button>
                    <div className="h-4 w-px bg-slate-200" />
                    <h1 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Layers size={16} className="text-purple-600" /> 
                        {isExpense ? 'Expenditure' : 'Revenue'} Analysis <span className="text-slate-300 mx-2">|</span> {category}
                    </h1>
                </div>
                <Button onClick={handlePrint} className="bg-slate-900 hover:bg-purple-600 text-white font-black rounded-xl h-10 px-6 gap-2 shadow-lg shadow-purple-100 transition-all">
                    <Printer size={18} /> Print Report
                </Button>
            </div>

            {/* Report Content */}
            <div className="max-w-7xl mx-auto pt-32 pb-20 px-8">
                
                {/* Header Section */}
                <header className="mb-16 space-y-8 border-b-8 border-slate-900 pb-12">
                    <div className="flex justify-between items-start">
                        <div className="space-y-4">
                            <Badge className="bg-purple-600 text-white rounded-full px-4 py-1 font-black text-[10px] uppercase tracking-[0.2em]">
                                Financial Disclosure Document
                            </Badge>
                            <h2 className="text-6xl font-black tracking-tighter text-slate-900 leading-[0.9]">
                                {category} <br /> Breakdown
                            </h2>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Aggregate {isExpense ? 'Cost' : 'Revenue'}</p>
                            <p className={`text-5xl font-black ${themeText}`}>{formatCurrency(totalAmount)}</p>
                            <p className="text-sm text-slate-500 font-bold mt-1">{transactions?.length || 0} Total Transactions</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-12 pt-8">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Generated On</p>
                            <p className="font-bold">{format(new Date(), 'MMMM dd, yyyy')}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stream Type</p>
                            <Badge className={`${themeBadge} border-none font-black text-[10px] uppercase`}>{isExpense ? 'Expenditure / Cost' : 'Income / Revenue'}</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Audit</p>
                            <p className="text-xs text-slate-400 font-bold">Verified Unified Transaction Ledger</p>
                        </div>
                    </div>
                </header>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    {/* Left Column: Main Ledgers */}
                    <div className="space-y-12">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-1.5 h-6 bg-purple-600 rounded-full" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Primary Control Accounts</h4>
                        </div>
                        {Object.entries(mainLedgers).map(([name, txs]: [string, any]) => (
                            <LedgerSection key={name} name={name} txs={txs} />
                        ))}
                        {Object.keys(mainLedgers).length === 0 && (
                            <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                                <p className="text-slate-300 font-bold text-xs uppercase tracking-widest">No Primary Accounts Linked</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Entity Ledgers */}
                    <div className="space-y-12">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Secondary / Entity Ledgers</h4>
                        </div>
                        {Object.entries(entityLedgers).map(([name, txs]: [string, any]) => (
                            <LedgerSection key={name} name={name} txs={txs} isSmall />
                        ))}
                        {Object.keys(entityLedgers).length === 0 && (
                            <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                                <p className="text-slate-300 font-bold text-xs uppercase tracking-widest">No Entity Ledgers Found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Section */}
                <footer className="mt-24 pt-20 border-t border-slate-100 flex flex-col items-center text-center gap-6">
                    <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white rotate-12 shadow-2xl shadow-slate-200">
                        <TrendingUp size={32} className={isExpense ? 'text-rose-400' : 'text-emerald-400'} />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-[0.4em]">Unified Financial Matrix</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">© {new Date().getFullYear()} QIX Accounting System • Strictly Confidential</p>
                    </div>
                </footer>
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .page-break-before { page-break-before: always; }
                    body { background: white !important; }
                    .bg-slate-50 { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
                    .bg-purple-600 { background-color: #9333ea !important; -webkit-print-color-adjust: exact; }
                    .bg-slate-900 { background-color: #0f172a !important; -webkit-print-color-adjust: exact; }
                    .text-white { color: white !important; -webkit-print-color-adjust: exact; }
                    .text-emerald-600 { color: #059669 !important; -webkit-print-color-adjust: exact; }
                    .text-rose-600 { color: #e11d48 !important; -webkit-print-color-adjust: exact; }
                    .bg-emerald-100 { background-color: #d1fae5 !important; -webkit-print-color-adjust: exact; }
                    .bg-rose-100 { background-color: #ffe4e6 !important; -webkit-print-color-adjust: exact; }
                }
            ` }} />
        </div>
    );
};

export default CategoryTransactionsView;
