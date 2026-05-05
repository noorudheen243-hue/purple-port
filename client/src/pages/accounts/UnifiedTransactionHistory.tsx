import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';
import { 
    History, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Search, 
    Filter,
    MoreVertical,
    FileSpreadsheet,
    Calendar,
    Edit3,
    Trash2,
    X
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';

const UnifiedTransactionHistory = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [editingTx, setEditingTx] = useState<any>(null);

    const { data: transactions, isLoading } = useQuery({
        queryKey: ['unified-transactions-history'],
        queryFn: async () => (await api.get('/accounting/unified/transactions')).data
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/accounting/unified/transactions/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unified-transactions-history'] });
            queryClient.invalidateQueries({ queryKey: ['unified-balance'] });
            Swal.fire('Deleted!', 'Transaction has been removed.', 'success');
        }
    });

    const handleDelete = (tx: any) => {
        const isLegacy = tx.isLegacy || tx.id.toString().startsWith('legacy-') || typeof tx.id === 'string' && tx.id.length < 10; 
        
        Swal.fire({
            title: isLegacy ? 'Delete Legacy Transaction?' : 'Delete Transaction?',
            text: "This will revert the balance impact on all linked ledgers. This action is irreversible.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Yes, Delete'
        }).then((result) => {
            if (result.isConfirmed) {
                if (tx.isLegacy) {
                    // Call Legacy Delete Endpoint
                    api.delete(`/accounting/transactions/${tx.id}`)
                        .then(() => {
                            queryClient.invalidateQueries({ queryKey: ['unified-transactions-history'] });
                            Swal.fire('Deleted!', 'Legacy transaction and its impacts reverted.', 'success');
                        })
                        .catch(err => Swal.fire('Error', err.response?.data?.message || 'Failed to delete', 'error'));
                } else {
                    deleteMutation.mutate(tx.id);
                }
            }
        });
    };

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.patch(`/accounting/unified/transactions/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unified-transactions-history'] });
            queryClient.invalidateQueries({ queryKey: ['unified-balance'] });
            setEditingTx(null);
            Swal.fire('Updated!', 'Transaction details saved.', 'success');
        }
    });

    const filteredData = (transactions || []).filter((t: any) => {
        const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             t.ledger?.ledger_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'ALL' || t.transaction_type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-2xl shadow-sm">
                        <History className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Transaction Pulse</h2>
                        <p className="text-xs text-slate-500 font-medium">Full audit trail for unified and legacy records.</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Find transaction..."
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-2.5 outline-none focus:border-purple-500 transition-all text-sm font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        className="bg-white border-2 border-slate-100 rounded-2xl px-4 py-2.5 outline-none focus:border-purple-500 text-sm font-bold appearance-none"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="ALL">All Flows</option>
                        <option value="INCOME">Incoming</option>
                        <option value="EXPENSE">Outgoing</option>
                    </select>
                </div>
            </div>

            <div className="overflow-hidden border-2 border-slate-50 rounded-[2.5rem] bg-white">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                            <th className="px-8 py-5">Date / Ref</th>
                            <th className="px-8 py-5">Ledger Account</th>
                            <th className="px-8 py-5">Category / Description</th>
                            <th className="px-8 py-5 text-right">Movement</th>
                            <th className="px-8 py-5 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold animate-pulse">Scanning ledger history...</td></tr>
                        ) : filteredData.length === 0 ? (
                            <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold italic">No records found.</td></tr>
                        ) : (
                            filteredData.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="font-black text-slate-800">{format(new Date(tx.date), 'dd MMM yyyy')}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">#{tx.id.toString().split('-').pop()}</span>
                                            {tx.isLegacy && <span className="text-[8px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">Legacy</span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-8 rounded-full ${tx.transaction_type === 'INCOME' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                                            <div>
                                                <div className="font-black text-slate-900 group-hover:text-purple-600 transition-colors">{tx.ledger?.ledger_name || 'System Account'}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{tx.ledger?.entity_type || 'GENERAL'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${tx.isLegacy ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {tx.category || 'Uncategorized'}
                                        </span>
                                        <p className="text-sm font-bold text-slate-600 mt-1.5">{tx.description}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className={`text-xl font-black ${tx.transaction_type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {tx.transaction_type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </div>
                                        <div className="flex items-center justify-end gap-1 mt-1">
                                            {tx.transaction_type === 'INCOME' ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownLeft className="w-3 h-3 text-rose-400" />}
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{tx.transaction_type} Flow</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!tx.isLegacy && (
                                                <button 
                                                    onClick={() => setEditingTx(tx)}
                                                    className="p-2 bg-slate-100 hover:bg-purple-100 text-slate-400 hover:text-purple-600 rounded-xl transition-all"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleDelete(tx)}
                                                className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                                                title={tx.isLegacy ? "Delete Legacy Transaction" : "Delete Transaction"}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingTx && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-lg p-8 shadow-2xl relative">
                        <button onClick={() => setEditingTx(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 font-bold text-2xl">✕</button>
                        
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-purple-100 p-4 rounded-3xl text-purple-600">
                                <Edit3 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">Edit Record</h3>
                                <p className="text-sm text-slate-500 font-medium">Update transaction details.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Date</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-purple-500 font-bold text-slate-600"
                                    value={editingTx.date ? format(new Date(editingTx.date), 'yyyy-MM-dd') : ''}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setEditingTx({...editingTx, date: new Date(e.target.value).toISOString()});
                                        }
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Description</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-purple-500 font-bold"
                                    value={editingTx.description}
                                    onChange={(e) => setEditingTx({...editingTx, description: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Amount</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-purple-500 font-black text-xl"
                                    value={editingTx.amount}
                                    onChange={(e) => setEditingTx({...editingTx, amount: parseFloat(e.target.value)})}
                                />
                            </div>
                            <button 
                                onClick={() => updateMutation.mutate(editingTx)}
                                className="w-full bg-purple-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-purple-200 hover:bg-purple-700 transition-all"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UnifiedTransactionHistory;
