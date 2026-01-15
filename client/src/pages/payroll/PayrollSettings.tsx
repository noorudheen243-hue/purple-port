
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import backend from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Search, Save } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const PayrollSettings = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [localStaff, setLocalStaff] = useState<any[]>([]);
    const [originalStaff, setOriginalStaff] = useState<any[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch Staff List
    const { data: staffList = [], isLoading } = useQuery({
        queryKey: ['staff-list-payroll'],
        queryFn: async () => {
            const res = await backend.get('/team/staff');
            return res.data;
        }
    });

    // Sync local state when data fetches
    useEffect(() => {
        if (staffList.length > 0) {
            const formatted = staffList.map((s: any) => ({
                id: s.id,
                user_id: s.user_id,
                full_name: s.user.full_name,
                staff_number: s.staff_number,
                designation: s.designation,
                base_salary: s.base_salary || 0,
                hra: s.hra || 0,
                conveyance_allowance: s.conveyance_allowance || 0,
                accommodation_allowance: s.accommodation_allowance || 0,
                allowances: s.allowances || 0
            }));
            setLocalStaff(formatted);
            setOriginalStaff(JSON.parse(JSON.stringify(formatted)));
            setHasChanges(false);
        }
    }, [staffList]);

    // Update Local State
    const handleUpdate = (id: string, field: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setLocalStaff(prev => prev.map(s => s.id === id ? { ...s, [field]: numValue } : s));
        setHasChanges(true);
    };

    // Calculate Total
    const calculateTotal = (s: any) => {
        return (s.base_salary || 0) +
            (s.hra || 0) +
            (s.conveyance_allowance || 0) +
            (s.accommodation_allowance || 0) +
            (s.allowances || 0);
    };

    // Save All Mutation - Concurrent
    const saveMutation = useMutation({
        mutationFn: async () => {
            const updates = localStaff.filter(s => {
                const original = originalStaff.find(o => o.id === s.id);
                return JSON.stringify(s) !== JSON.stringify(original);
            });

            if (updates.length === 0) {
                alert("No changes detected to save.");
                return;
            }

            await Promise.all(updates.map(s =>
                backend.patch(`/team/staff/${s.id}`, {
                    base_salary: s.base_salary,
                    hra: s.hra,
                    conveyance_allowance: s.conveyance_allowance,
                    accommodation_allowance: s.accommodation_allowance,
                    allowances: s.allowances
                })
            ));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-list-payroll'] });
            queryClient.invalidateQueries({ queryKey: ['staff'] }); // Invalidate general staff list used by Calculator
            alert("All changes saved successfully! Data is now available in Salary Calculator.");
            // Update original state to current
            setOriginalStaff(JSON.parse(JSON.stringify(localStaff)));
            setHasChanges(false);
        },
        onError: (err: any) => alert("Failed to save some changes: " + err.message)
    });

    const filteredStaff = localStaff.filter((s: any) =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.staff_number?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Payroll Settings</h1>
                    <p className="text-muted-foreground">Manage default salary structures. Changes reflect automatically in Salary Calculator.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4 mr-2" />
                        {saveMutation.isPending ? "Saving..." : "Save All Changes"}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Staff Salary Registry</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search staff..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Staff Name</TableHead>
                                    <TableHead>Basic Salary</TableHead>
                                    <TableHead>HRA</TableHead>
                                    <TableHead>Conveyance</TableHead>
                                    <TableHead>Accommodation</TableHead>
                                    <TableHead>Fixed Allow.</TableHead>
                                    <TableHead className="text-right font-bold w-[120px]">Total Per Month</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-4">Loading...</TableCell>
                                    </TableRow>
                                ) : filteredStaff.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-4">No staff found</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStaff.map((staff: any) => (
                                        <TableRow key={staff.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{staff.full_name}</span>
                                                    <span className="text-xs text-muted-foreground">{staff.staff_number}</span>
                                                    <span className="text-xs text-muted-foreground">{staff.designation}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="h-8 w-24"
                                                    value={staff.base_salary}
                                                    onChange={(e) => handleUpdate(staff.id, 'base_salary', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="h-8 w-24"
                                                    value={staff.hra}
                                                    onChange={(e) => handleUpdate(staff.id, 'hra', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="h-8 w-24"
                                                    value={staff.conveyance_allowance}
                                                    onChange={(e) => handleUpdate(staff.id, 'conveyance_allowance', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="h-8 w-24"
                                                    value={staff.accommodation_allowance}
                                                    onChange={(e) => handleUpdate(staff.id, 'accommodation_allowance', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="h-8 w-24"
                                                    value={staff.allowances}
                                                    onChange={(e) => handleUpdate(staff.id, 'allowances', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-700">
                                                ₹{calculateTotal(staff).toLocaleString('en-IN')}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PayrollSettings;
