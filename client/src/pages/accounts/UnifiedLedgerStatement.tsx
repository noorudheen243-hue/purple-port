import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { Calendar as CalendarIcon, FileText, Download, Printer, Share2, Loader2, Info, TrendingUp, TrendingDown, Calculator, Wallet } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';
import StatementTemplate from '../../components/finance/StatementTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef } from 'react';

const UnifiedLedgerStatement = () => {
    const [selectedLedgerId, setSelectedLedgerId] = useState('');
    const [dateRange, setDateRange] = useState({ 
        start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-01'), 
        end: format(new Date(), 'yyyy-MM-dd') 
    });
    const [statementResult, setStatementResult] = useState<any>(null);
    const statementPrintRef = useRef<HTMLDivElement>(null);

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
            setStatementResult(res.data);
        },
        onError: (err: any) => alert("Failed to generate: " + err.message)
    });

    const selectedLedger = ledgers?.find((l: any) => l.id === selectedLedgerId);

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

                pdf.save(`Statement_${selectedLedger?.ledger_name}_${format(new Date(), 'yyyyMMdd')}.pdf`);
            } finally {
                element.style.display = originalStyle;
            }
        }
    };

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
                        Statements include legacy history and unified transactions.
                    </div>
                    <div className="flex gap-2">
                         <button
                            onClick={handlePrint}
                            disabled={!statementResult}
                            className="p-3 border-2 rounded-xl hover:bg-slate-50 transition-all text-slate-600 disabled:opacity-30"
                            title="Print Professional Statement"
                        >
                            <Printer className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={!statementResult}
                            className="p-3 border-2 rounded-xl hover:bg-slate-50 transition-all text-slate-600 disabled:opacity-30"
                            title="Download PDF"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => generateMutation.mutate()}
                            disabled={!selectedLedgerId || generateMutation.isPending}
                            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                        >
                            {generateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                            Generate Statement
                        </button>
                    </div>
                </div>
            </div>

            {statementResult && selectedLedger && (
                <div className="bg-white text-black p-8 rounded-2xl shadow-xl border printable-area max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-4 border-primary pb-6 mb-8">
                        <div>
                            <div className="flex items-center gap-4 mb-4">
                                <img src="/qix_logo.png" alt="Qix Ads" className="h-14 w-auto" />
                                <div className="h-10 w-[2px] bg-gray-200"></div>
                                <div className="text-xs font-black text-primary bg-primary/5 px-2 py-1 rounded tracking-tighter uppercase">Professional Account Statement</div>
                            </div>
                            <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Unified Statement</h2>
                            <p className="text-xl font-bold text-gray-600 mt-1 uppercase tracking-tight">{selectedLedger.ledger_name}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Report Period</p>
                            <p className="font-bold">{format(new Date(dateRange.start), 'dd MMM yyyy')} — {format(new Date(dateRange.end), 'dd MMM yyyy')}</p>
                            <p className="text-xs text-gray-500">Account Type: {selectedLedger.entity_type}</p>
                        </div>
                    </div>

                    {/* Opening Balance Bar */}
                    <div className="bg-slate-900 text-white p-4 rounded-xl mb-6 flex justify-between items-center px-8">
                        <span className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Opening Balance</span>
                        <span className="text-xl font-black">{formatCurrency(statementResult.openingBalance)}</span>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-500 uppercase text-[9px] font-black tracking-widest">
                                    <th className="px-6 py-4 rounded-tl-lg">Date</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">Ref/Type</th>
                                    <th className="px-6 py-4 text-right">Income (+)</th>
                                    <th className="px-6 py-4 text-right">Expense (-)</th>
                                    <th className="px-6 py-4 text-right rounded-tr-lg">Running Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {statementResult.transactions.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold italic">No financial movements recorded for this period.</td></tr>
                                ) : (
                                    statementResult.transactions.map((tx: any) => {
                                        const isIncome = tx.transaction_type === 'INCOME';
                                        return (
                                            <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-5 whitespace-nowrap font-bold text-slate-400">{format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                                                <td className="px-6 py-5">
                                                    <div className="font-black text-slate-800 group-hover:text-primary transition-colors">{tx.description}</div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        {tx.category && <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-black">{tx.category}</span>}
                                                        {tx.isLegacy && <span className="text-[8px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-black uppercase">Legacy</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-slate-400 font-mono text-[10px] uppercase">{tx.reference || tx.sub_type || '-'}</td>
                                                <td className={`px-6 py-5 text-right font-mono font-black ${isIncome ? 'text-emerald-600' : 'text-slate-200'}`}>
                                                    {isIncome ? formatCurrency(tx.amount) : '—'}
                                                </td>
                                                <td className={`px-6 py-5 text-right font-mono font-black ${!isIncome ? 'text-rose-600' : 'text-slate-200'}`}>
                                                    {!isIncome ? formatCurrency(tx.amount) : '—'}
                                                </td>
                                                <td className="px-6 py-5 text-right font-mono font-black text-slate-900 bg-slate-50/30">
                                                    {formatCurrency(tx.running_balance)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Boxes */}
                    <div className="mt-12 grid grid-cols-4 gap-4">
                         <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                             <div className="flex items-center gap-2 text-slate-400 mb-2">
                                 <Calculator className="w-4 h-4" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Opening</span>
                             </div>
                             <p className="text-xl font-black text-slate-800">{formatCurrency(statementResult.openingBalance)}</p>
                         </div>
                         <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100">
                             <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                 <TrendingUp className="w-4 h-4" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Total Income</span>
                             </div>
                             <p className="text-xl font-black text-emerald-700">{formatCurrency(statementResult.totalIncome)}</p>
                         </div>
                         <div className="bg-rose-50 p-6 rounded-2xl border-2 border-rose-100">
                             <div className="flex items-center gap-2 text-rose-600 mb-2">
                                 <TrendingDown className="w-4 h-4" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Total Expense</span>
                             </div>
                             <p className="text-xl font-black text-rose-700">{formatCurrency(statementResult.totalExpense)}</p>
                         </div>
                         <div className="bg-primary p-6 rounded-2xl shadow-xl shadow-primary/20 text-white">
                             <div className="flex items-center gap-2 text-white/60 mb-2">
                                 <Wallet className="w-4 h-4" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Closing Balance</span>
                             </div>
                             <p className="text-xl font-black">{formatCurrency(statementResult.closingBalance)}</p>
                         </div>
                    </div>
                </div>
            )}

            {/* Hidden Printable Template */}
            <div className="hidden">
                <div style={{ position: 'absolute', top: '-10000px' }}>
                    {statementResult && (
                        <StatementTemplate
                            ref={statementPrintRef}
                            transactions={statementResult.transactions}
                            clientName={selectedLedger?.ledger_name}
                            startDate={new Date(dateRange.start)}
                            endDate={new Date(dateRange.end)}
                            openingBalance={statementResult.openingBalance}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default UnifiedLedgerStatement;
