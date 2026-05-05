import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    Plus, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    Calendar, 
    FileText, 
    Tag, 
    CheckCircle2, 
    Loader2,
    Search
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import Swal from 'sweetalert2';

const UniversalTransactionRecorder = () => {
    const queryClient = useQueryClient();
    const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [ledgerId, setLedgerId] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('General');
    const [description, setDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const { data: ledgers } = useQuery({
        queryKey: ['unified-ledgers'],
        queryFn: async () => (await api.get('/accounting/unified/ledgers')).data
    });

    const categories = [
        'Service Charges', 'Campaign Recharge', 'Consultation Fee', 'Ad Spend', 'Salary', 'Salary Advance', 'Rent', 'Electricity', 
        'Digital Assets', 'Drinks', 'Celebration', 'Transport', 'Advance', 'Misc'
    ];

    const filteredLedgers = ledgers?.filter((l: any) => 
        l.ledger_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const recordMutation = useMutation({
        mutationFn: (data: any) => api.post('/accounting/unified/transactions', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unified-balance'] });
            queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
            queryClient.invalidateQueries({ queryKey: ['unified-summary'] });
            setAmount('');
            setDescription('');
            Swal.fire({
                title: 'Transaction Recorded',
                text: 'The ledger has been updated successfully.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#f8fafc',
                customClass: {
                    title: 'font-black text-slate-800',
                    popup: 'rounded-[2rem] border-4 border-emerald-100 shadow-2xl'
                }
            });
        },
        onError: (err: any) => Swal.fire('Error', err.response?.data?.message || err.message, 'error')
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ledgerId || !amount) return;
        recordMutation.mutate({
            ledger_id: ledgerId,
            transaction_type: type,
            category,
            amount: parseFloat(amount),
            date: new Date(date),
            description: description || `${type === 'INCOME' ? 'Income' : 'Expense'} entry`
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-600/20 p-4 rounded-3xl backdrop-blur-md border border-purple-500/30">
                            <Plus className="w-8 h-8 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black tracking-tight">Record Movement</h2>
                            <p className="text-slate-400 font-medium">Capture financial flow for any account instantly.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-2 bg-slate-800/50 rounded-3xl w-fit border border-slate-700/50">
                        <button 
                            onClick={() => setType('INCOME')}
                            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all ${type === 'INCOME' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-700'}`}
                        >
                            <ArrowUpCircle className="w-5 h-5" /> Incoming
                        </button>
                        <button 
                            onClick={() => setType('EXPENSE')}
                            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all ${type === 'EXPENSE' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:bg-slate-700'}`}
                        >
                            <ArrowDownCircle className="w-5 h-5" /> Outgoing
                        </button>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Ledger Selection */}
                <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-xl space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Search className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Select Account</span>
                    </div>
                    
                    <input 
                        type="text" 
                        placeholder="Search ledger..."
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-purple-500 transition-all font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredLedgers?.map((l: any) => (
                            <button
                                key={l.id}
                                type="button"
                                onClick={() => setLedgerId(l.id)}
                                className={`w-full text-left px-6 py-4 rounded-2xl font-bold transition-all ${ledgerId === l.id ? 'bg-purple-600 text-white shadow-lg' : 'bg-white border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 text-slate-600'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <span>{l.ledger_name}</span>
                                    {ledgerId === l.id && <CheckCircle2 className="w-4 h-4" />}
                                </div>
                                <span className={`text-[10px] uppercase tracking-widest opacity-60 ${ledgerId === l.id ? 'text-white' : 'text-slate-400'}`}>
                                    {l.entity_type}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Details */}
                <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-xl space-y-6">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Transaction Amount</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400 text-2xl">₹</span>
                                <input 
                                    type="number" 
                                    required
                                    placeholder="0.00"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-12 py-6 outline-none focus:border-purple-500 transition-all text-3xl font-black text-slate-900"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="date" 
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-3 outline-none focus:border-purple-500 font-bold"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Category</label>
                                <div className="relative">
                                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <select 
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-3 outline-none focus:border-purple-500 font-bold appearance-none"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Description</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                                <textarea 
                                    placeholder="Enter transaction details..."
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl pl-10 pr-4 py-4 outline-none focus:border-purple-500 font-medium min-h-[100px]"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={recordMutation.isPending || !ledgerId || !amount}
                            className={`w-full py-5 rounded-[2rem] font-black text-white text-lg shadow-2xl transition-all flex items-center justify-center gap-3 ${
                                type === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                            } disabled:opacity-50 disabled:shadow-none`}
                        >
                            {recordMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                            Record {type === 'INCOME' ? 'Income' : 'Expense'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default UniversalTransactionRecorder;
