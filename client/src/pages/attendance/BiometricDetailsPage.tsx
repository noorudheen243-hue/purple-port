
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Clock, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/button';
import { useQueryClient } from '@tanstack/react-query';

import { RegularizationRequestDialog } from '../../components/attendance/RegularizationRequestDialog';

export default function BiometricDetailsPage() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'DEVELOPER_ADMIN';

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [search, setSearch] = useState('');
    const [selectedStaff, setSelectedStaff] = useState<string>('ALL');
    const [selectedDateForRegularization, setSelectedDateForRegularization] = useState<Date | string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Sync Function
    const handleSyncLogs = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            const res = await api.post('/attendance/sync-device', {}, { timeout: 60000 });
            queryClient.invalidateQueries({ queryKey: ['biometric-logs'] });
            return res.data;
        } catch (e: any) {
            console.error("Sync Failed:", e);
            throw e;
        } finally {
            setIsSyncing(false);
        }
    };

    // Auto-Sync on Mount
    useEffect(() => {
        if (isAdminOrManager) {
            const autoSync = async () => {
                try {
                    console.log("Auto-Syncing Biometric Logs...");
                    // We don't want to block UI or show alert on auto-sync, just do it.
                    await handleSyncLogs();
                } catch (e) {
                    console.warn("Auto-Sync Failed (Silently)", e);
                }
            };
            autoSync();
        }
    }, [isAdminOrManager]); // Dependencies: run when role checks out.

    // Fetch Staff List for Dropdown (Admin Only)
    const { data: staffList } = useQuery({
        queryKey: ['staff-list'],
        queryFn: async () => {
            const res = await api.get('/team/staff');
            // Filter out system users
            return res.data?.filter((s: any) => s.user?.full_name !== 'Biometric Bridge Agent');
        },
        enabled: isAdminOrManager
    });

    const { data: logs, isLoading } = useQuery({
        queryKey: ['biometric-logs', date, endDate, selectedStaff],
        queryFn: async () => {
            let url = `/attendance/biometric-logs?start=${date}&end=${endDate}`;
            if (selectedStaff !== 'ALL') {
                url += `&userId=${selectedStaff}`;
            }
            const res = await api.get(url);
            return res.data;
        }
    });

    const filteredLogs = useMemo(() => {
        if (!logs) return [];
        return logs.filter((log: any) =>
            log.user_name !== 'Biometric Bridge Agent' &&
            (log.user_name.toLowerCase().includes(search.toLowerCase()) ||
                log.staff_number.toLowerCase().includes(search.toLowerCase()))
        );
    }, [logs, search]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Biometric Details</h2>
                    <p className="text-muted-foreground">Daily punch logs and shift adherence</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Attendance Logs
                        </CardTitle>
                        <div className="flex gap-2 items-end flex-wrap">
                            <div className="w-40">
                                <Label>Start Date</Label>
                                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                            </div>
                            <div className="w-40">
                                <Label>End Date</Label>
                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>

                            {isAdminOrManager && (
                                <div className="w-48">
                                    <Label>Select Staff</Label>
                                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Staff" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Staff</SelectItem>
                                            {staffList?.map((staff: any) => (
                                                <SelectItem key={staff.id} value={staff.user?.id}>
                                                    {staff.user?.full_name || 'Unknown'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="w-64">
                                <Label>Search Logs</Label>
                                <Input
                                    placeholder="Search by name or ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            {isAdminOrManager && (
                                <div className="pb-1">
                                    <Button
                                        onClick={async () => {
                                            try {
                                                const res = await handleSyncLogs();
                                                if (res) alert('Success: ' + res.message);
                                            } catch (e: any) {
                                                alert('Sync Failed: ' + (e.response?.data?.error || e.message));
                                            }
                                        }}
                                        disabled={isSyncing}
                                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                        {isSyncing ? 'Syncing Logs...' : 'Sync Logs'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Staff Name</TableHead>
                                    <TableHead>Staff ID</TableHead>
                                    <TableHead>Shift Timing</TableHead>
                                    <TableHead>Punch In</TableHead>
                                    <TableHead>Punch Out</TableHead>
                                    <TableHead>Work Hours</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center h-24">Loading...</TableCell>
                                    </TableRow>
                                ) : filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center h-24">No logs found for selected range.</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log: any) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{format(new Date(log.date), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell className="font-medium">{log.user_name}</TableCell>
                                            <TableCell>{log.staff_number}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{log.shift_timing}</TableCell>
                                            <TableCell>
                                                {log.check_in ? (
                                                    <span className="text-green-600 font-mono">
                                                        {format(new Date(log.check_in), 'hh:mm aa')}
                                                    </span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {log.check_out ? (
                                                    <span className="text-red-600 font-mono">
                                                        {format(new Date(log.check_out), 'hh:mm aa')}
                                                    </span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>{log.work_hours ? log.work_hours.toFixed(2) + ' hrs' : '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    log.status === 'PRESENT' ? 'default' :
                                                        log.status === 'ABSENT' ? 'destructive' : 'secondary'
                                                }>
                                                    {log.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {/* Only show Regularize if Absent, Half-Day, or Missing Punches */}
                                                {(log.status === 'ABSENT' || log.status === 'HALF_DAY' || !log.check_in || !log.check_out) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-blue-600 hover:text-blue-800"
                                                        onClick={() => setSelectedDateForRegularization(log.date)}
                                                    >
                                                        Regularize
                                                    </Button>
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

            {selectedDateForRegularization && (
                <RegularizationRequestDialog
                    isOpen={!!selectedDateForRegularization}
                    onClose={() => setSelectedDateForRegularization(null)}
                    date={selectedDateForRegularization}
                />
            )}
        </div>
    );
}
