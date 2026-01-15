import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';
import { Search, Filter, RefreshCw, Pencil, Trash2, X, Save } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import ConfirmationModal from '../../components/ui/ConfirmationModal'; // Assuming exists, otherwise standard alert

const TransactionHistory = () => {
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [queryParams, setQueryParams] = useState({ limit: 20, start: '', end: '' });

    // Edit/Delete State
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<any>(null);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState<any>(null);

    const [isEditConfirmOpen, setEditConfirmOpen] = useState(false);

    // Fetch Transactions
    const { data: transactions, isLoading, refetch } = useQuery({
        queryKey: ['transactions', queryParams],
        queryFn: async () => {
            const params: any = { limit: queryParams.limit };
            if (queryParams.start) params.start_date = queryParams.start;
            if (queryParams.end) params.end_date = queryParams.end;

            return (await api.get('/accounting/transactions', { params })).data;
        }
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/accounting/transactions/${id}`),
        onSuccess: () => {
            setDeleteModalOpen(false);
            setTransactionToDelete(null);
            refetch();
        },
        onError: (err: any) => alert("Failed to delete: " + err.message)
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => api.put(`/accounting/transactions/${data.id}`, data),
        onSuccess: () => {
            setEditConfirmOpen(false); // Close confirm
            setEditModalOpen(false);   // Close edit form
            setEditingTx(null);
            refetch();
        },
        onError: (err: any) => alert("Failed to update: " + err.message)
    });

    const handleGenerate = () => {
        setQueryParams({
            limit: 100, // Increase limit when filtering
            start: dateRange.start,
            end: dateRange.end
        });
        setTimeout(refetch, 100);
    };

    const confirmDelete = (tx: any) => {
        setTransactionToDelete(tx);
        setDeleteModalOpen(true);
    };

    const openEdit = (tx: any) => {
        // Prepare editable fields
        setEditingTx({
            id: tx.id,
            description: tx.description,
            date: tx.date.split('T')[0], // format for input
            reference: tx.reference,
            amount: tx.amount // Add amount
        });
        setEditModalOpen(true);
    };

    const handleSaveClick = () => {
        if (!editingTx) return;
        setEditConfirmOpen(true);
    };

    const performUpdate = () => {
        updateMutation.mutate({
            id: editingTx.id,
            description: editingTx.description,
            date: new Date(editingTx.date).toISOString(),
            reference: editingTx.reference,
            amount: parseFloat(editingTx.amount)
        });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>

            {/* Filter Bar */}
            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
                    <div className="space-y-2 flex-1">
                        <label className="text-sm font-medium">From Date</label>
                        <input
                            type="date"
                            className="w-full bg-background border rounded-md px-3 py-2"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2 flex-1">
                        <label className="text-sm font-medium">To Date</label>
                        <input
                            type="date"
                            className="w-full bg-background border rounded-md px-3 py-2"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        />
                    </div>
                    <button
                        onClick={handleGenerate}
                        className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2 h-10"
                    >
                        <Filter className="w-4 h-4" /> Generate History
                    </button>
                    <button
                        onClick={() => {
                            setDateRange({ start: '', end: '' });
                            setQueryParams({ limit: 20, start: '', end: '' });
                            refetch();
                        }}
                        className="border px-4 py-2 rounded-md hover:bg-secondary flex items-center gap-2 h-10"
                        title="Reset to Last 20"
                    >
                        <RefreshCw className="w-4 h-4" /> Reset
                    </button>
                </CardContent>
            </Card>

            {/* Transactions Table */}
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground font-medium border-b">
                        <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Debit (To)</th>
                            <th className="px-4 py-3">Credit (From)</th>
                            <th className="px-4 py-3">Ref</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {isLoading ? (
                            <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Loading transactions...</td></tr>
                        ) : transactions?.length === 0 ? (
                            <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No transactions found.</td></tr>
                        ) : (
                            transactions?.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs">{tx.transaction_number || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                                    <td className="px-4 py-3 font-medium">{tx.description}</td>
                                    <td className="px-4 py-3 text-xs uppercase badge">
                                        <span className={`px-2 py-0.5 rounded font-medium ${tx.type === 'INCOME' ? 'bg-green-100 text-green-700 border border-green-200' : tx.type === 'EXPENSE' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-secondary text-foreground'}`}>
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{tx.debit_ledgers}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{tx.credit_ledgers}</td>
                                    <td className="px-4 py-3 text-xs font-mono">{tx.reference || '-'}</td>
                                    <td className={`px-4 py-3 text-right font-mono font-bold ${tx.type === 'INCOME' ? 'text-green-600' : tx.type === 'EXPENSE' ? 'text-red-600' : ''}`}>
                                        {formatCurrency(tx.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                                        <button
                                            onClick={() => openEdit(tx)}
                                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                                            title="Edit Details"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(tx)}
                                            className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors"
                                            title="Delete (Reverse Transaction)"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {!isLoading && transactions?.length >= 20 && !dateRange.start && (
                <div className="text-center text-xs text-muted-foreground pt-2">
                    Showing last 20 transactions. Use date filters to see more.
                </div>
            )}

            {/* Edit Modal - simple implementation inline or component */}
            {isEditModalOpen && editingTx && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background p-6 rounded-lg w-full max-w-md space-y-4 shadow-lg border">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold">Edit Transaction</h3>
                            <button onClick={() => setEditModalOpen(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium">Date</label>
                                <input
                                    type="date"
                                    className="w-full border rounded p-2 bg-background"
                                    value={editingTx.date}
                                    onChange={e => setEditingTx({ ...editingTx, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Description</label>
                                <input
                                    className="w-full border rounded p-2 bg-background"
                                    value={editingTx.description}
                                    onChange={e => setEditingTx({ ...editingTx, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Reference</label>
                                <input
                                    className="w-full border rounded p-2 bg-background"
                                    value={editingTx.reference || ''}
                                    onChange={e => setEditingTx({ ...editingTx, reference: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Amount</label>
                                <input
                                    type="number"
                                    className="w-full border rounded p-2 bg-background font-mono"
                                    value={editingTx.amount}
                                    onChange={e => setEditingTx({ ...editingTx, amount: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Changing this updates associated ledger balances.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 border rounded hover:bg-secondary">Cancel</button>
                            <button
                                onClick={handleSaveClick}
                                disabled={updateMutation.isPending}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal for Delete */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={() => deleteMutation.mutate(transactionToDelete.id)}
                title="Delete Transaction?"
                message={`Are you sure you want to delete this transaction for ${formatCurrency(transactionToDelete?.amount)}? This will reverse the balances in the ledgers.`}
                confirmLabel={deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
                isDestructive={true}
            />

            {/* Confirmation Modal for Edit */}
            <ConfirmationModal
                isOpen={isEditConfirmOpen}
                onClose={() => setEditConfirmOpen(false)}
                onConfirm={performUpdate}
                title="Confirm Changes"
                message="Are you sure you want to edit this transaction? Changing financial details will automatically update the linked ledger balances."
                confirmLabel={updateMutation.isPending ? "Saving..." : "Confim & Save"}
                isDestructive={false}
            />
        </div>
    );
};

export default TransactionHistory;
