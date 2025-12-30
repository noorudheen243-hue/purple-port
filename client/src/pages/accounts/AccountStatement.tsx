import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { Calendar as CalendarIcon, FileText, Download, Printer, Mail } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format'; // Assume formatDate exists or import date-fns
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const AccountStatement = () => {
    const [selectedLedger, setSelectedLedger] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [statementData, setStatementData] = useState<any>(null);

    // Fetch Ledgers
    const { data: ledgers, isLoading: isLoadingLedgers } = useQuery({
        queryKey: ['ledgers'],
        queryFn: async () => (await api.get('/accounting/ledgers')).data
    });

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

    const handleDownloadPDF = () => {
        if (!statementData) return;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Account Statement", 14, 22);

        doc.setFontSize(11);
        doc.text(`Account: ${statementData.ledger.name} (${statementData.ledger.head.name})`, 14, 32);
        doc.text(`Period: ${format(new Date(statementData.period.start), 'dd MMM yyyy')} to ${format(new Date(statementData.period.end), 'dd MMM yyyy')}`, 14, 38);
        doc.text(`Opening Balance: ${formatCurrency(statementData.opening_balance)}`, 14, 44);

        const tableColumn = ["Date", "Description", "Ref", "Type", "Debit", "Credit", "Balance"];
        const tableRows: any[] = [];

        statementData.transactions.forEach((tx: any) => {
            const txData = [
                format(new Date(tx.date), 'dd/MM/yyyy'),
                tx.description,
                tx.reference || '-',
                tx.type,
                tx.debit ? formatCurrency(tx.debit) : '-',
                tx.credit ? formatCurrency(tx.credit) : '-',
                formatCurrency(tx.balance)
            ];
            tableRows.push(txData);
        });

        // Add Closing Row
        tableRows.push(['', 'Closing Balance', '', '', '', '', formatCurrency(statementData.closing_balance)]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 50,
        });

        doc.save(`Statement_${statementData.ledger.name}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    };

    const handleEmail = () => {
        alert("Email functionality is not configured yet.");
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight no-print">Account Statement Generator</h1>

            {/* Selection Form */}
            <div className="bg-card p-6 rounded-lg border space-y-4 no-print shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Account</label>
                        <select
                            className="w-full bg-background border rounded-md px-3 py-2"
                            value={selectedLedger}
                            onChange={(e) => setSelectedLedger(e.target.value)}
                        >
                            <option value="">Choose Ledger...</option>
                            {ledgers?.map((l: any) => (
                                <option key={l.id} value={l.id}>{l.name} ({l.head.name})</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">From Date</label>
                        <input
                            type="date"
                            className="w-full bg-background border rounded-md px-3 py-2"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">To Date</label>
                        <input
                            type="date"
                            className="w-full bg-background border rounded-md px-3 py-2"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={() => generateMutation.mutate()}
                        disabled={!selectedLedger || !dateRange.start || !dateRange.end || generateMutation.isPending}
                        className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" /> {generateMutation.isPending ? "Generating..." : "Generate Statement"}
                    </button>
                </div>
            </div>

            {/* Statement View */}
            {statementData && (
                <div className="bg-white text-black p-8 rounded-lg shadow-lg border printable-area">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b pb-6 mb-6">
                        <div>
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
                        <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 border rounded hover:bg-gray-50 text-sm">
                            <Printer className="w-4 h-4" /> Print
                        </button>
                        <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-3 py-1.5 border rounded hover:bg-gray-50 text-sm">
                            <Download className="w-4 h-4" /> Download PDF
                        </button>
                        <button onClick={handleEmail} className="flex items-center gap-2 px-3 py-1.5 border rounded hover:bg-gray-50 text-sm">
                            <Mail className="w-4 h-4" /> Email
                        </button>
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 p-4 rounded mb-6 flex justify-between items-center">
                        <div>
                            <span className="text-sm text-gray-500 uppercase tracking-wider">Opening Balance</span>
                            <p className="text-lg font-mono font-medium">{formatCurrency(statementData.opening_balance)}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-gray-500 uppercase tracking-wider">Closing Balance</span>
                            <p className="text-2xl font-mono font-bold text-primary">{formatCurrency(statementData.closing_balance)}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3">Ref</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3 text-right">Debit</th>
                                    <th className="px-4 py-3 text-right">Credit</th>
                                    <th className="px-4 py-3 text-right text-gray-900">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {statementData.transactions.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No transactions found in this period.</td></tr>
                                ) : (
                                    statementData.transactions.map((tx: any) => (
                                        <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap">{format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                                            <td className="px-4 py-3">{tx.description}</td>
                                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{tx.reference || '-'}</td>
                                            <td className="px-4 py-3 text-xs uppercase badge">{tx.type}</td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-600">
                                                {tx.debit ? formatCurrency(tx.debit) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-600">
                                                {tx.credit ? formatCurrency(tx.credit) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-medium">
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
