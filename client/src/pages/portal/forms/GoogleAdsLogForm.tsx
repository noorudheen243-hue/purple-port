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
    const [amount, setAmount] = useState('');
    const [includeGst, setIncludeGst] = useState(false);

    // Gross amount: apply 18% GST if checked
    const grossAmount = amount
        ? includeGst
            ? (parseFloat(amount) * 1.18).toFixed(2)
            : parseFloat(amount).toFixed(2)
        : '';

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.post('/client-portal/tracking/google-ads', {
                client_id: clientId,
                date: data.date,
                campaign_name: data.campaign_name,
                campaign_type: campaignType,
                spend: grossAmount ? parseFloat(grossAmount) : 0, // Gross amount as spend
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
            setAmount('');
            setIncludeGst(false);
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
                        {/* GST Spend Widget */}
                        <div className="space-y-2">
                            <Label>Amount (₹)</Label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Enter amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="invisible">GST</Label>
                            <label className="flex items-center gap-2 h-10 px-3 border rounded-md bg-orange-50 border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={includeGst}
                                    onChange={(e) => setIncludeGst(e.target.checked)}
                                    className="w-4 h-4 accent-orange-500"
                                />
                                <span className="text-sm font-medium text-orange-700">+ GST 18%</span>
                            </label>
                        </div>
                        <div className="space-y-2">
                            <Label>Gross Amount (₹)</Label>
                            <div className={`flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm font-semibold ${includeGst ? 'bg-orange-50 border-orange-300 text-orange-800' : 'bg-gray-50 border-gray-200 text-gray-700'
                                }`}>
                                {grossAmount ? `₹ ${parseFloat(grossAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                {includeGst && amount && (
                                    <span className="ml-auto text-[10px] text-orange-500 font-normal">
                                        +₹{(parseFloat(amount) * 0.18).toFixed(2)} GST
                                    </span>
                                )}
                            </div>
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
