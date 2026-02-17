import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../lib/api';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ResignationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const resignationSchema = z.object({
    requested_relieving_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date",
    }),
    reason: z.string().min(5, "Reason must be at least 5 characters"),
    confirm: z.boolean().refine(val => val === true, "You must acknowledge the policy"),
});

type ResignationFormData = z.infer<typeof resignationSchema>;

export const ResignationFormModal: React.FC<ResignationFormModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();

    // Default Date: Today + 30 days
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    const defaultDateStr = defaultDate.toISOString().split('T')[0];

    const { register, handleSubmit, formState: { errors }, reset } = useForm<ResignationFormData>({
        resolver: zodResolver(resignationSchema),
        defaultValues: {
            requested_relieving_date: defaultDateStr,
            reason: '',
            confirm: false
        }
    });

    const mutation = useMutation({
        mutationFn: async (data: ResignationFormData) => {
            return await api.post('/team/resignation/apply', {
                requested_relieving_date: data.requested_relieving_date, // Send as string YYYY-MM-DD? Controller expects string transform to Date.
                reason: data.reason
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-resignation'] });
            reset();
            onClose();
            // Could show toast success here using a library or alert
            alert("Resignation request submitted successfully.");
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || "Failed to submit request.");
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-background text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-red-600 flex items-center gap-2">
                        <AlertTriangle size={20} /> Apply for Resignation
                    </DialogTitle>
                </DialogHeader>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-100 dark:border-red-900/50 mb-4 text-sm text-red-800 dark:text-red-200">
                    <p className="font-bold mb-1">Notice Policy</p>
                    <p>The standard notice period is <strong>30 days</strong>. Submitting this request initiates the process. Your final relieving date is subject to manager approval and handover completion.</p>
                </div>

                <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Last Working Day (Requested)</label>
                        <input
                            type="date"
                            {...register('requested_relieving_date')}
                            className="w-full p-2 border border-input bg-background rounded-md"
                        />
                        {errors.requested_relieving_date && <p className="text-red-500 text-xs">{errors.requested_relieving_date.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Reason for Leaving</label>
                        <textarea
                            {...register('reason')}
                            rows={4}
                            placeholder="Please provide a detailed reason..."
                            className="w-full p-2 border border-input bg-background rounded-md"
                        />
                        {errors.reason && <p className="text-red-500 text-xs">{errors.reason.message}</p>}
                    </div>

                    <div className="flex items-start gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="confirm"
                            {...register('confirm')}
                            className="mt-1"
                        />
                        <label htmlFor="confirm" className="text-sm text-muted-foreground">
                            I understand that this action is formal and irreversible without approval. I agree to serve the notice period as per company policy.
                        </label>
                    </div>
                    {errors.confirm && <p className="text-red-500 text-xs ml-6">{errors.confirm.message}</p>}

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md">Cancel</button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-2"
                        >
                            {mutation.isPending && <Loader2 className="animate-spin" size={16} />}
                            Submit Resignation
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
