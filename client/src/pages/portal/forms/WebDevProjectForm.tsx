import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import api from '../../../lib/api';
import Swal from 'sweetalert2';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Plus, Trash, Save, ExternalLink } from 'lucide-react';

interface WebDevProjectFormProps {
    clientId: string;
    existingProject?: any; // If editing
    onSuccess?: () => void;
}

export const WebDevProjectForm: React.FC<WebDevProjectFormProps> = ({ clientId, existingProject, onSuccess }) => {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState(existingProject?.status || 'PLANNING');

    const { register, control, handleSubmit, reset, setValue } = useForm({
        defaultValues: {
            project_name: existingProject?.project_name || '',
            staging_url: existingProject?.staging_url || '',
            live_url: existingProject?.live_url || '',
            milestones: existingProject?.milestones_json
                ? (typeof existingProject.milestones_json === 'string' ? JSON.parse(existingProject.milestones_json) : existingProject.milestones_json)
                : [{ name: 'Design Phase', status: 'PENDING', date: '' }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "milestones"
    });

    useEffect(() => {
        if (existingProject) {
            setValue('project_name', existingProject.project_name);
            setValue('staging_url', existingProject.staging_url);
            setValue('live_url', existingProject.live_url);
            // Status handled by state
            const ms = typeof existingProject.milestones_json === 'string' ? JSON.parse(existingProject.milestones_json) : existingProject.milestones_json;
            setValue('milestones', ms || []);
        }
    }, [existingProject, setValue]);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = {
                client_id: clientId,
                project_name: data.project_name,
                status: status,
                staging_url: data.staging_url,
                live_url: data.live_url,
                milestones_json: data.milestones,
                timeline_json: [] // Future scope
            };

            if (existingProject?.id) {
                return await api.patch(`/client-portal/tracking/web-dev/${existingProject.id}`, payload);
            } else {
                return await api.post('/client-portal/tracking/web-dev', payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['web-dev-projects'] });
            Swal.fire('Saved', 'Project updated successfully', 'success');
            if (!existingProject) reset();
            if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || 'Failed to save', 'error');
        }
    });

    const onSubmit = (data: any) => {
        mutation.mutate(data);
    };

    return (
        <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader><CardTitle className="text-lg">{existingProject ? 'Edit Project' : 'Add New Project'}</CardTitle></CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Project Name</Label>
                            <Input {...register('project_name')} placeholder="e.g. E-Commerce Website Redesign" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Overall Status</Label>
                            <Select onValueChange={setStatus} defaultValue={status}>
                                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PLANNING">Planning</SelectItem>
                                    <SelectItem value="DESIGN">Design</SelectItem>
                                    <SelectItem value="DEVELOPMENT">Development</SelectItem>
                                    <SelectItem value="AMENDS">Amends / QA</SelectItem>
                                    <SelectItem value="TESTING">Testing</SelectItem>
                                    <SelectItem value="DEPLOYED">Deployed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Staging URL (Dev)</Label>
                            <Input {...register('staging_url')} placeholder="https://dev.example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label>Live URL (Prod)</Label>
                            <Input {...register('live_url')} placeholder="https://example.com" />
                        </div>
                    </div>

                    {/* Milestones */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Project Milestones & Timeline</Label>
                            <Button type="button" size="sm" variant="ghost" onClick={() => append({ name: '', status: 'PENDING', date: '' })}><Plus size={16} /></Button>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
                                <div className="col-span-5">Milestone Name</div>
                                <div className="col-span-3">Status</div>
                                <div className="col-span-3">Date (Due/Done)</div>
                                <div className="col-span-1"></div>
                            </div>
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-5">
                                        <Input {...register(`milestones.${index}.name` as const)} placeholder="e.g. Wireframes Approval" required />
                                    </div>
                                    <div className="col-span-3">
                                        <select
                                            {...register(`milestones.${index}.status` as const)}
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <option value="PENDING">Pending</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="COMPLETED">Completed</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3">
                                        <Input type="date" {...register(`milestones.${index}.date` as const)} />
                                    </div>
                                    <div className="col-span-1 text-center">
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => remove(index)}>
                                            <Trash size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <Button type="submit" disabled={mutation.isPending}>
                            <Save className="mr-2 h-4 w-4" />
                            {mutation.isPending ? 'Saving...' : 'Save Project Details'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};
