import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';

interface RegularizationRequestDialogProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date | string;
    existingStatus?: string;
}

export function RegularizationRequestDialog({ isOpen, onClose, date, existingStatus }: RegularizationRequestDialogProps) {
    const [type, setType] = useState('MISSED_PUNCH_IN');
    const [reason, setReason] = useState('');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async () => {
            await api.post('/attendance/regularisation/request', {
                date,
                type,
                reason
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['biometric-logs'] });
            queryClient.invalidateQueries({ queryKey: ['regularisation-requests'] });
            onClose();
            alert('Request submitted successfully');
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Failed to submit request');
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Regularize Attendance: {format(new Date(date), 'MMM dd, yyyy')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label>Issue Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MISSED_PUNCH_IN">Missed Punch In</SelectItem>
                                <SelectItem value="MISSED_PUNCH_OUT">Missed Punch Out</SelectItem>
                                <SelectItem value="LATE_ARRIVAL">Late Arrival (Tech Issue)</SelectItem>
                                <SelectItem value="EARLY_DEPARTURE">Early Departure (Approved)</SelectItem>
                                <SelectItem value="WORK_FROM_HOME">Work From Home (Not marked)</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Reason</Label>
                        <Textarea
                            placeholder="Why is regularization needed?"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Note: You have a monthly limit of 3 requests. Exceeding this will flag your request for stricter review.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                            {mutation.isPending ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
