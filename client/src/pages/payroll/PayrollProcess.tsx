import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import backend from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, Check, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import Swal from 'sweetalert2';

const PayrollProcess = () => {
    const queryClient = useQueryClient();
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
    const [confirmModal, setConfirmModal] = useState<{ ids: string[], name: string, netPay: number, isBulk: boolean } | null>(null);
    const [selectedBank, setSelectedBank] = useState<string>('b5aa6ccd-f190-4be1-8012-9148cdc14ef0'); // Default to Canara
    const [selectedSlips, setSelectedSlips] = useState<string[]>([]);

    const bankOptions = [
        { id: '91064bc9-4be9-4f01-bb37-7818af05d35e', name: '1. Cash In Hand (cash)' },
        { id: 'b5aa6ccd-f190-4be1-8012-9148cdc14ef0', name: '2. Main Bank Account (canara)(Bank)' },
        { id: '3cb2933c-ef21-4397-ba07-9b66cd1827a7', name: '3. Secondary Bank Account (HDFC)(Bank)' },
    ];

    // Fetch Run Details (which includes Slips)
    const { data: runData, isLoading } = useQuery({
        queryKey: ['payroll-run', month, year],
        queryFn: async () => {
            const res = await backend.get('/payroll/run', { params: { month, year } });
            return res.data;
        }
    });

    const slips = runData?.slips || [];
    const pendingSlips = slips.filter((s: any) => s.status === 'PENDING' || s.status === 'DRAFT' || s.status === 'IN_PROGRESS');

    // Mutations
    const processMutation = useMutation({
        mutationFn: async (data: { ids: string[], bankId: string, isBulk: boolean }) => {
            if (data.isBulk) {
                await backend.post('/payroll/process-bulk', { slipIds: data.ids, bankId: data.bankId });
            } else {
                await backend.post(`/payroll/slip/${data.ids[0]}/process`, { bankId: data.bankId });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-run'] });
            setConfirmModal(null);
            setSelectedSlips([]);
            Swal.fire({
                title: 'Success!',
                text: 'Payroll processed successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        },
        onError: (error: any) => {
            Swal.fire({
                title: 'Error',
                text: error.response?.data?.message || 'Failed to process payroll',
                icon: 'error'
            });
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

    const handleProcessSingle = (slip: any) => {
        setConfirmModal({ ids: [slip.id], name: slip.name, netPay: slip.net_pay, isBulk: false });
    };

    const handleProcessBulk = () => {
        if (selectedSlips.length === 0) return;
        const totalPay = pendingSlips
            .filter((s: any) => selectedSlips.includes(s.id))
            .reduce((sum: number, s: any) => sum + s.net_pay, 0);
        
        setConfirmModal({ 
            ids: selectedSlips, 
            name: `${selectedSlips.length} Staff Member(s)`, 
            netPay: totalPay, 
            isBulk: true 
        });
    };

    const toggleSelectAll = () => {
        if (selectedSlips.length === pendingSlips.length) {
            setSelectedSlips([]);
        } else {
            setSelectedSlips(pendingSlips.map((s: any) => s.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedSlips(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-6 w-full pb-12 animate-in fade-in duration-500">
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
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Pending Approvals ({pendingSlips.length})</CardTitle>
                            <CardDescription>
                                Review and select slips to process. Amount will be posted to the ledger immediately.
                            </CardDescription>
                        </div>
                        {selectedSlips.length > 0 && (
                            <Button 
                                onClick={handleProcessBulk}
                                className="bg-purple-600 hover:bg-purple-700 shadow-md animate-in zoom-in duration-200"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Process Selected ({selectedSlips.length})
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox 
                                                checked={selectedSlips.length === pendingSlips.length && pendingSlips.length > 0}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
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
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                No pending slips found for this month.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pendingSlips.map((slip: any) => (
                                            <TableRow 
                                                key={slip.id} 
                                                className={selectedSlips.includes(slip.id) ? "bg-green-50/50 transition-colors" : ""}
                                            >
                                                <TableCell>
                                                    <Checkbox 
                                                        checked={selectedSlips.includes(slip.id)}
                                                        onCheckedChange={() => toggleSelect(slip.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium relative">
                                                    <div className="flex items-center gap-2">
                                                        {selectedSlips.includes(slip.id) && (
                                                            <CheckCircle2 className="w-4 h-4 text-green-600 animate-in fade-in zoom-in duration-300" />
                                                        )}
                                                        <span>{slip.name}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground pl-6">{slip.user?.staffProfile?.staff_number}</div>
                                                </TableCell>
                                                <TableCell>{slip.designation}</TableCell>
                                                <TableCell>{"\u20B9"}{slip.basic_salary.toLocaleString()}</TableCell>
                                                <TableCell>{"\u20B9"}{(slip.allowances + slip.conveyance_allowance + slip.accommodation_allowance + slip.incentives).toLocaleString()}</TableCell>
                                                <TableCell className="text-red-500">-{"\u20B9"}{(slip.lop_deduction + slip.advance_salary + slip.other_deductions).toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-green-700">{"\u20B9"}{slip.net_pay.toLocaleString()}</TableCell>
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
                                                        onClick={() => handleProcessSingle(slip)}
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

            {/* Confirmation Dialog with Bank Selection */}
            <Dialog open={!!confirmModal} onOpenChange={(open) => !open && setConfirmModal(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                            Confirm Payroll Process
                        </DialogTitle>
                        <DialogDescription>
                            Review payout details and select the source account.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-6">
                        <div className="p-4 bg-green-50 border border-green-100 rounded-lg space-y-1">
                            <p className="text-xs text-green-700 font-semibold uppercase tracking-wider">Total Payout for {confirmModal?.name}</p>
                            <p className="text-3xl font-bold text-green-800">₹{confirmModal?.netPay.toLocaleString()}</p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-purple-600" />
                                From which bank account to credit the amount?
                            </label>
                            <Select value={selectedBank} onValueChange={setSelectedBank}>
                                <SelectTrigger className="w-full h-12 bg-white border-2 border-purple-100 focus:border-purple-500 transition-all">
                                    <SelectValue placeholder="Select Bank Account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {bankOptions.map(bank => (
                                        <SelectItem key={bank.id} value={bank.id} className="py-3">
                                            {bank.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded border border-amber-200 flex gap-2 leading-relaxed">
                            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                            <p>This action will record <strong>separate Expense entries</strong> in accounts for each selected staff member. The specified amount will be deducted from your selection for each individual. This action is irreversible.</p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setConfirmModal(null)} className="flex-1">Cancel</Button>
                        <Button
                            className="bg-purple-600 hover:bg-purple-700 flex-1 shadow-lg shadow-purple-200"
                            disabled={processMutation.isPending}
                            onClick={() => confirmModal && processMutation.mutate({ 
                                ids: confirmModal.ids, 
                                bankId: selectedBank, 
                                isBulk: confirmModal.isBulk 
                            })}
                        >
                            {processMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                            Process & Submit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PayrollProcess;
