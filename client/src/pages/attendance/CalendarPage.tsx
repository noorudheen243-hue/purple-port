import React, { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ChevronLeft, ChevronRight, Check, X, Clock, HelpCircle, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, isSameMonth, addMonths, subMonths, getDay } from 'date-fns';

const CalendarPage = () => {
    const { user } = useAuthStore();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    // Set default selected user to current user
    React.useEffect(() => {
        if (user?.id && !selectedUserId) {
            setSelectedUserId(user.id);
        }
    }, [user]);

    // Fetch Staff List (for Admins)
    const { data: staffList } = useQuery({
        queryKey: ['staff-list-calendar'],
        queryFn: async () => (await api.get('/team/staff')).data,
        enabled: ['ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'].includes(user?.role || '')
    });

    // Fetch attendance
    const { data: attendanceData } = useQuery({
        queryKey: ['attendance', format(currentMonth, 'yyyy-MM'), selectedUserId],
        queryFn: async () => {
            if (!selectedUserId) return [];
            const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
            const res = await api.get(`/attendance/summary?userId=${selectedUserId}&start=${start}&end=${end}`);
            return res.data;
        },
        enabled: !!selectedUserId
    });

    // Helper to get status for a specific day
    const getStatusForDay = (date: Date) => {
        if (!attendanceData) return null;
        // Basic match logic assuming attendanceData is array of records
        const record = attendanceData.find((r: any) => isSameDay(new Date(r.date), date));
        return record;
    };

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    // Pad starting empty days
    const startingDayIndex = getDay(startOfMonth(currentMonth));
    const paddedDays = Array.from({ length: startingDayIndex }).fill(null).concat(daysInMonth);

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Attendance Calendar</h1>
                <div className="flex items-center gap-4">
                    {['ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'].includes(user?.role || '') && staffList && (
                        <div className="w-[200px]">
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staffList.map((s: any) => (
                                        <SelectItem key={s.user.id} value={s.user.id}>
                                            {s.user.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft /></Button>
                    <span className="text-lg font-medium min-w-[150px] text-center">{format(currentMonth, 'MMMM yyyy')}</span>
                    <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight /></Button>
                </div>
            </div>

            <Card className="flex-1 overflow-hidden">
                <CardContent className="p-0 h-full flex flex-col">
                    <div className="grid grid-cols-7 text-center border-b">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="p-4 font-bold bg-muted/20 text-muted-foreground">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                        {paddedDays.map((date: any, i) => {
                            if (!date) return <div key={`empty-${i}`} className="border-b border-r bg-muted/5" />;

                            const record = getStatusForDay(date);
                            const isToday = isSameDay(date, new Date());

                            let statusColor = 'bg-gray-50';
                            let icon = null;
                            let statusText = '';

                            const isSunday = getDay(date) === 0;
                            // Infer status if no record
                            let displayStatus = record?.status;

                            // FORCE SUNDAY AS WEEKLY OFF (Ignore any present marks)
                            if (isSunday) {
                                displayStatus = 'WEEKLY_OFF';
                            } else {
                                // Infer status logic for other days
                                if (!record && date < new Date(new Date().setHours(0, 0, 0, 0))) {
                                    displayStatus = 'ABSENT';
                                }

                                // Ghost Record Fix
                                if (record && record.status === 'PRESENT' && !record.check_in) {
                                    displayStatus = 'ABSENT';
                                }
                            }

                            if (displayStatus) {
                                switch (displayStatus) {
                                    case 'PRESENT':
                                        statusColor = 'bg-green-50 hover:bg-green-100 border-green-100';
                                        icon = <Check className="h-4 w-4 text-green-600" />;
                                        statusText = 'Present';
                                        break;
                                    case 'ABSENT':
                                        statusColor = 'bg-red-50 hover:bg-red-100 border-red-100';
                                        icon = <X className="h-4 w-4 text-red-600" />;
                                        statusText = 'Absent';
                                        break;
                                    case 'LEAVE':
                                        statusColor = 'bg-purple-50 hover:bg-purple-100 border-purple-100';
                                        icon = <Clock className="h-4 w-4 text-purple-600" />;
                                        statusText = 'On Leave';
                                        break;
                                    case 'HALF_DAY':
                                        statusColor = 'bg-yellow-50 hover:bg-yellow-100 border-yellow-100';
                                        statusText = 'Half Day';
                                        break;
                                    case 'WEEKLY_OFF':
                                    case 'HOLIDAY':
                                        statusColor = 'bg-blue-50/50 text-blue-700';
                                        statusText = displayStatus === 'HOLIDAY' ? 'Holiday' : 'Weekly Off';
                                        break;
                                    default:
                                        statusText = displayStatus;
                                }
                            }

                            return (
                                <div key={date.toString()} className={`p-2 border-b border-r min-h-[100px] flex flex-col items-start justify-between transition-colors ${statusColor} ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}>
                                    <span className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{format(date, 'd')}</span>
                                    {(record || displayStatus) && (
                                        <div className="w-full">
                                            {statusText && <span className="text-xs font-semibold block mb-1">{statusText}</span>}
                                            {record?.check_in && (
                                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <span className="text-green-600">IN:</span> {format(new Date(record.check_in), 'HH:mm')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CalendarPage;
