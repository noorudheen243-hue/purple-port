import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from '../../components/ui/dialog';
import { Eye, Printer, Share2, Download, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import InvoiceTemplate from '../../components/finance/InvoiceTemplate';
import StatementTemplate from '../../components/finance/StatementTemplate'; // NEW
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const ClientAccountsPage = () => {
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null); // For Invoice
    const statementPrintRef = useRef<HTMLDivElement>(null); // For Statement

    const handlePrintStatement = () => {
        if (statementPrintRef.current) {
            const content = statementPrintRef.current.innerHTML;
            const printWindow = window.open('', '', 'height=800,width=800');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Statement</title>');
                printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>'); // Quick style inject
                printWindow.document.write('</head><body >');
                printWindow.document.write(content);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => printWindow.print(), 1000); // Increased timeout for images
            }
        }
    };

    const [searchParams] = useSearchParams();
    const entityId = searchParams.get('entity_id');

    // Fetch Transactions (Backend automatically filters for the logged-in Client)
    const { data: transactions = [], isLoading: loadingTx } = useQuery({
        queryKey: ['client-transactions', entityId],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: '50' });
            if (entityId) params.append('client_id', entityId);

            const { data } = await api.get(`/accounting/transactions?${params.toString()}`);
            return data;
        }
    });

    const { data: invoices = [], isLoading: loadingInv } = useQuery({
        queryKey: ['client-invoices'],
        queryFn: async () => {
            // Fetch from new Billing Module
            const { data } = await api.get('/billing/invoices');
            return data;
        }
    });

    const isLoading = loadingTx || loadingInv;

    const handlePrint = () => {
        if (printRef.current) {
            const content = printRef.current.innerHTML;
            const printWindow = window.open('', '', 'height=600,width=800');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Print Invoice</title>');
                printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>'); // Quick style inject
                printWindow.document.write('</head><body >');
                printWindow.document.write(content);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => printWindow.print(), 500);
            }
        }
    };

    const handleDownloadPDF = async () => {
        if (printRef.current) {
            const canvas = await html2canvas(printRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice_${selectedInvoice.invoice_number}.pdf`);
        }
    };

    const handleShare = (invoice: any) => {
        const text = `Here is your invoice ${invoice.invoice_number || invoice.reference} for Amount ${formatCurrency(invoice.net_payable || invoice.amount)}.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (isLoading) return <div className="p-8 text-center">Loading account details...</div>;

    // Recent Activity (All transactions)
    const recentActivity = transactions;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">My Accounts</h1>
            <p className="text-muted-foreground">View your invoices and payment history.</p>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Transaction History</TabsTrigger>
                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Transaction History</CardTitle>
                            <Button variant="outline" size="sm" onClick={handlePrintStatement}>
                                <Printer className="h-4 w-4 mr-2" /> Print Statement
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold uppercase">Date</th>
                                            <th className="px-6 py-3 font-semibold uppercase">Description</th>
                                            <th className="px-6 py-3 font-semibold uppercase text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {recentActivity.length === 0 ? (
                                            <tr><td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">No recent activity found.</td></tr>
                                        ) : recentActivity.map((tx: any) => (
                                            <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">{format(new Date(tx.date), 'dd MMM yyyy')}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium">{tx.description}</div>
                                                    {tx.reference && <div className="text-xs text-muted-foreground">Ref: {tx.reference}</div>}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono font-bold ${['PAYMENT', 'RECEIPT'].includes(tx.type) ? 'text-green-600' : ''}`}>
                                                    {formatCurrency(tx.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Hidden Printable Template */}
                            <div className="hidden">
                                <StatementTemplate
                                    ref={statementPrintRef}
                                    transactions={recentActivity}
                                    clientName="Client Account" // TODO: Fetch client name context if available
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invoices">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Invoices</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold uppercase">Date</th>
                                            <th className="px-6 py-3 font-semibold uppercase">Invoice #</th>
                                            <th className="px-6 py-3 font-semibold uppercase">Amount</th>
                                            <th className="px-6 py-3 font-semibold uppercase">Status</th>
                                            <th className="px-6 py-3 font-semibold uppercase text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {invoices.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No invoices generated yet.</td></tr>
                                        ) : invoices.map((inv: any) => (
                                            <tr key={inv.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">{format(new Date(inv.invoice_date || inv.date), 'dd MMM yyyy')}</td>
                                                <td className="px-6 py-4 font-mono font-medium">{inv.invoice_number || inv.reference}</td>
                                                <td className="px-6 py-4 font-mono font-bold">{formatCurrency(inv.net_payable || inv.amount)}</td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className={inv.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}>
                                                        {inv.status || 'PENDING'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(inv)}>
                                                                    <Eye className="h-4 w-4 mr-2" /> View
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                                                {selectedInvoice && (
                                                                    <div className="space-y-4">
                                                                        <div className="flex justify-end gap-2 border-b pb-4">
                                                                            <Button variant="outline" size="sm" onClick={handlePrint}>
                                                                                <Printer className="h-4 w-4 mr-2" /> Print
                                                                            </Button>
                                                                            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                                                                                <Download className="h-4 w-4 mr-2" /> Download PDF
                                                                            </Button>
                                                                        </div>
                                                                        <div className="border p-1 bg-gray-50 flex justify-center">
                                                                            <div className="scale-90 origin-top">
                                                                                <InvoiceTemplate ref={printRef} data={selectedInvoice} />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </DialogContent>
                                                        </Dialog>

                                                        <Button variant="ghost" size="sm" onClick={() => handleShare(inv)}>
                                                            <Share2 className="h-4 w-4 mr-2" /> Share
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ClientAccountsPage;
