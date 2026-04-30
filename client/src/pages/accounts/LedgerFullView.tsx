import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    Calendar, 
    Download, 
    Printer, 
    ArrowUpRight, 
    ArrowDownLeft,
    FileText,
    TrendingUp,
    TrendingDown,
    Wallet,
    ArrowLeft
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';
import { useRef } from 'react';
import StatementTemplate from '../../components/finance/StatementTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

const LedgerFullView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const statementPrintRef = useRef<HTMLDivElement>(null);

    const { data: ledgers } = useQuery({
        queryKey: ['unified-ledgers'],
        queryFn: async () => (await api.get('/accounting/unified/ledgers')).data
    });

    const ledger = ledgers?.find((l: any) => l.id === id);

    const { data: statement, isLoading } = useQuery({
        queryKey: ['account-statement', id, startDate, endDate],
        queryFn: async () => {
            if (!id) return null;
            return (await api.post('/accounting/unified/reports/statement', {
                ledger_id: id,
                startDate,
                endDate
            })).data;
        },
        enabled: !!id
    });

    const handlePrint = () => {
        if (statementPrintRef.current) {
            const content = statementPrintRef.current.innerHTML;
            const printWindow = window.open('', '', 'height=800,width=800');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Statement of Account</title>');
                printWindow.document.write('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">');
                printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                printWindow.document.write('<style>@media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none; } }</style>');
                printWindow.document.write('</head><body class="bg-white">');
                printWindow.document.write(content);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                }, 1000);
            }
        }
    };

    const handleDownloadPDF = async () => {
        if (statementPrintRef.current) {
            const element = statementPrintRef.current;
            const originalStyle = element.style.display;
            element.style.display = 'block';
            element.style.position = 'absolute';
            element.style.left = '-9999px';
            
            try {
                const canvas = await html2canvas(element, { 
                    scale: 2,
                    useCORS: true,
                    windowWidth: 794,
                });
                
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Statement_${ledger?.ledger_name}_${format(new Date(), 'yyyyMMdd')}.pdf`);
            } finally {
                element.style.display = originalStyle;
            }
        }
    };

    if (!ledger && !isLoading) {
        return (
            <div className="p-20 text-center">
                <h2 className="text-2xl font-black text-slate-900">Ledger Not Found</h2>
                <button onClick={() => navigate(-1)} className="mt-4 text-purple-600 font-bold flex items-center gap-2 mx-auto">
                    <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-4 bg-slate-50 text-slate-400 hover:text-purple-600 rounded-2xl transition-all"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{ledger?.ledger_name}</h1>
                            <span className="px-4 py-1 bg-purple-100 text-purple-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-purple-200">
                                {ledger?.entity_type} Account
                            </span>
                        </div>
                        <p className="text-slate-500 mt-1 font-medium">Detailed financial history and audit trail.</p>
                    </div>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="flex bg-slate-50 p-2 rounded-2xl border border-slate-100 gap-2">
                        <input 
                            type="date"
                            className="bg-transparent px-4 py-2 outline-none font-bold text-sm text-slate-700"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="flex items-center text-slate-300">to</span>
                        <input 
                            type="date"
                            className="bg-transparent px-4 py-2 outline-none font-bold text-sm text-slate-700"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <button onClick={handlePrint} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-purple-600 transition-all shadow-xl shadow-slate-200" title="Print Statement">
                        <Printer className="w-6 h-6" />
                    </button>
                    <button onClick={handleDownloadPDF} className="p-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm" title="Download PDF">
                        <Download className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border-2 border-slate-50 p-8 rounded-[2.5rem] shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Opening Balance</p>
                    <p className="text-3xl font-black text-slate-900">{formatCurrency(statement?.openingBalance || 0)}</p>
                </div>
                <div className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-[2.5rem]">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Incoming</p>
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-black text-emerald-900">{formatCurrency(statement?.totalIncome || 0)}</p>
                </div>
                <div className="bg-rose-50 border-2 border-rose-100 p-8 rounded-[2.5rem]">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Total Outgoing</p>
                        <TrendingDown className="w-5 h-5 text-rose-500" />
                    </div>
                    <p className="text-3xl font-black text-rose-900">{formatCurrency(statement?.totalExpense || 0)}</p>
                </div>
                <div className="bg-purple-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-purple-200">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest">Closing Liquidity</p>
                        <Wallet className="w-5 h-5 text-purple-300" />
                    </div>
                    <p className="text-3xl font-black">{formatCurrency(statement?.closingBalance || 0)}</p>
                </div>
            </div>

            {/* Main Statement Table */}
            <div className="bg-white border-2 border-slate-100 rounded-[3.5rem] shadow-2xl overflow-hidden min-h-[600px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-10 py-6">Transaction Date</th>
                                <th className="px-10 py-6">Description / Reference</th>
                                <th className="px-10 py-6 text-right">Inflow</th>
                                <th className="px-10 py-6 text-right">Outflow</th>
                                <th className="px-10 py-6 text-right">Net Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* Opening Row */}
                            <tr className="bg-slate-50/50">
                                <td className="px-10 py-5 font-bold text-slate-400 text-sm">{formatDate(startDate)}</td>
                                <td className="px-10 py-5 font-black text-purple-600 text-[10px] uppercase tracking-widest italic">Brought Forward (Opening Balance)</td>
                                <td colSpan={2}></td>
                                <td className="px-10 py-5 text-right font-black text-slate-900">{formatCurrency(statement?.openingBalance || 0)}</td>
                            </tr>

                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Reconstructing History...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : statement?.transactions?.map((t: any) => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-10 py-6 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800">{formatDate(t.date)}</span>
                                            <span className="text-[9px] font-bold text-slate-300">REF: {t.id.toString().split('-').pop()}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-xl ${t.transaction_type === 'INCOME' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                                {t.transaction_type === 'INCOME' ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> : <ArrowUpRight className="w-4 h-4 text-rose-600" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">{t.description}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                        {t.category || 'General'}
                                                    </span>
                                                    {t.isLegacy && <span className="text-[8px] font-black text-amber-500 uppercase">Legacy</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right font-black text-emerald-600">
                                        {t.transaction_type === 'INCOME' ? formatCurrency(t.amount) : '-'}
                                    </td>
                                    <td className="px-10 py-6 text-right font-black text-rose-600">
                                        {t.transaction_type === 'EXPENSE' ? formatCurrency(t.amount) : '-'}
                                    </td>
                                    <td className="px-10 py-6 text-right font-black text-slate-900 bg-slate-50/30">
                                        {formatCurrency(t.running_balance)}
                                    </td>
                                </tr>
                            ))}

                            {statement?.transactions?.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center text-slate-400 font-bold italic">
                                        No activity found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hidden Printable Template */}
            <div className="hidden">
                <div style={{ position: 'absolute', top: '-10000px' }}>
                    {statement && (
                        <StatementTemplate
                            ref={statementPrintRef}
                            transactions={statement.transactions}
                            clientName={ledger?.ledger_name}
                            startDate={new Date(startDate)}
                            endDate={new Date(endDate)}
                            openingBalance={statement.openingBalance}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default LedgerFullView;
