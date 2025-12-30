import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import backend from '../../lib/api';
import { useForm } from 'react-hook-form';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DollarSign, Save, AlertCircle } from 'lucide-react';

const SalaryCalculator = () => {
    const queryClient = useQueryClient();
    const [selectedStaff, setSelectedStaff] = useState<string>('');
    const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
    const [year, setYear] = useState<number>(new Date().getFullYear());

    // Staff List
    const { data: staffList } = useQuery({
        queryKey: ['staff'],
        queryFn: () => backend.get('/team/staff').then(res => res.data)
    });

    // Fetch Draft Logic using useEffect to update form when data arrives
    const { data: draftData } = useQuery({
        queryKey: ['payroll-draft', selectedStaff, month, year],
        queryFn: () => backend.get(`/payroll/draft?userId=${selectedStaff}&month=${month}&year=${year}`).then(res => res.data),
        enabled: !!selectedStaff
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
            net_pay: 0
        }
    });

    const values = watch();

    // Real-time Calculation Effect
    useEffect(() => {
        if (draftData) {
            // If draft loaded, populate form
            if (draftData.isDraft) {
                reset(draftData);
            } else {
                // If fresh calc, use backend values but ensure form state is synced
                // Note: Backend 'getDraft' returns calculated values even if not saved (isDraft=false)
                reset(draftData);
            }
        }
    }, [draftData, reset]);

    // Recalc Net Pay on Frontend Change (Optional, but good for responsiveness)
    useEffect(() => {
        const gross = Number(values.basic_salary) + Number(values.hra) + Number(values.allowances) + Number(values.conveyance_allowance) + Number(values.accommodation_allowance) + Number(values.incentives);

        // Auto-Calculate LOP Deduction if Basic changes? 
        // Backend logic: DailyWage = (Basic+HRA+Conv+Acc)/30
        const standardEarnings = Number(values.basic_salary) + Number(values.hra) + Number(values.conveyance_allowance) + Number(values.accommodation_allowance);
        const dailyWage = standardEarnings / 30;
        const lopDed = Math.round(dailyWage * Number(values.lop_days)); // lop_days is read-only usually

        // Update derived fields
        if (lopDed !== values.lop_deduction) {
            setValue('lop_deduction', lopDed);
        }

        const totalDeductions = lopDed + Number(values.advance_salary) + Number(values.other_deductions);
        const net = gross - totalDeductions;

        if (net !== values.net_pay) {
            setValue('net_pay', net);
        }

    }, [values.basic_salary, values.hra, values.allowances, values.conveyance_allowance, values.accommodation_allowance, values.incentives, values.advance_salary, values.other_deductions, values.lop_days, setValue]);


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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
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
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
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
                        <SelectContent>
                            {staffList?.map((s: any) => (
                                <SelectItem key={s.user_id} value={s.user_id}>{s.user.full_name} - {s.designation}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

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
                                    <Label>Basic Salary</Label>
                                    <Input type="number" {...register('basic_salary')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>HRA</Label>
                                    <Input type="number" {...register('hra')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Conveyance</Label>
                                    <Input type="number" {...register('conveyance_allowance')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Accommodation</Label>
                                    <Input type="number" {...register('accommodation_allowance')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Allowances (Misc)</Label>
                                    <Input type="number" {...register('allowances')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Incentives</Label>
                                    <Input type="number" {...register('incentives')} />
                                </div>
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
