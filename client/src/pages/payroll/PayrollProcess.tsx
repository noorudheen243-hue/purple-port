
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import backend from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, Check, X, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const PayrollProcess = () => {
    const queryClient = useQueryClient();
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
    const [confirmModal, setConfirmModal] = useState<{ id: string, name: string, netPay: number } | null>(null);

    // Fetch Run Details (which includes Slips)
    const { data: runData, isLoading } = useQuery({
        queryKey: ['payroll-run', month, year],
        queryFn: async () => {
            const res = await backend.get('/payroll/run', { params: { month, year } });
            return res.data;
        }
    });

    const slips = runData?.slips || [];
    const pendingSlips = slips.filter((s: any) => s.status === 'PENDING' || s.status === 'DRAFT');

    // Mutations
    const processMutation = useMutation({
        mutationFn: async (id: string) => {
            await backend.post(`/payroll/slip/${id}/process`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-run'] });
            setConfirmModal(null);
        }
    });

    const rejectMutation = useMutation({
        mutationFn: async (id: string) => {
            await backend.delete(`/payroll/slip/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-run'] });
        }
    });

    const handleProcess = (slip: any) => {
        setConfirmModal({ id: slip.id, name: slip.name, netPay: slip.net_pay });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Payroll Process</h1>
                    <p className="text-muted-foreground">Review and finalize team salary payments.</p>
                </div>
                <div className="flex gap-3">
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <SelectItem key={m} value={m.toString()}>
                                    {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2026">2026</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Approvals ({pendingSlips.length})</CardTitle>
                        <CardDescription>
                            Review the following salary slips before processing. Once processed, the amount will be posted to the ledger.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Staff Name</TableHead>
                                        <TableHead>Designation</TableHead>
                                        <TableHead>Basic</TableHead>
                                        <TableHead>Allowances</TableHead>
                                        <TableHead>Deductions</TableHead>
                                        <TableHead className="text-right font-bold">Net Pay</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingSlips.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                No pending slips found for this month.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pendingSlips.map((slip: any) => (
                                            <TableRow key={slip.id}>
                                                <TableCell className="font-medium">
                                                    {slip.name}
                                                    <div className="text-xs text-muted-foreground">{slip.user?.staffProfile?.staff_number}</div>
                                                </TableCell>
                                                <TableCell>{slip.designation}</TableCell>
                                                <TableCell>₹{slip.basic_salary.toLocaleString()}</TableCell>
                                                <TableCell>₹{(slip.allowances + slip.conveyance_allowance + slip.accommodation_allowance + slip.incentives).toLocaleString()}</TableCell>
                                                <TableCell className="text-red-500">-₹{(slip.lop_deduction + slip.advance_salary + slip.other_deductions).toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-green-700">₹{slip.net_pay.toLocaleString()}</TableCell>
                                                <TableCell className="flex justify-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        disabled={rejectMutation.isPending}
                                                        onClick={() => rejectMutation.mutate(slip.id)}
                                                    >
                                                        Reject
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={() => handleProcess(slip)}
                                                    >
                                                        Submit
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Confirmation Dialog */}
            <Dialog open={!!confirmModal} onOpenChange={(open) => !open && setConfirmModal(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Salary Process</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to process the salary for <strong>{confirmModal?.name}</strong>?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                            <span className="text-sm font-medium">Net Payable Amount</span>
                            <span className="text-xl font-bold text-green-700">₹{confirmModal?.netPay.toLocaleString()}</span>
                        </div>
                        <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200 flex gap-2">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>This action will post a debit entry to Salary Expense and credit to the staff's ledger. This cannot be undone.</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmModal(null)}>Cancel</Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            disabled={processMutation.isPending}
                            onClick={() => confirmModal && processMutation.mutate(confirmModal.id)}
                        >
                            {processMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                            Confirm & Process
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PayrollProcess;
