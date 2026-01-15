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

interface GoogleAdsLogFormProps {
    clientId: string;
    onSuccess?: () => void;
}

export const GoogleAdsLogForm: React.FC<GoogleAdsLogFormProps> = ({ clientId, onSuccess }) => {
    const queryClient = useQueryClient();
    const { register, handleSubmit, reset } = useForm();
    const [campaignType, setCampaignType] = useState('Search');

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.post('/client-portal/tracking/google-ads', {
                client_id: clientId,
                date: data.date,
                campaign_name: data.campaign_name,
                campaign_type: campaignType,
                spend: data.spend,
                clicks: data.clicks,
                impressions: data.impressions,
                conversions: data.conversions,
                cpa: data.cpa,
                notes: data.notes
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['google-ads-logs'] });
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" {...register('date')} defaultValue={new Date().toISOString().split('T')[0]} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Campaign Name</Label>
                            <Input {...register('campaign_name')} placeholder="e.g. Brand Search" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Campaign Type</Label>
                            <Select onValueChange={setCampaignType} defaultValue={campaignType}>
                                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Search">Search</SelectItem>
                                    <SelectItem value="Display">Display</SelectItem>
                                    <SelectItem value="Video">Video (YouTube)</SelectItem>
                                    <SelectItem value="Performance Max">Performance Max</SelectItem>
                                    <SelectItem value="Shopping">Shopping</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="space-y-2">
                            <Label>Spend (₹)</Label>
                            <Input type="number" step="0.01" {...register('spend')} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Impressions</Label>
                            <Input type="number" {...register('impressions')} />
                        </div>
                        <div className="space-y-2">
                            <Label>Clicks</Label>
                            <Input type="number" {...register('clicks')} />
                        </div>
                        <div className="space-y-2">
                            <Label>Conversions</Label>
                            <Input type="number" {...register('conversions')} />
                        </div>
                        <div className="space-y-2">
                            <Label>CPA</Label>
                            <Input type="number" step="0.01" {...register('cpa')} />
                        </div>
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
