
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Calendar as CalendarIcon, Clock, Users, Sun, CheckCircle, XCircle } from 'lucide-react';
import EditShiftModal from '../../components/payroll/EditShiftModal';

const PayrollCalendar = () => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'DEVELOPER_ADMIN';
    const queryClient = useQueryClient();

    const [selectedUserId, setSelectedUserId] = useState<string>('me'); // 'me' resolves to current user in backed if no param usually, but here we logic it out
    // If admin defaults to 'me' it shows admin's own. 

    const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());

    // Edit Modal State
    const [editingDay, setEditingDay] = useState<any>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Fetch Staff for Admin
    const { data: staffList = [] } = useQuery({
        queryKey: ['staff-list'],
        queryFn: async () => {
            const res = await api.get('/team/staff');
            return res.data;
        },
        enabled: isAdmin
    });

    // Fetch Calendar Data
    const { data, isLoading } = useQuery({
        queryKey: ['payroll-calendar', selectedUserId, month, year],
        queryFn: async () => {
            const params: any = { month, year };
            if (selectedUserId !== 'me') params.userId = selectedUserId;

            const res = await api.get('/attendance/calendar', { params });
            return res.data;
        }
    });

    const calendar = data?.calendar || [];
    const stats = data?.stats || { totalDays: 0, holidays: 0, leaves: 0, workingDays: 0 };

    // Handle Edit Click
    const handleDayClick = (dayData: any) => {
        if (!isAdmin) return;
        setEditingDay(dayData);
        setIsEditOpen(true);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <CalendarIcon className="w-6 h-6 text-purple-600" />
                    Payroll Calendar
                </h1>

                <div className="flex flex-wrap gap-2 items-center">
                    {isAdmin && (
                        <div className="w-[200px]">
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="me">My Calendar</SelectItem>
                                    {staffList.map((staff: any) => (
                                        <SelectItem key={staff.user_id} value={staff.user_id}>
                                            {staff.user.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[120px]">
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
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 5 }, (_, i) => {
                                const y = new Date().getFullYear() - 2 + i;
                                return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>;
                            })}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['payroll-calendar'] })}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalDays}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Holidays</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.holidays}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Leaves</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.leaves}</div>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-300">Effective Working Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.workingDays}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Calendar Grid */}
            <Card>
                <CardContent className="p-0">
                    <div className="grid grid-cols-7 border-b text-center font-semibold bg-muted/50">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="p-3 border-r last:border-r-0">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7">
                        {/* Pad empty start days if needed - simplistic approach for now, assuming list matches dates. 
                            To do proper grid, we need to know start day of week.
                            Let's rely on the backend returning full month list and just standard grid wrapping.
                            We need to pad the START.
                         */}
                        {(() => {
                            if (calendar.length === 0) return null;
                            const firstDayStr = calendar[0].date; // YYYY-MM-01
                            const firstDayIndex = new Date(firstDayStr).getDay(); // 0-6

                            return Array.from({ length: firstDayIndex }).map((_, i) => (
                                <div key={`pad-${i}`} className="h-32 border-b border-r bg-muted/10"></div>
                            ));
                        })()}

                        {calendar.map((day: any) => {
                            let bgClass = '';
                            if (day.status === 'HOLIDAY') bgClass = 'bg-yellow-50 dark:bg-yellow-900/20';
                            else if (day.status === 'LEAVE') bgClass = 'bg-red-50 dark:bg-red-900/20';
                            else if (day.status === 'WEEKOFF') bgClass = 'bg-slate-50 dark:bg-slate-900/10';
                            else if (day.status === 'PRESENT') bgClass = 'bg-green-50 dark:bg-green-900/20';
                            else if (day.status === 'ABSENT' && new Date(day.date) < new Date()) bgClass = 'bg-red-50/50'; // Absent in past

                            return (
                                <div
                                    key={day.date}
                                    className={`h-32 border-b border-r p-2 hover:bg-slate-100 transition-colors cursor-pointer relative group ${bgClass}`}
                                    onClick={() => handleDayClick(day)}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-sm font-medium ${day.status === 'HOLIDAY' ? 'text-yellow-700' : ''}`}>{day.day}</span>
                                        {day.status !== 'WEEKOFF' && day.status !== 'ABSENT' && (
                                            <Badge variant="outline" className="text-[10px] uppercase">{day.status}</Badge>
                                        )}
                                    </div>

                                    <div className="mt-2 text-xs space-y-1">
                                        {day.status === 'PRESENT' && day.details && (
                                            <>
                                                <div className="flex items-center gap-1 text-green-700">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(day.details.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    -
                                                    {day.details.check_out ? new Date(day.details.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                </div>
                                                {day.details.work_hours && (
                                                    <div className="text-muted-foreground">{day.details.work_hours.toFixed(1)} hrs</div>
                                                )}
                                            </>
                                        )}
                                        {day.status === 'HOLIDAY' && (
                                            <div className="text-yellow-700 truncate font-medium" title={day.details?.name}>{day.details?.name}</div>
                                        )}
                                        {day.status === 'LEAVE' && (
                                            <div className="text-red-700 truncate" title={day.details?.reason}>{day.details?.type} - {day.details?.reason}</div>
                                        )}
                                    </div>

                                    {isAdmin && (
                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none">
                                            <span className="text-xs font-semibold bg-white px-2 py-1 rounded shadow">Edit</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Edit Modal (Placeholder - Needs Implementation) */}
            {isEditOpen && editingDay && (
                <EditShiftModal
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    dayData={editingDay}
                    userId={selectedUserId === 'me' ? (user?.id || '') : selectedUserId} // If admin viewing 'me', pass own id. If viewing other, pass that.
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['payroll-calendar'] });
                        setIsEditOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default PayrollCalendar;
