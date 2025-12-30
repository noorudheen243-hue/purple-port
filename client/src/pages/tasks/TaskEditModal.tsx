import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Briefcase, FileText, Layers, RefreshCw, User, Calendar as CalendarIcon, Check, Plus, Edit } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import FormErrorAlert from '../../components/ui/FormErrorAlert';

// Schema for Updating
const updateSchema = z.object({
    title: z.string().min(3, "Title is required"),
    description: z.string().optional(),
    type: z.enum(['GENERIC', 'GRAPHIC', 'VIDEO', 'COPY', 'STRATEGY', 'DEV']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    status: z.enum(['PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'REVISION_REQUESTED', 'COMPLETED']),
    due_date: z.string().optional(),
    assignee_id: z.string().optional(),
    // Client/Campaign usually not changed easily, but let's allow basic edits
});

type TaskEditData = z.infer<typeof updateSchema>;

interface TaskEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: any;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({ isOpen, onClose, task }) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // Fetch Data for Selects
    const { data: staff } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(res => res.data) });

    const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<TaskEditData>({
        resolver: zodResolver(updateSchema),
        defaultValues: {
            title: '',
            priority: 'MEDIUM',
            status: 'PLANNED',
            type: 'GENERIC'
        }
    });

    useEffect(() => {
        if (task) {
            reset({
                title: task.title,
                description: task.description,
                type: task.type,
                priority: task.priority,
                status: task.status,
                assignee_id: task.assignee_id,
                due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : ''
            });
        }
    }, [task, reset]);

    const updateMutation = useMutation({
        mutationFn: async (data: TaskEditData) => {
            const payload = { ...data };
            // Assignee ID is passed directly to let backend handle connection logic

            if (data.due_date) {
                // @ts-ignore
                payload.due_date = new Date(data.due_date);
            }
            return await api.put(`/tasks/${task.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            onClose();
        },
        onError: (err: any) => {
            alert("Failed to update task: " + (err.response?.data?.message || err.message));
        }
    });

    const onSubmit = (data: TaskEditData) => {
        updateMutation.mutate(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl bg-white p-0 gap-0">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-800">
                        <Edit className="text-blue-600" />
                        Edit Task
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    <FormErrorAlert errors={errors} />

                    {/* Title */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Task Title</label>
                        <input {...register('title')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none" />
                        {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Status</label>
                            <select {...register('status')} className="w-full px-4 py-2 border rounded-lg bg-white">
                                <option value="PLANNED">Planned</option>
                                <option value="ASSIGNED">Assigned</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="REVIEW">Review</option>
                                <option value="REVISION_REQUESTED">Revision Requested</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Priority</label>
                            <select {...register('priority')} className="w-full px-4 py-2 border rounded-lg bg-white">
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Assigned To</label>
                            <select {...register('assignee_id')} className="w-full px-4 py-2 border rounded-lg bg-white">
                                <option value="">Unassigned</option>
                                {staff?.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.full_name} ({u.department})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Due Date</label>
                            <input type="date" {...register('due_date')} className="w-full px-4 py-2 border rounded-lg" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default TaskEditModal;
