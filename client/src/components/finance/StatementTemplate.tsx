import React from 'react';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';

interface StatementTemplateProps {
    transactions: any[];
    clientName?: string;
    startDate?: Date;
    endDate?: Date;
}

// Forward Ref is needed for React-to-Print or manual printing logic
const StatementTemplate = React.forwardRef<HTMLDivElement, StatementTemplateProps>(({ transactions, clientName, startDate, endDate }, ref) => {

    const totalCredit = transactions.reduce((acc, tx) => tx.type === 'RECEIPT' || tx.type === 'INVOICE' ? acc : acc + tx.amount, 0); // Simplified logic, refine if needed based on Credit/Debit cols
    // Actually, let's keep it simple for the view requested: List of transactions.

    return (
        <div ref={ref} className="p-8 bg-white text-black font-sans max-w-[210mm] mx-auto min-h-[297mm]">
            {/* LETTERHEAD HEADER */}
            <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-8">
                <div className="flex items-center gap-4">
                    <img src="/qix_logo.png" alt="Qix Ads" className="h-16 w-auto object-contain" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Qix Ads</h1>
                        <p className="text-sm text-gray-600">Digital Marketing Agency</p>
                    </div>
                </div>
                <div className="text-right text-sm text-gray-600">
                    <p>123, Tech Plaza,</p>
                    <p>Cyber City, Hyderabad, 500081</p>
                    <p>+91 98765 43210 | contact@qixads.com</p>
                    <p>www.qixads.com</p>
                </div>
            </div>

            {/* DOCUMENT TITLE */}
            <div className="text-center mb-8">
                <h2 className="text-xl font-bold uppercase tracking-wide border-b inline-block pb-1">Transaction History Statement</h2>
            </div>

            {/* CLIENT INFO */}
            <div className="flex justify-between mb-6 text-sm">
                <div>
                    <h3 className="font-bold text-gray-700">Statement For:</h3>
                    <p className="text-lg font-semibold">{clientName || 'Valued Client'}</p>
                </div>
                <div className="text-right">
                    <p><span className="font-bold">Date Generated:</span> {format(new Date(), 'dd MMM yyyy')}</p>
                    {startDate && endDate && (
                        <p><span className="font-bold">Period:</span> {format(startDate, 'dd/MM/yy')} - {format(endDate, 'dd/MM/yy')}</p>
                    )}
                </div>
            </div>

            {/* TABLE */}
            <div className="mb-8">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-y border-gray-300">
                            <th className="px-4 py-3 font-bold uppercase text-gray-700 w-32">Date</th>
                            <th className="px-4 py-3 font-bold uppercase text-gray-700">Description</th>
                            <th className="px-4 py-3 font-bold uppercase text-gray-700 w-32 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {transactions.length === 0 ? (
                            <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No transactions found for this period.</td></tr>
                        ) : transactions.map((tx, idx) => (
                            <tr key={tx.id || idx}>
                                <td className="px-4 py-3 align-top">{format(new Date(tx.date), 'dd MMM yyyy')}</td>
                                <td className="px-4 py-3 align-top">
                                    <p className="font-medium text-gray-900">{tx.description}</p>
                                    {tx.reference && <span className="text-xs text-gray-500">Ref: {tx.reference}</span>}
                                </td>
                                <td className={`px-4 py-3 text-right font-mono font-bold ${['PAYMENT', 'RECEIPT'].includes(tx.type) ? 'text-green-700' : 'text-gray-900'}`}>
                                    {formatCurrency(tx.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* FOOTER */}
            <div className="mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-500">
                <p>This is a computer-generated statement and does not require a physical signature.</p>
                <p>Thank you for doing business with Qix Ads.</p>
            </div>
        </div>
    );
});

export default StatementTemplate;
