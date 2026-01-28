import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

// Form Schema
const formSchema = z.object({
    date: z.string(),
    description: z.string().min(3, "Description is required"),
    amount: z.number().min(1, "Amount must be positive"),
    type: z.enum(['EXPENSE', 'INCOME']),
    payment_mode_id: z.string().min(1, "Payment Mode is required"), // Bank/Cash
    category_id: z.string().optional(), // Made optional for Advances
    reference: z.string().optional(),
    nature: z.enum(['GENERAL', 'ADVANCE_RECEIVED', 'ADVANCE_PAID']),
    entity_id: z.string().optional() // Client ID or Staff ID
});

type FormData = z.infer<typeof formSchema>;

const TransactionEntry = () => {
    const queryClient = useQueryClient();
    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            type: 'EXPENSE',
            nature: 'GENERAL',
            amount: 0
        }
    });

    // Watchers for conditional logic
    const nature = watch('nature');
    const type = watch('type');
    const isExpense = type === 'EXPENSE';

    // Fetch Data
    const { data: ledgers, isLoading: isLoadingLedgers } = useQuery({
        queryKey: ['ledgers'],
        queryFn: async () => (await api.get('/accounting/ledgers')).data
    });

    const { data: clients } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => (await api.get('/clients')).data,
        enabled: nature === 'ADVANCE_RECEIVED'
    });

    const { data: staff } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users');
            // Filter out external users (Clients)
            return res.data.filter((u: any) => u.role !== 'CLIENT');
        },
        enabled: nature === 'ADVANCE_PAID'
    });

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/accounting/transactions', data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            const txId = data.data.transaction_number || 'Recorded';
            alert(`Transaction ${txId} Recorded Successfully!`);
            reset({
                date: format(new Date(), 'yyyy-MM-dd'),
                type: 'EXPENSE',
                nature: 'GENERAL',
                amount: 0,
                description: '',
                reference: ''
            });
        },
        onError: (err: any) => {
            const serverMsg = err.response?.data?.message || "Transaction Failed";
            const serverDetail = err.response?.data?.error || err.message;
            alert(`❌ Error: ${serverMsg}\nDetails: ${serverDetail}`);
        }
    });

    // Effects for Auto-switching Type based on Nature
    React.useEffect(() => {
        if (nature === 'ADVANCE_RECEIVED') {
            setValue('type', 'INCOME');
        } else if (nature === 'ADVANCE_PAID') {
            setValue('type', 'EXPENSE');
        }
    }, [nature, setValue]);


    // Filtering Logic
    const paymentModes = ledgers?.filter((l: any) =>
        ['BANK', 'CASH'].includes(l.entity_type)
    ) || [];

    const categoryLedgers = ledgers?.filter((l: any) => {
        if (['BANK', 'CASH'].includes(l.entity_type)) return false;
        // Filtering for specific types could be added here
        return true;
    }) || [];


    const onSubmit = async (data: FormData) => {
        let from_ledger_id = '';
        let to_ledger_id = '';
        let final_entity_id = data.entity_id;

        if (data.nature === 'GENERAL') {
            if (!data.category_id) {
                alert("Please select a Ledger Account for General transactions.");
                return;
            }
            // Standard Logic
            from_ledger_id = isExpense ? data.payment_mode_id : data.category_id;
            to_ledger_id = isExpense ? data.category_id : data.payment_mode_id;
        }
        else if (data.nature === 'ADVANCE_RECEIVED') {
            if (!data.entity_id) {
                alert("Please select a Client.");
                return;
            }
            // Income Logic: Credit Client, Debit Bank
            // We need the Client's Ledger ID.
            // Assuming 'entity_id' is the Client ID, we must find the corresponding Ledger.
            // In a robust system, we fetch the ledger for this entity.
            // Here, we might need to lookup locally or let backend resolve.
            // Backend 'recordTransaction' expects ledger IDs.

            // Let's Find Ledger for Entity
            const clientLedger = ledgers?.find((l: any) => l.entity_type === 'CLIENT' && l.entity_id === data.entity_id);
            if (!clientLedger) {
                alert("Ledger not found for selected Client. Please ensure client ledger exists.");
                return;
            }

            from_ledger_id = clientLedger.id; // Credit Client
            to_ledger_id = data.payment_mode_id; // Debit Bank
        }
        else if (data.nature === 'ADVANCE_PAID') {
            if (!data.entity_id) {
                alert("Please select a Staff Member.");
                return;
            }
            // Expense Logic: Debit Staff, Credit Bank
            const staffLedger = ledgers?.find((l: any) => l.entity_type === 'USER' && l.entity_id === data.entity_id);
            if (!staffLedger) {
                alert("Ledger not found for selected Staff. Please ensure staff ledger exists.");
                return;
            }

            from_ledger_id = data.payment_mode_id; // Credit Bank
            to_ledger_id = staffLedger.id; // Debit Staff
        }

        const payload = {
            date: data.date,
            description: data.description,
            amount: data.amount,
            type: data.type,
            reference: data.reference,
            nature: data.nature,
            entity_id: final_entity_id,
            from_ledger_id,
            to_ledger_id
        };

        mutation.mutate(payload);
    };

    if (isLoadingLedgers) return <div>Loading System Data...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Record Transaction</h1>
                <p className="text-muted-foreground">Record Income, Expenses, and Advances.</p>
            </div>

            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    {/* Standard Type Selection (Disabled if Advance) */}
                    <div className={`grid grid-cols-2 gap-4 ${nature !== 'GENERAL' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Accounting Entry Type</label>
                            <div className="flex gap-4 p-1 bg-muted rounded-lg">
                                <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md cursor-pointer transition-all ${isExpense ? 'bg-background shadow-sm text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                    <input type="radio" value="EXPENSE" {...register('type')} className="hidden" />
                                    <ArrowUpCircle className="w-4 h-4" />
                                    Expense (Out)
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md cursor-pointer transition-all ${!isExpense ? 'bg-background shadow-sm text-green-600 font-medium' : 'text-muted-foreground'}`}>
                                    <input type="radio" value="INCOME" {...register('type')} className="hidden" />
                                    <ArrowDownCircle className="w-4 h-4" />
                                    Income (In)
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Nature Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium block">Transaction Type</label>
                        <div className="flex gap-4 p-1 bg-muted rounded-lg">
                            {[
                                { value: 'GENERAL', label: 'General' },
                                { value: 'ADVANCE_RECEIVED', label: 'Advance Received (Client)' },
                                { value: 'ADVANCE_PAID', label: 'Advance Paid (Staff)' }
                            ].map(opt => (
                                <label key={opt.value} className={`flex-1 flex items-center justify-center py-2 text-sm rounded-md cursor-pointer transition-all ${nature === opt.value ? 'bg-background shadow-sm font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                                    <input type="radio" value={opt.value} {...register('nature')} className="hidden" />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className="w-full bg-background border rounded-md px-3 py-2 pl-10"
                                    {...register('date')}
                                />
                                <CalendarIcon className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount ({'₹'})</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full bg-background border rounded-md px-3 py-2 font-mono"
                                {...register('amount', { valueAsNumber: true })}
                            />
                            {errors.amount && <span className="text-destructive text-xs">{errors.amount.message}</span>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <input
                            type="text"
                            className="w-full bg-background border rounded-md px-3 py-2"
                            {...register('description')}
                        />
                        {errors.description && <span className="text-destructive text-xs">{errors.description.message}</span>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        {/* Left Side: Cash/Bank Selection (Always valid) */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Wallet className="w-4 h-4" />
                                {isExpense ? "Paid From (Source)" : "Deposit To (Destination)"}
                            </label>
                            <select className="w-full bg-background border rounded-md px-3 py-2" {...register('payment_mode_id')}>
                                <option value="">Select Bank / Cash</option>
                                {paymentModes.map((l: any) => (
                                    <option key={l.id} value={l.id}>{l.name} ({l.entity_type})</option>
                                ))}
                            </select>
                            {errors.payment_mode_id && <span className="text-destructive text-xs">{errors.payment_mode_id.message}</span>}
                        </div>

                        {/* Right Side: Dynamic based on Nature */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                {nature === 'ADVANCE_RECEIVED' ? "Select Client" :
                                    nature === 'ADVANCE_PAID' ? "Select Staff Member" :
                                        (isExpense ? "Expense Account" : "Income Account")}
                            </label>

                            {nature === 'GENERAL' && (
                                <select className="w-full bg-background border rounded-md px-3 py-2" {...register('category_id')}>
                                    <option value="">Select Ledger Account</option>
                                    {categoryLedgers.map((l: any) => (
                                        <option key={l.id} value={l.id}>{l.name} ({l.head.name})</option>
                                    ))}
                                </select>
                            )}

                            {nature === 'ADVANCE_RECEIVED' && (
                                <select className="w-full bg-background border rounded-md px-3 py-2" {...register('entity_id')}>
                                    <option value="">Select Client</option>
                                    {clients?.map((person: any) => (
                                        <option key={person.id} value={person.id}>{person.name}</option>
                                    ))}
                                </select>
                            )}

                            {nature === 'ADVANCE_PAID' && (
                                <select className="w-full bg-background border rounded-md px-3 py-2" {...register('entity_id')}>
                                    <option value="">Select Staff</option>
                                    {staff?.map((person: any) => (
                                        <option key={person.id} value={person.id}>{person.full_name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Reference (Optional)</label>
                        <input
                            type="text"
                            placeholder="Cheque # / UPI Ref"
                            className="w-full bg-background border rounded-md px-3 py-2"
                            {...register('reference')}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className={`w-full py-2 rounded-md font-medium text-white transition-colors disabled:opacity-50 ${isExpense ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {mutation.isPending ? "Processing..." : (nature !== 'GENERAL' ? "Record Advance" : (isExpense ? "Record Expense" : "Record Income"))}
                    </button>

                </form>
            </div>
        </div>
    );
};

export default TransactionEntry;
