import React, { useState, useEffect } from 'react';
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
    initialData?: any;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export const MetaAdsLogForm: React.FC<MetaAdsLogFormProps> = ({ clientId, initialData, onSuccess, onCancel }) => {
    const queryClient = useQueryClient();
    const { register, handleSubmit, reset, setValue } = useForm();
    const [platform, setPlatform] = useState('Facebook');
    const [objective, setObjective] = useState('Engagement');
    const [amount, setAmount] = useState('');
    const [includeGst, setIncludeGst] = useState(false);

    // Compute gross amount whenever amount or GST toggle changes
    const grossAmount = amount
        ? includeGst
            ? (parseFloat(amount) * 1.18).toFixed(2)
            : parseFloat(amount).toFixed(2)
        : '';

    useEffect(() => {
        if (initialData) {
            setPlatform(initialData.platform || 'Facebook');
            setObjective(initialData.objective || 'Engagement');
            // Pre-fill amount from existing spend
            if (initialData.spend) setAmount(String(initialData.spend));

            // Parse results if string
            const results = typeof initialData.results_json === 'string'
                ? JSON.parse(initialData.results_json)
                : initialData.results_json || {};

            // Flatten data for form
            const formData = {
                ...initialData,
                date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : '',
                ...results // Spread results fields (impressions, clicks, etc.)
            };

            reset(formData);
        } else {
            reset({});
            setPlatform('Facebook');
            setObjective('Engagement');
            setAmount('');
            setIncludeGst(false);
        }
    }, [initialData, reset]);

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

            const payload = {
                client_id: clientId,
                date: data.date,
                campaign_name: data.campaign_name,
                objective: objective,
                platform: platform,
                spend: grossAmount ? parseFloat(grossAmount) : 0, // Gross amount (with GST if selected) as the spend
                results_json: results,
                notes: data.notes
            };

            if (initialData?.id) {
                return await api.patch(`/client-portal/tracking/meta-ads/${initialData.id}`, payload);
            } else {
                return await api.post('/client-portal/tracking/meta-ads', payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads-logs'] });
            Swal.fire('Saved', `Record ${initialData ? 'updated' : 'added'} successfully`, 'success');
            if (!initialData) reset(); // Only reset if adding new, else keep form or let parent handle
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
        <Card className={`mb-8 border-primary/20 ${initialData ? 'bg-yellow-50' : 'bg-primary/5'}`}>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{initialData ? 'Edit Daily Entry' : 'Add Daily Entry'}</CardTitle>
                    {onCancel && (
                        <Button variant="ghost" size="sm" onClick={onCancel} type="button">Cancel Edit</Button>
                    )}
                </div>
            </CardHeader>
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
                            <Select onValueChange={setPlatform} value={platform}>
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
                            <Select onValueChange={setObjective} value={objective}>
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
                        {/* GST Spend Widget: Amount → GST Checkbox → Gross Amount */}
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

                    <div className="flex justify-end gap-2">
                        {onCancel && (
                            <Button variant="outline" type="button" onClick={onCancel}>
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : (initialData ? 'Update Record' : 'Save Record')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};
