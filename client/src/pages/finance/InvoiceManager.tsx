import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Eye, Printer, Share2, Download, Lock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/format';
import InvoiceTemplate from '../../components/finance/InvoiceTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const InvoiceManager = () => {
    const queryClient = useQueryClient();
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
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
            // toast.success("Invoice Updated");
            alert("Invoice Updated Successfully");
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }
    });

    const handlePrint = () => {
        if (printRef.current) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Print Invoice</title>');

                // Copy all stylesheets
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

                // Also copy explicit style tags for Tailwind JIT / css-in-js
                const styles = document.getElementsByTagName('style');
                for (let i = 0; i < styles.length; i++) {
                    printWindow.document.write(styles[i].outerHTML);
                }

                // Ensure tailwind CDN as fallback if local styles fail
                printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');

                printWindow.document.write('</head><body class="bg-white">');
                printWindow.document.write(printRef.current.innerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();

                // Wait for resources to load
                setTimeout(() => {
                    printWindow.print();
                    // printWindow.close(); // Optional: Close after print
                }, 1000);
            }
        }
    };

    const handleDownloadPDF = async () => {
        if (printRef.current) {
            document.body.classList.add('pdf-mode');

            // 210mm x 297mm at 96 DPI is approx 794x1123 pixels
            // This forces the html2canvas engine to pretend the window is exactly A4 size
            const canvas = await html2canvas(printRef.current, {
                scale: 2, // higher res
                useCORS: true,
                logging: false,
                width: 794,
                height: 1123,
                windowWidth: 794
            });
            document.body.classList.remove('pdf-mode');

            const imgData = canvas.toDataURL('image/png');

            // a4 is 210x297 mm
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Since our canvas was captured at exact A4 ratio, it directly fits
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            pdf.save(`Invoice_${selectedInvoice.invoice_number}.pdf`);
        }
    };

    const handleShare = (invoice: any) => {
        const text = `Here is your invoice ${invoice.invoice_number} for Amount ${formatCurrency(invoice.net_payable)}.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
                                        <div className="flex justify-end gap-2">
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
                                                                <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
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

                                            <Button variant="ghost" size="icon" onClick={() => handleShare(inv)}>
                                                <Share2 className="h-4 w-4" />
                                            </Button>
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
