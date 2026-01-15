import React, { useState } from 'react';
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

interface MetaAdsLogFormProps {
    clientId: string;
    onSuccess?: () => void;
}

export const MetaAdsLogForm: React.FC<MetaAdsLogFormProps> = ({ clientId, onSuccess }) => {
    const queryClient = useQueryClient();
    const { register, handleSubmit, reset } = useForm();
    const [platform, setPlatform] = useState('Facebook');
    const [objective, setObjective] = useState('Engagement');

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            // Structure the dynamic JSON
            const results = {
                engagements: data.engagements,
                reach: data.reach,
                impressions: data.impressions,
                leads: data.leads,
                cost_per_lead: data.cost_per_lead,
                clicks: data.clicks,
                cpc: data.cpc,
            };

            return await api.post('/client-portal/tracking/meta-ads', {
                client_id: clientId,
                date: data.date,
                campaign_name: data.campaign_name,
                objective: objective,
                platform: platform,
                spend: data.spend,
                results_json: results,
                notes: data.notes
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads-logs'] });
            Swal.fire('Saved', 'Daily record added successfully', 'success');
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
            <CardHeader><CardTitle className="text-lg">Add Daily Entry</CardTitle></CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" {...register('date')} defaultValue={new Date().toISOString().split('T')[0]} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Campaign Name</Label>
                            <Input {...register('campaign_name')} placeholder="e.g. Summer Sale" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Platform</Label>
                            <Select onValueChange={setPlatform} defaultValue={platform}>
                                <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Facebook">Facebook</SelectItem>
                                    <SelectItem value="Instagram">Instagram</SelectItem>
                                    <SelectItem value="Both">Both</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Objective</Label>
                            <Select onValueChange={setObjective} defaultValue={objective}>
                                <SelectTrigger><SelectValue placeholder="Objective" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Engagement">Engagement</SelectItem>
                                    <SelectItem value="Leads">Leads</SelectItem>
                                    <SelectItem value="Traffic">Traffic</SelectItem>
                                    <SelectItem value="Sales">Sales</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Spend (₹)</Label>
                            <Input type="number" step="0.01" {...register('spend')} required />
                        </div>

                        {/* Dynamic Fields based on Objective */}
                        {(objective === 'Engagement' || objective === 'Sales') && (
                            <>
                                <div className="space-y-2">
                                    <Label>Engagements</Label>
                                    <Input type="number" {...register('engagements')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Reach</Label>
                                    <Input type="number" {...register('reach')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Impressions</Label>
                                    <Input type="number" {...register('impressions')} />
                                </div>
                            </>
                        )}

                        {(objective === 'Leads') && (
                            <>
                                <div className="space-y-2">
                                    <Label>Leads Generated</Label>
                                    <Input type="number" {...register('leads')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cost per Lead (CPL)</Label>
                                    <Input type="number" step="0.01" {...register('cost_per_lead')} />
                                </div>
                            </>
                        )}

                        {(objective === 'Traffic') && (
                            <>
                                <div className="space-y-2">
                                    <Label>Link Clicks</Label>
                                    <Input type="number" {...register('clicks')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>CPC</Label>
                                    <Input type="number" step="0.01" {...register('cpc')} />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea {...register('notes')} placeholder="Campaign observations..." />
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Save Record'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};
