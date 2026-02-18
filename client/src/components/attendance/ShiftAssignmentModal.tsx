import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import api from '../../lib/api';
import Swal from 'sweetalert2';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface ShiftAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffId: string;
    staffName: string;
    onSuccess: () => void;
}

export const ShiftAssignmentModal: React.FC<ShiftAssignmentModalProps> = ({ isOpen, onClose, staffId, staffName, onSuccess }) => {
    const [shifts, setShifts] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [selectedShift, setSelectedShift] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [graceOverride, setGraceOverride] = useState('');

    useEffect(() => {
        if (isOpen && staffId) {
            fetchData();
        }
    }, [isOpen, staffId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [shiftsRes, assignmentsRes] = await Promise.all([
                api.get('/attendance/shifts'),
                api.get(`/attendance/shifts/assignments/${staffId}`)
            ]);
            setShifts(shiftsRes.data);
            setAssignments(assignmentsRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedShift || !fromDate) {
            Swal.fire('Error', 'Please select a shift and start date.', 'error');
            return;
        }

        try {
            await api.post('/attendance/shifts/assign', {
                staff_id: staffId,
                shift_id: selectedShift,
                from_date: fromDate,
                to_date: toDate || null,
                grace_time: graceOverride ? parseInt(graceOverride) : undefined
            });

            Swal.fire({
                icon: 'success',
                title: 'Assigned!',
                text: 'Shift assigned successfully.',
                timer: 1500,
                showConfirmButton: false
            });

            // Reset form and refresh
            setSelectedShift('');
            setFromDate('');
            setToDate('');
            setGraceOverride('');
            fetchData();
            onSuccess();
        } catch (error: any) {
            Swal.fire('Error', error.response?.data?.error || 'Assignment failed', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this assignment?")) return;
        try {
            await api.delete(`/attendance/shifts/assignments/${id}`);
            fetchData();
            onSuccess();
        } catch (error: any) {
            Swal.fire('Error', 'Failed to delete assignment', 'error');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Manage Shift Assignments: {staffName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* New Assignment Form */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                        <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> New Assignment
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Shift</Label>
                                <select
                                    className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={selectedShift}
                                    onChange={(e) => setSelectedShift(e.target.value)}
                                >
                                    <option value="">Select Shift...</option>
                                    {shifts.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.start_time} - {s.end_time})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Grace Time Override (Min)</Label>
                                <Input
                                    type="number"
                                    placeholder="Default"
                                    value={graceOverride}
                                    onChange={e => setGraceOverride(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>From Date</Label>
                                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>To Date (Optional)</Label>
                                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                                <p className="text-[10px] text-muted-foreground">Leave empty for indefinite assignment</p>
                            </div>
                        </div>
                        <Button className="w-full" onClick={handleAssign}>Assign Shift</Button>
                    </div>

                    {/* Active Assignments List */}
                    <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-3">Assignment History</h4>
                        <div className="border rounded-md overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-600 font-medium">
                                    <tr>
                                        <th className="px-4 py-2">Shift</th>
                                        <th className="px-4 py-2">Period</th>
                                        <th className="px-4 py-2">Grace</th>
                                        <th className="px-4 py-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {assignments.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No assignments found.</td>
                                        </tr>
                                    ) : (
                                        assignments.map((a: any) => (
                                            <tr key={a.id} className={!a.is_active ? 'opacity-50 bg-slate-50' : ''}>
                                                <td className="px-4 py-2 font-medium">
                                                    {a.shift.name}
                                                    <span className="text-xs text-slate-400 block">{a.shift.start_time} - {a.shift.end_time}</span>
                                                </td>
                                                <td className="px-4 py-2">
                                                    {format(new Date(a.from_date), 'MMM d, yyyy')}
                                                    {' -> '}
                                                    {a.to_date ? format(new Date(a.to_date), 'MMM d, yyyy') : 'Indefinite'}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {a.grace_time ? `${a.grace_time}m (Override)` : `${a.shift.default_grace_time}m (Default)`}
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 text-red-500" onClick={() => handleDelete(a.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
