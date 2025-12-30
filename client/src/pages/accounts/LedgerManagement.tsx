import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Plus, Search, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// --- Types ---
type Ledger = {
    id: string;
    name: string;
    head: { id: string; name: string; type: string };
    entity_type: string;
    balance: number;
    status: string;
    description?: string;
};

type AccountHead = {
    id: string;
    name: string;
    code: string;
    type: string;
};

// --- Form Schema ---
const ledgerSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    head_id: z.string().uuid("Account Head is required"),
    entity_type: z.string().min(1, "Type is required"), // Dropdown
    description: z.string().optional(),
    opening_balance: z.number().optional(),
});
type LedgerFormData = z.infer<typeof ledgerSchema>;


const LedgerManagement = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');

    // --- State ---
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);
    const [deletingLedger, setDeletingLedger] = useState<Ledger | null>(null);

    // --- Queries ---
    const { data: ledgers, isLoading: isLoadingLedgers } = useQuery({
        queryKey: ['ledgers'],
        queryFn: async () => (await api.get('/accounting/ledgers')).data
    });

    const { data: heads } = useQuery({
        queryKey: ['accountHeads'],
        queryFn: async () => (await api.get('/accounting/heads')).data
    });

    // --- Mutations ---
    const createMutation = useMutation({
        mutationFn: (data: LedgerFormData) => api.post('/accounting/ledgers', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            setIsCreateOpen(false);
        },
        onError: (err: any) => alert("Failed to create: " + (err.response?.data?.message || err.message))
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: string; payload: Partial<LedgerFormData> }) => api.put(`/accounting/ledgers/${data.id}`, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            setEditingLedger(null);
        },
        onError: (err: any) => alert("Failed to update: " + (err.response?.data?.message || err.message))
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/accounting/ledgers/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            setDeletingLedger(null);
        },
        onError: (err: any) => alert("Failed to delete: " + (err.response?.data?.message || err.message))
    });

    // --- Helpers ---
    const filteredLedgers = ledgers?.filter((l: Ledger) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.head.name.toLowerCase().includes(search.toLowerCase())
    );

    const getBalanceColor = (balance: number) => balance >= 0 ? 'text-green-600' : 'text-red-600';


    // --- Render ---
    if (isLoadingLedgers) return <div>Loading Ledgers...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Ledger Master List</h1>
                    <p className="text-muted-foreground">Manage your chart of accounts.</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                >
                    <Plus className="w-4 h-4" /> Create Account
                </button>
            </div>

            <div className="flex gap-4 items-center bg-card p-4 rounded-lg border">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search ledgers..."
                    className="bg-transparent outline-none flex-1"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Table View */}
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground font-medium border-b">
                        <tr>
                            <th className="px-4 py-3">Account Name</th>
                            <th className="px-4 py-3">Group (Head)</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3 text-right">Balance</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredLedgers?.map((ledger: Ledger) => (
                            <tr key={ledger.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3 font-medium">{ledger.name}</td>
                                <td className="px-4 py-3 text-muted-foreground">{ledger.head.name}</td>
                                <td className="px-4 py-3 text-muted-foreground text-xs uppercase">{ledger.entity_type}</td>
                                <td className={`px-4 py-3 text-right font-mono ${getBalanceColor(ledger.balance)}`}>
                                    {formatCurrency(ledger.balance)}
                                </td>
                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                    <button
                                        onClick={() => setEditingLedger(ledger)}
                                        className="p-1 hover:bg-secondary rounded text-blue-600"
                                        title="Edit"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setDeletingLedger(ledger)}
                                        className="p-1 hover:bg-secondary rounded text-red-600"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!filteredLedgers?.length && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">No ledgers found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            {(isCreateOpen || editingLedger) && (
                <LedgerFormModal
                    isOpen={true}
                    mode={editingLedger ? 'EDIT' : 'CREATE'}
                    initialData={editingLedger || undefined}
                    heads={heads || []}
                    onClose={() => { setIsCreateOpen(false); setEditingLedger(null); }}
                    onSubmit={(data: any) => {
                        if (editingLedger) {
                            updateMutation.mutate({ id: editingLedger.id, payload: data });
                        } else {
                            createMutation.mutate(data);
                        }
                    }}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingLedger && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-md rounded-lg shadow-lg border p-6 space-y-4">
                        <div className="flex items-center gap-3 text-destructive">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="font-semibold text-lg">Delete Account?</h3>
                        </div>
                        <p className="text-muted-foreground">
                            Are you sure you want to delete <strong>{deletingLedger.name}</strong>?
                            This action cannot be undone. If there are existing transactions, deletion will fail.
                        </p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setDeletingLedger(null)}
                                className="px-4 py-2 rounded-md hover:bg-muted"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate(deletingLedger.id)}
                                disabled={deleteMutation.isPending}
                                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                            >
                                {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-Component: Form Modal ---
const LedgerFormModal = ({ isOpen, mode, initialData, heads, onClose, onSubmit, isLoading }: any) => {
    const { register, handleSubmit, formState: { errors } } = useForm<LedgerFormData>({
        resolver: zodResolver(ledgerSchema),
        defaultValues: {
            name: initialData?.name || '',
            head_id: initialData?.head.id || '',
            entity_type: initialData?.entity_type || 'INCOME', // Default to Income usually safe
            description: initialData?.description || '',
            opening_balance: initialData?.balance || 0
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-2xl rounded-lg shadow-lg border p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">{mode === 'CREATE' ? 'New Account' : 'Edit Account'}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Account Name</label>
                        <input className="w-full bg-background border rounded-md px-3 py-2" {...register('name')} placeholder="e.g. Office Rent" />
                        {errors.name && <span className="text-destructive text-xs">{errors.name.message}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Account Group (Head)</label>
                            <select className="w-full bg-background border rounded-md px-3 py-2" {...register('head_id')}>
                                <option value="">Select Group...</option>
                                {heads.map((h: AccountHead) => (
                                    <option key={h.id} value={h.id}>{h.name}</option>
                                ))}
                            </select>
                            {errors.head_id && <span className="text-destructive text-xs">{errors.head_id.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <select className="w-full bg-background border rounded-md px-3 py-2" {...register('entity_type')}>
                                <option value="INCOME">Income</option>
                                <option value="EXPENSE">Expense</option>
                                <option value="ASSET">Asset (Fixed/Current)</option>
                                <option value="LIABILITY">Liability</option>
                                <option value="EQUITY">Equity</option>
                                <option value="BANK">Bank</option>
                                <option value="CASH">Cash</option>
                                <option value="VENDOR">Vendor</option>
                            </select>
                            {errors.entity_type && <span className="text-destructive text-xs">{errors.entity_type.message}</span>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <input className="w-full bg-background border rounded-md px-3 py-2" {...register('description')} placeholder="Optional description" />
                    </div>

                    <div className="space-y-2 bg-muted/50 p-3 rounded-md">
                        <label className="text-sm font-medium">
                            {mode === 'CREATE' ? "Opening Balance" : "Current Balance (Adjustment)"}
                        </label>
                        <input
                            type="number"
                            className="w-full bg-background border rounded-md px-3 py-2"
                            {...register('opening_balance', { valueAsNumber: true })}
                            placeholder="0.00"
                        />
                        <p className="text-xs text-muted-foreground">
                            {mode === 'CREATE'
                                ? "Will create an opening journal entry."
                                : "Updating this will create a manual adjustment transaction."}
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 hover:bg-muted rounded-md text-sm">Cancel</button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                        >
                            {isLoading ? "Saving..." : (mode === 'CREATE' ? "Create Account" : "Update Account")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LedgerManagement;
