import React, { useState, useEffect, useMemo } from 'react';
import { Check, X, Calendar, ClipboardList, CheckSquare, ScrollText, Download, FileSpreadsheet, FileJson } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
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
    const [nameFilter, setNameFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('ALL');
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

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

    const handleRecalculateAll = async () => {
        if (!window.confirm("This will recalculate attendance status for ALL staff based on current shift assignments. Continue?")) return;
        setIsRecalculating(true);
        try {
            const { data } = await api.post('/attendance/recalculate-all');
            alert(data.message || "Recalculation complete");
            fetchAttendance();
        } catch (error: any) {
            alert("Recalculation failed: " + (error.response?.data?.message || error.message));
        } finally {
            setIsRecalculating(false);
        }
    };

    // Derived Data with Filtering
    const filteredAttendance = attendanceData.filter(item => {
        const matchesName = item.user.name.toLowerCase().includes(nameFilter.toLowerCase());
        const matchesDept = deptFilter === 'ALL' || item.user.department === deptFilter;
        return matchesName && matchesDept;
    });

    const departments = useMemo(() => {
        const depts = new Set<string>();
        attendanceData.forEach(item => {
            if (item.user.department) depts.add(item.user.department);
        });
        return Array.from(depts).sort();
    }, [attendanceData]);

    // --- EXPORT LOGIC ---

    const exportToExcel = () => {
        setIsExporting(true);
        try {
            const fileName = `Attendance_${viewMode}_${month}_${year}.xlsx`;
            let dataToExport: any[] = [];

            if (viewMode === 'SUMMARY') {
                dataToExport = filteredAttendance.map(item => {
                    const s = calculateSummary(item);
                    return {
                        'Staff Name': item.user.name,
                        'Designation': item.user.designation,
                        'Department': item.user.department,
                        'Total Days': s.totalDays,
                        'Holidays': s.totalHolidays,
                        'Present (Effective)': s.totalPresentValue,
                        'Half Days': s.totalHalfDaysCount,
                        'Leaves': s.totalLeaves,
                        'LOP Days': s.totalLOP
                    };
                });
            } else {
                // Register Export
                dataToExport = filteredAttendance.map(item => {
                    const row: any = {
                        'Staff Name': item.user.name,
                        'Department': item.user.department
                    };
                    daysInMonth.forEach(d => {
                        const dateKey = `${year}-${month.padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const record = item.attendance[dateKey];
                        row[d] = record ? record.status : (new Date(parseInt(year), parseInt(month) - 1, d) < new Date() ? 'ABSENT' : '-');
                    });
                    return row;
                });
            }

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance");
            XLSX.writeFile(wb, fileName);
        } catch (e) {
            console.error("Export Failed", e);
            alert("Export Failed");
        } finally {
            setIsExporting(false);
        }
    };

    const exportToPDF = () => {
        setIsExporting(true);
        try {
            const doc = new jsPDF('l', 'mm', 'a4') as any;
            const monthName = new Date(0, parseInt(month) - 1).toLocaleString('default', { month: 'long' });

            doc.setFontSize(18);
            doc.text(`Attendance ${viewMode === 'SUMMARY' ? 'Summary' : 'Register'} - ${monthName} ${year}`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

            if (viewMode === 'SUMMARY') {
                const tableData = filteredAttendance.map(item => {
                    const s = calculateSummary(item);
                    return [
                        item.user.name,
                        item.user.department,
                        s.totalDays,
                        s.totalHolidays,
                        s.totalPresentValue,
                        s.totalHalfDaysCount,
                        s.totalLeaves,
                        s.totalLOP
                    ];
                });

                (doc as any).autoTable({
                    startY: 35,
                    head: [['Name', 'Dept', 'Days', 'Hol', 'Pres', 'HD', 'Leave', 'LOP']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [128, 0, 128] }
                });
            } else {
                // Register PDF (Compact)
                const headers = ['Name', ...daysInMonth.map(String)];
                const tableData = filteredAttendance.map(item => {
                    return [
                        item.user.name,
                        ...daysInMonth.map(d => {
                            const dateKey = `${year}-${month.padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const record = item.attendance[dateKey];
                            if (!record) return '-';
                            if (record.status === 'PRESENT' || record.status === 'REGULARIZED') return 'P';
                            if (record.status === 'HALF_DAY') return 'HD';
                            if (record.status === 'ABSENT') return 'AB';
                            if (record.status === 'LEAVE') return 'L';
                            if (record.status === 'HOLIDAY') return 'H';
                            return '?';
                        })
                    ];
                });

                (doc as any).autoTable({
                    startY: 35,
                    head: [headers],
                    body: tableData,
                    styles: { fontSize: 6, cellPadding: 1 },
                    headStyles: { fillColor: [128, 0, 128] },
                    columnStyles: { 0: { cellWidth: 30 } }
                });
            }

            doc.save(`Attendance_${viewMode}_${month}_${year}.pdf`);
        } catch (e) {
            console.error("PDF Export Failed", e);
            alert("PDF Export Failed");
        } finally {
            setIsExporting(false);
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

            // 2b. Regularized
            if (record.status === 'REGULARIZED') {
                return (
                    <div className="flex flex-col items-center justify-center h-full">
                        <span className="text-[10px] font-bold text-purple-600">REG</span>
                        <CheckSquare className="h-3 w-3 text-purple-600" />
                    </div>
                );
            }

            // 3. Status Display (Trust Backend)
            const status = record.status;

            if (status === 'HALF_DAY') {
                return (
                    <div className="flex flex-col items-center justify-center h-full">
                        <span className="text-[10px] font-bold text-orange-600">HD</span>
                        <span className="text-[8px] text-muted-foreground">{record.check_in ? (record.check_out ? 'Hours' : 'In Only') : 'Out Only'}</span>
                    </div>
                );
            }

            if (status === 'PRESENT' || status === 'LATE' || status === 'REGULARIZED') {
                return <div className="flex items-center justify-center h-full"><Check className="h-5 w-5 text-green-600" /></div>;
            }

            if (status === 'ABSENT') {
                return <div className="w-full h-full bg-red-100 flex items-center justify-center rounded text-red-600 font-bold text-xs">AB</div>;
            }

            return <span>{status}</span>;
        }

        // Past Dates Empty = Absent
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj < today) {
            return <div className="w-full h-full bg-red-100 flex items-center justify-center rounded text-red-600 font-bold text-xs">AB</div>;
        }

        return (
            <span className="text-[9px] text-muted-foreground/50 whitespace-pre-wrap leading-tight block text-center">
                {userShift && userShift !== 'Check Assignments' ? userShift : 'Pending Shift'}
            </span>
        );
    };


    // --- Summary Logic (TRUST BACKEND STATUS) ---

    const getDayValue = (record: any) => {
        if (!record) return 0;
        const s = record.status;
        if (s === 'PRESENT' || s === 'LATE' || s === 'REGULARIZED' || s === 'LEAVE' || s === 'HOLIDAY') return 1;
        if (s === 'HALF_DAY') return 0.5;
        return 0; // ABSENT, etc.
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
                const status = record.status;
                const value = getDayValue(record);

                if (status === 'HOLIDAY') {
                    totalHolidays++;
                } else if (status === 'LEAVE') {
                    totalLeaves++;
                    totalPresentValue += value;
                } else if (status === 'HALF_DAY') {
                    totalHalfDaysCount++;
                    totalPresentValue += value;
                } else if (status === 'ABSENT') {
                    totalLOP++;
                } else {
                    // PRESENT, LATE, REGULARIZED
                    totalPresentValue += value;
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
            {/* Header Section */}
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Attendance Management</h1>
                    <p className="text-muted-foreground">Monitor daily attendance and generate monthly summaries.</p>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/40 p-2 rounded-lg border">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setViewMode('LOGS')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all border ${viewMode === 'LOGS'
                                ? 'bg-white text-yellow-700 border-yellow-500 shadow-sm ring-1 ring-yellow-100'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200'
                                }`}
                        >
                            <ScrollText className="w-4 h-4 mr-2 inline-block" />
                            Attendance Log
                        </button>
                        <button
                            onClick={() => setViewMode('REGISTER')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all border ${viewMode === 'REGISTER'
                                ? 'bg-purple-700 text-white border-purple-800 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                                }`}
                        >
                            <Calendar className="w-4 h-4 mr-2 inline-block" />
                            Attendance Register
                        </button>
                        <button
                            onClick={() => setViewMode('SUMMARY')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all border ${viewMode === 'SUMMARY'
                                ? 'bg-yellow-400 text-black border-yellow-500 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200'
                                }`}
                        >
                            <ClipboardList className="w-4 h-4 mr-2 inline-block" />
                            Attendance Summary
                        </button>
                        <button
                            onClick={() => setViewMode('REGULARIZATION')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all border ${viewMode === 'REGULARIZATION'
                                ? 'bg-white text-purple-700 border-purple-600 shadow-sm ring-1 ring-purple-100'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                                }`}
                        >
                            <CheckSquare className="w-4 h-4 mr-2 inline-block" />
                            Attendance Regularization
                        </button>
                    </div>

                    {viewMode !== 'LOGS' && viewMode !== 'REGULARIZATION' && (
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="w-[150px]">
                                <Input
                                    placeholder="Filter by name..."
                                    value={nameFilter}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNameFilter(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <Select value={deptFilter} onValueChange={setDeptFilter}>
                                <SelectTrigger className="w-[140px] h-9 bg-background">
                                    <SelectValue placeholder="Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Depts</SelectItem>
                                    {departments.map((d: string) => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="h-6 w-px bg-border mx-1" />
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger className="w-[120px] h-9 bg-background">
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
                                <SelectTrigger className="w-[90px] h-9 bg-background">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(y => (
                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={fetchAttendance} disabled={isLoading} className="h-9">
                                {isLoading ? '...' : 'Refresh'}
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleRecalculateAll}
                                disabled={isRecalculating}
                                className="h-9 bg-red-600 hover:bg-red-700"
                            >
                                {isRecalculating ? 'Recalculating...' : 'Recalculate All'}
                            </Button>
                            <div className="h-6 w-px bg-border mx-1" />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportToExcel}
                                disabled={isExporting}
                                className="h-9 gap-1 text-green-700 border-green-200 hover:bg-green-50"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Excel
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportToPDF}
                                disabled={isExporting}
                                className="h-9 gap-1 text-red-700 border-red-200 hover:bg-red-50"
                            >
                                <Download className="w-4 h-4" />
                                PDF
                            </Button>
                        </div>
                    )}
                </div>
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
                                    {filteredAttendance.map((data, index) => (
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
                                <TableHeader className="sticky bottom-0 bg-muted/80 z-30 font-bold border-t-2">
                                    <TableRow>
                                        <TableCell className="sticky left-0 bg-muted/90 z-40 border-r py-3 font-bold text-xs uppercase tracking-wider">
                                            Daily Totals
                                        </TableCell>
                                        {daysInMonth.map(d => {
                                            const dateKey = `${year}-${month.padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                            const isSunday = new Date(parseInt(year), parseInt(month) - 1, d).getDay() === 0;

                                            let present = 0;
                                            let leaves = 0;
                                            let absent = 0;

                                            filteredAttendance.forEach(data => {
                                                const record = data.attendance[dateKey];
                                                if (!record && !isSunday) {
                                                    const dateObj = new Date(parseInt(year), parseInt(month) - 1, d);
                                                    if (dateObj < new Date()) absent++;
                                                } else if (record) {
                                                    if (record.status === 'LEAVE') leaves++;
                                                    else if (record.status === 'ABSENT') absent++;
                                                    else if (['PRESENT', 'LATE', 'REGULARIZED', 'HALF_DAY'].includes(record.status)) present += (record.status === 'HALF_DAY' ? 0.5 : 1);
                                                }
                                            });

                                            return (
                                                <TableCell key={d} className={`p-1 text-center border-l font-bold text-[10px] ${isSunday ? 'bg-blue-100/50' : ''}`}>
                                                    <div className="flex flex-col gap-0.5">
                                                        {present > 0 && <span className="text-green-700">P:{present}</span>}
                                                        {leaves > 0 && <span className="text-red-700">L:{leaves}</span>}
                                                        {absent > 0 && <span className="text-orange-700">A:{absent}</span>}
                                                    </div>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                </TableHeader>
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
                                {filteredAttendance.map((data) => {
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
