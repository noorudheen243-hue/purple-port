import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { Calendar as CalendarIcon, FileText, Download, Printer, Mail, Users, Share2, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import Swal from 'sweetalert2';

import { useSearchParams } from 'react-router-dom';

const AccountStatement = () => {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'client' | 'staff' | 'other'>(
        (searchParams.get('type') as any) || 'client'
    );
    const [selectedLedger, setSelectedLedger] = useState<any>('');
    const [selectedEntityId, setSelectedEntityId] = useState(searchParams.get('entity_id') || '');
    const [dateRange, setDateRange] = useState({ 
        start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-01'), 
        end: format(new Date(), 'yyyy-MM-dd') 
    });
    const [statementData, setStatementData] = useState<any>(null);

    // Fetch All Ledgers
    const { data: ledgers, isLoading: isLoadingLedgers } = useQuery({
        queryKey: ['ledgers'],
        queryFn: async () => (await api.get('/accounting/ledgers')).data
    });

    // Fetch Clients
    const { data: clients } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => (await api.get('/clients')).data,
        enabled: activeTab === 'client'
    });

    // Fetch Staff (Users)
    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: async () => (await api.get('/users')).data,
        enabled: activeTab === 'staff'
    });

    // Resolve Ledger when Entity changes
    React.useEffect(() => {
        if (!ledgers || ledgers.length === 0) return;

        if (activeTab === 'client' && selectedEntityId) {
            const client = (clients as any[])?.find(c => c.id === selectedEntityId);
            const clientWords = client?.name.toLowerCase().split(' ').filter((w: string) => w.length > 2) || [];
            
            const matches = ledgers.filter((l: any) => 
                (l.entity_id === selectedEntityId) ||
                (client && clientWords.some((word: string) => l.name.toLowerCase().includes(word)))
            );
            
            if (matches.length > 0) {
                setSelectedLedger(matches.map((m: any) => m.id));
            } else {
                setSelectedLedger('');
            }
        } else if (activeTab === 'staff' && selectedEntityId) {
            const found = ledgers.find((l: any) => l.entity_id === selectedEntityId && l.entity_type === 'USER');
            if (found) setSelectedLedger(found.id);
            else setSelectedLedger('');
        }
    }, [selectedEntityId, ledgers, activeTab, clients]);

    // Auto-select from URL params
    React.useEffect(() => {
        if (ledgers) {
            const typeParam = searchParams.get('type');
            if (typeParam) setActiveTab(typeParam as any);

            const ledgerIdParam = searchParams.get('ledger_id');
            const entityIdParam = searchParams.get('entity_id');
            const entityTypeParam = searchParams.get('entity_type');

            if (ledgerIdParam) {
                setSelectedLedger(ledgerIdParam);
            } else if (entityIdParam) {
                setSelectedEntityId(entityIdParam);
            }
        }
    }, [ledgers, searchParams]);

    // Fetch Statement
    const generateMutation = useMutation({
        mutationFn: async () => {
            return api.post('/accounting/reports/statement', {
                ledger_id: selectedLedger,
                start_date: dateRange.start,
                end_date: dateRange.end
            });
        },
        onSuccess: (res) => {
            setStatementData(res.data);
        },
        onError: (err: any) => alert("Failed to generate: " + err.message)
    });

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = (share = false) => {
        if (!statementData) return;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. LETTERHEAD
        // Logo
        doc.addImage('/qix_logo.png', 'PNG', 14, 10, 30, 15);
        
        // Company Info
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("QIX ADS", 14, 32);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text("2nd Floor City Center Complex, Pattambi Rd,", 14, 37);
        doc.text("Perinthalmanna, Kerala 679322", 14, 41);
        doc.text("Contact: +91 98765 43210 | www.qixads.com", 14, 45);

        // 2. DOCUMENT TITLE
        doc.setDrawColor(49, 46, 129); // Purple
        doc.setLineWidth(0.5);
        doc.line(14, 48, pageWidth - 14, 48);
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        const title = activeTab === 'staff' ? "SALARY STATEMENT" : "ACCOUNT STATEMENT";
        doc.text(title, pageWidth / 2, 58, { align: 'center' });

        // 3. STATEMENT INFO
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("Statement For:", 14, 70);
        doc.setFont('helvetica', 'normal');
        const ledgerLabel = statementData.all_ledgers ? statementData.all_ledgers.join(', ') : `${statementData.ledger.name} (${statementData.ledger.head.name})`;
        doc.text(ledgerLabel, 45, 70, { maxWidth: pageWidth - 60 });
        
        doc.setFont('helvetica', 'bold');
        doc.text("Period:", 14, 82);
        doc.setFont('helvetica', 'normal');
        doc.text(`${format(new Date(statementData.period.start), 'dd MMM yyyy')} to ${format(new Date(statementData.period.end), 'dd MMM yyyy')}`, 45, 82);

        // 4. SUMMARY BOX
        doc.setFillColor(248, 250, 252);
        doc.rect(14, 82, pageWidth - 28, 15, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("Opening Balance:", 20, 91);
        doc.setFont('helvetica', 'normal');
        doc.text(formatCurrency(statementData.opening_balance), 50, 91);
        
        doc.setFont('helvetica', 'bold');
        doc.text("Closing Balance:", pageWidth - 80, 91);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(49, 46, 129);
        doc.text(formatCurrency(statementData.closing_balance), pageWidth - 45, 91);
        doc.setTextColor(0);

        // 5. TRANSACTIONS TABLE
        const tableColumn = ["Date", "Description", "Ref", "Charges / Dr", "Payments / Cr", "Balance"];
        const tableRows = statementData.transactions.map((tx: any) => [
            format(new Date(tx.date), 'dd/MM/yyyy'),
            `${tx.description}${tx.ledger_name ? `\n[${tx.ledger_name}]` : ''}`,
            tx.reference || '-',
            tx.debit > 0 ? formatCurrency(tx.debit) : '-',
            tx.credit > 0 ? formatCurrency(tx.credit) : '-',
            formatCurrency(tx.balance)
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 110,
            theme: 'striped',
            headStyles: { fillColor: [49, 46, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                3: { halign: 'right' },
                4: { halign: 'right' },
                5: { halign: 'right', fontStyle: 'bold' }
            },
            styles: { fontSize: 8 }
        });

        const fileName = `Statement_${statementData.ledger.name}_${format(new Date(), 'yyyyMMdd')}.pdf`;

        if (share && navigator.share) {
            const pdfBlob = doc.output('blob');
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
            
            navigator.share({
                files: [file],
                title: 'Account Statement',
                text: `Attached is the account statement for ${statementData.ledger.name}`
            }).catch(err => console.log('Share failed', err));
        } else {
            doc.save(fileName);
        }
    };

    const handleSharePDF = () => {
        if (!navigator.share) {
            Swal.fire({
                title: 'Share Not Supported',
                text: 'Your browser does not support direct sharing. Please download the PDF and share it manually.',
                icon: 'info'
            });
            return;
        }
        handleDownloadPDF(true);
    };

    const handleEmail = () => {
        Swal.fire("Feature coming soon", "Direct email dispatch is under development.", "info");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h1 className="text-2xl font-bold tracking-tight">Statement Generator</h1>
            </div>

            {/* TAB SWITCHER */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit no-print">
                {[
                    { id: 'client', label: 'Client statements', icon: <Users className="w-4 h-4" /> },
                    { id: 'staff', label: 'Staff Statements', icon: <Users className="w-4 h-4 text-orange-500" /> },
                    { id: 'other', label: 'Other statements', icon: <FileText className="w-4 h-4 text-purple-500" /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id as any);
                            setSelectedEntityId('');
                            setSelectedLedger('');
                            setStatementData(null);
                        }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === tab.id 
                                ? 'bg-white text-primary shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Selection Form */}
            <div className="bg-card p-6 rounded-xl border space-y-4 no-print shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* ENTITY SELECTION */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                            {activeTab === 'client' ? 'Select Client' : activeTab === 'staff' ? 'Select Staff Name' : 'Select Ledger Account'}
                        </label>
                        
                        {activeTab === 'client' && (
                            <select
                                className="w-full bg-background border-2 rounded-lg px-4 py-2.5 focus:border-primary transition-colors outline-none"
                                value={selectedEntityId}
                                onChange={(e) => setSelectedEntityId(e.target.value)}
                            >
                                <option value="">Choose Client...</option>
                                {clients?.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.client_code})</option>
                                ))}
                            </select>
                        )}

                        {activeTab === 'staff' && (
                            <select
                                className="w-full bg-background border-2 rounded-lg px-4 py-2.5 focus:border-primary transition-colors outline-none"
                                value={selectedEntityId}
                                onChange={(e) => setSelectedEntityId(e.target.value)}
                            >
                                <option value="">Choose Staff Member...</option>
                                {users?.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                                ))}
                            </select>
                        )}

                        {activeTab === 'other' && (
                            <select
                                className="w-full bg-background border-2 rounded-lg px-4 py-2.5 focus:border-primary transition-colors outline-none"
                                value={selectedLedger}
                                onChange={(e) => setSelectedLedger(e.target.value)}
                            >
                                <option value="">Choose Account...</option>
                                {ledgers?.filter((l: any) => !['CLIENT', 'USER'].includes(l.entity_type)).map((l: any) => (
                                    <option key={l.id} value={l.id}>{l.name} ({l.head.name})</option>
                                ))}
                            </select>
                        )}
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
                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => generateMutation.mutate()}
                        disabled={!selectedLedger || (Array.isArray(selectedLedger) && selectedLedger.length === 0) || !dateRange.start || !dateRange.end || generateMutation.isPending}
                        className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
                    >
                        {generateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                        {generateMutation.isPending ? "Generating..." : "Generate Statement"}
                    </button>
                </div>
            </div>

            {/* Statement View */}
            {statementData && (
                <div className="bg-white text-black p-8 rounded-lg shadow-lg border printable-area">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b pb-6 mb-6">
                        <div>
                            <img src="/qix_logo.png" alt="Qix Ads" className="h-12 w-auto mb-4" />
                            <h2 className="text-3xl font-bold text-gray-900">Statement of Account</h2>
                            <p className="text-gray-600 mt-1">{statementData.ledger.name} <span className="text-sm text-gray-400 ml-2">({statementData.ledger.head.name})</span></p>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                            <p><strong>Generated on:</strong> {format(new Date(), 'PPpp')}</p>
                            <p><strong>Period:</strong> {format(new Date(statementData.period.start), 'PP')} - {format(new Date(statementData.period.end), 'PP')}</p>
                        </div>
                    </div>

                    {/* Action Buttons (Hidden in Print) */}
                    <div className="flex justify-end gap-3 mb-6 no-print">
                        <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-semibold transition-colors">
                            <Printer className="w-4 h-4" /> Print
                        </button>
                        <button onClick={() => handleDownloadPDF(false)} className="flex items-center gap-2 px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-semibold transition-colors">
                            <Download className="w-4 h-4" /> Download PDF
                        </button>
                        <button onClick={handleSharePDF} className="flex items-center gap-2 px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-semibold transition-colors text-indigo-600">
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 p-6 rounded-xl mb-6 flex justify-between items-center border border-gray-100">
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Opening Balance</span>
                            <p className="text-xl font-mono font-bold text-gray-700">{formatCurrency(statementData.opening_balance)}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Closing Balance</span>
                            <p className="text-3xl font-mono font-black text-primary">{formatCurrency(statementData.closing_balance)}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-gray-700 uppercase text-[10px] font-black tracking-widest border-y-2 border-gray-200">
                                    <th className="px-4 py-4">Date</th>
                                    <th className="px-4 py-4">Description</th>
                                    <th className="px-4 py-4">Ref</th>
                                    <th className="px-4 py-4 text-right">Income</th>
                                    <th className="px-4 py-4 text-right">Expense</th>
                                    <th className="px-4 py-4 text-right text-gray-900 bg-gray-200/50">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {statementData.transactions.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 font-medium">No transactions found in this period.</td></tr>
                                ) : (
                                    statementData.transactions.map((tx: any) => (
                                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap font-medium">{format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                                            <td className="px-4 py-4">
                                                <div className="font-semibold text-gray-800">{tx.description}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                    {tx.ledger_name || tx.type}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-gray-500 font-mono text-xs">{tx.reference || '-'}</td>
                                            <td className="px-4 py-4 text-right font-mono font-bold text-emerald-600">
                                                {tx.credit ? formatCurrency(tx.credit) : '-'}
                                            </td>
                                            <td className="px-4 py-4 text-right font-mono font-bold text-rose-600">
                                                {tx.debit ? formatCurrency(tx.debit) : '-'}
                                            </td>
                                            <td className="px-4 py-4 text-right font-mono font-black text-gray-900 bg-gray-50/30">
                                                {formatCurrency(tx.balance)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t text-center text-xs text-gray-400">
                        <p>Generated by Qix Ads ERP System</p>
                    </div>
                </div>
            )}

            {/* Print Styles */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .printable-area { 
                        position: absolute; 
                        top: 0; 
                        left: 0; 
                        width: 100%; 
                        height: 100%; 
                        margin: 0; 
                        padding: 20px;
                        border: none;
                        box-shadow: none;
                    }
                    body { background: white; }
                }
            `}</style>
        </div>
    );
};

export default AccountStatement;
