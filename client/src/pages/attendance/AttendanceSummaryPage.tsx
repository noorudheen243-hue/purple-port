import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';

// Mock Data for demonstration
// In real app, fetch from /api/attendance/team-summary
const MOCK_DATA = [
    {
        user: { id: '1', name: 'Alice Smith', shift: '09:30 - 18:30' },
        attendance: {
            '2023-10-01': { status: 'HOLIDAY' },
            '2023-10-02': { status: 'PRESENT', check_in: '2023-10-02T09:35:00', check_out: '2023-10-02T18:30:00' },
            '2023-10-03': { status: 'LATE', check_in: '2023-10-03T10:15:00', check_out: '2023-10-03T18:40:00' },
            '2023-10-04': { status: 'ABSENT' },
        }
    },
    {
        user: { id: '2', name: 'Bob Jones', shift: '10:00 - 19:00' },
        attendance: {
            '2023-10-01': { status: 'HOLIDAY' },
            '2023-10-02': { status: 'PRESENT', check_in: '2023-10-02T09:55:00', check_out: '2023-10-02T19:05:00' },
        }
    }
];

import api from '../../lib/api';

const AttendanceSummaryPage = () => {
    // Default to Current Month and Year (Live)
    const currentDate = new Date();
    const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());
    const [year, setYear] = useState(currentDate.getFullYear().toString());

    const [daysInMonth, setDaysInMonth] = useState<number[]>([]);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const days = new Date(parseInt(year), parseInt(month), 0).getDate();
        setDaysInMonth(Array.from({ length: days }, (_, i) => i + 1));
        fetchAttendance();
    }, [month, year]);

    const fetchAttendance = async () => {
        setIsLoading(true);
        try {
            // Fetch from real API
            const { data } = await api.get(`/attendance/team-summary?month=${month}&year=${year}`);
            setAttendanceData(data);
        } catch (error) {
            console.error("Failed to fetch attendance summary", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusContent = (record: any, day: number, userShift: string) => {
        // 1. Force Sunday as Holiday/Weekly Off (Priority Overwrite)
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, day);
        if (dateObj.getDay() === 0) { // 0 is Sunday
            return <div className="flex items-center justify-center h-full text-blue-600 font-bold text-sm">H</div>;
        }

        // 2. Check if Record exists
        if (record) {
            if ((record.status === 'PRESENT' || record.status === 'LATE' || record.status === 'HALF_DAY') && record.check_in) {
                return (
                    <div className="flex items-center justify-center h-full">
                        <Check className="h-5 w-5 text-green-600" />
                    </div>
                );
            }
            // Fallback: If status says PRESENT but no check_in, consider it Absent (Ghost Record)
            if (record.status === 'ABSENT' || (record.status === 'PRESENT' && !record.check_in)) {
                return <div className="w-full h-full bg-red-100 flex items-center justify-center rounded text-red-600 font-bold text-xs">AB</div>;
            }

            // Holiday - Blue 'H'
            if (record.status === 'HOLIDAY') return <div className="flex items-center justify-center h-full text-blue-600 font-bold text-sm">H</div>;

            // Leave - Red Box with 'X' or Short Code
            if (record.status === 'LEAVE') {
                let code = <X className="h-4 w-4 text-red-600" />;
                if (record.leave_type) {
                    const typeMap: Record<string, string> = {
                        'CASUAL': 'CL',
                        'SICK': 'SL',
                        'EARNED': 'EL',
                        'UNPAID': 'LOP',
                        'MATERNITY': 'ML',
                        'PATERNITY': 'PL',
                        'COMPENSATORY': 'CO'
                    };
                    const shortCode = typeMap[record.leave_type] || 'L';
                    code = <span className="text-[10px] font-bold text-red-700">{shortCode}</span>;
                }

                return (
                    <div className="w-full h-full bg-red-100 flex items-center justify-center rounded border border-red-200">
                        {code}
                    </div>
                );
            }

            return <span>{record.status}</span>;
        }

        // 2. If No Record, Check for Sunday (Redundant now, captured by step 1) but kept variable for step 3 logic if needed, 
        // actually step 1 returns early, so if we are here, it is NOT a Sunday.

        // 3. Check for Past Dates (Absent)
        // Set time to end of day to ensure we catch "today" correctly if needed, or stick to start of day for strict comparison.
        // Let's use start of today for comparison.
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // If dateObj is before today, and no record exists, it's an Absence (AB)
        if (dateObj < today) {
            return <div className="w-full h-full bg-red-100 flex items-center justify-center rounded text-red-600 font-bold text-xs">AB</div>;
        }

        // 4. Default Empty (Future/Today) - Show Shift Timing
        return <span className="text-[9px] text-muted-foreground/50 whitespace-pre-wrap leading-tight block">{userShift.replace(' - ', '\nto\n')}</span>;
    };

    const years = Array.from({ length: 11 }, (_, i) => 2026 + i); // 2026 to 2036

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Monthly Attendance Register</h1>
                <div className="flex items-center gap-4">
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">January</SelectItem>
                            <SelectItem value="2">February</SelectItem>
                            <SelectItem value="3">March</SelectItem>
                            <SelectItem value="4">April</SelectItem>
                            <SelectItem value="5">May</SelectItem>
                            <SelectItem value="6">June</SelectItem>
                            <SelectItem value="7">July</SelectItem>
                            <SelectItem value="8">August</SelectItem>
                            <SelectItem value="9">September</SelectItem>
                            <SelectItem value="10">October</SelectItem>
                            <SelectItem value="11">November</SelectItem>
                            <SelectItem value="12">December</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={fetchAttendance} disabled={isLoading}>
                        Refresh
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden shadow-lg border-t-4 border-t-primary">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-[200px] sticky left-0 bg-background/95 backdrop-blur z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] h-12">Staff Details</TableHead>
                                    {daysInMonth.map(d => {
                                        const dateObj = new Date(parseInt(year), parseInt(month) - 1, d);
                                        const isSunday = dateObj.getDay() === 0;
                                        return (
                                            <TableHead key={d} className={`min-w-[50px] text-center p-1 h-12 border-l ${isSunday ? 'bg-blue-50/50 text-blue-700' : ''}`}>
                                                <div className="flex flex-col items-center justify-center h-full">
                                                    <span className="font-bold text-sm">{d}</span>
                                                    <span className="text-[10px] uppercase opacity-70">{dateObj.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                                                </div>
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={daysInMonth.length + 1} className="text-center py-8 text-muted-foreground animate-pulse">Loading attendance data...</TableCell>
                                    </TableRow>
                                ) : attendanceData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={daysInMonth.length + 1} className="text-center py-8 text-muted-foreground">No staff found.</TableCell>
                                    </TableRow>
                                ) : (
                                    attendanceData.map((data, index) => (
                                        <TableRow key={data.user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                            <TableCell className="sticky left-0 bg-inherit z-10 font-medium border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-foreground">{data.user.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">{data.user.designation || data.user.department}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            {daysInMonth.map(d => {
                                                const dateKey = `${year}-${month.padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                                const record = data.attendance[dateKey];
                                                const isSunday = new Date(parseInt(year), parseInt(month) - 1, d).getDay() === 0;
                                                return (
                                                    <TableCell key={d} className={`p-1 text-center border-l h-14 ${isSunday ? 'bg-blue-50/30' : ''} hover:bg-muted/20 transition-colors`}>
                                                        {getStatusContent(record, d, data.user.shift)}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    )))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AttendanceSummaryPage;
