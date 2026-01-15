
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
    Loader2,
    Undo2,
    Trash2,
    CheckCircle2,
    XCircle,
    Clock
} from 'lucide-react';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const LeaveHistoryPage = () => {
    const queryClient = useQueryClient();
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [statusFilter, setStatusFilter] = useState('ALL');

    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [actionType, setActionType] = useState<'revert' | 'delete' | null>(null);

    // Fetch History
    const { data: history = [], isLoading } = useQuery({
        queryKey: ['leave-history', month, year, statusFilter],
        queryFn: async () => {
            const { data } = await api.get(`/leave/history?month=${month}&year=${year}&status=${statusFilter}`);
            return data;
        }
    });

    // Mutations
    const revertMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.post(`/leave/${id}/revert`);
        },
        onSuccess: () => {
            alert("Leave request reverted to Pending");
            queryClient.invalidateQueries({ queryKey: [`leave-history`] });
            handleCloseModal();
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || "Failed to revert request");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/leave/${id}`);
        },
        onSuccess: () => {
            alert("Leave request deleted permanently");
            queryClient.invalidateQueries({ queryKey: [`leave-history`] });
            handleCloseModal();
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || "Failed to delete request");
        }
    });

    const handleActionConfirm = () => {
        if (!selectedRequest) return;
        if (actionType === 'revert') {
            revertMutation.mutate(selectedRequest.id);
        } else if (actionType === 'delete') {
            deleteMutation.mutate(selectedRequest.id);
        }
    };

    const handleCloseModal = () => {
        setSelectedRequest(null);
        setActionType(null);
    };

    // Calculate Stats
    const stats = {
        total: history.length,
        approved: history.filter((r: any) => r.status === 'APPROVED').length,
        rejected: history.filter((r: any) => r.status === 'REJECTED').length,
        pending: history.filter((r: any) => r.status === 'PENDING').length
    };

    const getStatusBadge = (status: string) => {
        const styles: any = {
            APPROVED: 'bg-green-100 text-green-700 hover:bg-green-100',
            REJECTED: 'bg-red-100 text-red-700 hover:bg-red-100',
            PENDING: 'bg-orange-100 text-orange-700 hover:bg-orange-100'
        };
        return <Badge className={styles[status] || ''}>{status}</Badge>;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold">Leave Request History</h1>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 bg-secondary/30 p-2 rounded-lg">
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[120px] bg-background">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[100px] bg-background">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {[2025, 2026, 2027].map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px] bg-background">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                        <div className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-600">Approved</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{stats.approved}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-600">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-orange-600">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-700">{stats.pending}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Data Table */}
            <Card className="overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead>Staff Details</TableHead>
                            <TableHead>Leave Type</TableHead>
                            <TableHead>Dates / Duration</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action By</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading history...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : history.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No records found for this period.
                                </TableCell>
                            </TableRow>
                        ) : (
                            history.map((request: any) => {
                                const startDate = new Date(request.start_date);
                                const endDate = new Date(request.end_date);
                                const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                                return (
                                    <TableRow key={request.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{request.user.full_name}</span>
                                                <span className="text-xs text-muted-foreground">{request.user.department}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs">{request.type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span>{startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</span>
                                                <span className="text-xs text-muted-foreground">{days} days</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <p className="truncate text-sm text-muted-foreground" title={request.reason}>
                                                {request.reason}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(request.status)}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-medium text-muted-foreground">
                                                {request.approver?.full_name || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {request.status !== 'PENDING' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        title="Revert to Pending"
                                                        onClick={() => {
                                                            setSelectedRequest(request);
                                                            setActionType('revert');
                                                        }}
                                                    >
                                                        <Undo2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    title="Delete Permanently"
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setActionType('delete');
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>

            <ConfirmationModal
                isOpen={!!selectedRequest}
                onClose={handleCloseModal}
                onConfirm={handleActionConfirm}
                title={actionType === 'revert' ? 'Revert Request?' : 'Delete Request?'}
                message={actionType === 'revert'
                    ? "Are you sure you want to revert this request to PENDING? This will remove any associated 'LEAVE' records from the Attendance Register."
                    : "Are you sure you want to permanently delete this request? This action cannot be undone and will remove associated attendance records."}
                confirmLabel={actionType === 'revert' ? 'Revert' : 'Delete'}
                isDestructive={true}
            />
        </div>
    );
};

export default LeaveHistoryPage;
