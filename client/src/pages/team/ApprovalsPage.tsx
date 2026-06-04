import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format, getMonth, getYear } from 'date-fns';
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
import { Check, X, Edit2, Trash2, Calendar, Clock, AlertCircle, History, RotateCcw, LogOut, Search } from 'lucide-react';
import Swal from 'sweetalert2';

const ApprovalsPage = () => {
    const queryClient = useQueryClient();
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'leave' | 'regularization' | 'resignation' | 'history'>('leave');

    // Filter States
    const [staffFilter, setStaffFilter] = useState('');
    const [historyMonth, setHistoryMonth] = useState<string>((new Date().getMonth() + 1).toString());
    const [historyYear, setHistoryYear] = useState<string>(new Date().getFullYear().toString());
    const [historyStatus, setHistoryStatus] = useState<string>('ALL');

    // --- DATA FETCHING ---
    const { data: leaves = [], isLoading: leavesLoading } = useQuery({
        queryKey: ['leave-requests'],
        queryFn: async () => (await api.get('/leave/requests')).data,
    });

    const { data: regularisation = [], isLoading: regLoading } = useQuery({
        queryKey: ['regularisation-requests'],
        queryFn: async () => (await api.get('/attendance/regularisation/requests?status=PENDING')).data,
    });

    const { data: leaveHistory = [], isLoading: lhLoading } = useQuery({
        queryKey: ['leave-history', historyMonth, historyYear, historyStatus],
        queryFn: async () => (await api.get(`/leave/history`, { params: { month: historyMonth === 'ALL' ? undefined : historyMonth, year: historyYear === 'ALL' ? undefined : historyYear, status: historyStatus } })).data,
    });

    const { data: regHistory = [], isLoading: rhLoading } = useQuery({
        queryKey: ['regularisation-history', historyMonth, historyYear, historyStatus],
        queryFn: async () => (await api.get(`/attendance/regularisation/history`, { params: { month: historyMonth === 'ALL' ? undefined : historyMonth, year: historyYear === 'ALL' ? undefined : historyYear, status: historyStatus } })).data,
    });

    const { data: resignation = [], isLoading: resLoading } = useQuery({
        queryKey: ['resignation-requests'],
        queryFn: async () => (await api.get('/team/resignation')).data,
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
            queryClient.invalidateQueries({ queryKey: ['leave-history'] });
            queryClient.invalidateQueries({ queryKey: ['regularisation-history'] });
            queryClient.invalidateQueries({ queryKey: ['resignation-requests'] });
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
            queryClient.invalidateQueries({ queryKey: ['leave-history'] });
            queryClient.invalidateQueries({ queryKey: ['regularisation-history'] });
            Swal.fire({ title: 'Deleted', text: 'Request deleted successfully', icon: 'success', timer: 1500 });
        },
        onError: (error: any) => {
            Swal.fire('Error', error.response?.data?.message || 'Delete failed', 'error');
        }
    });

    // Resignation Mutations
    const approveResignationMutation = useMutation({
        mutationFn: async (id: string) => await api.patch(`/team/resignation/${id}/approve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['resignation-requests'] });
            Swal.fire({ title: 'Approved', text: 'Resignation approved & notice started.', icon: 'success', timer: 1500 });
        },
        onError: (err: any) => Swal.fire('Error', err.response?.data?.message || 'Approval failed', 'error')
    });

    const rejectResignationMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string, reason: string }) => await api.patch(`/team/resignation/${id}/reject`, { reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['resignation-requests'] });
            Swal.fire({ title: 'Rejected', text: 'Resignation request rejected.', icon: 'success', timer: 1500 });
        },
        onError: (err: any) => Swal.fire('Error', err.response?.data?.message || 'Rejection failed', 'error')
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
            queryClient.invalidateQueries({ queryKey: ['leave-history'] });
            queryClient.invalidateQueries({ queryKey: ['regularisation-history'] });
            Swal.fire({ title: 'Updated', text: 'Request updated successfully', icon: 'success', timer: 1500 });
        },
        onError: (error: any) => {
            Swal.fire('Error', error.response?.data?.message || 'Update failed', 'error');
        }
    });

    const revertMutation = useMutation({
        mutationFn: async ({ id, type }: { id: string, type: 'LEAVE' | 'REGULARISATION' }) => {
            const endpoint = type === 'LEAVE' ? `/leave/${id}/revert` : `/attendance/regularisation/${id}/revert`;
            return api.post(endpoint);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
            queryClient.invalidateQueries({ queryKey: ['regularisation-requests'] });
            queryClient.invalidateQueries({ queryKey: ['leave-history'] });
            queryClient.invalidateQueries({ queryKey: ['regularisation-history'] });
            Swal.fire({ title: 'Reverted', text: 'Request reverted to Pending', icon: 'success', timer: 1500 });
        },
        onError: (error: any) => Swal.fire('Error', error.response?.data?.message || 'Revert failed', 'error')
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

    const handleResignationAction = (req: any, action: 'APPROVE' | 'REJECT') => {
        if (action === 'APPROVE') {
            Swal.fire({
                title: 'Approve Resignation?',
                text: `This will start the notice period for ${req.employee.full_name}.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                confirmButtonText: 'Yes, Approve'
            }).then((result) => {
                if (result.isConfirmed) approveResignationMutation.mutate(req.id);
            });
        } else {
            Swal.fire({
                title: 'Reject Resignation',
                input: 'text',
                inputLabel: 'Reason',
                inputPlaceholder: 'Reason for rejection...',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'Reject'
            }).then((result) => {
                if (result.isConfirmed) rejectResignationMutation.mutate({ id: req.id, reason: result.value });
            });
        }
    };

    const handleDelete = (id: string, type: 'LEAVE' | 'REGULARISATION') => {
        Swal.fire({
            title: 'Delete Request?',
            text: "This action cannot be undone.",
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

    const handleRevert = (req: any, type: 'LEAVE' | 'REGULARISATION') => {
        Swal.fire({
            title: 'Revert to Pending?',
            text: "This will undo the approval/rejection and allow you to process it again.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            confirmButtonText: 'Yes, Revert'
        }).then((result) => {
            if (result.isConfirmed) {
                revertMutation.mutate({ id: req.id, type });
            }
        });
    }

    const saveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data: any = Object.fromEntries(formData.entries());

        // Format dates? Browser date input returns yyyy-mm-dd, which is fine for backend usually
        editMutation.mutate(data);
    };

    // --- LOCAL FILTERING ---
    const filterStaffAndDate = (req: any, dateField: string, employeeField: string = 'user') => {
        const employee = req[employeeField];
        const staffName = (employee?.full_name || '').toLowerCase();
        if (staffFilter && !staffName.includes(staffFilter.toLowerCase())) return false;

        const dStr = req[dateField];
        if (dStr) {
            const d = new Date(dStr);
            const m = (d.getMonth() + 1).toString();
            const y = d.getFullYear().toString();
            if (historyMonth !== 'ALL' && m !== historyMonth) return false;
            if (historyYear !== 'ALL' && y !== historyYear) return false;
        }
        return true;
    };

    const filteredLeaves = leaves.filter((l: any) => l.status === 'PENDING' && filterStaffAndDate(l, 'start_date', 'user'));
    const filteredRegs = regularisation.filter((r: any) => filterStaffAndDate(r, 'date', 'user'));
    const filteredResignations = resignation.filter((r: any) => r.status === 'APPLIED' && filterStaffAndDate(r, 'applied_date', 'employee'));

    const filteredLeaveHistory = leaveHistory.filter((l: any) => filterStaffAndDate(l, 'start_date', 'user'));
    const filteredRegHistory = regHistory.filter((r: any) => filterStaffAndDate(r, 'date', 'user'));
    const filteredResignationHistory = resignation.filter((r: any) => r.status !== 'APPLIED' && filterStaffAndDate(r, 'applied_date', 'employee'));

    const activeTabsConfig = [
        { 
            id: 'leave', label: 'Leave Requests', icon: Calendar, count: filteredLeaves.length, 
            btnActive: 'bg-yellow-50/80 border-yellow-500 text-yellow-700 shadow-md ring-4 ring-yellow-500/10 scale-[1.02]', 
            btnInactive: 'bg-white border-slate-200 text-slate-600 shadow-sm hover:shadow-md hover:border-yellow-300 hover:bg-yellow-50', 
            iconActive: 'text-yellow-600 scale-110', 
            iconInactive: 'text-slate-400 group-hover:text-yellow-500 group-hover:-translate-y-1' 
        },
        { 
            id: 'regularization', label: 'Regularization', icon: Clock, count: filteredRegs.length, 
            btnActive: 'bg-purple-50/80 border-purple-500 text-purple-700 shadow-md ring-4 ring-purple-500/10 scale-[1.02]', 
            btnInactive: 'bg-white border-slate-200 text-slate-600 shadow-sm hover:shadow-md hover:border-purple-300 hover:bg-purple-50', 
            iconActive: 'text-purple-600 scale-110', 
            iconInactive: 'text-slate-400 group-hover:text-purple-500 group-hover:-translate-y-1' 
        },
        { 
            id: 'resignation', label: 'Resignation', icon: LogOut, count: filteredResignations.length, 
            btnActive: 'bg-red-50/80 border-red-500 text-red-700 shadow-md ring-4 ring-red-500/10 scale-[1.02]', 
            btnInactive: 'bg-white border-slate-200 text-slate-600 shadow-sm hover:shadow-md hover:border-red-300 hover:bg-red-50', 
            iconActive: 'text-red-600 scale-110', 
            iconInactive: 'text-slate-400 group-hover:text-red-500 group-hover:-translate-y-1' 
        },
        { 
            id: 'history', label: 'Approval History', icon: History, count: 0, 
            btnActive: 'bg-blue-50/80 border-blue-500 text-blue-700 shadow-md ring-4 ring-blue-500/10 scale-[1.02]', 
            btnInactive: 'bg-white border-slate-200 text-slate-600 shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-blue-50', 
            iconActive: 'text-blue-600 scale-110', 
            iconInactive: 'text-slate-400 group-hover:text-blue-500 group-hover:-translate-y-1' 
        },
    ];

    // --- RENDER HELPERS ---

    const RequestTable = ({ requests, type, isHistory = false }: { requests: any[], type: 'LEAVE' | 'REGULARISATION', isHistory?: boolean }) => (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Staff Name</TableHead>
                        <TableHead>Date(s)</TableHead>
                        <TableHead>Type/Reason</TableHead>
                        {isHistory && <TableHead>Actioned By</TableHead>}
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={isHistory ? 6 : 5} className="text-center h-24 text-muted-foreground">
                                No requests found.
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
                                            <span>{format(new Date(req.start_date), 'MMM dd')} - {format(new Date(req.end_date), 'MMM dd, yyyy')}</span>
                                        </div>
                                    ) : (
                                        <span>{format(new Date(req.date), 'MMM dd, yyyy')}</span>
                                    )}
                                </TableCell>
                                <TableCell className="max-w-[250px]">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-xs">{req.type}</span>
                                        <p className="truncate text-sm text-muted-foreground" title={req.reason}>{req.reason}</p>
                                    </div>
                                </TableCell>
                                {isHistory && (
                                    <TableCell>
                                        <span className="text-sm">{req.approver?.full_name || '-'}</span>
                                    </TableCell>
                                )}
                                <TableCell>
                                    <Badge variant={req.status === 'PENDING' ? 'secondary' : req.status === 'APPROVED' ? 'default' : 'destructive'}>
                                        {req.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {req.status === 'PENDING' ? (
                                            <>
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(req, type)} title="Edit">
                                                    <Edit2 className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(req.id, type)} title="Delete">
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                </Button>
                                                {!isHistory && (
                                                    <>
                                                        <div className="w-px h-6 bg-border mx-1" />
                                                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReject(req, type)}>
                                                            Reject
                                                        </Button>
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(req, type)}>
                                                            Approve
                                                        </Button>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            isHistory && (
                                                <Button size="sm" variant="outline" onClick={() => handleRevert(req, type)} title="Revert to Pending">
                                                    <RotateCcw className="h-4 w-4 mr-2" /> Revert
                                                </Button>
                                            )
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    const ResignationHistoryTable = ({ requests }: { requests: any[] }) => (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Applied Date</TableHead>
                        <TableHead>Action Taken By</TableHead>
                        <TableHead>Reason / Remarks</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                No resignation history found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        requests.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span>{req.employee?.full_name}</span>
                                        <span className="text-xs text-muted-foreground">{req.employee?.role}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{format(new Date(req.applied_date), 'dd MMM yyyy')}</TableCell>
                                <TableCell>
                                    <span className="text-sm font-medium">{req.approver?.full_name || '-'}</span>
                                </TableCell>
                                <TableCell className="max-w-[250px]">
                                    <div className="flex flex-col">
                                        <span className="truncate text-sm text-muted-foreground" title={req.reason}>Reason: {req.reason}</span>
                                        {req.rejection_reason && <span className="truncate text-xs text-red-500" title={req.rejection_reason}>Remark: {req.rejection_reason}</span>}
                                        {req.revision_reason && <span className="truncate text-xs text-orange-500" title={req.revision_reason}>Revision: {req.revision_reason}</span>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={req.status === 'UNDER_NOTICE' ? 'default' : req.status === 'COMPLETED' ? 'secondary' : 'destructive'}>
                                        {req.status === 'UNDER_NOTICE' ? 'APPROVED (NOTICE)' : req.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500" >
            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
                <CardHeader className="pb-6 border-b bg-white rounded-t-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Approvals Management</CardTitle>
                            <CardDescription className="text-gray-500 mt-1">Review and process team requests seamlessly.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-8">
                        
                        {/* Unified Filter Bar */}
                        <div className="flex flex-col md:flex-row gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search Staff</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input 
                                        placeholder="Type a name to filter..." 
                                        className="pl-10 bg-white border-slate-200 focus-visible:ring-blue-500 rounded-lg shadow-sm"
                                        value={staffFilter}
                                        onChange={(e) => setStaffFilter(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-[160px] space-y-1">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Month</Label>
                                <Select value={historyMonth} onValueChange={setHistoryMonth}>
                                    <SelectTrigger className="bg-white border-slate-200 rounded-lg shadow-sm focus:ring-blue-500"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL" className="font-semibold text-blue-600">All Months</SelectItem>
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <SelectItem key={i + 1} value={(i + 1).toString()}>{format(new Date(2000, i, 1), 'MMMM')}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-full md:w-[130px] space-y-1">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year</Label>
                                <Select value={historyYear} onValueChange={setHistoryYear}>
                                    <SelectTrigger className="bg-white border-slate-200 rounded-lg shadow-sm focus:ring-blue-500"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL" className="font-semibold text-blue-600">All Years</SelectItem>
                                        <SelectItem value="2024">2024</SelectItem>
                                        <SelectItem value="2025">2025</SelectItem>
                                        <SelectItem value="2026">2026</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {activeTab === 'history' && (
                                <div className="w-full md:w-[160px] space-y-1 animate-in slide-in-from-right-2 fade-in">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</Label>
                                    <Select value={historyStatus} onValueChange={setHistoryStatus}>
                                        <SelectTrigger className="bg-white border-slate-200 rounded-lg shadow-sm focus:ring-blue-500"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL" className="font-semibold text-blue-600">All Status</SelectItem>
                                            <SelectItem value="APPROVED">Approved</SelectItem>
                                            <SelectItem value="REJECTED">Rejected</SelectItem>
                                            <SelectItem value="PENDING">Pending</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Navigation Buttons Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {activeTabsConfig.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group ${
                                        activeTab === tab.id ? tab.btnActive : tab.btnInactive
                                    }`}
                                >
                                    <tab.icon className={`w-8 h-8 mb-3 transition-transform duration-300 ${activeTab === tab.id ? tab.iconActive : tab.iconInactive}`} />
                                    <span className="font-bold text-sm tracking-wide">{tab.label}</span>
                                    {tab.count > 0 && (
                                        <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-bounce">
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            
                            {activeTab === 'leave' && (
                                <div className="p-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                            <Calendar className="h-5 w-5 text-yellow-500" /> Pending Leave Requests
                                        </h3>
                                    </div>
                                    <RequestTable requests={filteredLeaves} type="LEAVE" />
                                </div>
                            )}

                            {activeTab === 'regularization' && (
                                <div className="p-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                            <Clock className="h-5 w-5 text-purple-500" /> Pending Regularization
                                        </h3>
                                    </div>
                                    <RequestTable requests={filteredRegs} type="REGULARISATION" />
                                </div>
                            )}

                            {activeTab === 'resignation' && (
                                <div className="p-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                            <LogOut className="h-5 w-5 text-red-500" /> Pending Resignations
                                        </h3>
                                    </div>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader className="bg-slate-50">
                                                <TableRow>
                                                    <TableHead className="font-semibold">Employee</TableHead>
                                                    <TableHead className="font-semibold">Applied Date</TableHead>
                                                    <TableHead className="font-semibold">Reason</TableHead>
                                                    <TableHead className="font-semibold">Status</TableHead>
                                                    <TableHead className="text-right font-semibold">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredResignations.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">No pending resignations found.</TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredResignations.map((req: any) => (
                                                        <TableRow key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <TableCell>
                                                                <div className="font-medium text-slate-900">{req.employee.full_name}</div>
                                                                <div className="text-xs text-slate-500">{req.employee.role}</div>
                                                            </TableCell>
                                                            <TableCell className="text-slate-600">{format(new Date(req.applied_date), 'dd MMM yyyy')}</TableCell>
                                                            <TableCell className="max-w-[300px] truncate text-slate-600" title={req.reason}>{req.reason}</TableCell>
                                                            <TableCell><Badge variant="outline" className="bg-white">{req.status}</Badge></TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleResignationAction(req, 'REJECT')}>Reject</Button>
                                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => handleResignationAction(req, 'APPROVE')}>Approve</Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="p-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                            <History className="h-5 w-5 text-blue-500" /> Approval History
                                        </h3>
                                    </div>
                                    <Tabs defaultValue="hist-leave" className="w-full">
                                        <TabsList className="w-full justify-start border-b pb-0 mb-6 bg-transparent p-0 flex gap-6 h-auto">
                                            <TabsTrigger value="hist-leave" className="data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-600 data-[state=inactive]:text-slate-500 bg-transparent rounded-none px-2 py-3 font-semibold transition-all">Leave History</TabsTrigger>
                                            <TabsTrigger value="hist-reg" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=inactive]:text-slate-500 bg-transparent rounded-none px-2 py-3 font-semibold transition-all">Regularization History</TabsTrigger>
                                            <TabsTrigger value="hist-res" className="data-[state=active]:border-b-2 data-[state=active]:border-rose-500 data-[state=active]:text-rose-600 data-[state=inactive]:text-slate-500 bg-transparent rounded-none px-2 py-3 font-semibold transition-all">Resignation History</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="hist-leave" className="mt-0 focus-visible:ring-0">
                                            <RequestTable requests={filteredLeaveHistory} type="LEAVE" isHistory={true} />
                                        </TabsContent>
                                        <TabsContent value="hist-reg" className="mt-0 focus-visible:ring-0">
                                            <RequestTable requests={filteredRegHistory} type="REGULARISATION" isHistory={true} />
                                        </TabsContent>
                                        <TabsContent value="hist-res" className="mt-0 focus-visible:ring-0">
                                            <ResignationHistoryTable requests={filteredResignationHistory} />
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            )}
                        </div>

                    </div>
                </CardContent>
            </Card>

            {/* Edit Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen} >
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
            </Dialog >
        </div >
    );
};

export default ApprovalsPage;
