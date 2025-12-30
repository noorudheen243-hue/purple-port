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
    type: z.enum(['EXPENSE', 'INCOME']), // Restricted to two types
    payment_mode_id: z.string().min(1, "Payment Mode is required"), // Bank/Cash
    category_id: z.string().min(1, "Ledger Account is required"), // Income/Expense Ledger
    reference: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

const TransactionEntry = () => {
    const queryClient = useQueryClient();
    const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            type: 'EXPENSE',
            amount: 0
        }
    });

    const { data: ledgers, isLoading } = useQuery({
        queryKey: ['ledgers'],
        queryFn: async () => (await api.get('/accounting/ledgers')).data
    });

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/accounting/transactions', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            alert("Transaction Recorded Successfully!");
            reset({
                date: format(new Date(), 'yyyy-MM-dd'),
                type: 'EXPENSE', // Reset to default
                amount: 0,
                description: '',
                reference: ''
            });
        },
        onError: (err: any) => {
            alert("Failed: " + (err.response?.data?.message || err.message));
        }
    });

    // Formatting Logic
    const transactionType = watch('type');
    const isExpense = transactionType === 'EXPENSE';

    // 1. Filter Payment Modes (Bank & Cash)
    const paymentModes = ledgers?.filter((l: any) =>
        ['BANK', 'CASH'].includes(l.entity_type)
    ) || [];

    // 2. Filter Category Ledgers (Everything ELSE)
    // For Expense: Show Expenses, Liabilities?
    // For Income: Show Income?
    // Or just show all non-bank? Prompt says "select ledger account from drop down list".
    // I will filter based on type for better UX.
    const categoryLedgers = ledgers?.filter((l: any) => {
        if (['BANK', 'CASH'].includes(l.entity_type)) return false; // Exclude banks from category list

        // Optional: Stricter filtering
        // if (isExpense) return ['EXPENSE', 'LIABILITY', 'ADJUSTMENT'].includes(l.head.type);
        // if (!isExpense) return ['INCOME', 'ASSET', 'ADJUSTMENT'].includes(l.head.type);
        return true;
    }) || [];


    const onSubmit = (data: FormData) => {
        // Map Form Data to API Schema (single -> double entry mapping)

        const payload = {
            date: data.date,
            description: data.description,
            amount: data.amount,
            type: data.type, // 'EXPENSE' or 'INCOME'
            reference: data.reference,

            // Map Ledgers
            from_ledger_id: isExpense ? data.payment_mode_id : data.category_id,
            to_ledger_id: isExpense ? data.category_id : data.payment_mode_id,
        };

        mutation.mutate(payload);
    };

    if (isLoading) return <div>Loading Ledgers...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Record Transaction</h1>
                <p className="text-muted-foreground">Single-entry mode: Record Income or Expenses.</p>
            </div>

            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    {/* Top Row: Type Selection */}
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
                            {errors.date && <span className="text-destructive text-xs">{errors.date.message}</span>}
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
                            placeholder={isExpense ? "e.g. Paid Electricity Bill" : "e.g. Received Client Payment"}
                            className="w-full bg-background border rounded-md px-3 py-2"
                            {...register('description')}
                        />
                        {errors.description && <span className="text-destructive text-xs">{errors.description.message}</span>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        {/* Left Side: Cash/Bank Selection */}
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

                        {/* Right Side: Ledger Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                {isExpense ? "Expense Account" : "Income Account"}
                            </label>
                            <select className="w-full bg-background border rounded-md px-3 py-2" {...register('category_id')}>
                                <option value="">Select Ledger Account</option>
                                {categoryLedgers.map((l: any) => (
                                    <option key={l.id} value={l.id}>{l.name} ({l.head.name})</option>
                                ))}
                            </select>
                            {errors.category_id && <span className="text-destructive text-xs">{errors.category_id.message}</span>}
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
                        {mutation.isPending ? "Processing..." : (isExpense ? "Record Expense" : "Record Income")}
                    </button>

                </form>
            </div>
        </div>
    );
};

export default TransactionEntry;
