import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import api from '../../../lib/api';
import Swal from 'sweetalert2';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';

interface ContentDeliverableFormProps {
    clientId: string;
    onSuccess?: () => void;
}

export const ContentDeliverableForm: React.FC<ContentDeliverableFormProps> = ({ clientId, onSuccess }) => {
    const queryClient = useQueryClient();
    const { register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            title: '',
            type: 'CREATIVE',
            status: 'DRAFT',
            link: '',
            notes: ''
        }
    });

    // Watch type to control defaults if needed
    const type = watch('type');

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.post('/client-portal/tracking/content', {
                client_id: clientId,
                title: data.title,
                type: data.type,
                status: data.status,
                link: data.link,
                notes: data.notes
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content-deliverables'] });
            Swal.fire('Saved', 'Deliverable added successfully', 'success');
            reset();
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
            <CardHeader><CardTitle className="text-lg">Add New Deliverable</CardTitle></CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Title / Topic</Label>
                            <Input {...register('title')} placeholder="e.g. September Social Media Calendar" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select onValueChange={(val) => setValue('type', val)} defaultValue="CREATIVE">
                                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CREATIVE">Creative (Design)</SelectItem>
                                    <SelectItem value="COPY">Copywriting</SelectItem>
                                    <SelectItem value="BLOG">Blog Article</SelectItem>
                                    <SelectItem value="BRANDING_ASSET">Branding Asset</SelectItem>
                                    <SelectItem value="VIDEO">Video / Reel</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Link / URL (Drive, Figma, Doc)</Label>
                            <Input {...register('link')} placeholder="https://..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select onValueChange={(val) => setValue('status', val)} defaultValue="DRAFT">
                                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT">Draft / In Progress</SelectItem>
                                    <SelectItem value="SUBMITTED">Submitted for Review</SelectItem>
                                    <SelectItem value="APPROVED">Approved</SelectItem>
                                    <SelectItem value="REJECTED">Changes Requested</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea {...register('notes')} placeholder="Instructions or comments..." />
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Add Deliverable'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};
