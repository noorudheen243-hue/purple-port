import React, { useState, useEffect } from 'react';
import { Check, X, Calendar, ClipboardList } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import api from '../../lib/api';

const AttendanceSummaryPage = () => {
    // Default to Current Month and Year (Live)
    const currentDate = new Date();
    const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());
    const [year, setYear] = useState(currentDate.getFullYear().toString());

    const [daysInMonth, setDaysInMonth] = useState<number[]>([]);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'REGISTER' | 'SUMMARY'>('REGISTER');

    useEffect(() => {
        const days = new Date(parseInt(year), parseInt(month), 0).getDate();
        setDaysInMonth(Array.from({ length: days }, (_, i) => i + 1));
        fetchAttendance();
    }, [month, year]);

    const fetchAttendance = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get(`/attendance/team-summary?month=${month}&year=${year}`);
            setAttendanceData(data);
        } catch (error) {
            console.error("Failed to fetch attendance summary", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusContent = (record: any, day: number, userShift: string) => {
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, day);
        if (dateObj.getDay() === 0) {
            return <div className="flex items-center justify-center h-full text-blue-600 font-bold text-sm">H</div>;
        }

        if (record) {
            // 1. Holiday
            if (record.status === 'HOLIDAY') return <div className="flex items-center justify-center h-full text-blue-600 font-bold text-sm">H</div>;

            // 2. Leave
            if (record.status === 'LEAVE') {
                let code = <X className="h-4 w-4 text-red-600" />;
                if (record.leave_type) {
                    const typeMap: Record<string, string> = { 'CASUAL': 'CL', 'SICK': 'SL', 'EARNED': 'EL', 'UNPAID': 'LOP', 'MATERNITY': 'ML', 'PATERNITY': 'PL', 'COMPENSATORY': 'CO' };
                    const shortCode = typeMap[record.leave_type] || 'L';
                    code = <span className="text-[10px] font-bold text-red-700">{shortCode}</span>;
                }
                return <div className="w-full h-full bg-red-100 flex items-center justify-center rounded border border-red-200">{code}</div>;
            }

            // 3. Present / Half Day Logic check for UI Display
            // We use the same Logic as Summary Calculation for consistency
            const { status } = calculateDailyStatus(record);

            if (status === 'HALF_DAY') {
                return (
                    <div className="flex flex-col items-center justify-center h-full">
                        <span className="text-[10px] font-bold text-orange-600">HD</span>
                        <span className="text-[8px] text-muted-foreground">{record.check_in ? 'In Only' : 'Out Only'}</span>
                    </div>
                );
            }

            if ((status === 'PRESENT' || status === 'LATE') && record.check_in) {
                return <div className="flex items-center justify-center h-full"><Check className="h-5 w-5 text-green-600" /></div>;
            }

            // Fallback Absent
            if (record.status === 'ABSENT' || (record.status === 'PRESENT' && !record.check_in)) {
                return <div className="w-full h-full bg-red-100 flex items-center justify-center rounded text-red-600 font-bold text-xs">AB</div>;
            }

            return <span>{record.status}</span>;
        }

        // Past Dates Empty = Absent
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj < today) {
            return <div className="w-full h-full bg-red-100 flex items-center justify-center rounded text-red-600 font-bold text-xs">AB</div>;
        }

        return <span className="text-[9px] text-muted-foreground/50 whitespace-pre-wrap leading-tight block">{userShift.replace(' - ', '\nto\n')}</span>;
    };


    // --- Summary Logic ---

    const calculateDailyStatus = (record: any) => {
        if (!record) return { status: 'ABSENT', value: 0 };
        if (record.status === 'HOLIDAY') return { status: 'HOLIDAY', value: 1 }; // Weekends/Holidays don't count as "Present" work days usually, but they are paid. However, for "Total Present Days" count, usually we count ACTUAL worked days.
        // Wait, "Total Holidays" is separate. "Total Present Days" typically means days worked. 

        if (record.status === 'LEAVE') return { status: 'LEAVE', value: 0 };

        // Half Day Checks
        // 1. Backend explicit Half Day
        if (record.status === 'HALF_DAY') return { status: 'HALF_DAY', value: 0.5 };

        // 2. Missing One Punch (Check In exists but No Check Out OR Vice Versa? Usually backend sends what it has)
        // If status is PRESENT/LATE but one punch is missing
        if ((record.status === 'PRESENT' || record.status === 'LATE') && (!record.check_in || !record.check_out)) {
            return { status: 'HALF_DAY', value: 0.5 };
        }

        // 3. Duration Check (>= 4 hrs)
        if (record.check_in && record.check_out) {
            const start = new Date(record.check_in);
            const end = new Date(record.check_out);
            const durationHrs = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

            if (durationHrs >= 4 && durationHrs <= 7) {
                // User defined: 4-7 hours is Half Day
                return { status: 'HALF_DAY', value: 0.5 };
            }
            // If duration > 7 -> Full Day
        }

        if (record.status === 'PRESENT' || record.status === 'LATE') return { status: 'PRESENT', value: 1 };

        return { status: 'ABSENT', value: 0 };
    };

    const calculateSummary = (user: any) => {
        let totalHolidays = 0;
        let totalPresentValue = 0; // Full = 1, Half = 0.5
        let totalLeaves = 0;
        let totalLOP = 0;
        let totalHalfDaysCount = 0; // For separate count if needed

        // We need to iterate ALL days in month, not just records
        daysInMonth.forEach(day => {
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, day);
            const dateKey = `${year}-${month.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSunday = dateObj.getDay() === 0;
            const isFuture = dateObj > new Date(); // Ignore future dates for LOP calculation? Or count as 0? 
            // "Payroll Process Days" usually implies for the whole month, assuming 30.

            // Priority:
            // 1. Sunday -> Holiday (unless worked? usually treat as Holiday/Off)
            // 2. Holiday Record -> Holiday
            // 3. Leave -> Leave
            // 4. Present/Half -> Present
            // 5. No Record (Past) -> LOP
            // 6. Future -> Ignore (or treat as projected? Standard payroll assumes 30 days usually).

            if (isSunday) {
                totalHolidays++;
                return;
            }

            const record = user.attendance[dateKey];
            if (record) {
                if (record.status === 'HOLIDAY') {
                    totalHolidays++;
                } else if (record.status === 'LEAVE') {
                    totalLeaves++;
                } else {
                    const { status, value } = calculateDailyStatus(record);
                    if (status === 'HALF_DAY') {
                        totalPresentValue += 0.5;
                        totalHalfDaysCount++;
                    } else if (status === 'PRESENT') {
                        totalPresentValue += 1;
                    } else {
                        // Absent record
                        totalLOP++;
                    }
                }
            } else {
                // No Record
                // If Past Date (and not Sunday), it is LOP
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (dateObj < today) {
                    totalLOP++;
                }
                // Future dates don't count as LOP or Present yet.
            }
        });

        // Payroll Process Days = 30 - (LOP) + (HalfDays * 0.5)? 
        // User Formula: "30 - (Number of LOP Days x 1 ) + Nomber of Half-Days x .5"
        // Wait, if Half Day is worked, it is PAID. 
        // If LOP is Absent, it is DEDUCTED.
        // User likely means: Start with 30. Deduct Full Absences.
        // What about Half Days? If they worked half day, they lose 0.5 day pay? Or get 0.5 pay?
        // "30 - (LOP) + (Half * 0.5)" -> This adds to 30? No.
        // If I am Absent 1 day -> 29.
        // If I work Half Day 1 day -> Is it 29.5?
        // Formula: 30 - (LOP_Days) - (Half_Day_Count * 0.5). 
        // Example: 1 Half Day. LOP = 0. Process = 30 - 0 - 0.5 = 29.5. (Correct, lost half day pay).
        // Example: 1 Absent (LOP). Process = 30 - 1 = 29.

        // CORRECTION: User formula text was "30 - (Number of LOP Days x 1 ) + Nomber of Half-Days x .5"
        // The "+" is suspicious. If "Number of Half-Days x .5" is deducted, it should be "-".
        // IF the user meant "Effective Worked Days" it would be different.
        // "Payroll Process Days" usually means "Paid Days".
        // I will assume logic: Pay for 30 days minus deductions.
        // Deductions = Full LOP + 0.5 * Half LOP.
        // If a Half Day is worked, it counts as 0.5 LOP (0.5 Worked).
        // So Process Days = 30 - LOP_Count - (Half_Day_Count * 0.5).

        const processDays = 30 - totalLOP - (totalHalfDaysCount * 0.5);

        return {
            totalDays: daysInMonth.length,
            totalHolidays,
            totalPresentValue, // (Green Tick = 1, Half = 0.5)
            totalLeaves,
            totalLOP, // Full Absences
            totalHalfDaysCount,
            processDays
        };
    };


    const years = Array.from({ length: 11 }, (_, i) => 2026 + i);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Attendance Management</h1>
                    <p className="text-muted-foreground">Monitor daily attendance and generate monthly summaries.</p>
                </div>

                <div className="flex bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('REGISTER')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'REGISTER'
                            ? 'bg-purple-700 text-white shadow'
                            : 'text-muted-foreground hover:bg-background/50'
                            }`}
                    >
                        <Calendar className="w-4 h-4 mr-2 inline-block" />
                        Attendance Register
                    </button>
                    <button
                        onClick={() => setViewMode('SUMMARY')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'SUMMARY'
                            ? 'bg-yellow-400 text-purple-900 shadow font-semibold'
                            : 'text-muted-foreground hover:bg-background/50'
                            }`}
                    >
                        <ClipboardList className="w-4 h-4 mr-2 inline-block" />
                        Attendance Summary
                    </button>
                </div>

                <div className="flex items-center gap-2">
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
                            {years.map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={fetchAttendance} disabled={isLoading}>
                        {isLoading ? 'Loading...' : 'Refresh'}
                    </Button>
                </div>
            </div>

            {viewMode === 'REGISTER' ? (
                <Card className="overflow-hidden shadow-lg border-t-4 border-t-purple-600">
                    <CardHeader className="bg-purple-50/50 pb-4">
                        <CardTitle className="text-purple-900">Monthly Register</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[250px] sticky left-0 bg-background z-20 font-bold border-r">Staff Details</TableHead>
                                        {daysInMonth.map(d => {
                                            const dateObj = new Date(parseInt(year), parseInt(month) - 1, d);
                                            const isSunday = dateObj.getDay() === 0;
                                            return (
                                                <TableHead key={d} className={`min-w-[45px] text-center p-1 border-l ${isSunday ? 'bg-blue-50 text-blue-700' : ''}`}>
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className="font-bold">{d}</span>
                                                        <span className="text-[9px] uppercase">{dateObj.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                                                    </div>
                                                </TableHead>
                                            );
                                        })}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attendanceData.map((data, index) => (
                                        <TableRow key={data.user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <TableCell className="sticky left-0 bg-inherit z-10 border-r py-3">
                                                <div className="font-medium text-sm">{data.user.name}</div>
                                                <div className="text-[10px] text-muted-foreground">{data.user.designation}</div>
                                            </TableCell>
                                            {daysInMonth.map(d => {
                                                const dateKey = `${year}-${month.padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                                const record = data.attendance[dateKey];
                                                const isSunday = new Date(parseInt(year), parseInt(month) - 1, d).getDay() === 0;
                                                return (
                                                    <TableCell key={d} className={`p-0 text-center border-l h-12 ${isSunday ? 'bg-blue-50/30' : ''}`}>
                                                        {getStatusContent(record, d, data.user.shift)}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="shadow-lg border-t-4 border-t-yellow-500">
                    <CardHeader className="bg-yellow-50/50 pb-4">
                        <CardTitle className="text-yellow-800">Attendance Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[300px]">Staff Name</TableHead>
                                    <TableHead className="text-center">Total Days</TableHead>
                                    <TableHead className="text-center text-blue-600">Holidays</TableHead>
                                    <TableHead className="text-center text-green-600">Present (Effective)</TableHead>
                                    <TableHead className="text-center text-orange-600">Half Days</TableHead>
                                    <TableHead className="text-center text-purple-600">Approved Leaves</TableHead>
                                    <TableHead className="text-center text-red-600">LOP Days</TableHead>
                                    <TableHead className="text-center font-bold bg-slate-100">Payroll Process Days</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendanceData.map((data) => {
                                    const summary = calculateSummary(data);
                                    return (
                                        <TableRow key={data.user.id}>
                                            <TableCell>
                                                <div className="font-medium">{data.user.name}</div>
                                                <div className="text-xs text-muted-foreground">{data.user.designation}</div>
                                            </TableCell>
                                            <TableCell className="text-center">{summary.totalDays}</TableCell>
                                            <TableCell className="text-center font-medium text-blue-700">{summary.totalHolidays}</TableCell>
                                            <TableCell className="text-center font-bold text-green-700">{summary.totalPresentValue}</TableCell>
                                            <TableCell className="text-center text-orange-700">{summary.totalHalfDaysCount}</TableCell>
                                            <TableCell className="text-center text-purple-700">{summary.totalLeaves}</TableCell>
                                            <TableCell className="text-center font-bold text-red-600">{summary.totalLOP}</TableCell>
                                            <TableCell className="text-center font-bold text-lg bg-slate-50">{summary.processDays}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AttendanceSummaryPage;
