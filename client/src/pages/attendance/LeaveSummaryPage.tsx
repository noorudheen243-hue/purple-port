import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';

const LeaveSummaryPage = () => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'DEVELOPER_ADMIN';

    // State for selected user (defaults to current user)
    const [selectedUserId, setSelectedUserId] = useState<string>('me');

    // Effect to set default only when user is loaded (though 'me' works for initial load)
    useEffect(() => {
        if (user && !isAdmin) {
            setSelectedUserId('me');
        }
    }, [user, isAdmin]);

    // Fetch Staff List (Only if Admin)
    const { data: staffList = [] } = useQuery({
        queryKey: ['staff-list'],
        queryFn: async () => {
            const res = await api.get('/team/staff');
            return res.data;
        },
        enabled: isAdmin
    });

    // Fetch Real Data for Selected User
    const { data: leaves = [], isLoading } = useQuery({
        queryKey: ['leave-summary', selectedUserId],
        queryFn: async () => {
            const targetId = selectedUserId === 'me' ? user?.id : selectedUserId;
            // Use /team/leaves which supports userId filtering for admins and falls back to self for others
            // Ensure we don't send 'undefined' sting
            if (!targetId) return [];

            const res = await api.get(`/team/leaves?userId=${targetId}`);
            return res.data;
        },
        enabled: !!(selectedUserId === 'me' ? user?.id : selectedUserId)
    });

    // Fetch Allocations
    const { data: allocations = [] } = useQuery({
        queryKey: ['my-allocations', selectedUserId],
        queryFn: async () => {
            const targetId = selectedUserId === 'me' ? user?.id : selectedUserId;
            if (!targetId) return [];
            const year = new Date().getFullYear();
            const res = await api.get(`/attendance/planner/allocations?year=${year}&userId=${targetId}`);
            return res.data; // Returns array, take first
        },
        enabled: !!(selectedUserId === 'me' ? user?.id : selectedUserId)
    });

    const userAllocation = allocations[0]?.allocation || {
        casual_leave: 12, // fallback defaults
        sick_leave: 7,
        earned_leave: 0,
        unpaid_leave: 0
    };

    const displayedLeaves = leaves.filter((l: any) => {
        if (selectedUserId === 'me') return true;
        return true;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>;
            case 'PENDING': return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>;
            case 'REJECTED': return <Badge className="bg-red-500 hover:bg-red-600">Rejected</Badge>;
            default: return <Badge variant="outline">Unknown</Badge>;
        }
    };

    // Calculate Balances 
    const casualUsed = displayedLeaves.filter((l: any) => l.type === 'CASUAL' && l.status === 'APPROVED').length;
    const sickUsed = displayedLeaves.filter((l: any) => l.type === 'SICK' && l.status === 'APPROVED').length;
    const unpaidUsed = displayedLeaves.filter((l: any) => (l.type === 'UNPAID' || l.type === 'LOP') && l.status === 'APPROVED').length;
    const earnedUsed = displayedLeaves.filter((l: any) => l.type === 'EARNED' && l.status === 'APPROVED').length;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Leave Summary</h1>

                {isAdmin && (
                    <div className="w-[300px]">
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Staff Member" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="me">My Summary</SelectItem>
                                {staffList.map((staff: any) => (
                                    <SelectItem key={staff.user_id} value={staff.user_id}>
                                        {staff.user.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Casual Leave</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{casualUsed} / {userAllocation.casual_leave}</div>
                        <div className="text-xs text-muted-foreground mt-1">Available: {userAllocation.casual_leave - casualUsed}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Sick Leave</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sickUsed} / {userAllocation.sick_leave}</div>
                        <div className="text-xs text-muted-foreground mt-1">Available: {userAllocation.sick_leave - sickUsed}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Unpaid/LOP</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{unpaidUsed}</div>
                        <div className="text-xs text-muted-foreground mt-1">Limit: {userAllocation.unpaid_leave > 0 ? userAllocation.unpaid_leave : '∞'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Earned Leave</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{earnedUsed} / {userAllocation.earned_leave}</div>
                        <div className="text-xs text-muted-foreground mt-1">Available: {userAllocation.earned_leave - earnedUsed}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Dates</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Loading...</TableCell>
                                </TableRow>
                            ) : displayedLeaves.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No leave history found.</TableCell>
                                </TableRow>
                            ) : (
                                displayedLeaves.map((leave: any) => (
                                    <TableRow key={leave.id}>
                                        <TableCell><Badge variant="outline">{leave.type}</Badge></TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{format(new Date(leave.start_date), 'PP')} - {format(new Date(leave.end_date), 'PP')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={leave.reason}>{leave.reason}</TableCell>
                                        <TableCell>{getStatusBadge(leave.status)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default LeaveSummaryPage;
