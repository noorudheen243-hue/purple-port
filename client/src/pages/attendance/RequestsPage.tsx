import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { format } from 'date-fns';
import { Check, X, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function RequestsPage() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('PENDING');

    const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'DEVELOPER_ADMIN';

    const { data: requests, isLoading } = useQuery({
        queryKey: ['regularisation-requests', statusFilter],
        queryFn: async () => {
            const res = await api.get(`/attendance/regularisation/requests?status=${statusFilter}`);
            return res.data;
        },
        enabled: isAdminOrManager // Only fetch if admin/manager
    });

    const mutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: 'APPROVED' | 'REJECTED' }) => {
            await api.patch(`/attendance/regularisation/${id}/status`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regularisation-requests'] });
            // Also invalidate attendance logs if approved
            queryClient.invalidateQueries({ queryKey: ['biometric-logs'] });
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Failed to update status');
        }
    });

    if (!isAdminOrManager) {
        return <div className="p-6">You do not have permission to view this page.</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Approvals</h2>
                    <p className="text-muted-foreground">Manage attendance regularization requests</p>
                </div>
            </div>

            <Tabs defaultValue="PENDING" onValueChange={setStatusFilter}>
                <TabsList>
                    <TabsTrigger value="PENDING">Pending</TabsTrigger>
                    <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                    <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
                </TabsList>

                <TabsContent value={statusFilter} className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{statusFilter === 'PENDING' ? 'Pending Requests' : `${statusFilter} History`}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center h-24">Loading...</TableCell>
                                            </TableRow>
                                        ) : requests?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center h-24">No requests found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            requests?.map((req: any) => (
                                                <TableRow key={req.id}>
                                                    <TableCell>{format(new Date(req.date), 'MMM dd, yyyy')}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{req.user?.full_name}</div>
                                                        <div className="text-xs text-muted-foreground">{req.user?.department}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{req.type.replace(/_/g, ' ')}</Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-xs">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="truncate" title={req.reason}>{req.reason}</span>
                                                            {req.exceeds_limit && (
                                                                <span className="flex items-center text-xs text-amber-600 font-semibold gap-1">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    Limit Exceeded
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={
                                                            req.status === 'APPROVED' ? 'default' :
                                                                req.status === 'REJECTED' ? 'destructive' : 'secondary'
                                                        }>
                                                            {req.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {req.status === 'PENDING' && (
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={() => mutation.mutate({ id: req.id, status: 'REJECTED' })}
                                                                    title="Reject"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                    onClick={() => mutation.mutate({ id: req.id, status: 'APPROVED' })}
                                                                    title="Approve"
                                                                >
                                                                    <Check className="w-4 h-4" />
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
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
