import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    Plus, 
    Receipt, 
    Calendar, 
    ChevronRight, 
    Filter,
    BarChart3,
    ArrowDownRight,
    LucideIcon,
    Droplets,
    Home,
    Zap,
    Cpu,
    Coffee,
    PartyPopper,
    Bus,
    PenTool,
    Target,
    UserCheck,
    Loader2
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import Swal from 'sweetalert2';

const EXPENSE_CATEGORIES = [
    { name: 'Electricity', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100', ledger: 'Electricity' },
    { name: 'Rent', icon: Home, color: 'text-purple-600', bg: 'bg-purple-100', hasSub: true },
    { name: 'Digital Assets', icon: Cpu, color: 'text-blue-600', bg: 'bg-blue-100', ledger: 'Digital Assets (Software/Subs)' },
    { name: 'Drinking Water', icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-100', ledger: 'Drinking Water' },
    { name: 'Refreshment', icon: Coffee, color: 'text-orange-600', bg: 'bg-orange-100', ledger: 'Refreshment & Snacks' },
    { name: 'Celebration', icon: PartyPopper, color: 'text-pink-600', bg: 'bg-pink-100', ledger: 'Celebrations & Team Events' },
    { name: 'Transportation', icon: Bus, color: 'text-indigo-600', bg: 'bg-indigo-100', ledger: 'Transportation & Travel' },
    { name: 'Stationary', icon: PenTool, color: 'text-slate-600', bg: 'bg-slate-100', ledger: 'Office Stationary' },
    { name: 'Meta Recharge', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-100', isClientLinked: true },
    { name: 'Staff Salary', icon: UserCheck, color: 'text-violet-600', bg: 'bg-violet-100', isStaffLinked: true },
];

const ExpenseManagement = () => {
    const queryClient = useQueryClient();
    const [selectedCategory, setSelectedCategory] = useState('Electricity');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Sub-Selections
    const [selectedRentType, setSelectedRentType] = useState<'Office Rent' | 'Accommodation Rent'>('Office Rent');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [salaryOption, setSalaryOption] = useState<'Monthly Payroll' | 'Advance Salary' | 'Final Settlement'>('Monthly Payroll');

    // Queries
    const { data: summary, isLoading } = useQuery({
        queryKey: ['expense-summary'],
        queryFn: async () => (await api.get('/accounting/unified/reports/expenses')).data
    });

    const { data: ledgers } = useQuery({
        queryKey: ['unified-ledgers'],
        queryFn: async () => (await api.get('/accounting/unified/ledgers')).data
    });

    const { data: clients } = useQuery({
        queryKey: ['active-clients'],
        queryFn: async () => (await api.get('/clients')).data
    });

    const { data: staff } = useQuery({
        queryKey: ['active-staff'],
        queryFn: async () => (await api.get('/users')).data // Filtering for active is handled by roles/status usually
    });

    // Mutations
    const recordMutation = useMutation({
        mutationFn: (data: any) => api.post('/accounting/unified/transactions', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
            queryClient.invalidateQueries({ queryKey: ['unified-summary'] });
            queryClient.invalidateQueries({ queryKey: ['unified-ledgers'] });
            setAmount('');
            setDescription('');
            Swal.fire({ title: 'Payment Finalized', text: 'The transaction has been successfully recorded.', icon: 'success', background: '#f8fafc', customClass: { popup: 'rounded-[3rem]' } });
        }
    });

    const [payrollSlipId, setPayrollSlipId] = useState<string | null>(null);

    // Fetch payroll amount if Monthly Payroll selected
    useEffect(() => {
        const fetchPendingPayroll = async () => {
            if (selectedCategory === 'Staff Salary' && salaryOption === 'Monthly Payroll' && selectedStaffId) {
                try {
                    const txDate = new Date(date);
                    const month = txDate.getMonth() + 1;
                    const year = txDate.getFullYear();

                    const res = await api.get('/payroll/slips', { 
                        params: { userId: selectedStaffId, year, month } 
                    });
                    
                    const slips = res.data;
                    const pendingSlip = slips.find((s: any) => 
                        ['PENDING', 'DRAFT', 'IN_PROGRESS'].includes(s.status)
                    );

                    if (pendingSlip) {
                        setAmount(pendingSlip.net_pay.toString());
                        setPayrollSlipId(pendingSlip.id);
                        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
                        setDescription(`Monthly Salary for ${monthName} ${year}`);
                    } else {
                        setPayrollSlipId(null);
                    }
                } catch (error) {
                    console.error("Failed to fetch pending payroll:", error);
                    setPayrollSlipId(null);
                }
            } else {
                setPayrollSlipId(null);
            }
        };

        fetchPendingPayroll();
    }, [selectedStaffId, salaryOption, selectedCategory, date]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let targetLedgerId = '';
        let finalDescription = description;

        // 1. Resolve Ledger ID based on Category Logic
        if (selectedCategory === 'Electricity') {
            targetLedgerId = ledgers?.find((l: any) => l.ledger_name === 'Electricity')?.id;
        } else if (selectedCategory === 'Rent') {
            targetLedgerId = ledgers?.find((l: any) => l.ledger_name === selectedRentType)?.id;
        } else if (selectedCategory === 'Meta Recharge') {
            targetLedgerId = ledgers?.find((l: any) => l.ledger_name === 'Meta Ad Account')?.id;
            const client = clients?.find((c: any) => c.id === selectedClientId);
            finalDescription = `Meta Recharge for ${client?.name}. ${description}`;
        } else if (selectedCategory === 'Staff Salary') {
            // Find Staff's own ledger
            const staffMember = staff?.find((s: any) => s.id === selectedStaffId);
            targetLedgerId = ledgers?.find((l: any) => l.entity_id === selectedStaffId)?.id;
            finalDescription = `${salaryOption} for ${staffMember?.full_name}. ${description}`;
        } else {
            // Map by predefined ledger name
            const cat = EXPENSE_CATEGORIES.find(c => c.name === selectedCategory);
            targetLedgerId = ledgers?.find((l: any) => l.ledger_name === cat?.ledger)?.id;
        }

        if (!targetLedgerId) {
            Swal.fire('Ledger Not Found', `Please ensure the ledger for ${selectedCategory} is created.`, 'error');
            return;
        }

        // 2. Handle Meta Recharge double effect (User: "effected to Meta Ad account and client ledger")
        if (selectedCategory === 'Meta Recharge') {
            // Record in Meta Ad Account
            await recordMutation.mutateAsync({
                ledger_id: targetLedgerId,
                transaction_type: 'EXPENSE',
                category: 'Meta Recharge',
                amount: parseFloat(amount),
                date: new Date(date),
                description: finalDescription
            });

            // Record in Client Ledger
            const clientLedgerId = ledgers?.find((l: any) => l.entity_id === selectedClientId)?.id;
            if (clientLedgerId) {
                await recordMutation.mutateAsync({
                    ledger_id: clientLedgerId,
                    transaction_type: 'EXPENSE', // It's an expense for the client context
                    category: 'Meta Recharge',
                    amount: parseFloat(amount),
                    date: new Date(date),
                    description: `Recharge recorded via Meta Ad Account.`
                });
            }
        } else if (selectedCategory === 'Staff Salary' && salaryOption === 'Advance Salary') {
            // Advance Salary Logic: Post to staff ledger and mark as advance
            await recordMutation.mutateAsync({
                ledger_id: targetLedgerId,
                transaction_type: 'EXPENSE',
                category: 'Staff Salary',
                sub_type: 'Advance Salary',
                amount: parseFloat(amount),
                date: new Date(date),
                description: finalDescription
            });
        } else {
            // Standard Recording
            recordMutation.mutate({
                ledger_id: targetLedgerId,
                transaction_type: 'EXPENSE',
                category: selectedCategory,
                amount: parseFloat(amount),
                date: new Date(date),
                description: finalDescription,
                payroll_slip_id: selectedCategory === 'Staff Salary' && salaryOption === 'Monthly Payroll' ? payrollSlipId : undefined
            });
        }
    };

    const activeCat = EXPENSE_CATEGORIES.find(c => c.name === selectedCategory);

    const handleCategoryClick = (categoryName: string) => {
        window.open(`/accounts/category-transactions/${encodeURIComponent(categoryName)}`, '_blank', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no');
    };

    if (isLoading) return <div className="p-20 text-center animate-pulse text-slate-400 font-black tracking-widest uppercase">Initializing Expense Engine...</div>;


    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Recording Form */}
            <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-50 p-8 rounded-[3.5rem] border-2 border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    
                    <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <ArrowDownRight className="w-6 h-6 text-rose-500" /> Record Movement
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Primary Category</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {EXPENSE_CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.name}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat.name)}
                                            className={`p-4 rounded-3xl flex flex-col items-center gap-2 border-2 transition-all duration-300 ${
                                                selectedCategory === cat.name 
                                                    ? 'border-purple-600 bg-white shadow-xl shadow-purple-100 scale-105' 
                                                    : 'border-transparent bg-white/50 hover:bg-white hover:border-slate-200'
                                            }`}
                                        >
                                            <cat.icon className={`w-5 h-5 ${cat.color}`} />
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight">{cat.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sub-selectors Based on Logic */}
                            {selectedCategory === 'Rent' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 p-6 bg-white rounded-3xl border-2 border-purple-50 shadow-sm">
                                    <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest px-1">Select Rent Purpose</label>
                                    <div className="flex gap-2">
                                        {['Office Rent', 'Accommodation Rent'].map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setSelectedRentType(r as any)}
                                                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    selectedRentType === r ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                                }`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedCategory === 'Meta Recharge' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 p-6 bg-white rounded-3xl border-2 border-emerald-50 shadow-sm">
                                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Client Linking</label>
                                    <select 
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none font-bold text-slate-700"
                                        value={selectedClientId}
                                        onChange={(e) => setSelectedClientId(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Client Account...</option>
                                        {clients?.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedCategory === 'Staff Salary' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4 p-6 bg-white rounded-3xl border-2 border-violet-50 shadow-sm">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-violet-600 uppercase tracking-widest px-1">Staff Member</label>
                                        <select 
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none font-bold text-slate-700"
                                            value={selectedStaffId}
                                            onChange={(e) => setSelectedStaffId(e.target.value)}
                                            required
                                        >
                                            <option value="">Select Personnel...</option>
                                            {staff?.map((s: any) => (
                                                <option key={s.id} value={s.id}>{s.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Salary Component</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['Monthly Payroll', 'Advance Salary', 'Final Settlement'].map(opt => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => setSalaryOption(opt as any)}
                                                    className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all border-2 ${
                                                        salaryOption === opt ? 'bg-violet-600 border-violet-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (₹)</label>
                                        {payrollSlipId && (
                                            <span className="text-[8px] font-black bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                                                Payroll Linked
                                            </span>
                                        )}
                                    </div>
                                    <input 
                                        type="number"
                                        className="w-full bg-white border-2 border-slate-100 rounded-3xl px-6 py-4 focus:border-purple-500 outline-none font-black text-lg text-slate-900"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Transaction Date</label>
                                    <input 
                                        type="date"
                                        className="w-full bg-white border-2 border-slate-100 rounded-3xl px-6 py-4 focus:border-purple-500 outline-none font-bold text-slate-700"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Narrative / Notes</label>
                                <textarea 
                                    className="w-full bg-white border-2 border-slate-100 rounded-3xl px-6 py-4 focus:border-purple-500 outline-none font-medium text-slate-600 h-32"
                                    placeholder="Brief explanation for this disbursement..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={recordMutation.isPending}
                            className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] hover:bg-purple-600 transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {recordMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm Payment'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Right: Summary View */}
            <div className="lg:col-span-7 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Categorized Expenditures</h2>
                        <p className="text-slate-500 font-medium">Real-time distribution of agency operational costs.</p>
                    </div>
                    <button className="flex items-center gap-3 text-white font-black text-xs bg-black px-8 py-4 rounded-2xl uppercase tracking-widest hover:bg-purple-600 transition-all">
                        <BarChart3 className="w-4 h-4" /> Comprehensive Audit
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {EXPENSE_CATEGORIES.map((cat) => {
                        const catData = summary?.find((s: any) => s.category === cat.name);
                        return (
                            <div 
                                key={cat.name} 
                                onClick={() => handleCategoryClick(cat.name)}
                                className="bg-white border-2 border-slate-50 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`${cat.bg} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
                                        <cat.icon className={`w-6 h-6 ${cat.color}`} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{catData?.count || 0} Events</p>
                                        <div className="flex items-center gap-1 justify-end mt-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Active Tracking</span>
                                        </div>
                                    </div>
                                </div>
                                <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.15em] mb-1">{cat.name}</h3>
                                <p className="text-2xl font-black text-slate-900 tracking-tight">
                                    {formatCurrency(catData?.total || 0)}
                                </p>
                            </div>
                        );
                    })}
                </div>
                
                <div className="bg-purple-900 p-12 rounded-[3.5rem] text-white flex justify-between items-center shadow-3xl shadow-purple-100 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-800 to-transparent opacity-50"></div>
                    <div className="relative z-10">
                        <p className="text-purple-300 text-xs font-black uppercase tracking-[0.25em]">Aggregated Monthly Expenditure</p>
                        <h4 className="text-5xl font-black mt-2 tracking-tighter">
                            {formatCurrency(summary?.reduce((sum: number, s: any) => sum + s.total, 0) || 0)}
                        </h4>
                    </div>
                    <div className="relative z-10 bg-white/10 p-6 rounded-full group-hover:scale-110 transition-transform duration-500">
                        <Receipt className="w-16 h-16 text-purple-300" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseManagement;
