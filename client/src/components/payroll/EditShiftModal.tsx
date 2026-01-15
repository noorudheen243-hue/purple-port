
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import backend from '../../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

interface EditShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    dayData: any;
    userId: string;
    onSuccess: () => void;
}

const EditShiftModal = ({ isOpen, onClose, dayData, userId, onSuccess }: EditShiftModalProps) => {
    const { register, handleSubmit, setValue, watch } = useForm({
        defaultValues: {
            status: 'PRESENT',
            check_in: '',
            check_out: '',
            work_hours: 0
        }
    });

    useEffect(() => {
        if (dayData) {
            setValue('status', dayData.status === 'HOLIDAY' || dayData.status === 'LEAVE' || dayData.status === 'WEEKOFF' ? 'PRESENT' : dayData.status);

            if (dayData.details?.check_in) {
                // Convert UTC iso string to local time input format HH:mm
                const d = new Date(dayData.details.check_in);
                const time = d.toTimeString().slice(0, 5);
                setValue('check_in', time);
            }
            if (dayData.details?.check_out) {
                const d = new Date(dayData.details.check_out);
                const time = d.toTimeString().slice(0, 5);
                setValue('check_out', time);
            }
        }
    }, [dayData, setValue]);

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            // Need to construct full ISO strings from time inputs
            // We know the date from dayData.date

            const baseDate = dayData.date; // YYYY-MM-DD

            let checkInISO = null;
            let checkOutISO = null;

            if (data.check_in) {
                checkInISO = new Date(`${baseDate}T${data.check_in}:00`).toISOString();
            }
            if (data.check_out) {
                checkOutISO = new Date(`${baseDate}T${data.check_out}:00`).toISOString();
            }

            // Call a new or existing endpoint to update record. 
            // We might need to create `PUT /attendance/record` or similar. 
            // For now, let's assume we use a specialized endpoint we will create next: `POST /attendance/admin/update`

            return backend.post('/attendance/admin/update', {
                userId,
                date: baseDate,
                status: data.status,
                check_in: checkInISO,
                check_out: checkOutISO
            });
        },
        onSuccess: () => {
            onSuccess();
            onClose();
        },
        onError: (err: any) => alert("Failed to update: " + err.message)
    });

    const onSubmit = (data: any) => {
        updateMutation.mutate(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Attendance - {dayData?.date}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select onValueChange={(v) => setValue('status', v)} defaultValue={watch('status')}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PRESENT">Present</SelectItem>
                                <SelectItem value="ABSENT">Absent</SelectItem>
                                <SelectItem value="HALF_DAY">Half Day</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Check In Time</Label>
                            <Input type="time" {...register('check_in')} />
                        </div>
                        <div className="space-y-2">
                            <Label>Check Out Time</Label>
                            <Input type="time" {...register('check_out')} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditShiftModal;
