import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Save, Trash2, Plus, RefreshCw, AlertCircle, Search, ServerCrash } from 'lucide-react';

const HolidayLeavePlannerPage = () => {
    const queryClient = useQueryClient();
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    // --- HOLIDAYS ---
    const { data: holidays = [], isLoading: holidaysLoading, isError: holidaysError, error: hError } = useQuery({
        queryKey: ['holidays', year],
        queryFn: async () => {
            try {
                const res = await api.get(`/attendance/planner/holidays?year=${year}`);
                return res.data;
            } catch (err) { throw err; }
        },
        retry: 1
    });

    const [newHoliday, setNewHoliday] = useState({ name: '', date: '', description: '' });

    const addHolidayMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/attendance/planner/holidays', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays', year] });
            setNewHoliday({ name: '', date: '', description: '' });
        },
        onError: (err: any) => alert(err.response?.data?.error || 'Failed')
    });

    const deleteHolidayMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/attendance/planner/holidays/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays', year] })
    });

    const populateSundaysMutation = useMutation({
        mutationFn: async () => await api.post('/attendance/planner/holidays/sundays', { year }),
        onSuccess: (res) => {
            alert(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['holidays', year] });
        }
    });

    // --- ALLOCATIONS ---
    const { data: allocations = [], isLoading: allocLoading, isError: allocError } = useQuery({
        queryKey: ['allocations', year],
        queryFn: async () => (await api.get(`/attendance/planner/allocations?year=${year}`)).data,
        retry: 1
    });

    const updateAllocationMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/attendance/planner/allocations', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allocations', year] });
        },
        onError: (err: any) => alert(err.response?.data?.error || 'Update Failed')
    });

    const handleAllocSave = (staff: any, fullValues: any) => {
        const payload = {
            user_id: staff.user_id,
            year: year,
            casual: parseFloat(fullValues.casual) || 0,
            sick: parseFloat(fullValues.sick) || 0,
            earned: parseFloat(fullValues.earned) || 0,
            unpaid: parseFloat(fullValues.unpaid) || 0
        };
        updateAllocationMutation.mutate(payload);
    };

    const filteredAllocations = useMemo(() => {
        if (!searchTerm) return allocations;
        return allocations.filter((staff: any) =>
            staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            staff.staff_number?.includes(searchTerm)
        );
    }, [allocations, searchTerm]);

    const isBackendError = holidaysError || allocError;

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Holiday & Leave Planner</h1>
                    <p className="text-muted-foreground">Manage organization holidays and staff leave credits.</p>
                </div>
                <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
                    <Button variant="ghost" size="sm" onClick={() => setYear(year - 1)}>←</Button>
                    <span className="font-bold text-xl px-4 min-w-[80px] text-center">{year}</span>
                    <Button variant="ghost" size="sm" onClick={() => setYear(year + 1)}>→</Button>
                </div>
            </div>

            {isBackendError && (
                <Alert variant="destructive">
                    <ServerCrash className="h-4 w-4" />
                    <AlertTitle>Connection Error</AlertTitle>
                    <AlertDescription>
                        Unable to connect to the Planner Service.
                        <strong> If you just enabled this feature, you MUST restart your backend server.</strong>
                        <br />
                        (Check console for details: 404 means route not found, 500 means Prisma Client mismatch).
                    </AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="holidays" className="w-full">
                <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                    <TabsTrigger value="holidays">Holidays</TabsTrigger>
                    <TabsTrigger value="allocations">Leave Allocation</TabsTrigger>
                </TabsList>

                <TabsContent value="holidays" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Add Form */}
                        <Card className="md:col-span-4 h-fit">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Plus className="w-5 h-5" /> Add Holiday
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input type="date" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input placeholder="e.g. Independence Day" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input placeholder="Optional" value={newHoliday.description} onChange={e => setNewHoliday({ ...newHoliday, description: e.target.value })} />
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() => addHolidayMutation.mutate(newHoliday)}
                                    disabled={!newHoliday.date || !newHoliday.name || addHolidayMutation.isPending}
                                >
                                    {addHolidayMutation.isPending ? 'Saving...' : 'Add Holiday'}
                                </Button>

                                <div className="pt-4 border-t">
                                    <Button variant="secondary" className="w-full" onClick={() => populateSundaysMutation.mutate()} disabled={populateSundaysMutation.isPending}>
                                        <RefreshCw className="w-4 h-4 mr-2" /> Populate All Sundays
                                    </Button>
                                    <p className="text-[11px] text-muted-foreground mt-2 text-center text-balance">
                                        Automatically marks every Sunday in {year} as a recurring holiday.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* List */}
                        <Card className="md:col-span-8">
                            <CardHeader>
                                <CardTitle className="text-lg">Holiday List ({holidays.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border h-[500px] overflow-y-auto relative">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Holiday</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {holidaysLoading ? (
                                                <TableRow><TableCell colSpan={4} className="text-center h-24">Loading Holidays...</TableCell></TableRow>
                                            ) : holidays.length === 0 ? (
                                                <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No holidays found for {year}.</TableCell></TableRow>
                                            ) : holidays.map((h: any) => (
                                                <TableRow key={h.id}>
                                                    <TableCell className="font-medium whitespace-nowrap">{format(new Date(h.date), 'dd MMM, EEEE')}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{h.name}</div>
                                                        {h.description && <div className="text-xs text-muted-foreground">{h.description}</div>}
                                                    </TableCell>
                                                    <TableCell>{h.is_recurring ? <Badge variant="secondary" className="text-[10px]">Recurring</Badge> : <Badge variant="outline" className="text-[10px]">One-time</Badge>}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteHolidayMutation.mutate(h.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="allocations" className="pt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <div>
                                <CardTitle>Staff Leave Allocations</CardTitle>
                                <CardDescription>Set annual leave credits for staff members.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search staff..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border max-h-[600px] overflow-y-auto relative">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                        <TableRow>
                                            <TableHead className="w-[250px]">Employee</TableHead>
                                            <TableHead className="text-center w-[120px]">Medical (SL)</TableHead>
                                            <TableHead className="text-center w-[120px]">Casual (CL)</TableHead>
                                            <TableHead className="text-center w-[120px]">Earned (EL)</TableHead>
                                            <TableHead className="text-center w-[120px]">Unpaid Limit</TableHead>
                                            <TableHead className="text-right w-[100px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allocLoading ? (
                                            <TableRow><TableCell colSpan={6} className="text-center h-32">Loading Allocations...</TableCell></TableRow>
                                        ) : filteredAllocations.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">No staff found.</TableCell></TableRow>
                                        ) : filteredAllocations.map((staff: any) => (
                                            <AllocationRow
                                                key={staff.user_id}
                                                staff={staff}
                                                onSave={(val) => handleAllocSave(staff, val)}
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

// Row Component for cleaner state
const AllocationRow = React.memo(({ staff, onSave }: { staff: any, onSave: (val: any) => void }) => {
    const [values, setValues] = useState({
        sick: staff.allocation.sick_leave,
        casual: staff.allocation.casual_leave,
        earned: staff.allocation.earned_leave,
        unpaid: staff.allocation.unpaid_leave
    });

    const [isDirty, setIsDirty] = useState(false);

    // Reset state if staff changes (e.g. search filter or refetch)
    React.useEffect(() => {
        setValues({
            sick: staff.allocation.sick_leave,
            casual: staff.allocation.casual_leave,
            earned: staff.allocation.earned_leave,
            unpaid: staff.allocation.unpaid_leave
        });
        setIsDirty(false);
    }, [staff]);

    const handleChange = (field: string, val: string) => {
        setValues(prev => ({ ...prev, [field]: val }));
        setIsDirty(true);
    };

    const handleSave = () => {
        onSave(values);
        setIsDirty(false); // Optimistically set dirty false, parent query invalidation will eventually reset default values
    };

    return (
        <TableRow className="hover:bg-muted/50">
            <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                    {staff.avatar_url ? (
                        <img src={staff.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {staff.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <div className="font-semibold text-sm">{staff.name}</div>
                        <div className="text-xs text-muted-foreground">{staff.department}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-center p-2">
                <Input
                    type="number"
                    className={`w-20 mx-auto text-center h-8 ${isDirty ? 'bg-yellow-50 border-yellow-300' : ''}`}
                    value={values.sick}
                    onChange={e => handleChange('sick', e.target.value)}
                />
            </TableCell>
            <TableCell className="text-center p-2">
                <Input
                    type="number"
                    className={`w-20 mx-auto text-center h-8 ${isDirty ? 'bg-yellow-50 border-yellow-300' : ''}`}
                    value={values.casual}
                    onChange={e => handleChange('casual', e.target.value)}
                />
            </TableCell>
            <TableCell className="text-center p-2">
                <Input
                    type="number"
                    className={`w-20 mx-auto text-center h-8 ${isDirty ? 'bg-yellow-50 border-yellow-300' : ''}`}
                    value={values.earned}
                    onChange={e => handleChange('earned', e.target.value)}
                />
            </TableCell>
            <TableCell className="text-center p-2">
                <Input
                    type="number"
                    className={`w-20 mx-auto text-center h-8 ${isDirty ? 'bg-yellow-50 border-yellow-300' : ''}`}
                    value={values.unpaid}
                    onChange={e => handleChange('unpaid', e.target.value)}
                />
            </TableCell>
            <TableCell className="text-right">
                <Button
                    size="sm"
                    variant={isDirty ? "default" : "ghost"}
                    className={isDirty ? "animate-pulse" : ""}
                    disabled={!isDirty}
                    onClick={handleSave}
                >
                    <Save className="w-4 h-4" />
                </Button>
            </TableCell>
        </TableRow>
    );
});

export default HolidayLeavePlannerPage;
