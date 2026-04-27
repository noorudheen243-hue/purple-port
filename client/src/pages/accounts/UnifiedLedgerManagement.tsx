import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Plus, Search, Link as LinkIcon, ExternalLink, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

const UnifiedLedgerManagement = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');

    const { data: ledgers, isLoading } = useQuery({
        queryKey: ['unified-ledgers'],
        queryFn: async () => (await api.get('/accounting/unified/ledgers')).data
    });

    const filteredLedgers = ledgers?.filter((l: any) =>
        l.ledger_name.toLowerCase().includes(search.toLowerCase()) ||
        l.entity_type.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) return <div className="p-8 text-center">Loading Unified Ledgers...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-purple-50 p-6 rounded-2xl border border-purple-100">
                <div>
                    <h1 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6" /> Unified Ledger System
                    </h1>
                    <p className="text-purple-700 text-sm">Managing combined Income & Expense accounts with legacy mapping.</p>
                </div>
                <div className="flex gap-3">
                     <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> SAFE MODE ACTIVE
                     </span>
                </div>
            </div>

            <div className="flex gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search unified ledgers by name or entity..."
                    className="bg-transparent outline-none flex-1"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLedgers?.map((ledger: any) => (
                    <div key={ledger.id} className="bg-card border rounded-2xl p-5 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-0.5 bg-muted rounded">
                                    {ledger.entity_type}
                                </span>
                                <h3 className="font-bold text-lg mt-1 group-hover:text-primary transition-colors">{ledger.ledger_name}</h3>
                            </div>
                            <div className="bg-primary/10 p-2 rounded-lg">
                                <LinkIcon className="w-4 h-4 text-primary" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">System Status</span>
                                <span className="font-bold text-emerald-600">Unified</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Legacy Mappings</span>
                                <span className="flex gap-1">
                                    {ledger.mappings?.[0]?.old_income_ledger_id && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Income Mapped"></span>}
                                    {ledger.mappings?.[0]?.old_expense_ledger_id && <span className="w-2 h-2 rounded-full bg-rose-500" title="Expense Mapped"></span>}
                                </span>
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t flex items-center justify-between">
                            <UnifiedBalanceDisplay ledgerId={ledger.id} />
                            <button className="text-primary hover:underline text-xs font-bold flex items-center gap-1">
                                View Full Statement <ExternalLink className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const UnifiedBalanceDisplay = ({ ledgerId }: { ledgerId: string }) => {
    const { data: balanceData, isLoading } = useQuery({
        queryKey: ['unified-balance', ledgerId],
        queryFn: async () => (await api.get(`/accounting/unified/ledgers/${ledgerId}/balance`)).data
    });

    if (isLoading) return <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>;

    const balance = balanceData?.balance || 0;
    return (
        <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Net Balance</span>
            <span className={`font-mono font-black ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(balance)}
            </span>
        </div>
    );
};

export default UnifiedLedgerManagement;
