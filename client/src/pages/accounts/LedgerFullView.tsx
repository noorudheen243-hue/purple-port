import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Swal from 'sweetalert2';
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
    ArrowLeft,
    Pencil,
    Trash2,
    X,
    Loader2,
    History
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
    const queryClient = useQueryClient();

    // Edit State
    const [editingTransaction, setEditingTransaction] = useState<any>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editType, setEditType] = useState<'INCOME'|'EXPENSE'>('INCOME');

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

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.patch(`/accounting/unified/transactions/${editingTransaction.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['account-statement', id] });
            queryClient.invalidateQueries({ queryKey: ['unified-ledgers'] });
            setEditingTransaction(null);
            Swal.fire({ title: 'Updated', text: 'Transaction updated successfully', icon: 'success', background: '#f8fafc', customClass: { popup: 'rounded-[2rem]' } });
        },
        onError: (err: any) => Swal.fire('Error', err.response?.data?.message || err.message, 'error')
    });

    const deleteMutation = useMutation({
        mutationFn: (txId: string) => api.delete(`/accounting/unified/transactions/${txId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['account-statement', id] });
            queryClient.invalidateQueries({ queryKey: ['unified-ledgers'] });
            Swal.fire({ title: 'Deleted', text: 'Transaction removed from ledger', icon: 'success', background: '#f8fafc', customClass: { popup: 'rounded-[2rem]' } });
        },
        onError: (err: any) => Swal.fire('Error', err.response?.data?.message || err.message, 'error')
    });

    const handleDelete = (tx: any) => {
        Swal.fire({
            title: 'Delete Transaction?',
            text: `Are you sure you want to remove this ${formatCurrency(tx.amount)} transaction? Any linked balances will be reverted.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!',
            background: '#f8fafc',
            customClass: { popup: 'rounded-[2rem]' }
        }).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(tx.id);
            }
        });
    };

    const handleEdit = (tx: any) => {
        setEditingTransaction(tx);
        setEditAmount(tx.amount);
        setEditDescription(tx.description);
        setEditDate(new Date(tx.date).toISOString().split('T')[0]);
        setEditType(tx.transaction_type);
    };

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
                                <th className="px-10 py-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* Opening Row */}
                            <tr className="bg-slate-50/50">
                                <td className="px-10 py-5 font-bold text-slate-400 text-sm">{formatDate(startDate)}</td>
                                <td className="px-10 py-5 font-black text-purple-600 text-[10px] uppercase tracking-widest italic">Brought Forward (Opening Balance)</td>
                                <td colSpan={2}></td>
                                <td className="px-10 py-5 text-right font-black text-slate-900">{formatCurrency(statement?.openingBalance || 0)}</td>
                                <td className="px-10 py-5">
                                    {statement?.openingBalance !== 0 && (
                                        <div className="flex items-center justify-center">
                                            <button 
                                                onClick={() => setStartDate('2000-01-01')}
                                                className="text-[9px] font-black bg-purple-50 text-purple-500 px-3 py-1.5 rounded-full hover:bg-purple-600 hover:text-white transition-all uppercase tracking-widest flex items-center gap-1.5"
                                                title="Expand date range to see past transactions"
                                            >
                                                <History className="w-3 h-3" />
                                                View Past
                                            </button>
                                        </div>
                                    )}
                                </td>
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
                                    <td className="px-10 py-6">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => handleEdit(t)}
                                                className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-purple-100 hover:text-purple-600 transition-all"
                                                title="Edit Transaction"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(t)}
                                                className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-all"
                                                title="Delete Transaction"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
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

            {/* Edit Modal */}
            {editingTransaction && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="bg-purple-900 p-8 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">Modify Transaction</h2>
                                <p className="text-purple-300 text-xs mt-1 uppercase font-black tracking-widest">Updating: {editingTransaction.id.toString().split('-').pop()}</p>
                            </div>
                            <button onClick={() => setEditingTransaction(null)} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Type</label>
                                    <select
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-purple-500 outline-none transition-all font-bold text-slate-800"
                                        value={editType}
                                        onChange={(e) => setEditType(e.target.value as any)}
                                    >
                                        <option value="INCOME">Income (Credit)</option>
                                        <option value="EXPENSE">Expense (Debit)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Date</label>
                                    <input 
                                        type="date"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-purple-500 outline-none transition-all font-bold text-slate-800"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Amount</label>
                                <input 
                                    type="number"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-purple-500 outline-none transition-all font-bold text-slate-800"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Description</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-purple-500 outline-none transition-all font-medium text-slate-600 h-24"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="Transaction details..."
                                />
                            </div>
                            <button 
                                onClick={() => updateMutation.mutate({ 
                                    amount: parseFloat(editAmount), 
                                    description: editDescription,
                                    date: editDate,
                                    transaction_type: editType
                                })}
                                disabled={updateMutation.isPending || !editAmount || !editDescription || !editDate}
                                className="w-full bg-purple-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-100 disabled:opacity-50"
                            >
                                {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Apply Updates'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
