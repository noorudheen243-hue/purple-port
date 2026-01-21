import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, X, Edit2, Trash2, Calendar, Clock, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const ApprovalsPage = () => {
    const queryClient = useQueryClient();
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<any>(null);

    // --- DATA FETCHING ---
    const { data: leaves = [], isLoading: leavesLoading } = useQuery({
        queryKey: ['leave-requests'],
        queryFn: async () => (await api.get('/leave/requests')).data,
    });

    const { data: regularisation = [], isLoading: regLoading } = useQuery({
        queryKey: ['regularisation-requests'],
        queryFn: async () => (await api.get('/attendance/regularisation/requests?status=PENDING')).data,
    });

    // --- MUTATIONS ---

    // Generic Approve/Reject Mutation
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, type, status, reason }: { id: string, type: 'LEAVE' | 'REGULARISATION', status: 'APPROVED' | 'REJECTED', reason?: string }) => {
            const endpoint = type === 'LEAVE'
                ? `/leave/${id}/status`
                : `/attendance/regularisation/${id}/status`;

            return api.patch(endpoint, { status, rejection_reason: reason });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
            queryClient.invalidateQueries({ queryKey: ['regularisation-requests'] });
            Swal.fire({ title: 'Success', text: 'Request updated successfully', icon: 'success', timer: 1500 });
        },
        onError: (error: any) => {
            Swal.fire('Error', error.response?.data?.message || 'Action failed', 'error');
        }
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async ({ id, type }: { id: string, type: 'LEAVE' | 'REGULARISATION' }) => {
            const endpoint = type === 'LEAVE'
                ? `/leave/${id}`
                : `/attendance/regularisation/${id}`;
            return api.delete(endpoint);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
            queryClient.invalidateQueries({ queryKey: ['regularisation-requests'] });
            Swal.fire({ title: 'Deleted', text: 'Request deleted successfully', icon: 'success', timer: 1500 });
        },
        onError: (error: any) => {
            Swal.fire('Error', error.response?.data?.message || 'Delete failed', 'error');
        }
    });

    // Edit Mutation
    const editMutation = useMutation({
        mutationFn: async (data: any) => {
            const endpoint = editingRequest.category === 'LEAVE'
                ? `/leave/${editingRequest.id}`
                : `/attendance/regularisation/${editingRequest.id}`;

            return api.put(endpoint, data);
        },
        onSuccess: () => {
            setEditModalOpen(false);
            setEditingRequest(null);
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
            queryClient.invalidateQueries({ queryKey: ['regularisation-requests'] });
            Swal.fire({ title: 'Updated', text: 'Request updated successfully', icon: 'success', timer: 1500 });
        },
        onError: (error: any) => {
            Swal.fire('Error', error.response?.data?.message || 'Update failed', 'error');
        }
    });


    // --- HANDLERS ---

    const handleApprove = (req: any, type: 'LEAVE' | 'REGULARISATION') => {
        const title = type === 'REGULARISATION' ? 'Approve & Update Attendance?' : 'Approve Leave?';
        const text = type === 'REGULARISATION'
            ? `This will mark ${req.user.full_name} as PRESENT for ${format(new Date(req.date), 'MMM dd, yyyy')}.`
            : `This will mark ${req.user.full_name} on LEAVE from ${format(new Date(req.start_date), 'MMM dd')} to ${format(new Date(req.end_date), 'MMM dd')}.`;

        Swal.fire({
            title,
            text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Yes, Approve'
        }).then((result) => {
            if (result.isConfirmed) {
                updateStatusMutation.mutate({ id: req.id, type, status: 'APPROVED' });
            }
        });
    };

    const handleReject = (req: any, type: 'LEAVE' | 'REGULARISATION') => {
        Swal.fire({
            title: 'Reject Request',
            input: 'text',
            inputLabel: 'Reason for Rejection',
            inputPlaceholder: 'Enter reason...',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Reject'
        }).then((result) => {
            if (result.isConfirmed) {
                updateStatusMutation.mutate({ id: req.id, type, status: 'REJECTED', reason: result.value });
            }
        });
    };

    const handleDelete = (id: string, type: 'LEAVE' | 'REGULARISATION') => {
        Swal.fire({
            title: 'Delete Request?',
            text: "This action cannot be undone. Ensuring no trace remains.",
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, Delete'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate({ id, type });
            }
        });
    };

    const handleEdit = (req: any, type: 'LEAVE' | 'REGULARISATION') => {
        setEditingRequest({ ...req, category: type });
        setEditModalOpen(true);
    };

    const saveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data: any = Object.fromEntries(formData.entries());

        // Format dates? Browser date input returns yyyy-mm-dd, which is fine for backend usually
        editMutation.mutate(data);
    };

    // --- RENDER HELPERS ---

    const RequestTable = ({ requests, type }: { requests: any[], type: 'LEAVE' | 'REGULARISATION' }) => (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Staff Name</TableHead>
                        <TableHead>Date(s)</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                No pending requests found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        requests.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span>{req.user.full_name}</span>
                                        <span className="text-xs text-muted-foreground">{req.user.role}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {type === 'LEAVE' ? (
                                        <div className="flex flex-col">
                                            <span>{format(new Date(req.start_date), 'MMM dd, yyyy')} - {format(new Date(req.end_date), 'MMM dd, yyyy')}</span>
                                            <span className="text-xs text-muted-foreground">{req.type}</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <span>{format(new Date(req.date), 'MMM dd, yyyy')}</span>
                                            <span className="text-xs text-muted-foreground">{req.type}</span>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="max-w-[300px]">
                                    <p className="truncate text-sm" title={req.reason}>{req.reason}</p>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={req.status === 'PENDING' ? 'secondary' : req.status === 'APPROVED' ? 'default' : 'destructive'}>
                                        {req.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {req.status === 'PENDING' && (
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(req, type)} title="Edit">
                                                <Edit2 className="h-4 w-4 text-blue-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(req.id, type)} title="Delete">
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                            <div className="w-px h-6 bg-border mx-1" />
                                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReject(req, type)}>
                                                Reject
                                            </Button>
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(req, type)}>
                                                Approve
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>Approvals Management</CardTitle>
                    <CardDescription>Manage and process all pending leave and attendance regularization requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="leave" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="leave" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Leave Requests
                                {leaves.filter((l: any) => l.status === 'PENDING').length > 0 && (
                                    <Badge variant="destructive" className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] h-auto min-w-[18px]">
                                        {leaves.filter((l: any) => l.status === 'PENDING').length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="regularisation" className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Attendance Requests
                                {regularisation.length > 0 && (
                                    <Badge variant="destructive" className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] h-auto min-w-[18px]">
                                        {regularisation.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="leave" className="space-y-4">
                            <RequestTable requests={leaves.filter((l: any) => l.status === 'PENDING')} type="LEAVE" />
                        </TabsContent>

                        <TabsContent value="regularisation" className="space-y-4">
                            <RequestTable requests={regularisation} type="REGULARISATION" />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Edit Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Request</DialogTitle>
                    </DialogHeader>
                    {editingRequest && (
                        <form onSubmit={saveEdit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                {editingRequest.category === 'LEAVE' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="start_date">Start Date</Label>
                                                <Input id="start_date" name="start_date" type="date" defaultValue={editingRequest.start_date.split('T')[0]} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="end_date">End Date</Label>
                                                <Input id="end_date" name="end_date" type="date" defaultValue={editingRequest.end_date.split('T')[0]} required />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="type">Leave Type</Label>
                                            <Select name="type" defaultValue={editingRequest.type}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                                                    <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                                                    <SelectItem value="Privilege Leave">Privilege Leave</SelectItem>
                                                    <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="date">Date</Label>
                                            <Input id="date" name="date" type="date" defaultValue={editingRequest.date.split('T')[0]} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="type">Type</Label>
                                            <Select name="type" defaultValue={editingRequest.type}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="MISSED_CHECK_IN">Missed Check-In</SelectItem>
                                                    <SelectItem value="MISSED_CHECK_OUT">Missed Check-Out</SelectItem>
                                                    <SelectItem value="WORK_FROM_HOME">Work From Home</SelectItem>
                                                    <SelectItem value="ON_DUTY">On Duty</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="reason">Reason</Label>
                                    <Textarea id="reason" name="reason" defaultValue={editingRequest.reason} required />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                                <Button type="submit">Save Changes</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ApprovalsPage;
