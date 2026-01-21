import React, { useState, useEffect } from 'react';
import { Check, X, Calendar, ClipboardList, CheckSquare, ScrollText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import api from '../../lib/api';
import RegularisationPage from './RegularisationPage';
import BiometricDetailsPage from './BiometricDetailsPage';

const AttendanceSummaryPage = () => {
    // Default to Current Month and Year (Live)
    const currentDate = new Date();
    const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());
    const [year, setYear] = useState(currentDate.getFullYear().toString());

    const [daysInMonth, setDaysInMonth] = useState<number[]>([]);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'REGISTER' | 'SUMMARY' | 'REGULARIZATION' | 'LOGS'>('REGISTER');

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

    const calculateDailyStatus = (record: any, userShift: string = '') => {
        if (!record) return { status: 'ABSENT', value: 0 };
        if (record.status === 'HOLIDAY') return { status: 'HOLIDAY', value: 1 };
        if (record.status === 'LEAVE') return { status: 'LEAVE', value: 0 };

        // Half Day Checks
        if (record.status === 'HALF_DAY') return { status: 'HALF_DAY', value: 0.5 };

        // 1. Missing One Punch
        if ((record.status === 'PRESENT' || record.status === 'LATE') && (!record.check_in || !record.check_out)) {
            return { status: 'HALF_DAY', value: 0.5 };
        }

        // 2. Duration Check based on Shift
        if (record.check_in && record.check_out) {
            const start = new Date(record.check_in);
            const end = new Date(record.check_out);
            const durationHrs = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

            // Shift Logic
            const isNoBreakShift = userShift && userShift.toUpperCase().includes('NO BREAK');

            // Thresholds
            const halfDayMin = 4;
            const fullDayMin = isNoBreakShift ? 7.15 : 8; // If No Break, > 7.15 is Full. Else > 8 is Full.
            // Half Day Range: 4 to [fullDayMin]

            if (durationHrs >= halfDayMin && durationHrs <= fullDayMin) {
                return { status: 'HALF_DAY', value: 0.5 };
            }
            // If duration > fullDayMin -> Full Day (stays PRESENT)
        }

        if (record.status === 'PRESENT' || record.status === 'LATE') return { status: 'PRESENT', value: 1 };

        return { status: 'ABSENT', value: 0 };
    };

    const calculateSummary = (user: any) => {
        let totalHolidays = 0;
        let totalPresentValue = 0;
        let totalLeaves = 0;
        let totalLOP = 0;
        let totalHalfDaysCount = 0;

        daysInMonth.forEach(day => {
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, day);
            const dateKey = `${year}-${month.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSunday = dateObj.getDay() === 0;

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
                    const { status, value } = calculateDailyStatus(record, user.user.shift);
                    if (status === 'HALF_DAY') {
                        totalPresentValue += 0.5;
                        totalHalfDaysCount++;
                    } else if (status === 'PRESENT') {
                        totalPresentValue += 1;
                    } else {
                        totalLOP++;
                    }
                }
            } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (dateObj < today) {
                    totalLOP++;
                }
            }
        });

        return {
            totalDays: daysInMonth.length,
            totalHolidays,
            totalPresentValue,
            totalLeaves,
            totalLOP,
            totalHalfDaysCount
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

                <div className="flex bg-muted p-1 rounded-lg flex-wrap gap-1">
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
                    <button
                        onClick={() => setViewMode('REGULARIZATION')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all border ${viewMode === 'REGULARIZATION'
                                ? 'bg-white border-purple-600 text-purple-700 shadow font-bold'
                                : 'border-transparent text-muted-foreground hover:bg-background/50'
                            }`}
                    >
                        <CheckSquare className="w-4 h-4 mr-2 inline-block" />
                        Attendance Regularization
                    </button>
                    <button
                        onClick={() => setViewMode('LOGS')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all border ${viewMode === 'LOGS'
                                ? 'bg-white border-blue-600 text-blue-700 shadow font-bold'
                                : 'border-transparent text-muted-foreground hover:bg-background/50'
                            }`}
                    >
                        <ScrollText className="w-4 h-4 mr-2 inline-block" />
                        Attendance Log
                    </button>
                </div>

                {viewMode !== 'LOGS' && viewMode !== 'REGULARIZATION' && (
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
                )}
            </div>

            {viewMode === 'REGISTER' && (
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
            )}

            {viewMode === 'SUMMARY' && (
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
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {viewMode === 'REGULARIZATION' && (
                <RegularisationPage />
            )}

            {viewMode === 'LOGS' && (
                <BiometricDetailsPage />
            )}
        </div>
    );
};

export default AttendanceSummaryPage;
