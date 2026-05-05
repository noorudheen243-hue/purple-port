import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    Search, 
    Calendar, 
    Download, 
    Printer, 
    ArrowUpRight, 
    ArrowDownLeft,
    Filter,
    FileText,
    TrendingUp,
    TrendingDown,
    ChevronRight,
    Wallet
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';
import { useRef } from 'react';
import StatementTemplate from '../../components/finance/StatementTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

const UnifiedAccountStatement = () => {
    const [selectedLedgerId, setSelectedLedgerId] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const statementPrintRef = useRef<HTMLDivElement>(null);

    const { data: ledgers } = useQuery({
        queryKey: ['unified-ledgers'],
        queryFn: async () => (await api.get('/accounting/unified/ledgers')).data
    });

    const { data: statement, isLoading, isFetching } = useQuery({
        queryKey: ['account-statement', selectedLedgerId, startDate, endDate],
        queryFn: async () => {
            if (!selectedLedgerId) return null;
            return (await api.post('/accounting/unified/reports/statement', {
                ledger_id: selectedLedgerId,
                startDate,
                endDate
            })).data;
        },
        enabled: !!selectedLedgerId
    });

    const filteredLedgers = ledgers?.filter((l: any) => 
        l.entity_type !== 'USER' && l.ledger_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
            
            // Temporarily make visible for capture
            element.style.display = 'block';
            element.style.position = 'absolute';
            element.style.left = '-9999px';
            
            try {
                const canvas = await html2canvas(element, { 
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    windowWidth: 794 // Approx A4 width in px at 96 DPI
                });
                
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                
                // Calculate height of one A4 page in canvas units
                const pageHeightInCanvas = (canvasWidth * pdfHeight) / pdfWidth;
                
                let heightLeft = canvasHeight;
                let position = 0;
                let pageCount = 0;

                while (heightLeft > 0) {
                    if (pageCount > 0) pdf.addPage();
                    
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, (canvasHeight * pdfWidth) / canvasWidth);
                    
                    heightLeft -= pageHeightInCanvas;
                    position -= pdfHeight;
                    pageCount++;
                }

                pdf.save(`Statement_${ledgers?.find((l: any) => l.id === selectedLedgerId)?.ledger_name}_${format(new Date(), 'yyyyMMdd')}.pdf`);
            } finally {
                element.style.display = originalStyle;
            }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Left Column: Ledger Selection & Filters */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 shadow-sm sticky top-8">
                    <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                        <Filter className="w-5 h-5 text-purple-600" /> Statement Filter
                    </h2>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Search Account</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="Client, Staff or General..."
                                    className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-3 outline-none focus:border-purple-500 font-bold text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredLedgers?.map((l: any) => (
                                <button
                                    key={l.id}
                                    onClick={() => setSelectedLedgerId(l.id)}
                                    className={`w-full text-left px-5 py-4 rounded-2xl transition-all border-2 ${
                                        selectedLedgerId === l.id 
                                            ? 'bg-purple-600 border-purple-600 text-white shadow-xl shadow-purple-100 scale-[1.02]' 
                                            : 'bg-white border-transparent hover:border-slate-200 text-slate-600'
                                    }`}
                                >
                                    <div className="font-bold text-sm">{l.ledger_name}</div>
                                    <div className={`text-[9px] uppercase font-black tracking-widest mt-0.5 opacity-60 ${selectedLedgerId === l.id ? 'text-white' : 'text-slate-400'}`}>
                                        {l.entity_type}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">From</label>
                                <input 
                                    type="date"
                                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 outline-none focus:border-purple-500 font-bold text-xs"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">To</label>
                                <input 
                                    type="date"
                                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 outline-none focus:border-purple-500 font-bold text-xs"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Statement Display */}
            <div className="lg:col-span-8">
                {!selectedLedgerId ? (
                    <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-50/50 rounded-[3rem] border-4 border-dashed border-slate-100 text-slate-400 text-center p-12">
                        <div className="bg-white p-6 rounded-full shadow-lg mb-6">
                            <FileText className="w-12 h-12 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">No Account Selected</h3>
                        <p className="max-w-xs font-medium">Please select a ledger from the left panel to generate a detailed financial statement.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Summary Header */}
                        <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                    {ledgers?.find((l: any) => l.id === selectedLedgerId)?.ledger_name}
                                </h2>
                                <p className="text-slate-500 font-medium">Activity Report: {formatDate(startDate)} to {formatDate(endDate)}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handlePrint} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-purple-600 transition-all shadow-lg shadow-slate-200" title="Print Statement">
                                    <Printer className="w-5 h-5" />
                                </button>
                                <button onClick={handleDownloadPDF} className="p-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:border-purple-200 transition-all" title="Download PDF">
                                    <Download className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Totals Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2.5rem]">
                                <div className="flex justify-between items-start mb-2">
                                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Income</span>
                                </div>
                                <p className="text-2xl font-black text-emerald-900">{formatCurrency(statement?.totalIncome || 0)}</p>
                            </div>
                            <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2.5rem]">
                                <div className="flex justify-between items-start mb-2">
                                    <TrendingDown className="w-5 h-5 text-rose-600" />
                                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Total Expense</span>
                                </div>
                                <p className="text-2xl font-black text-rose-900">{formatCurrency(statement?.totalExpense || 0)}</p>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white">
                                <div className="flex justify-between items-start mb-2">
                                    <Wallet className="w-5 h-5 text-purple-400" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Closing Balance</span>
                                </div>
                                <p className="text-2xl font-black">{formatCurrency(statement?.closingBalance || 0)}</p>
                            </div>
                        </div>

                        {/* Statement Table */}
                        <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-xl overflow-hidden min-h-[500px]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Income</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Expense</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {/* Opening Balance Row */}
                                        <tr className="bg-purple-50/30">
                                            <td className="px-8 py-4 font-bold text-slate-400 text-xs">{formatDate(startDate)}</td>
                                            <td className="px-8 py-4 font-black text-purple-600 text-xs uppercase tracking-widest">Opening Balance B/F</td>
                                            <td className="px-8 py-4 text-right"></td>
                                            <td className="px-8 py-4 text-right"></td>
                                            <td className="px-8 py-4 text-right font-black text-slate-900">{formatCurrency(statement?.openingBalance || 0)}</td>
                                        </tr>

                                        {statement?.transactions?.map((t: any) => (
                                            <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-8 py-5 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 text-sm">{formatDate(t.date)}</span>
                                                        {t.isLegacy && <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest mt-1">Legacy System</span>}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${t.transaction_type === 'INCOME' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                                            {t.transaction_type === 'INCOME' ? <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 text-rose-600" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 text-sm">{t.description}</div>
                                                            <div className="text-[10px] font-medium text-slate-400">{t.category} {t.reference ? `| Ref: ${t.reference}` : ''}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right font-bold text-emerald-600 text-sm">
                                                    {t.transaction_type === 'INCOME' ? formatCurrency(t.amount) : '-'}
                                                </td>
                                                <td className="px-8 py-5 text-right font-bold text-rose-600 text-sm">
                                                    {t.transaction_type === 'EXPENSE' ? formatCurrency(t.amount) : '-'}
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">
                                                    {formatCurrency(t.running_balance)}
                                                </td>
                                            </tr>
                                        ))}

                                        {(!statement?.transactions || statement.transactions.length === 0) && !isLoading && (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium">
                                                    No transactions recorded within this period.
                                                </td>
                                            </tr>
                                        )}
                                        
                                        {isLoading && (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <TrendingUp className="w-8 h-8 text-purple-200 animate-bounce" />
                                                        <span className="font-black text-slate-300 uppercase tracking-[0.2em] text-xs">Generating Report...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden Printable Template */}
            <div className="hidden">
                <div style={{ position: 'absolute', top: '-10000px' }}>
                    {statement && (
                        <StatementTemplate
                            ref={statementPrintRef}
                            transactions={statement.transactions}
                            clientName={ledgers?.find((l: any) => l.id === selectedLedgerId)?.ledger_name}
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

export default UnifiedAccountStatement;
