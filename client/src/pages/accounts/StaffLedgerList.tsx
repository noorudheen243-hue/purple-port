import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    UserCheck, 
    ArrowRight, 
    Calendar,
    Wallet,
    ShieldCheck,
    AlertCircle,
    ArrowUpRight,
    ArrowDownLeft
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';

import StaffStatement from './StaffStatement';

const StaffLedgerList = () => {
    const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);

    const { data: staffLedgers, isLoading } = useQuery({
        queryKey: ['unified-ledgers', 'USER'],
        queryFn: async () => (await api.get('/accounting/unified/ledgers?type=USER')).data
    });

    if (selectedLedgerId) {
        return <StaffStatement ledgerId={selectedLedgerId} onBack={() => setSelectedLedgerId(null)} />;
    }

    if (isLoading) return <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Accessing Personnel Vault...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Staff Account Management</h2>
                    <p className="text-slate-500 font-medium mt-1">Unified tracking of Salary, Advances, and Performance Incentives.</p>
                </div>
                <div className="flex gap-2">
                     <span className="bg-white border-2 border-slate-100 text-purple-600 px-6 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 uppercase tracking-widest shadow-sm">
                        <ShieldCheck className="w-5 h-5" /> Secured Personnel Portal
                     </span>
                </div>
            </div>

            <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="px-10 py-6">Staff Member</th>
                            <th className="px-10 py-6">Account Status</th>
                            <th className="px-10 py-6 text-right">Net Balance</th>
                            <th className="px-10 py-6 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {staffLedgers?.map((ledger: any) => (
                            <StaffTableRow 
                                key={ledger.id} 
                                ledger={ledger} 
                                onSelect={() => setSelectedLedgerId(ledger.id)} 
                            />
                        ))}

                        {staffLedgers?.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-20 text-center bg-slate-50/50">
                                    <div className="flex flex-col items-center gap-3">
                                        <AlertCircle className="w-10 h-10 text-slate-200" />
                                        <p className="text-slate-300 font-bold italic tracking-tight text-lg">No personnel accounts identified.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StaffTableRow = ({ ledger, onSelect }: { ledger: any, onSelect: () => void }) => {
    const { data: balanceData } = useQuery({
        queryKey: ['unified-balance', ledger.id],
        queryFn: async () => (await api.get(`/accounting/unified/ledgers/${ledger.id}/balance`)).data
    });

    const balance = balanceData?.balance || 0;

    return (
        <tr className="hover:bg-slate-50/30 transition-all group cursor-pointer" onClick={onSelect}>
            <td className="px-10 py-7">
                <div className="flex items-center gap-4">
                    <div className="bg-purple-50 p-4 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-black text-slate-900 text-lg group-hover:text-purple-600 transition-colors leading-tight">{ledger.ledger_name}</p>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Unified Personnel Record</p>
                    </div>
                </div>
            </td>
            <td className="px-10 py-7">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Verified Active</span>
                </div>
            </td>
            <td className="px-10 py-7 text-right">
                <div className="flex flex-col items-end">
                    <p className={`text-2xl font-black ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'} tracking-tight`}>
                        {formatCurrency(balance)}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                        {balance >= 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownLeft className="w-3 h-3 text-rose-400" />}
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{balance >= 0 ? 'Credit Advance' : 'Net Payable'}</span>
                    </div>
                </div>
            </td>
            <td className="px-10 py-7 text-center">
                <button className="p-4 bg-slate-50 text-slate-300 rounded-2xl hover:bg-black hover:text-white hover:scale-110 transition-all shadow-sm">
                    <ArrowRight className="w-5 h-5" />
                </button>
            </td>
        </tr>
    );
};

export default StaffLedgerList;
