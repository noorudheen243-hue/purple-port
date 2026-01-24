import React, { forwardRef } from 'react';

interface InvoiceItem {
    sl_no: number;
    particulars: string;
    description?: string;
    quantity: number;
    rate: number;
    amount: number;
}

interface InvoiceData {
    invoice_number: string;
    invoice_date: string | Date;
    due_date: string | Date;
    client_name: string;
    items: InvoiceItem[];
    sub_total: number;
    additions_total: number;
    additions_desc?: string;
    deductions_total: number;
    deductions_desc?: string;
    net_payable: number;
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, { data: InvoiceData }>(({ data }, ref) => {
    const formatDate = (d: string | Date) => new Date(d).toLocaleDateString('en-GB');

    return (
        <div
            ref={ref}
            className="invoice-template bg-white text-black font-sans mx-auto min-h-[297mm] flex flex-col justify-between p-8 print:p-0 relative"
            style={{ width: '100%', maxWidth: '210mm' }}
        >
            {/* Top Content Group */}
            <div>
                {/* Header: Logo (Left) vs Address (Right) */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        {/* Logo Placeholder - User provided image implies a purple Qix logo */}
                        <img src="/qix_logo.png" alt="Qix Ads" className="h-16 object-contain mb-2" />
                    </div>
                    <div className="text-right text-xs text-gray-600 leading-tight font-medium tracking-wide">
                        {/* Company Name removed, Address Only */}
                        <p>2nd floor City Center Complex, Pattambi Rd,</p>
                        <p>Perinthalmanna, Kerala 679322</p>
                        <p className="mt-1">Phone: 9947 381381</p>
                        <p>Email: qixmediasol@gmail.com | Web: www.qixads.com</p>
                    </div>
                </div>

                {/* Main Heading */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-[0.2em] border-b-2 border-gray-200 pb-2 inline-block">INVOICE</h1>
                </div>

                {/* Bill To & Invoice Details */}
                <div className="flex justify-between items-start mb-8">
                    <div className="w-1/2">
                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Invoice To:</h3>
                        <p className="text-xl font-bold text-gray-800">{data.client_name}</p>
                        {/* Address would go here if available in data */}
                    </div>

                    <div className="w-1/2 text-right space-y-2">
                        <div className="flex justify-end gap-4">
                            <span className="text-sm font-bold text-gray-500 uppercase min-w-24">Invoice No:</span>
                            <span className="font-mono font-bold text-gray-900">{data.invoice_number}</span>
                        </div>
                        <div className="flex justify-end gap-4">
                            <span className="text-sm font-bold text-gray-500 uppercase min-w-24">Date:</span>
                            <span className="font-mono font-medium">{formatDate(data.invoice_date)}</span>
                        </div>
                        <div className="flex justify-end gap-4">
                            <span className="text-sm font-bold text-gray-500 uppercase min-w-24">Due Date:</span>
                            <span className="font-mono font-medium">{formatDate(data.due_date)}</span>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="mb-8">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-purple-900 text-white">
                                <th className="p-3 text-sm font-bold w-16 text-center border-r border-purple-800">SL.</th>
                                <th className="p-3 text-sm font-bold border-r border-purple-800">PARTICULARS</th>
                                <th className="p-3 text-sm font-bold w-20 text-center border-r border-purple-800">QTY</th>
                                <th className="p-3 text-sm font-bold w-32 text-right border-r border-purple-800">RATE</th>
                                <th className="p-3 text-sm font-bold w-36 text-right">AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {data.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-3 text-center align-top text-gray-600 border-r">{String(item.sl_no).padStart(2, '0')}</td>
                                    <td className="p-3 align-top border-r">
                                        <p className="font-semibold text-gray-800">{item.particulars}</p>
                                        {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                                    </td>
                                    <td className="p-3 text-center align-top text-gray-600 border-r">{item.quantity}</td>
                                    <td className="p-3 text-right align-top text-gray-600 border-r">{item.rate.toFixed(2)}</td>
                                    <td className="p-3 text-right align-top font-bold text-gray-900">{item.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Calculation Section */}
                <div className="flex justify-end mb-12 page-break-inside-avoid">
                    <div className="w-2/5 min-w-[300px] space-y-3">
                        <div className="flex justify-between text-sm text-gray-600 px-2">
                            <span>Sub Total</span>
                            <span className="font-medium">{data.sub_total.toFixed(2)}</span>
                        </div>

                        {data.additions_total > 0 && (
                            <div className="flex justify-between text-sm text-gray-600 px-2">
                                <span>Additions {data.additions_desc ? `(${data.additions_desc})` : ''}</span>
                                <span className="font-medium text-green-600">+ {data.additions_total.toFixed(2)}</span>
                            </div>
                        )}

                        {data.deductions_total > 0 && (
                            <div className="flex justify-between text-sm text-gray-600 px-2">
                                <span>Deductions {data.deductions_desc ? `(${data.deductions_desc})` : ''}</span>
                                <span className="font-medium text-red-600">- {data.deductions_total.toFixed(2)}</span>
                            </div>
                        )}

                        {/* Net Payable - Optimized for print/pdf no overlap */}
                        <div className="mt-4 flex justify-between items-center border-t-2 border-purple-900 pt-2">
                            <span className="text-sm font-bold text-purple-900 uppercase tracking-wider whitespace-nowrap">Net Amount to Pay</span>
                            <span className="text-xl font-bold text-purple-900 font-mono whitespace-nowrap ml-4">
                                {'\u20B9'} {data.net_payable.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer - Pushed to bottom via flex-col justify-between */}
            <div className="border-t-2 border-gray-200 pt-6 mt-8 flex justify-between items-end page-break-inside-avoid">
                {/* Left: Payment Details */}
                <div className="text-sm text-gray-700 space-y-1.5 flex-1">
                    <h4 className="font-bold text-gray-900 uppercase mb-2 text-xs tracking-wider">Payment Details</h4>
                    <p><span className="font-medium">Account Name:</span> Qix Media Solution Advertisement</p>
                    <p><span className="font-medium">Account No:</span> <span className="font-mono tracking-wide">120001381353</span></p>
                    <p><span className="font-medium">Bank:</span> Canara Bank | <span className="font-medium">IFSC:</span> <span className="font-mono">CNRB0000757</span></p>
                    <div className="flex gap-4 mt-2">
                        <p><span className="font-medium">GPay:</span> 9947381381</p>
                        <p><span className="font-medium">UPI:</span> 9947381381@apl</p>
                    </div>
                </div>

                {/* Right: Signature */}
                <div className="text-center w-48">
                    <div className="h-20 mb-2 flex items-center justify-center relative">
                        {/* Interactive or printable Seal area */}
                        <div className="w-20 h-20 border-2 border-purple-200 rounded-full flex items-center justify-center opacity-40 absolute top-0 left-1/2 transform -translate-x-1/2">
                            <span className="text-[0.6rem] text-purple-900 font-bold text-center leading-tight uppercase">Qix Media<br />Seal</span>
                        </div>
                    </div>
                    <p className="font-bold text-gray-900 text-sm uppercase border-t border-gray-400 pt-2">Accounts Manager</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Authorized Signatory</p>
                </div>
            </div>
        </div>
    );
});

export default InvoiceTemplate;
