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

    // Toggle Buttons Section
    if (viewMode === 'SETTINGS') {
        return (
            <div className="space-y-6 p-6">
                <div className="flex gap-4 mb-6">
                    <Button
                        onClick={() => setViewMode('CALCULATOR')}
                        className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200"
                        variant="outline"
                    >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Salary Calculator
                    </Button>
                    <Button
                        onClick={() => setViewMode('SETTINGS')}
                        className="bg-yellow-500 text-white hover:bg-yellow-600 shadow-md"
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Payroll Settings
                    </Button>
                </div>
                <PayrollSettings />

                {/* Back Button / Context */}
                {/* PayrollSettings component has its own layout */}
            </div>
        );
    }

    // Staff List
    const { data: staffList } = useQuery({
        queryKey: ['staff'],
        queryFn: () => backend.get('/team/staff').then(res => res.data)
    });

    // ... (rest of the code)

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
            daily_wage: 0
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
                    const res = await backend.get('/payroll/draft', { params: { userId: selectedStaff, month, year } });
                    const data = res.data;

                    // Merge Staff Defaults with any potential existing input (though we prioritize defaults for core structure)
                    // Policy: Core structure (Basic, HRA, Conv, Acc) comes from Profile. 
                    // Variable (Allowances/Misc, Incentives, Deductions) come from Draft or 0.

                    if (staffProfile) {
                        reset({
                            basic_salary: staffProfile.base_salary || 0,
                            hra: staffProfile.hra || 0,
                            conveyance_allowance: staffProfile.conveyance_allowance || 0,
                            accommodation_allowance: staffProfile.accommodation_allowance || 0,

                            // Variable Components
                            allowances: data.allowances || 0, // Allowance (Misc)
                            incentives: data.incentives || 0,

                            advance_salary: data.advance_salary || 0,
                            other_deductions: data.other_deductions || 0,

                            lop_days: data.lop_days || 0,
                            lop_deduction: data.lop_deduction || 0,

                            total_working_days: data.total_working_days || 30,
                            net_pay: data.net_pay || 0
                        });
                    }

                } catch (error) {
                    console.error("Failed to fetch salary data", error);
                }
            };
            fetchData();
        }
    }, [selectedStaff, month, year, reset, staffList]);

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

        const deductions =
            (Number(values.lop_deduction) || 0) +
            (Number(values.advance_salary) || 0) +
            (Number(values.other_deductions) || 0);

        const net = earnings - deductions;
        if (values.net_pay !== net) {
            setValue('net_pay', net);
        }
    }, [
        values.basic_salary, values.hra, values.conveyance_allowance, values.accommodation_allowance,
        values.allowances, values.incentives, values.lop_deduction, values.advance_salary, values.other_deductions,
        setValue
    ]);

    const saveMutation = useMutation({
        mutationFn: (data: any) => backend.post('/payroll/slip', { month, year, userId: selectedStaff, data }),
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

            {/* Navigation Toggle */}
            <div className="flex gap-4 mb-2">
                <Button
                    onClick={() => setViewMode('CALCULATOR')}
                    className="bg-purple-700 text-white hover:bg-purple-800 shadow-md"
                >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Salary Calculator
                </Button>
                <Button
                    onClick={() => setViewMode('SETTINGS')}
                    className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200"
                    variant="outline"
                >
                    <Settings className="w-4 h-4 mr-2" />
                    Payroll Settings
                </Button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <h1 className="text-2xl font-bold tracking-tight">Salary Calculator</h1>
                <div className="flex gap-2">
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
            )
            }
        </div >
    );
};

export default SalaryCalculator;
