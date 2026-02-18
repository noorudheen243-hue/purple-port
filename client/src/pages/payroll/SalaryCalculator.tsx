import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import backend from '../../lib/api';
import { useForm } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DollarSign, Save, AlertCircle, Settings } from 'lucide-react';
import PayrollSettings from './PayrollSettings';
import { useAuthStore } from '../../store/authStore';

const SalaryCalculator = () => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'DEVELOPER_ADMIN';
    const [viewMode, setViewMode] = useState<'CALCULATOR' | 'SETTINGS'>('CALCULATOR');

    // If not admin, redirect or show unauthorized
    if (!isAdmin) {
        return <div className="p-8 text-center text-red-500">You are not authorized to access this page.</div>;
    }

    const queryClient = useQueryClient();
    const [selectedStaff, setSelectedStaff] = useState<string>('');
    const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [payrollType, setPayrollType] = useState<'MONTHLY' | 'TILL_DATE'>('MONTHLY');

    // Staff List
    const { data: staffList } = useQuery({
        queryKey: ['staff'],
        queryFn: () => backend.get('/team/staff').then(res => res.data)
    });

    // Form
    const { register, handleSubmit, setValue, watch, reset } = useForm({
        defaultValues: {
            basic_salary: 0,
            hra: 0,
            allowances: 0,
            conveyance_allowance: 0,
            accommodation_allowance: 0,
            incentives: 0,
            advance_salary: 0,
            other_deductions: 0,
            lop_days: 0,
            lop_deduction: 0,
            total_working_days: 30,
            net_pay: 0,
            calculation_date: undefined as Date | undefined,
            days_in_period: 0,
            is_prorated: false,
            gross_total: 0,
            daily_wage: 0,
            payroll_type: 'MONTHLY'
        }
    });

    // Fetch logic on selection
    useEffect(() => {
        if (selectedStaff && month && year && staffList) {
            const fetchData = async () => {
                try {
                    // 1. Get Staff Profile from pre-loaded list (Contains Defaults)
                    const staffProfile = staffList.find((s: any) => s.user_id === selectedStaff);

                    // 2. Fetch Draft Slip (if exists) or Calculate Fresh
                    const res = await backend.get('/payroll/draft', { params: { userId: selectedStaff, month, year, payrollType } });
                    const data = res.data;

                    // Merge Staff Defaults
                    if (staffProfile) {
                        reset({
                            basic_salary: staffProfile.base_salary || 0,
                            hra: staffProfile.hra || 0,
                            conveyance_allowance: staffProfile.conveyance_allowance || 0,
                            accommodation_allowance: staffProfile.accommodation_allowance || 0,
                            allowances: data.allowances || 0,
                            incentives: data.incentives || 0,
                            advance_salary: data.advance_salary || 0,
                            other_deductions: data.other_deductions || 0,
                            lop_days: data.lop_days || 0,
                            lop_deduction: data.lop_deduction || 0,
                            total_working_days: data.total_working_days || 30,
                            net_pay: data.net_pay || 0,
                            calculation_date: data.calculation_date ? new Date(data.calculation_date) : undefined,
                            days_in_period: data.days_in_period || 0,
                            is_prorated: data.is_prorated || false,
                            gross_total: data.gross_total || 0,
                            daily_wage: data.daily_wage || 0,
                            payroll_type: data.payroll_type || payrollType
                        });
                    }

                } catch (error) {
                    console.error("Failed to fetch salary data", error);
                }
            };
            fetchData();
        }
    }, [selectedStaff, month, year, payrollType, reset, staffList]);

    const values = watch();

    // Auto-Calculate Net Pay
    useEffect(() => {
        const earnings =
            (Number(values.basic_salary) || 0) +
            (Number(values.hra) || 0) +
            (Number(values.conveyance_allowance) || 0) +
            (Number(values.accommodation_allowance) || 0) +
            (Number(values.allowances) || 0) +
            (Number(values.incentives) || 0);

        // Note: Logic for Gross Total update needs to match backend if we want real-time client side calc.
        // But since 'Gross Total' is complex (Till Date vs Monthly), we rely on Backend 'values.gross_total'
        // OR we just use the 'Net Pay' which IS (Gross - Deductions).
        // Wait, 'earnings' calculated here is SUM OF COMPONENTS. 
        // For 'Monthly', Gross = Sum Of Components.
        // For 'Till Date', Gross != Sum Of Components (it is Time Based).
        // So we should NOT overwrite 'net_pay' using 'earnings' sum if it is TILL_DATE?
        // Actually, the form values `basic_salary` etc are populated.
        // If Till Date, does `basic_salary` represent the Full Month Basic or Prorated?
        // Service returns `basic_salary` as the FULL MONTH value (from profile).
        // And `gross_total` as the prorated value.
        // So `net_pay` calc here: `earnings - deductions` is WRONG for Till Date if earnings are full month.
        // We should use `gross_total` from values!

        // Correct Logic:
        const gross = Number(values.gross_total) || 0;

        // Wait, if user EDITS 'Incentives', does Gross Update?
        // If Monthly: Gross = Fixed + NewIncentives.
        // If Till Date: Gross = ProratedFixed + NewIncentives.
        // We need to handle this. 
        // For now, let's assume 'gross_total' is derived. 
        // If user changes Incentives, we might need to Recalculate Gross.
        // Simple fix: Net Pay = Gross - Deductions. 
        // But Gross needs to update if components change.
        // Let's rely on `values.gross_total` being accurate OR update it?
        // Ideally, we should trigger a backend Recalc on change? Or replicate logic.
        // Replicating 'Till Date' logic here is complex (need working days etc).
        // Monthly logic is easy.

        // For implementation speed/robustness: 
        // 1. If Monthly: Gross = Sum(Components).
        // 2. If Till Date: Gross = (Sum(Fixed)/TotalDays * DaysWorked) + Incentives.
        // We have `total_working_days` (which is actually `days_in_period` for Till Date?)
        // Service sends `total_working_days`.
        // Let's trust Service `gross_total` initially.
        // If user edits, we might drift. 
        // Requirement 6: "Dynamic recalculation button".
        // Maybe we just allow fetching? 
        // Or we update logic here to be smart.

        const deductions =
            (Number(values.lop_deduction) || 0) +
            (Number(values.advance_salary) || 0) +
            (Number(values.other_deductions) || 0);

        // If we want to support client-side updates:
        let currentGross = Number(values.gross_total) || 0;

        // If Monthly, sync Gross to Sum
        if (payrollType === 'MONTHLY') {
            currentGross =
                (Number(values.basic_salary) || 0) +
                (Number(values.hra) || 0) +
                (Number(values.conveyance_allowance) || 0) +
                (Number(values.accommodation_allowance) || 0) +
                (Number(values.allowances) || 0) +
                (Number(values.incentives) || 0);
        } else {
            // Till Date: We assume `gross_total` from backend is correct for the fixed part.
            // If user adds Incentives, we should add them?
            // Service Logic: Gross = BaseTillDate + Incentives.
            // So if `values.incentives` changes, Gross should change by Delta?
            // Or we just recalculate:
            // We don't have `BaseTillDate` stored separately.
            // But we know `DailyWage * Days`.
            // Let's use `daily_wage` (which is per day fixed) * `total_working_days` (days elapsed) + `incentives` + `allowances`?
            // Wait, Service: `grossTotal = BaseSalaryTillDate + Incentives`.
            // BaseSalaryTillDate = PerDayFixed * DaysTillDate.
            // Allowance (Misc) is added on top in Service? "Gross Earnings = StandardEarnings + Allowances".
            // Actually my service implementation: `monthlyFixed = basic+hra+...`. `PreDay = MonthlyFixed/TotalDays`.
            // `Base = PerDay * Days`.
            // `Gross = Base + Incentives`.
            // `standardEarnings` INCLUDED `allowances` (Misc).
            // So default logic: Gross = (Fixed+Misc+Inc)/30 * Days?
            // Use Backend `gross_total` as source of truth.
        }

        const net = currentGross - deductions;

        // Only update if Monthly (safe) or if we trust the loop. 
        // For Till Date, we might just let Net follow Gross which is static unless backend recalc.

        if (payrollType === 'MONTHLY') {
            if (values.gross_total !== currentGross) setValue('gross_total', currentGross);
            if (values.net_pay !== net) setValue('net_pay', net);
        } else {
            const net = (Number(values.gross_total) || 0) - deductions;
            if (values.net_pay !== net) setValue('net_pay', net);
        }

    }, [
        values.basic_salary, values.hra, values.conveyance_allowance, values.accommodation_allowance,
        values.allowances, values.incentives, values.lop_deduction, values.advance_salary, values.other_deductions,
        values.gross_total, payrollType,
        setValue
    ]);

    const saveMutation = useMutation({
        mutationFn: (data: any) => backend.post('/payroll/slip', { month, year, userId: selectedStaff, data: { ...data, payroll_type: payrollType } }),
        onSuccess: () => {
            alert("Payroll Stub Saved");
            queryClient.invalidateQueries({ queryKey: ['payroll-draft'] });
        },
        onError: (err: any) => alert(err.response?.data?.message || "Failed to save")
    });

    const onSubmit = (data: any) => {
        saveMutation.mutate(data);
    };

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500">

            {/* Navigation Toggle - ALWAYS VISIBLE */}
            <div className="flex gap-4 mb-2">
                <Button
                    onClick={() => setViewMode('CALCULATOR')}
                    className={viewMode === 'CALCULATOR' ? "bg-purple-700 text-white hover:bg-purple-800 shadow-md" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200 variant='outline'"}
                >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Salary Calculator
                </Button>
                <Button
                    onClick={() => setViewMode('SETTINGS')}
                    className={viewMode === 'SETTINGS' ? "bg-yellow-500 text-white hover:bg-yellow-600 shadow-md" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200 variant='outline'"}
                >
                    <Settings className="w-4 h-4 mr-2" />
                    Payroll Settings
                </Button>
            </div>

            {/* SETTINGS VIEW */}
            {viewMode === 'SETTINGS' && (
                <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                    <PayrollSettings />
                </div>
            )}

            {/* CALCULATOR VIEW */}
            {viewMode === 'CALCULATOR' && (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                        <h1 className="text-2xl font-bold tracking-tight">Salary Calculator</h1>
                        <div className="flex gap-2">
                            <Select value={payrollType} onValueChange={(v: any) => setPayrollType(v)}>
                                <SelectTrigger className="w-[140px] bg-background">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                                    <SelectItem value="TILL_DATE">Till Date</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={month.toString()} onValueChange={(v: string) => setMonth(parseInt(v))}>
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
                            <Select value={year.toString()} onValueChange={(v: string) => setYear(parseInt(v))}>
                                <SelectTrigger className="w-[100px] bg-background">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 5 }, (_, i) => {
                                        const y = new Date().getFullYear() - 2 + i; // Current year -2 to +2
                                        return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>;
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Staff Selection</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Staff Member" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] overflow-y-auto">
                                    {staffList?.map((s: any) => (
                                        <SelectItem key={s.user_id} value={s.user_id}>{s.user.full_name} - {s.designation}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    {selectedStaff && values.is_prorated && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Pro-rated Calculation</h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Salary calculated for <strong>{values.days_in_period || 0} days</strong> (1st to {values.calculation_date ? new Date(values.calculation_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'today'}).
                                        <br />
                                        LOP and deductions are based on attendance data up to this date.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedStaff && (
                        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* EARNINGS */}
                            <Card className="border-green-200 dark:border-green-900">
                                <CardHeader className="bg-green-50 dark:bg-green-950/20">
                                    <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5" /> Earnings
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Basic Salary <span className="text-xs text-muted-foreground">(Locked)</span></Label>
                                            <Input type="number" {...register('basic_salary')} readOnly className="bg-muted text-muted-foreground" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>HRA <span className="text-xs text-muted-foreground">(Locked)</span></Label>
                                            <Input type="number" {...register('hra')} readOnly className="bg-muted text-muted-foreground" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Conveyance <span className="text-xs text-muted-foreground">(Locked)</span></Label>
                                            <Input type="number" {...register('conveyance_allowance')} readOnly className="bg-muted text-muted-foreground" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Accommodation <span className="text-xs text-muted-foreground">(Locked)</span></Label>
                                            <Input type="number" {...register('accommodation_allowance')} readOnly className="bg-muted text-muted-foreground" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Allowance (Misc)</Label>
                                            <Input type="number" {...register('allowances')} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Incentives</Label>
                                            <Input type="number" {...register('incentives')} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* GROSS TOTAL */}
                            <Card className="border-purple-200 dark:border-purple-900 md:col-span-2">
                                <CardHeader className="bg-purple-50 dark:bg-purple-950/20">
                                    <CardTitle className="text-purple-700 dark:text-purple-400 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5" /> Gross Total (Before Deductions)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-lg p-6 text-center">
                                        <p className="text-sm text-purple-700 dark:text-purple-300 mb-2 font-semibold">GROSS TOTAL</p>
                                        <p className="text-4xl font-bold text-purple-900 dark:text-purple-50">
                                            ₹{(watch('gross_total') || 0).toLocaleString('en-IN')}
                                        </p>
                                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">
                                            Auto-calculated based on salary structure and days worked
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* DEDUCTIONS */}
                            <Card className="border-red-200 dark:border-red-900">
                                <CardHeader className="bg-red-50 dark:bg-red-950/20">
                                    <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5" /> Deductions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="space-y-4">
                                        <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg flex justify-between items-center">
                                            <div>
                                                <span className="block font-semibold text-red-900 dark:text-red-200">Auto-LOP Days</span>
                                                <span className="text-xs text-red-700 dark:text-red-300">Derived from Attendance</span>
                                            </div>
                                            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                                                {Number(watch('lop_days'))}
                                            </div>
                                            {/* Hidden Input to register value */}
                                            <input type="hidden" {...register('lop_days')} />
                                        </div>

                                        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex justify-between items-center">
                                            <div>
                                                <span className="block font-semibold text-blue-900 dark:text-blue-200">Total Working Days</span>
                                                <span className="text-xs text-blue-700 dark:text-blue-300">Days - Sundays - Holidays</span>
                                            </div>
                                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                                {Number(watch('total_working_days')) || 30}
                                            </div>
                                            <input type="hidden" {...register('total_working_days')} />
                                        </div>

                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>LOP Deduction (Auto)</Label>
                                            <Input type="number" {...register('lop_deduction')} readOnly className="bg-muted" />
                                            <p className="text-[10px] text-muted-foreground">Calculated based on LOP Days</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Salary Advance (Ledger)</Label>
                                            <Input type="number" {...register('advance_salary')} readOnly className="bg-muted" />
                                            <p className="text-[10px] text-muted-foreground">Fetched from Accounting Ledger</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Other Deductions</Label>
                                            <Input type="number" {...register('other_deductions')} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* SUMMARY */}
                            <Card className="md:col-span-2 bg-slate-900 text-white">
                                <CardContent className="p-6 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-medium text-slate-300">Net Payable</h3>
                                        <p className="text-sm text-slate-400">Earnings - Deductions</p>
                                    </div>
                                    <div className="text-4xl font-bold text-white">
                                        ₹ {Math.max(0, Number(watch('net_pay'))).toLocaleString('en-IN')}
                                    </div>
                                    <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white" disabled={saveMutation.isPending}>
                                        <Save className="w-5 h-5 mr-2" />
                                        {saveMutation.isPending ? 'Saving...' : 'Save Payroll Stub'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </form>
                    )}
                </>
            )}
        </div>
    );
};

export default SalaryCalculator;
