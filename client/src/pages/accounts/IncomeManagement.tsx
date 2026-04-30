import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    Plus, 
    TrendingUp, 
    Calendar, 
    ArrowUpRight, 
    Target,
    UserCheck,
    CreditCard,
    Briefcase,
    DollarSign,
    Loader2
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import Swal from 'sweetalert2';

const INCOME_CATEGORIES = [
    { name: 'Service Charges', icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-100', isClientLinked: true },
    { name: 'Campaign Recharge', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-100', isClientLinked: true },
    { name: 'Consultation Fee', icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-100', isClientLinked: true },
    { name: 'Misc Income', icon: DollarSign, color: 'text-slate-600', bg: 'bg-slate-100', isClientLinked: false },
];

const IncomeManagement = () => {
    const queryClient = useQueryClient();
    const [selectedCategory, setSelectedCategory] = useState('Service Charges');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedClientId, setSelectedClientId] = useState('');

    // Queries
    const { data: summary, isLoading } = useQuery({
        queryKey: ['income-summary'],
        queryFn: async () => (await api.get('/accounting/unified/reports/income')).data
    });

    const { data: ledgers } = useQuery({
        queryKey: ['unified-ledgers'],
        queryFn: async () => (await api.get('/accounting/unified/ledgers')).data
    });

    const { data: clients } = useQuery({
        queryKey: ['active-clients'],
        queryFn: async () => (await api.get('/clients')).data
    });

    // Mutations
    const recordMutation = useMutation({
        mutationFn: (data: any) => api.post('/accounting/unified/transactions', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income-summary'] });
            queryClient.invalidateQueries({ queryKey: ['unified-summary'] });
            queryClient.invalidateQueries({ queryKey: ['unified-ledgers'] });
            setAmount('');
            setDescription('');
            Swal.fire({ 
                title: 'Income Recorded', 
                text: 'The revenue entry has been successfully finalized.', 
                icon: 'success', 
                background: '#f8fafc', 
                customClass: { popup: 'rounded-[3rem]' } 
            });
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let targetLedgerId = '';
        let finalDescription = description;

        const cat = INCOME_CATEGORIES.find(c => c.name === selectedCategory);

        if (cat?.isClientLinked) {
            targetLedgerId = ledgers?.find((l: any) => l.entity_id === selectedClientId)?.id;
            const client = clients?.find((c: any) => c.id === selectedClientId);
            finalDescription = `[${selectedCategory}] ${client?.name}: ${description}`;
        } else {
            // Default to a general income ledger if one exists, or ask to create
            targetLedgerId = ledgers?.find((l: any) => l.ledger_name === 'Other Service Charges (Income)')?.id;
        }

        if (!targetLedgerId) {
            Swal.fire('Ledger Not Found', `Please ensure the ledger for ${selectedCategory} is linked correctly.`, 'error');
            return;
        }

        recordMutation.mutate({
            ledger_id: targetLedgerId,
            transaction_type: 'INCOME',
            category: selectedCategory,
            amount: parseFloat(amount),
            date: new Date(date),
            description: finalDescription
        });
    };

    const handleCategoryClick = (categoryName: string) => {
        window.open(`/accounts/category-transactions/${encodeURIComponent(categoryName)}`, '_blank', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no');
    };

    if (isLoading) return <div className="p-20 text-center animate-pulse text-slate-400 font-black tracking-widest uppercase">Initializing Revenue Matrix...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Recording Form */}
            <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-50 p-8 rounded-[3.5rem] border-2 border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    
                    <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <ArrowUpRight className="w-6 h-6 text-emerald-500" /> Record Revenue
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Income Stream</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {INCOME_CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.name}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat.name)}
                                            className={`p-5 rounded-3xl flex flex-col items-center gap-2 border-2 transition-all duration-300 ${
                                                selectedCategory === cat.name 
                                                    ? 'border-emerald-500 bg-white shadow-xl shadow-emerald-100 scale-105' 
                                                    : 'border-transparent bg-white/50 hover:bg-white hover:border-slate-200'
                                            }`}
                                        >
                                            <cat.icon className={`w-6 h-6 ${cat.color}`} />
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{cat.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {INCOME_CATEGORIES.find(c => c.name === selectedCategory)?.isClientLinked && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 p-6 bg-white rounded-3xl border-2 border-emerald-50 shadow-sm">
                                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Source Client</label>
                                    <select 
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none font-bold text-slate-700"
                                        value={selectedClientId}
                                        onChange={(e) => setSelectedClientId(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Client Ledger...</option>
                                        {clients?.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Receipt Amount (₹)</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-white border-2 border-slate-100 rounded-3xl px-6 py-4 focus:border-emerald-500 outline-none font-black text-lg text-slate-900"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Receipt Date</label>
                                    <input 
                                        type="date"
                                        className="w-full bg-white border-2 border-slate-100 rounded-3xl px-6 py-4 focus:border-emerald-500 outline-none font-bold text-slate-700"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Description</label>
                                <textarea 
                                    className="w-full bg-white border-2 border-slate-100 rounded-3xl px-6 py-4 focus:border-emerald-500 outline-none font-medium text-slate-600 h-32"
                                    placeholder="Enter payment details (Cheque No, Ref, etc)..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={recordMutation.isPending}
                            className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {recordMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm Receipt'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Right: Summary View */}
            <div className="lg:col-span-7 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Revenue Breakdown</h2>
                        <p className="text-slate-500 font-medium">Categorized view of all incoming cash flow.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {INCOME_CATEGORIES.map((cat) => {
                        const catData = summary?.find((s: any) => s.category === cat.name);
                        return (
                            <div 
                                key={cat.name} 
                                onClick={() => handleCategoryClick(cat.name)}
                                className="bg-white border-2 border-slate-50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`${cat.bg} p-5 rounded-2xl group-hover:scale-110 transition-transform`}>
                                        <cat.icon className={`w-8 h-8 ${cat.color}`} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{catData?.count || 0} Invoices</p>
                                        <div className="flex items-center gap-1 justify-end mt-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Live Flow</span>
                                        </div>
                                    </div>
                                </div>
                                <h3 className="font-black text-slate-400 text-xs uppercase tracking-[0.15em] mb-1">{cat.name}</h3>
                                <p className="text-3xl font-black text-slate-900 tracking-tight">
                                    {formatCurrency(catData?.total || 0)}
                                </p>
                            </div>
                        );
                    })}
                </div>
                
                <div className="bg-emerald-900 p-12 rounded-[3.5rem] text-white flex justify-between items-center shadow-3xl shadow-emerald-100 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-emerald-800 to-transparent opacity-50"></div>
                    <div className="relative z-10">
                        <p className="text-emerald-300 text-xs font-black uppercase tracking-[0.25em]">Total Unified Revenue</p>
                        <h4 className="text-5xl font-black mt-2 tracking-tighter">
                            {formatCurrency(summary?.reduce((sum: number, s: any) => sum + s.total, 0) || 0)}
                        </h4>
                    </div>
                    <div className="relative z-10 bg-white/10 p-6 rounded-full group-hover:scale-110 transition-transform duration-500">
                        <TrendingUp className="w-16 h-16 text-emerald-300" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IncomeManagement;
