import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Loader2, Check, X, Calendar, Edit2, User, Save, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { getAssetUrl } from '../../../lib/utils';

export const ResignationManagerView = () => {
    const queryClient = useQueryClient();
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [actionType, setActionType] = useState<'REVISE' | 'REJECT' | null>(null);
    const [editableDates, setEditableDates] = useState<{ [key: string]: string }>({});
    const [editableStatuses, setEditableStatuses] = useState<{ [key: string]: string }>({});
    const [isEditingDate, setIsEditingDate] = useState<{ [key: string]: boolean }>({});

    const { data: requests, isLoading, isError } = useQuery({
        queryKey: ['all-resignations'],
        queryFn: async () => (await api.get('/team/resignation')).data
    });

    const approveMutation = useMutation({
        mutationFn: async ({ id, date }: { id: string, date?: string }) =>
            await api.patch(`/team/resignation/${id}/approve`, { approved_relieving_date: date }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-resignations'] });
            alert("Resignation Approved & Notice Period Started.");
            setEditableDates({});
            setIsEditingDate({});
        },
        onError: (err: any) => alert(err.response?.data?.message || "Failed to approve")
    });

    const patchMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) =>
            await api.patch(`/team/resignation/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-resignations'] });
            alert("Record Updated Successfully.");
            setIsEditingDate({});
            setEditableDates({});
            setEditableStatuses({});
        },
        onError: (err: any) => alert(err.response?.data?.message || "Failed to update record")
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

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/team/resignation/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-resignations'] });
            alert("Record Deleted.");
        },
        onError: (err: any) => alert(err.response?.data?.message || "Failed to delete")
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
                            <TableHead>Notice Period</TableHead>
                            <TableHead>Days Left</TableHead>
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
                                        {isEditingDate[req.id] ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground w-8 text-xs">Final:</span>
                                                <Input
                                                    type="date"
                                                    className="h-8 w-32 p-1 text-xs"
                                                    value={editableDates[req.id] || (req.approved_relieving_date ? new Date(req.approved_relieving_date).toISOString().split('T')[0] : new Date(req.requested_relieving_date).toISOString().split('T')[0])}
                                                    onChange={(e) => setEditableDates({ ...editableDates, [req.id]: e.target.value })}
                                                />
                                            </div>
                                        ) : (
                                            <>
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
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">
                                        {(() => {
                                            const relievingDate = new Date(editableDates[req.id] || req.approved_relieving_date || req.requested_relieving_date);
                                            const appliedDate = new Date(req.applied_date);
                                            const diff = relievingDate.getTime() - appliedDate.getTime();
                                            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                            return `${days} Days`;
                                        })()}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm font-semibold">
                                        {(() => {
                                            const relievingDate = new Date(editableDates[req.id] || req.approved_relieving_date || req.requested_relieving_date);
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const diff = relievingDate.getTime() - today.getTime();
                                            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                            return days > 0 ? `${days} Left` : "Today/Passed";
                                        })()}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {isEditingDate[req.id] ? (
                                        <div className="w-32">
                                            <Select
                                                value={editableStatuses[req.id] || req.status}
                                                onValueChange={(val) => setEditableStatuses({ ...editableStatuses, [req.id]: val })}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="APPLIED">Applied</SelectItem>
                                                    <SelectItem value="UNDER_NOTICE">In Notice</SelectItem>
                                                    <SelectItem value="REJECTED">Rejected</SelectItem>
                                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <>
                                            <Badge variant={req.status === 'APPLIED' ? 'outline' : req.status === 'UNDER_NOTICE' ? 'default' : 'secondary'} className="capitalize">
                                                {req.status === 'UNDER_NOTICE' ? 'In Notice' : req.status.toLowerCase().replace('_', ' ')}
                                            </Badge>
                                            {req.status === 'UNDER_NOTICE' && (
                                                <div className="mt-2 flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded border border-orange-200 dark:border-orange-800 w-fit">
                                                    <span className="text-xs font-semibold">Remaining:</span>
                                                    <span className="text-sm font-bold">{req.remaining_days} Days</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {isEditingDate[req.id] ? (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="bg-green-600 hover:bg-green-700 h-8 text-xs gap-1"
                                                    onClick={() => patchMutation.mutate({
                                                        id: req.id,
                                                        data: {
                                                            status: editableStatuses[req.id] || req.status,
                                                            approved_relieving_date: editableDates[req.id] ? new Date(editableDates[req.id]) : req.approved_relieving_date
                                                        }
                                                    })}
                                                    disabled={patchMutation.isPending}
                                                >
                                                    <Save size={14} /> Save
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs"
                                                    onClick={() => {
                                                        setIsEditingDate({ ...isEditingDate, [req.id]: false });
                                                        setEditableDates({ ...editableDates, [req.id]: "" });
                                                        setEditableStatuses({ ...editableStatuses, [req.id]: "" });
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-primary border-primary/20 hover:bg-primary/5 h-8 text-xs gap-1"
                                                    onClick={() => setIsEditingDate({ ...isEditingDate, [req.id]: true })}
                                                >
                                                    <Edit2 size={14} /> Edit
                                                </Button>
                                                {req.status === 'APPLIED' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-500 border-red-100 hover:bg-red-50 h-8 text-xs"
                                                        onClick={() => { setSelectedRequest(req); setActionType('REJECT'); }}
                                                    >
                                                        <X size={14} /> Reject
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-8 text-xs text-red-600 bg-red-50 hover:bg-red-100 border-red-100 gap-1"
                                                    onClick={() => { if (confirm("Delete this record permanently?")) deleteMutation.mutate(req.id); }}
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </Button>
                                            </>
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
