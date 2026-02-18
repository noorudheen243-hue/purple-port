import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Loader2, Check, X, Calendar, Edit2, User } from 'lucide-react';
import { format } from 'date-fns';
import { getAssetUrl } from '../../../lib/utils';

export const ResignationManagerView = () => {
    const queryClient = useQueryClient();
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [actionType, setActionType] = useState<'REVISE' | 'REJECT' | null>(null);

    const { data: requests, isLoading, isError } = useQuery({
        queryKey: ['all-resignations'],
        queryFn: async () => (await api.get('/team/resignation')).data
    });

    const approveMutation = useMutation({
        mutationFn: async (id: string) => await api.patch(`/team/resignation/${id}/approve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-resignations'] });
            alert("Resignation Approved & Notice Period Started.");
        },
        onError: (err: any) => alert(err.response?.data?.message || "Failed to approve")
    });

    const completeMutation = useMutation({
        mutationFn: async (id: string) => await api.patch(`/team/resignation/${id}/complete`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-resignations'] });
            alert("Resignation process marked as COMPLETED.");
        },
        onError: (err: any) => alert(err.response?.data?.message || "Failed to complete")
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string, reason: string }) => await api.patch(`/team/resignation/${id}/reject`, { reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-resignations'] });
            setActionType(null);
            setSelectedRequest(null);
        },
        onError: (err: any) => alert(err.response?.data?.message || "Failed to reject")
    });

    const reviseMutation = useMutation({
        mutationFn: async ({ id, days, reason }: { id: string, days: number, reason: string }) =>
            await api.patch(`/team/resignation/${id}/revise`, { days, reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-resignations'] });
            setActionType(null);
            setSelectedRequest(null);
        },
        onError: (err: any) => alert(err.response?.data?.message || "Failed to revise")
    });

    // Sub-components for Modals
    const RejectForm = ({ request, onClose }: { request: any, onClose: () => void }) => {
        const [reason, setReason] = useState("");
        return (
            <div className="space-y-4">
                <p>Are you sure you want to reject the resignation for <strong>{request.employee.full_name}</strong>?</p>
                <textarea
                    className="w-full border rounded p-2 bg-background"
                    placeholder="Reason for rejection..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="destructive"
                        onClick={() => rejectMutation.mutate({ id: request.id, reason })}
                        disabled={!reason || rejectMutation.isPending}
                    >
                        {rejectMutation.isPending ? "Rejecting..." : "Reject Request"}
                    </Button>
                </div>
            </div>
        );
    };

    const ReviseForm = ({ request, onClose }: { request: any, onClose: () => void }) => {
        const [days, setDays] = useState(request.final_notice_period_days || request.default_notice_period_days || 30);
        const [reason, setReason] = useState(request.revision_reason || "");

        return (
            <div className="space-y-4">
                <p>Revise notice period for <strong>{request.employee.full_name}</strong>.</p>
                <div className="grid gap-2">
                    <label className="text-sm font-medium">New Notice Period (Days)</label>
                    <input
                        type="number"
                        className="w-full border rounded p-2 bg-background"
                        value={days}
                        onChange={e => setDays(Number(e.target.value))}
                        min={0}
                    />
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Reason for Revision</label>
                    <textarea
                        className="w-full border rounded p-2 bg-background"
                        placeholder="Why is it being changed?"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={() => reviseMutation.mutate({ id: request.id, days, reason })}
                        disabled={!reason || reviseMutation.isPending}
                    >
                        {reviseMutation.isPending ? "Saving..." : "Save Revision"}
                    </Button>
                </div>
            </div>
        );
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin inline mr-2" /> Loading Requests...</div>;
    if (isError) return <div className="p-8 text-center text-red-500">Failed to load resignation requests. Please try again.</div>;


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="bg-primary/10 p-2 rounded-full text-primary"><User size={20} /></span>
                Resignation Requests
            </h2>

            <div className="border rounded-lg overflow-hidden shadow-sm bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Applied On</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests?.map((req: any) => (
                            <TableRow key={req.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                                            {req.employee.avatar_url ? (
                                                <img src={getAssetUrl(req.employee.avatar_url)} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={16} className="text-muted-foreground" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground">{req.employee.full_name}</div>
                                            <div className="text-xs text-muted-foreground">{req.employee.staffProfile?.designation || "Staff"}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm text-foreground">
                                        {format(new Date(req.applied_date), 'dd MMM yyyy')}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate italic" title={req.reason}>
                                        "{req.reason}"
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex items-center gap-1" title="Requested Relieving Date">
                                            <span className="text-muted-foreground w-8">Req:</span>
                                            {format(new Date(req.requested_relieving_date), 'dd MMM yy')}
                                        </div>
                                        {req.approved_relieving_date && (
                                            <div className="flex items-center gap-1 font-bold text-primary" title="Approved Relieving Date">
                                                <span className="text-muted-foreground w-8 font-normal">Final:</span>
                                                {format(new Date(req.approved_relieving_date), 'dd MMM yy')}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={req.status === 'APPLIED' ? 'outline' : req.status === 'UNDER_NOTICE' ? 'default' : 'secondary'} className="capitalize">
                                        {req.status === 'UNDER_NOTICE' ? 'In Notice' : req.status.toLowerCase().replace('_', ' ')}
                                    </Badge>
                                    {req.status === 'UNDER_NOTICE' && (
                                        <div className="mt-2 flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded border border-orange-200 dark:border-orange-800 w-fit">
                                            <span className="text-xs font-semibold">Remaining:</span>
                                            <span className="text-sm font-bold">{req.remaining_days} Days</span>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {req.status === 'APPLIED' && (
                                            <>
                                                <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 h-8 text-xs" onClick={() => approveMutation.mutate(req.id)}>
                                                    <Check size={14} className="mr-1" /> Approve
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 h-8" onClick={() => { setSelectedRequest(req); setActionType('REJECT'); }}>
                                                    <X size={14} />
                                                </Button>
                                            </>
                                        )}
                                        {req.status === 'UNDER_NOTICE' && (
                                            <>
                                                <Button size="sm" variant="outline" className="h-8 text-xs bg-muted/50 hover:bg-muted" onClick={() => { setSelectedRequest(req); setActionType('REVISE'); }}>
                                                    <Edit2 size={14} className="mr-1" /> Edit Days
                                                </Button>
                                                <Button size="sm" variant="default" className="h-8 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => completeMutation.mutate(req.id)}>
                                                    Complete
                                                </Button>
                                            </>
                                        )}
                                        {(req.status === 'COMPLETED' || req.status === 'REJECTED') && (
                                            <span className="text-xs text-muted-foreground italic px-2">Archived</span>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {requests && requests.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground flex flex-col items-center justify-center w-full">
                                    <div className="mb-2 bg-muted p-2 rounded-full"><Check className="text-muted-foreground" /></div>
                                    No active resignation requests.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Action Dialog */}
            <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{actionType === 'REVISE' ? 'Revise Notice Period' : 'Reject Request'}</DialogTitle>
                    </DialogHeader>
                    {selectedRequest && actionType === 'REVISE' && <ReviseForm request={selectedRequest} onClose={() => setSelectedRequest(null)} />}
                    {selectedRequest && actionType === 'REJECT' && <RejectForm request={selectedRequest} onClose={() => setSelectedRequest(null)} />}
                </DialogContent>
            </Dialog>
        </div>
    );
};
