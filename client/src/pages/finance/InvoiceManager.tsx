import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Eye, Printer, Share2, Download, Lock, CheckCircle, Trash2, MessageCircle, Mail, FileDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/format';
import InvoiceTemplate from '../../components/finance/InvoiceTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const InvoiceManager = () => {
    const queryClient = useQueryClient();
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [shareInvoice, setShareInvoice] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const { data: invoices = [], isLoading } = useQuery({
        queryKey: ['invoices'],
        queryFn: async () => {
            const { data } = await api.get('/billing/invoices');
            return data;
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            return await api.patch(`/billing/invoices/${id}/status`, { status });
        },
        onSuccess: () => {
            alert("Invoice Updated Successfully");
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }
    });

    const deleteInvoiceMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.delete(`/billing/invoices/${id}`);
        },
        onSuccess: () => {
            alert("Invoice Deleted Successfully");
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.error || 'Failed to delete invoice.';
            alert(`Error: ${msg}`);
        }
    });

    const handleDelete = (inv: any) => {
        if (window.confirm(`Are you sure you want to delete invoice ${inv.invoice_number}? This action cannot be undone.`)) {
            deleteInvoiceMutation.mutate(inv.id);
        }
    };

    const handlePrint = () => {
        if (printRef.current) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Print Invoice</title>');
                const styleSheets = Array.from(document.styleSheets);
                styleSheets.forEach((styleSheet) => {
                    try {
                        if (styleSheet.href) {
                            printWindow.document.write(`<link rel="stylesheet" type="text/css" href="${styleSheet.href}">`);
                        } else if (styleSheet.cssRules) {
                            const rules = Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('');
                            printWindow.document.write(`<style>${rules}</style>`);
                        }
                    } catch (e) {
                        console.warn('Could not copy stylesheet', e);
                    }
                });
                const styles = document.getElementsByTagName('style');
                for (let i = 0; i < styles.length; i++) {
                    printWindow.document.write(styles[i].outerHTML);
                }
                printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                printWindow.document.write('</head><body class="bg-white">');
                printWindow.document.write(printRef.current.innerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => { printWindow.print(); }, 1000);
            }
        }
    };

    const handleDownloadPDF = async (invoice?: any) => {
        const target = invoice || selectedInvoice;
        if (!target) return;

        // If the dialog is not open (sharing from list), open it first
        if (!selectedInvoice || selectedInvoice.id !== target.id) {
            setSelectedInvoice(target);
            // Give time for the template to render then download
            setTimeout(() => doDownloadPDF(target), 600);
            return;
        }
        doDownloadPDF(target);
    };

    const doDownloadPDF = async (invoice: any) => {
        if (printRef.current) {
            document.body.classList.add('pdf-mode');
            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                width: 794,
                height: 1123,
                windowWidth: 794
            });
            document.body.classList.remove('pdf-mode');
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            pdf.save(`Invoice_${invoice.invoice_number}.pdf`);
        }
    };

    // Share handlers
    const handleShareWhatsApp = (inv: any) => {
        const text = `Dear Customer,\n\nPlease find your Invoice ${inv.invoice_number} for Amount ${formatCurrency(inv.net_payable)}.\n\nThank you for your business!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        setShareInvoice(null);
    };

    const handleShareWhatsAppBusiness = (inv: any) => {
        const text = `Dear Customer,\n\nPlease find your Invoice ${inv.invoice_number} for Amount ${formatCurrency(inv.net_payable)}.\n\nThank you for your business!`;
        // WhatsApp Business uses the same API endpoint; on mobile it routes to WA Business if installed
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
        setShareInvoice(null);
    };

    const handleShareEmail = (inv: any) => {
        const subject = `Invoice ${inv.invoice_number} from Qix Ads`;
        const body = `Dear Customer,\n\nPlease find your Invoice ${inv.invoice_number} for Amount ${formatCurrency(inv.net_payable)}.\n\nDue Date: ${format(new Date(inv.due_date || inv.invoice_date), 'dd MMM yyyy')}\n\nThank you for your business!\n\nRegards,\nQix Ads Team`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setShareInvoice(null);
    };

    const handleSharePDF = (inv: any) => {
        setShareInvoice(null);
        handleDownloadPDF(inv);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Generated Invoices</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">No invoices generated yet.</TableCell>
                                </TableRow>
                            ) : invoices.map((inv: any) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                                    <TableCell>{inv.client_name}</TableCell>
                                    <TableCell>{format(new Date(inv.invoice_date), 'dd MMM yyyy')}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={
                                            inv.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                inv.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-700'
                                        }>{inv.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(inv.net_payable)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 items-center">
                                            {inv.status === 'DRAFT' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => updateStatusMutation.mutate({ id: inv.id, status: 'SUBMITTED' })}
                                                    className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 h-8 px-2"
                                                >
                                                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Submit
                                                </Button>
                                            )}

                                            {/* View Dialog */}
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => setSelectedInvoice(inv)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                                    {selectedInvoice && (
                                                        <div className="space-y-4">
                                                            <div className="flex justify-end gap-2 border-b pb-4">
                                                                <Button variant="outline" size="sm" onClick={handlePrint}>
                                                                    <Printer className="h-4 w-4 mr-2" /> Print
                                                                </Button>
                                                                <Button variant="outline" size="sm" onClick={() => doDownloadPDF(selectedInvoice)}>
                                                                    <Download className="h-4 w-4 mr-2" /> Download PDF
                                                                </Button>
                                                                {selectedInvoice.status === 'DRAFT' && (
                                                                    <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: selectedInvoice.id, status: 'SUBMITTED' })}>
                                                                        <Lock className="h-4 w-4 mr-2" /> Submit & Lock
                                                                    </Button>
                                                                )}
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

                                            {/* Share Button with Dropdown */}
                                            <div className="relative">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setShareInvoice(shareInvoice?.id === inv.id ? null : inv)}
                                                    title="Share Invoice"
                                                >
                                                    <Share2 className="h-4 w-4" />
                                                </Button>

                                                {shareInvoice?.id === inv.id && (
                                                    <>
                                                        {/* Backdrop */}
                                                        <div
                                                            className="fixed inset-0 z-40"
                                                            onClick={() => setShareInvoice(null)}
                                                        />
                                                        {/* Dropdown */}
                                                        <div className="absolute right-0 mt-1 w-52 rounded-lg border bg-white shadow-lg z-50 py-1 overflow-hidden">
                                                            <div className="flex items-center justify-between px-3 py-2 border-b">
                                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Share Invoice</span>
                                                                <button onClick={() => setShareInvoice(null)} className="text-gray-400 hover:text-gray-600">
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>

                                                            <button
                                                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-green-50 hover:text-green-700 transition-colors"
                                                                onClick={() => handleShareWhatsApp(inv)}
                                                            >
                                                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-600 text-xs font-bold flex-shrink-0">WA</span>
                                                                <span>WhatsApp</span>
                                                            </button>

                                                            <button
                                                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-teal-50 hover:text-teal-700 transition-colors"
                                                                onClick={() => handleShareWhatsAppBusiness(inv)}
                                                            >
                                                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-100 text-teal-600 text-xs font-bold flex-shrink-0">WB</span>
                                                                <span>WhatsApp Business</span>
                                                            </button>

                                                            <button
                                                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                onClick={() => handleShareEmail(inv)}
                                                            >
                                                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
                                                                    <Mail className="h-3.5 w-3.5" />
                                                                </span>
                                                                <span>Email</span>
                                                            </button>

                                                            <button
                                                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-red-50 hover:text-red-700 transition-colors"
                                                                onClick={() => handleSharePDF(inv)}
                                                            >
                                                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600 flex-shrink-0">
                                                                    <FileDown className="h-3.5 w-3.5" />
                                                                </span>
                                                                <span>Download as PDF</span>
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Delete Button – only for DRAFT invoices */}
                                            {inv.status === 'DRAFT' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(inv)}
                                                    disabled={deleteInvoiceMutation.isPending}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    title="Delete Invoice"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default InvoiceManager;
