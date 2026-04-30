import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    Plus, 
    User, 
    Building2, 
    Wallet, 
    ArrowRight, 
    Info, 
    Loader2,
    ShieldCheck
} from 'lucide-react';
import Swal from 'sweetalert2';

const UnifiedLedgerCreator = ({ onSuccess }: { onSuccess?: () => void }) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [type, setType] = useState('GENERAL');
    const [metadata, setMetadata] = useState('');

    const types = [
        { id: 'GENERAL', name: 'General Account', icon: Wallet, desc: 'For standard operational accounts.' },
        { id: 'CLIENT', name: 'Client Account', icon: User, desc: 'For tracking customer balances.' },
        { id: 'TEAM', name: 'Staff Account', icon: Building2, desc: 'For payroll and employee advances.' },
    ];

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/accounting/unified/ledgers', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unified-ledgers'] });
            setName('');
            setMetadata('');
            Swal.fire({
                title: 'Account Created',
                text: 'The new headless ledger is ready for use.',
                icon: 'success',
                confirmButtonColor: '#7c3aed',
                background: '#f8fafc',
                customClass: { popup: 'rounded-[2rem]' }
            });
            if (onSuccess) onSuccess();
        },
        onError: (err: any) => Swal.fire('Error', err.response?.data?.message || err.message, 'error')
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        mutation.mutate({
            ledger_name: name,
            entity_type: type,
            metadata: metadata
        });
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-5">
                {/* Left Side Info */}
                <div className="md:col-span-2 bg-purple-600 p-12 text-white flex flex-col justify-between">
                    <div>
                        <div className="bg-white/20 w-fit p-4 rounded-3xl backdrop-blur-md mb-8">
                            <Plus className="w-10 h-10" />
                        </div>
                        <h2 className="text-4xl font-black leading-tight mb-6 tracking-tight">New Ledger Account</h2>
                        <p className="text-purple-100 font-medium opacity-80 leading-relaxed">
                            Create a headless account without group constraints. It can hold any type of transaction instantly.
                        </p>
                    </div>

                    <div className="bg-white/10 p-6 rounded-3xl border border-white/20 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <ShieldCheck className="w-5 h-5 text-purple-200" />
                            <span className="font-black text-xs uppercase tracking-widest">System Security</span>
                        </div>
                        <p className="text-xs text-purple-200/80">Every account is end-to-end tracked with a unique immutable ID.</p>
                    </div>
                </div>

                {/* Right Side Form */}
                <form onSubmit={handleSubmit} className="md:col-span-3 p-12 space-y-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Account Holder Name</label>
                        <input 
                            type="text" 
                            required
                            placeholder="e.g. Amazon Web Services"
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-5 outline-none focus:border-purple-500 transition-all text-xl font-bold text-slate-800 placeholder:text-slate-300"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Account Classification</label>
                        <div className="grid grid-cols-1 gap-3">
                            {types.map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setType(t.id)}
                                    className={`flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-left group ${type === t.id ? 'border-purple-600 bg-purple-50/50' : 'border-slate-50 bg-white hover:border-slate-200'}`}
                                >
                                    <div className={`p-3 rounded-2xl transition-all ${type === t.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                        <t.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className={`font-black text-sm ${type === t.id ? 'text-purple-900' : 'text-slate-700'}`}>{t.name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{t.desc}</p>
                                    </div>
                                    <ArrowRight className={`w-5 h-5 ml-auto transition-all ${type === t.id ? 'text-purple-600 translate-x-0' : 'text-slate-200 -translate-x-2'}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Metadata (Optional)</label>
                        <textarea 
                            placeholder="Account notes, bank details, or contact info..."
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-5 outline-none focus:border-purple-500 transition-all font-medium min-h-[100px] text-slate-600"
                            value={metadata}
                            onChange={(e) => setMetadata(e.target.value)}
                        />
                    </div>

                    <div className="pt-4">
                        <button 
                            disabled={mutation.isPending || !name}
                            className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-200 disabled:opacity-50"
                        >
                            {mutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                            Initialize Account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UnifiedLedgerCreator;
