import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import api from '../../../lib/api';
import Swal from 'sweetalert2';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Plus, Trash, Save } from 'lucide-react';

interface SeoLogFormProps {
    clientId: string;
    onSuccess?: () => void;
}

export const SeoLogForm: React.FC<SeoLogFormProps> = ({ clientId, onSuccess }) => {
    const queryClient = useQueryClient();
    const currentDate = new Date();
    const [month, setMonth] = useState(currentDate.getMonth() + 1);
    const [year, setYear] = useState(currentDate.getFullYear());

    const { register, control, handleSubmit, reset } = useForm({
        defaultValues: {
            organic_traffic: 0,
            summary: '',
            activities: [{ activity: '' }], // Array of strings wrapped in obj for useFieldArray
            rankings: [{ keyword: '', rank: '', change: '' }]
        }
    });

    const { fields: activityFields, append: appendActivity, remove: removeActivity } = useFieldArray({
        control,
        name: "activities"
    });

    const { fields: rankingFields, append: appendRanking, remove: removeRanking } = useFieldArray({
        control,
        name: "rankings"
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            // Transform form data to match API expectations
            const activitiesList = data.activities.map((a: any) => a.activity).filter((a: string) => a.trim() !== '');
            const rankingsList = data.rankings.filter((r: any) => r.keyword.trim() !== '');

            return await api.post('/client-portal/tracking/seo', {
                client_id: clientId,
                month,
                year,
                organic_traffic: data.organic_traffic,
                summary: data.summary,
                activities_json: activitiesList,
                keyword_rankings_json: rankingsList
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['seo-logs'] });
            Swal.fire('Saved', 'SEO Monthly Log updated successfully', 'success');
            // Don't full reset, mainly just clear lists if needed, but keeping year/month is helpful
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
            <CardHeader><CardTitle className="text-lg">Update Monthly SEO Log</CardTitle></CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Month/Year Selection */}
                    <div className="flex gap-4">
                        <div className="w-1/3 space-y-2">
                            <Label>Month</Label>
                            <Input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(parseInt(e.target.value))} required />
                        </div>
                        <div className="w-1/3 space-y-2">
                            <Label>Year</Label>
                            <Input type="number" min="2020" max="2030" value={year} onChange={(e) => setYear(parseInt(e.target.value))} required />
                        </div>
                        <div className="w-1/3 space-y-2">
                            <Label>Organic Traffic</Label>
                            <Input type="number" {...register('organic_traffic')} placeholder="e.g. 5400" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Monthly Summary / Highlights</Label>
                        <Textarea {...register('summary')} placeholder="Executive summary of SEO progress this month..." />
                    </div>

                    {/* Dynamic Activities */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Key Activities Performed</Label>
                            <Button type="button" size="sm" variant="ghost" onClick={() => appendActivity({ activity: '' })}><Plus size={16} /></Button>
                        </div>
                        {activityFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2">
                                <Input {...register(`activities.${index}.activity` as const)} placeholder="e.g. Optimized Home Page Meta Tags" />
                                <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => removeActivity(index)}>
                                    <Trash size={16} />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Dynamic Rankings */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Keyword Rankings Snapshot</Label>
                            <Button type="button" size="sm" variant="ghost" onClick={() => appendRanking({ keyword: '', rank: '', change: '' })}><Plus size={16} /></Button>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
                                <div className="col-span-5">Keyword</div>
                                <div className="col-span-3">Rank</div>
                                <div className="col-span-3">Change</div>
                                <div className="col-span-1"></div>
                            </div>
                            {rankingFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-5">
                                        <Input {...register(`rankings.${index}.keyword` as const)} placeholder="Keyword" />
                                    </div>
                                    <div className="col-span-3">
                                        <Input {...register(`rankings.${index}.rank` as const)} placeholder="#" />
                                    </div>
                                    <div className="col-span-3">
                                        <Input {...register(`rankings.${index}.change` as const)} placeholder="+/-" />
                                    </div>
                                    <div className="col-span-1 text-center">
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeRanking(index)}>
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
                            {mutation.isPending ? 'Saving...' : 'Save Monthly Log'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};
