
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Download } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import * as XLSX from 'xlsx';

const SalaryStatementPage = () => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'DEVELOPER_ADMIN';

    const [selectedUserId, setSelectedUserId] = useState<string>('me');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

    // Fetch Staff for Admin Filter
    const { data: staffList = [] } = useQuery({
        queryKey: ['staff-list'],
        queryFn: async () => {
            const res = await api.get('/team/staff');
            return res.data;
        },
        enabled: isAdmin
    });

    const { data: slips = [], isLoading } = useQuery({
        queryKey: ['salary-statement', selectedUserId, selectedYear],
        queryFn: async () => {
            const params: any = { year: selectedYear };
            if (selectedUserId !== 'me') params.userId = selectedUserId;
            // Month is undefined to get all months

            const res = await api.get('/payroll/history', { params });
            return res.data;
        }
    });

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(slips.map((s: any) => ({
            Month: new Date(0, s.run.month - 1).toLocaleString('default', { month: 'long' }),
            Year: s.run.year,
            Basic: s.basic_salary,
            HRA: s.hra,
            Conveyance: s.conveyance_allowance,
            Accommodation: s.accommodation_allowance,
            Allowances: s.allowances,
            Incentives: s.incentives,
            Gross: calculateGross(s),
            LOP_Days: s.lop_days,
            LOP_Ded: s.lop_deduction,
            Advance: s.advance_salary,
            Other_Ded: s.other_deductions,
            Net_Pay: s.net_pay
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Salary Statement");
        XLSX.writeFile(workbook, `Salary_Statement_${selectedYear}.xlsx`);
    };

    const calculateGross = (s: any) => (s.basic_salary || 0) + (s.hra || 0) + (s.conveyance_allowance || 0) + (s.accommodation_allowance || 0) + (s.allowances || 0) + (s.incentives || 0);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold">Annual Salary Statement</h1>

                <div className="flex gap-2 items-center">
                    {isAdmin && (
                        <div className="w-[200px]">
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="me">My Statement</SelectItem>
                                    {staffList.map((staff: any) => (
                                        <SelectItem key={staff.user_id} value={staff.user_id}>
                                            {staff.user.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="w-[100px]">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger>
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 5 }, (_, i) => {
                                    const y = new Date().getFullYear() - 2 + i;
                                    return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>;
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button variant="outline" onClick={exportToExcel} disabled={slips.length === 0}>
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Month</TableHead>
                                <TableHead className="text-right">Basic</TableHead>
                                <TableHead className="text-right">HRA</TableHead>
                                <TableHead className="text-right">Conv.</TableHead>
                                <TableHead className="text-right">Accomm.</TableHead>
                                <TableHead className="text-right">Allow.</TableHead>
                                <TableHead className="text-right">Incent.</TableHead>
                                <TableHead className="text-right font-bold text-gray-700">GROSS</TableHead>
                                <TableHead className="text-right text-red-600">LOP ({slips.length > 0 ? 'Days' : ''})</TableHead>
                                <TableHead className="text-right text-red-600">LOP Amt</TableHead>
                                <TableHead className="text-right text-red-600">Adv.</TableHead>
                                <TableHead className="text-right text-red-600">Other</TableHead>
                                <TableHead className="text-right font-bold bg-gray-50">NET PAY</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="text-center h-24">Loading statement...</TableCell>
                                </TableRow>
                            ) : slips.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="text-center h-24 text-muted-foreground">No data found for selected year.</TableCell>
                                </TableRow>
                            ) : (
                                slips.map((slip: any) => (
                                    <TableRow key={slip.id}>
                                        <TableCell>{new Date(0, slip.run.month - 1).toLocaleString('default', { month: 'short' })}</TableCell>
                                        <TableCell className="text-right">{slip.basic_salary}</TableCell>
                                        <TableCell className="text-right">{slip.hra}</TableCell>
                                        <TableCell className="text-right">{slip.conveyance_allowance}</TableCell>
                                        <TableCell className="text-right">{slip.accommodation_allowance}</TableCell>
                                        <TableCell className="text-right">{slip.allowances}</TableCell>
                                        <TableCell className="text-right">{slip.incentives}</TableCell>
                                        <TableCell className="text-right font-bold bg-green-50">
                                            {calculateGross(slip).toLocaleString('en-IN')}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600 font-medium">
                                            {slip.lop_days > 0 ? `${slip.lop_days}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600">
                                            {slip.lop_deduction > 0 ? slip.lop_deduction : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600">
                                            {slip.advance_salary > 0 ? slip.advance_salary : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600">
                                            {slip.other_deductions > 0 ? slip.other_deductions : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold bg-gray-100">
                                            {slip.net_pay.toLocaleString('en-IN')}
                                        </TableCell>
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

export default SalaryStatementPage;
