import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { 
    CalendarIcon, Wallet, ArrowDownCircle, ArrowUpCircle, X, 
    Briefcase, FileText, UserCheck, Tag, Coffee, Home, Droplet, 
    Paperclip, Monitor, Gift 
} from 'lucide-react';
import Swal from 'sweetalert2';

// Form Schema
const formSchema = z.object({
    date: z.string(),
    description: z.string().min(3, "Description is required"),
    amount: z.number().min(1, "Amount must be positive"),
    type: z.enum(['EXPENSE', 'INCOME']),
    payment_mode_id: z.string().min(1, "Payment Mode is required"),
    category_id: z.string().optional(),
    reference: z.string().optional(),
    nature: z.string(),
    entity_id: z.string().optional(),
    sub_category: z.string().optional() // For Petty/Rent
});

type FormData = z.infer<typeof formSchema>;

const TransactionEntry = () => {
    const queryClient = useQueryClient();
    const [selectedAction, setSelectedAction] = useState<any>(null);

    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            type: 'EXPENSE',
            nature: 'GENERAL',
            amount: 0
        }
    });

    const isExpense = watch('type') === 'EXPENSE';
    const currentNature = watch('nature');

    // Fetch Data
    const { data: ledgers, isLoading: isLoadingLedgers } = useQuery({
        queryKey: ['ledgers'],
        queryFn: async () => (await api.get('/accounting/ledgers')).data
    });

    const { data: clients } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => (await api.get('/clients')).data
    });

    const { data: staff } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users');
            return res.data.filter((u: any) => u.role !== 'CLIENT');
        }
    });

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/accounting/transactions', data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            
            Swal.fire({
                title: 'Transaction Recorded!',
                text: `Transaction ${data.data?.transaction_number || ''} recorded successfully.`,
                icon: 'success',
                confirmButtonColor: '#10b981',
                confirmButtonText: 'Great!'
            });
            
            closeModal();
        },
        onError: (err: any) => {
            const serverMsg = err.response?.data?.message || "Transaction Failed";
            Swal.fire({
                title: 'Error',
                text: serverMsg,
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        }
    });

    const handleOpenModal = (action: any, type: 'EXPENSE' | 'INCOME') => {
        setSelectedAction(action);
        reset({
            date: format(new Date(), 'yyyy-MM-dd'),
            type,
            nature: action.nature,
            amount: 0,
            description: action.label,
            reference: ''
        });
    };

    const closeModal = () => {
        setSelectedAction(null);
        reset();
    };

    // Filtered Ledgers
    const paymentModes = ledgers?.filter((l: any) => ['BANK', 'CASH'].includes(l.entity_type)) || [];
    const expenseLedgers = ledgers?.filter((l: any) => l.head?.type === 'EXPENSE' && !['BANK', 'CASH', 'CLIENT', 'USER'].includes(l.entity_type)) || [];
    const incomeLedgers = ledgers?.filter((l: any) => l.head?.type === 'INCOME' && !['BANK', 'CASH', 'CLIENT', 'USER'].includes(l.entity_type)) || [];

    const onSubmit = async (data: FormData) => {
        let from_ledger_id = '';
        let to_ledger_id = '';
        let final_entity_id = data.entity_id;

        // Auto-resolve ledgers based on nature
        if (data.type === 'EXPENSE') {
            from_ledger_id = data.payment_mode_id; // Credit Bank
            to_ledger_id = data.category_id || ''; // Debit Expense/Entity

            if (data.nature === 'SALARY_ADVANCE' || data.nature === 'STAFF_INCENTIVE') {
                const staffLedger = ledgers?.find((l: any) => l.entity_type === 'USER' && l.entity_id === data.entity_id);
                if (!staffLedger) return Swal.fire('Error', 'Ledger not found for selected Staff.', 'error');
                to_ledger_id = staffLedger.id;
                if(data.nature === 'STAFF_INCENTIVE') {
                    // Change reference to user ID for payroll sync
                    data.reference = data.entity_id;
                }
            } else if (data.nature === 'META_RECHARGE_EXPENSE') {
                const clientLedger = ledgers?.find((l: any) => l.entity_type === 'CLIENT' && l.entity_id === data.entity_id);
                if (!clientLedger) return Swal.fire('Error', 'Ledger not found for selected Client.', 'error');
                to_ledger_id = clientLedger.id;
            } else if (data.nature === 'PETTY_EXPENSE' || data.nature === 'RENT') {
                // Find ledger by name matching the sub_category
                const targetName = data.sub_category;
                let targetLedger = ledgers?.find((l: any) => l.name.toLowerCase().includes(targetName?.toLowerCase() || ''));
                if(!targetLedger) return Swal.fire('Error', `Specific ledger not found for ${targetName}. Please create it first.`, 'error');
                to_ledger_id = targetLedger.id;
            }

            if (!to_ledger_id) return Swal.fire('Error', 'Please specify the Expense Account.', 'error');

        } else {
            // INCOME
            to_ledger_id = data.payment_mode_id; // Debit Bank
            from_ledger_id = data.category_id || ''; // Credit Income/Entity

            if (['ADVANCE_RECEIVED', 'DM_SERVICE_CHARGE', 'META_RECHARGE_INCOME'].includes(data.nature)) {
                const clientLedger = ledgers?.find((l: any) => l.entity_type === 'CLIENT' && l.entity_id === data.entity_id);
                if (!clientLedger) return Swal.fire('Error', 'Ledger not found for selected Client.', 'error');
                from_ledger_id = clientLedger.id;
            } else if (['BRANDING_WORKS', 'OTHER_SERVICE_CHARGE'].includes(data.nature)) {
                // Find Income Ledger by Nature
                let targetName = data.nature === 'BRANDING_WORKS' ? 'Branding' : 'Service Charge';
                let targetLedger = ledgers?.find((l: any) => l.name.toLowerCase().includes(targetName.toLowerCase()) && l.head?.type === 'INCOME');
                if(!targetLedger) return Swal.fire('Error', `Specific Income ledger not found for ${targetName}. Please create it first.`, 'error');
                from_ledger_id = targetLedger.id;
            }

            if (!from_ledger_id) return Swal.fire('Error', 'Please specify the Income Account.', 'error');
        }

        mutation.mutate({
            ...data,
            from_ledger_id,
            to_ledger_id
        });
    };

    if (isLoadingLedgers) return <div className="p-8 text-center bg-background text-foreground">Loading System Financial Data...</div>;

    const expenseActions = [
        { label: 'General Expenses', nature: 'GENERAL_EXPENSE', icon: Wallet, color: 'bg-rose-100 text-rose-600' },
        { label: 'Salary Advance', nature: 'SALARY_ADVANCE', icon: UserCheck, color: 'bg-orange-100 text-orange-600' },
        { label: 'Staff Incentives', nature: 'STAFF_INCENTIVE', icon: Gift, color: 'bg-yellow-100 text-yellow-600' },
        { label: 'Meta Recharge', nature: 'META_RECHARGE_EXPENSE', icon: Tag, color: 'bg-red-100 text-red-600' },
        { label: 'Petty Expenses', nature: 'PETTY_EXPENSE', icon: Coffee, color: 'bg-pink-100 text-pink-600' },
        { label: 'Rent Payments', nature: 'RENT', icon: Home, color: 'bg-fuchsia-100 text-fuchsia-600' },
    ];

    const incomeActions = [
        { label: 'General Income', nature: 'GENERAL_INCOME', icon: Briefcase, color: 'bg-emerald-100 text-emerald-600' },
        { label: 'Advance Received', nature: 'ADVANCE_RECEIVED', icon: FileText, color: 'bg-teal-100 text-teal-600' },
        { label: 'DM Service Charge', nature: 'DM_SERVICE_CHARGE', icon: Monitor, color: 'bg-cyan-100 text-cyan-600' },
        { label: 'Meta Recharge', nature: 'META_RECHARGE_INCOME', icon: Tag, color: 'bg-sky-100 text-sky-600' },
        { label: 'Branding Works', nature: 'BRANDING_WORKS', icon: Paperclip, color: 'bg-blue-100 text-blue-600' },
        { label: 'Other Service Charge', nature: 'OTHER_SERVICE_CHARGE', icon: Briefcase, color: 'bg-indigo-100 text-indigo-600' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col items-center mb-8">
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Record Transaction Dashboard</h1>
                <p className="text-muted-foreground mt-2">Select a transaction category to proceed with auto-mapped accounting rules.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* EXPENSES BOARD */}
                <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                    <div className="bg-red-50 dark:bg-red-950/20 px-6 py-4 border-b">
                        <div className="flex items-center gap-3">
                            <ArrowUpCircle className="text-red-500 w-6 h-6" />
                            <h2 className="text-xl font-bold text-red-600 dark:text-red-400">EXPENSES (OUT)</h2>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-4">
                        {expenseActions.map(action => (
                            <button 
                                key={action.nature} 
                                onClick={() => handleOpenModal(action, 'EXPENSE')}
                                className="group flex flex-col items-center justify-center p-6 bg-background rounded-xl border hover:border-red-500/50 hover:shadow-md transition-all"
                            >
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${action.color}`}>
                                    <action.icon className="w-7 h-7" />
                                </div>
                                <span className="font-semibold text-sm text-center">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* INCOME BOARD */}
                <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                    <div className="bg-green-50 dark:bg-green-950/20 px-6 py-4 border-b">
                        <div className="flex items-center gap-3">
                            <ArrowDownCircle className="text-green-500 w-6 h-6" />
                            <h2 className="text-xl font-bold text-green-600 dark:text-green-400">INCOME (IN)</h2>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-4">
                        {incomeActions.map(action => (
                            <button 
                                key={action.nature} 
                                onClick={() => handleOpenModal(action, 'INCOME')}
                                className="group flex flex-col items-center justify-center p-6 bg-background rounded-xl border hover:border-green-500/50 hover:shadow-md transition-all"
                            >
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${action.color}`}>
                                    <action.icon className="w-7 h-7" />
                                </div>
                                <span className="font-semibold text-sm text-center">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* TRANSACTION MODAL */}
            {selectedAction && (
                <div className="relative z-50">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" onClick={closeModal} />
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <div className="w-full max-w-lg rounded-2xl bg-card border shadow-2xl p-6">
                            <div className="text-xl font-bold flex items-center justify-between mb-6 pb-4 border-b">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedAction.color}`}>
                                        <selectedAction.icon className="w-5 h-5" />
                                    </div>
                                    <span>{selectedAction.label} Entry</span>
                                </div>
                                <button onClick={closeModal} className="text-muted-foreground hover:bg-muted p-2 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            
                            {/* Standard Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Date</label>
                                    <div className="relative">
                                        <input type="date" className="w-full bg-background border rounded-lg px-3 py-2 pl-9 focus:ring-2 focus:ring-primary/20" {...register('date')} />
                                        <CalendarIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Amount (₹)</label>
                                    <input type="number" step="0.01" className="w-full bg-background border rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-primary/20 text-lg" {...register('amount', { valueAsNumber: true })} />
                                    {errors.amount && <span className="text-red-500 text-xs">{errors.amount.message}</span>}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Description</label>
                                <input type="text" className="w-full bg-background border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20" {...register('description')} />
                                {errors.description && <span className="text-red-500 text-xs">{errors.description.message}</span>}
                            </div>

                            {/* Dynamic Fields Based on Nature */}
                            <div className="bg-muted/50 p-4 rounded-xl space-y-4 border border-muted">
                                
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">{isExpense ? "Paid From (Bank/Cash)" : "Received In (Bank/Cash)"}</label>
                                    <select className="w-full bg-background border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20" {...register('payment_mode_id')}>
                                        <option value="">Select Mode</option>
                                        {paymentModes.map((l: any) => <option key={l.id} value={l.id}>{l.name} ({l.entity_type})</option>)}
                                    </select>
                                    {errors.payment_mode_id && <span className="text-red-500 text-xs">{errors.payment_mode_id.message}</span>}
                                </div>

                                {/* GENERAL Category Logic */}
                                {(currentNature === 'GENERAL_EXPENSE' || currentNature === 'GENERAL_INCOME') && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">{isExpense ? "Expense Ledger" : "Income Ledger"}</label>
                                        <select className="w-full bg-background border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20" {...register('category_id')}>
                                            <option value="">Select Ledger</option>
                                            {(isExpense ? expenseLedgers : incomeLedgers).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* STAFF Specific Logic */}
                                {['SALARY_ADVANCE', 'STAFF_INCENTIVE'].includes(currentNature) && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-blue-600">Select Staff Member</label>
                                        <select className="w-full bg-blue-50/50 border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20" {...register('entity_id')}>
                                            <option value="">Choose Staff...</option>
                                            {staff?.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                                        </select>
                                        <p className="text-xs text-muted-foreground mt-1">※ Auto-syncs with Payroll deductions & earnings.</p>
                                    </div>
                                )}

                                {/* CLIENT Specific Logic */}
                                {['ADVANCE_RECEIVED', 'DM_SERVICE_CHARGE', 'META_RECHARGE_EXPENSE', 'META_RECHARGE_INCOME'].includes(currentNature) && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-emerald-600">Select Client</label>
                                        <select className="w-full bg-emerald-50/50 border-emerald-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500/20" {...register('entity_id')}>
                                            <option value="">Choose Client...</option>
                                            {clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <p className="text-xs text-muted-foreground mt-1">※ Updates Client Statement automatically.</p>
                                    </div>
                                )}

                                {/* PETTY EXPENSE Predefined */}
                                {currentNature === 'PETTY_EXPENSE' && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Expense Category</label>
                                        <select className="w-full bg-background border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20" {...register('sub_category')}>
                                            <option value="">Select...</option>
                                            <option value="Water">Water Bottle</option>
                                            <option value="Stationary">Office Stationary</option>
                                            <option value="Maintenance">Office Maintenance</option>
                                            <option value="Refreshment">Refreshments / Snacks</option>
                                        </select>
                                    </div>
                                )}

                                {/* RENT Predefined */}
                                {currentNature === 'RENT' && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Rent Type</label>
                                        <select className="w-full bg-background border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20" {...register('sub_category')}>
                                            <option value="">Select...</option>
                                            <option value="Office Rent">Office Rent</option>
                                            <option value="Room Rent">Staff Room Rent</option>
                                        </select>
                                    </div>
                                )}

                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Reference Code (Optional)</label>
                                <input type="text" placeholder="Cheque # / UPI Ref" className="w-full bg-background border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20" {...register('reference')} />
                            </div>

                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none 
                                    ${isExpense ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'}`}
                            >
                                {mutation.isPending ? "Processing Transaction..." : `Record ${isExpense ? 'Expense' : 'Income'}`}
                                </button>

                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionEntry;
