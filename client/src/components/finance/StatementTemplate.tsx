import React from 'react';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';

interface StatementTemplateProps {
    transactions: any[];
    clientName?: string;
    startDate?: Date;
    endDate?: Date;
    openingBalance?: number;
}

const StatementTemplate = React.forwardRef<HTMLDivElement, StatementTemplateProps>(({ 
    transactions, 
    clientName, 
    startDate, 
    endDate,
    openingBalance = 0 
}, ref) => {

    const today = new Date();
    
    // Summary Calculations
    let totalDebit = 0;
    let totalCredit = 0;
    
    const processedTransactions = transactions.map(tx => {
        // Handle both legacy (type) and unified (transaction_type) formats
        const type = tx.type || tx.transaction_type;
        const isCredit = ['RECEIPT', 'PAYMENT', 'INCOME'].includes(type);
        
        // If the backend already provided debit/credit, use them, otherwise calculate
        const debit = tx.debit !== undefined ? tx.debit : (isCredit ? 0 : tx.amount);
        const credit = tx.credit !== undefined ? tx.credit : (isCredit ? tx.amount : 0);
        
        totalDebit += debit;
        totalCredit += credit;
        
        return {
            ...tx,
            debit,
            credit
        };
    });

    const closingBalance = openingBalance + totalDebit - totalCredit;

    // Running Balance Calculation for table
    let currentRunningBalance = openingBalance;
    const transactionsWithRunningBalance = processedTransactions.map(tx => {
        currentRunningBalance = currentRunningBalance + tx.debit - tx.credit;
        return { ...tx, runningBalance: currentRunningBalance };
    });

    return (
        <div 
            ref={ref} 
            className="bg-white text-black print:p-0 statement-container"
            style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '12mm 10mm',
                margin: '0 auto',
                fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}
        >
            <style>{`
                @media print {
                    .statement-container { border: none !important; padding: 10mm !important; }
                    .no-break { page-break-inside: avoid; break-inside: avoid; }
                    tr { page-break-inside: avoid; break-inside: avoid; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                }
                .statement-table td { padding: 8px 12px !important; }
            `}</style>

            {/* HEADER */}
            <div className="flex justify-between items-start border-b-2 border-purple-900 pb-4 mb-6 no-break">
                <div className="flex flex-col gap-2">
                    <img src="/qix_logo.png" alt="Qix Ads" className="h-16 w-auto object-contain" />
                    <div>
                        <h1 className="text-2xl font-black text-purple-900 tracking-tighter">QIX ADS</h1>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Premium Digital Solutions</p>
                    </div>
                </div>
                <div className="text-right text-xs text-gray-600 leading-relaxed font-medium">
                    <p>2nd floor City Center Complex, Pattambi Rd,</p>
                    <p>Perinthalmanna, Kerala 679322</p>
                    <p>Phone: +91 9947 381381</p>
                    <p>Email: qixmediasol@gmail.com</p>
                    <p>Web: www.qixads.com</p>
                </div>
            </div>

            {/* DOCUMENT TITLE */}
            <div className="text-center mb-6 no-break">
                <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-gray-900 border-b-4 border-gray-100 inline-block pb-1">Statement of Account</h2>
            </div>

            {/* STATEMENT INFO */}
            <div className="grid grid-cols-2 gap-8 mb-6 no-break">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-[10px] font-bold text-purple-900 uppercase tracking-wider mb-1">Statement For:</h3>
                    <p className="text-xl font-extrabold text-gray-800 leading-none">{clientName || 'Valued Client'}</p>
                    <p className="text-xs text-gray-500 mt-2 italic">Ledger Account Details</p>
                </div>
                <div className="flex flex-col justify-center items-end text-sm">
                    <div className="flex gap-4 mb-1">
                        <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider">Date Generated:</span>
                        <span className="font-mono font-bold">{format(today, 'dd MMM yyyy')}</span>
                    </div>
                    {startDate && endDate && (
                        <div className="flex gap-4">
                            <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider">Period:</span>
                            <span className="font-mono font-bold text-purple-900">{format(startDate, 'dd/MM/yy')} - {format(endDate, 'dd/MM/yy')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* SUMMARY BOX */}
            <div className="grid grid-cols-4 gap-0 border-2 border-purple-900 rounded-xl overflow-hidden mb-6 shadow-sm no-break">
                <div className="bg-white p-4 border-r border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase mb-1">Opening Balance</span>
                    <span className="text-sm font-mono font-black">{formatCurrency(openingBalance)}</span>
                </div>
                <div className="bg-white p-4 border-r border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase mb-1 text-red-600">Total Debits (+)</span>
                    <span className="text-sm font-mono font-black text-red-600">{formatCurrency(totalDebit)}</span>
                </div>
                <div className="bg-white p-4 border-r border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase mb-1 text-green-600">Total Credits (-)</span>
                    <span className="text-sm font-mono font-black text-green-600">{formatCurrency(totalCredit)}</span>
                </div>
                <div className="bg-purple-900 p-4 flex flex-col items-center justify-center text-white">
                    <span className="text-[9px] font-bold uppercase mb-1 opacity-80">Closing Balance</span>
                    <span className="text-lg font-mono font-black">{formatCurrency(closingBalance)}</span>
                </div>
            </div>

            {/* TRANSACTIONS TABLE */}
            <div className="mb-8 flex-grow">
                <table className="w-full text-left border-collapse table-fixed statement-table">
                    <thead>
                        <tr className="bg-gray-900 text-white">
                            <th className="p-3 text-[10px] font-bold uppercase w-28 border-r border-gray-800">Date</th>
                            <th className="p-3 text-[10px] font-bold uppercase border-r border-gray-800">Particulars</th>
                            <th className="p-3 text-[10px] font-bold uppercase w-24 border-r border-gray-800 text-center">Ref</th>
                            <th className="p-3 text-[10px] font-bold uppercase w-28 border-r border-gray-800 text-right">Debit</th>
                            <th className="p-3 text-[10px] font-bold uppercase w-28 border-r border-gray-800 text-right">Credit</th>
                            <th className="p-3 text-[10px] font-bold uppercase w-32 text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody className="text-[11px] font-medium leading-tight">
                        {/* Opening Balance Row */}
                        <tr className="bg-gray-50 font-bold italic border-b border-gray-200">
                            <td className="p-3 border-r" colSpan={5}>Opening Balance Brought Forward</td>
                            <td className="p-3 text-right font-mono">{formatCurrency(openingBalance)}</td>
                        </tr>
                        
                        {transactionsWithRunningBalance.length === 0 ? (
                            <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">No transactions recorded for this period.</td></tr>
                        ) : transactionsWithRunningBalance.map((tx, idx) => (
                            <tr key={tx.id || idx} className="border-b border-gray-100 hover:bg-purple-50/30 transition-colors">
                                <td className="p-3 border-r align-top text-gray-600 font-mono">{format(new Date(tx.date), 'dd MMM yyyy')}</td>
                                <td className="p-3 border-r align-top">
                                    <div className="font-bold text-gray-900">{tx.description}</div>
                                    {tx.category && <span className="text-[9px] text-purple-700 bg-purple-50 px-1 rounded uppercase font-bold">{tx.category}</span>}
                                </td>
                                <td className="p-3 border-r align-top text-center font-mono text-gray-500">{tx.reference || '-'}</td>
                                <td className="p-3 border-r align-top text-right font-mono font-bold text-red-600">{tx.debit > 0 ? formatCurrency(tx.debit) : ''}</td>
                                <td className="p-3 border-r align-top text-right font-mono font-bold text-green-700">{tx.credit > 0 ? formatCurrency(tx.credit) : ''}</td>
                                <td className="p-3 align-top text-right font-mono font-black text-gray-900">{formatCurrency(tx.runningBalance)}</td>
                            </tr>
                        ))}

                        {/* Closing Balance Row */}
                        <tr className="bg-purple-50 font-black border-t-2 border-purple-900">
                            <td className="p-4 border-r" colSpan={5}>Current Closing Balance</td>
                            <td className="p-4 text-right font-mono text-base">{formatCurrency(closingBalance)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* FOOTER - SIGNATURES */}
            <div className="mt-8 border-t border-gray-200 pt-6 flex justify-between items-end no-break">
                <div className="w-1/3 text-xs text-gray-500 italic leading-relaxed">
                    <p className="font-bold text-gray-900 mb-2 not-italic underline">Terms & Conditions:</p>
                    <p>1. This is a computer generated statement.</p>
                    <p>2. Any discrepancy should be reported within 7 days.</p>
                    <p>3. Balance subject to clearance of cheques.</p>
                </div>

                <div className="flex gap-16">
                    {/* Seal Area */}
                    <div className="text-center">
                        <div className="w-24 h-24 border-2 border-purple-100 rounded-full flex items-center justify-center opacity-30 mx-auto mb-2">
                            <span className="text-[8px] font-black uppercase text-purple-900 leading-tight">Qix Media Solution<br/>Official Seal</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company Seal</p>
                    </div>

                    {/* Signature Area */}
                    <div className="text-center w-48">
                        <div className="h-16 mb-2 flex items-end justify-center">
                            <div className="w-full border-b border-gray-400"></div>
                        </div>
                        <p className="font-black text-gray-900 text-[11px] uppercase tracking-wider">Authorized Signatory</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Accounts Department</p>
                    </div>
                </div>
            </div>
            
            <div className="text-center mt-8 text-[9px] text-gray-400 uppercase tracking-widest font-bold">
                Thank you for your continued business with Qix Ads.
            </div>
        </div>
    );
});

export default StatementTemplate;

