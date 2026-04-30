import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    Search, 
    ExternalLink, 
    ShieldCheck, 
    User, 
    Users, 
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    ChevronRight,
    ArrowRight,
    Plus,
    LayoutGrid,
    Users2,
    UserCircle,
    Pencil,
    Trash2,
    X,
    Loader2
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import Swal from 'sweetalert2';

interface Props {
    onOpenCreator?: () => void;
}

const UnifiedLedgerManagement = ({ onOpenCreator }: Props) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<'GENERAL' | 'CLIENT' | 'USER'>('GENERAL');
    
    // Edit State
    const [editingLedger, setEditingLedger] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [editMetadata, setEditMetadata] = useState('');

    const { data: ledgers, isLoading } = useQuery({
        queryKey: ['unified-ledgers'],
        queryFn: async () => (await api.get('/accounting/unified/ledgers')).data
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.patch(`/accounting/unified/ledgers/${editingLedger.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unified-ledgers'] });
            setEditingLedger(null);
            Swal.fire({ title: 'Updated', text: 'Ledger updated successfully', icon: 'success', background: '#f8fafc', customClass: { popup: 'rounded-[2rem]' } });
        },
        onError: (err: any) => Swal.fire('Error', err.response?.data?.message || err.message, 'error')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/accounting/unified/ledgers/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unified-ledgers'] });
            Swal.fire({ title: 'Deleted', text: 'Ledger removed from ecosystem', icon: 'success', background: '#f8fafc', customClass: { popup: 'rounded-[2rem]' } });
        },
        onError: (err: any) => Swal.fire('Error', err.response?.data?.message || err.message, 'error')
    });

    const categories = [
        { id: 'GENERAL', name: 'General Ledgers', icon: LayoutGrid },
        { id: 'CLIENT', name: 'Client Ledgers', icon: Users2 },
        { id: 'USER', name: 'Staff Ledgers', icon: UserCircle },
    ];

    const getAccountLabel = (type: string) => {
        switch(type) {
            case 'CLIENT': return 'Client Account';
            case 'USER': 
            case 'TEAM': return 'Staff Account';
            case 'BANK': return 'Bank Account';
            default: return 'General Account';
        }
    };

    const getAccountIcon = (type: string) => {
        switch(type) {
            case 'CLIENT': return <Users className="w-4 h-4" />;
            case 'USER': 
            case 'TEAM': return <User className="w-4 h-4" />;
            case 'BANK': return <Wallet className="w-4 h-4" />;
            default: return <ShieldCheck className="w-4 h-4" />;
        }
    };

    const handleDelete = (ledger: any) => {
        Swal.fire({
            title: 'Delete Ledger?',
            text: `Are you sure you want to remove "${ledger.ledger_name}"? This cannot be undone if no transactions exist.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!',
            background: '#f8fafc',
            customClass: { popup: 'rounded-[2rem]' }
        }).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(ledger.id);
            }
        });
    };

    const handleEdit = (ledger: any) => {
        setEditingLedger(ledger);
        setEditName(ledger.ledger_name);
        setEditMetadata(ledger.metadata || '');
    };

    const handleRowClick = (ledgerId: string) => {
        navigate(`/dashboard/accounts/ledger/${ledgerId}`);
    };

    const filteredLedgers = ledgers?.filter((l: any) => {
        const matchesSearch = l.ledger_name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = l.entity_type === activeCategory || (activeCategory === 'USER' && l.entity_type === 'TEAM');
        return matchesSearch && matchesCategory;
    });

    if (isLoading) return <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Accessing Financial Vault...</div>;

    return (
        <div className="space-y-8">
            {/* Sub-Tabs & Create Button Row */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div className="flex gap-2 p-1.5 bg-slate-100 rounded-3xl w-fit border border-slate-200 shadow-inner">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black transition-all duration-300 uppercase tracking-widest ${
                                activeCategory === cat.id 
                                    ? 'bg-white text-purple-600 shadow-lg shadow-purple-100' 
                                    : 'text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            <cat.icon className="w-4 h-4" />
                            {cat.name}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap gap-4 w-full xl:w-auto">
                    <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-2xl flex-1 md:w-80 border-2 border-slate-100 shadow-sm">
                        <Search className="w-5 h-5 text-slate-300" />
                        <input
                            type="text"
                            placeholder="Search in category..."
                            className="bg-transparent outline-none flex-1 font-bold text-slate-700 placeholder:text-slate-300 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    <button 
                        onClick={onOpenCreator}
                        className="flex items-center justify-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-3xl font-black hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 text-sm uppercase tracking-widest"
                    >
                        <Plus className="w-5 h-5" /> Create Ledger Account
                    </button>
                </div>
            </div>

            {/* Table Layout */}
            <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="px-10 py-6">Account Holder</th>
                            <th className="px-10 py-6">Classification</th>
                            <th className="px-10 py-6">Status</th>
                            <th className="px-10 py-6 text-right">Net Liquidity</th>
                            <th className="px-10 py-6 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredLedgers?.map((ledger: any) => (
                            <tr 
                                key={ledger.id} 
                                onClick={() => handleRowClick(ledger.id)}
                                className="hover:bg-slate-50 transition-all group cursor-pointer"
                            >
                                <td className="px-10 py-7">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${ledger.entity_type === 'CLIENT' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                                            {getAccountIcon(ledger.entity_type)}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 group-hover:text-purple-600 transition-colors">{ledger.ledger_name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">REF: {ledger.id.toString().split('-').pop()}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-7">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                                        {getAccountLabel(ledger.entity_type)}
                                    </span>
                                </td>
                                <td className="px-10 py-7">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-200 animate-pulse"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified / Unified</span>
                                    </div>
                                </td>
                                <td className="px-10 py-7 text-right">
                                    <UnifiedBalanceDisplay ledgerId={ledger.id} />
                                </td>
                                <td className="px-10 py-7">
                                    <div className="flex items-center justify-center gap-2">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(ledger);
                                            }}
                                            className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-purple-100 hover:text-purple-600 transition-all"
                                            title="Edit Ledger"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(ledger);
                                            }}
                                            className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-all"
                                            title="Delete Ledger"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {filteredLedgers?.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-24 text-center bg-slate-50/50">
                                    <div className="flex flex-col items-center gap-4">
                                        <ShieldCheck className="w-12 h-12 text-slate-200" />
                                        <p className="text-slate-300 font-bold italic text-lg tracking-tight">No records found in this category.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingLedger && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="bg-purple-900 p-8 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">Modify Ledger</h2>
                                <p className="text-purple-300 text-xs mt-1 uppercase font-black tracking-widest">Updating: {editingLedger.ledger_name}</p>
                            </div>
                            <button onClick={() => setEditingLedger(null)} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Ledger Name</label>
                                <input 
                                    type="text"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-purple-500 outline-none transition-all font-bold text-slate-800"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Account Metadata</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-purple-500 outline-none transition-all font-medium text-slate-600 min-h-[120px]"
                                    value={editMetadata}
                                    onChange={(e) => setEditMetadata(e.target.value)}
                                    placeholder="Add notes, account details, or mapping info..."
                                />
                            </div>
                            <button 
                                onClick={() => updateMutation.mutate({ ledger_name: editName, metadata: editMetadata })}
                                disabled={updateMutation.isPending || !editName}
                                className="w-full bg-purple-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-100 disabled:opacity-50"
                            >
                                {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Apply Updates'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const UnifiedBalanceDisplay = ({ ledgerId }: { ledgerId: string }) => {
    const { data: balance, isLoading } = useQuery({
        queryKey: ['unified-balance', ledgerId],
        queryFn: async () => (await api.get(`/accounting/unified/ledgers/${ledgerId}/balance`)).data
    });

    if (isLoading) return <div className="h-6 w-24 bg-slate-100 rounded-full animate-pulse ml-auto"></div>;

    const val = balance?.balance || 0;
    return (
        <div className="flex flex-col items-end">
            <p className={`text-xl font-black ${val >= 0 ? 'text-slate-900' : 'text-rose-600'} tracking-tight`}>
                {formatCurrency(val)}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
                {val >= 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownLeft className="w-3 h-3 text-rose-400" />}
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{val >= 0 ? 'Credit Pool' : 'Net Debit'}</span>
            </div>
        </div>
    );
};

export default UnifiedLedgerManagement;
