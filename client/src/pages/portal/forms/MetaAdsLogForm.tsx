import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import api from '../../../lib/api';
import Swal from 'sweetalert2';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../components/ui/card';
import { ArrowRight, Activity, MousePointerClick, Eye, Target } from 'lucide-react';

interface MetaAdsLogFormProps {
    clientId: string;
    initialData?: any;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export const MetaAdsLogForm: React.FC<MetaAdsLogFormProps> = ({ clientId, initialData, onSuccess, onCancel }) => {
    const queryClient = useQueryClient();
    const { register, handleSubmit, reset } = useForm();
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

    // Fetch Meta Campaigns connected via Ad Intelligence
    const { data: campaigns, isLoading } = useQuery({
        queryKey: ['integrated-meta-campaigns', clientId],
        queryFn: async () => {
            const { data } = await api.get(`/client-portal/tracking/meta-ads/campaigns?clientId=${clientId}`);
            return data;
        },
        enabled: !initialData && !!clientId, // Only need to fetch if not editing
    });

    useEffect(() => {
        if (initialData) {
            // Edit Mode: prepopulate date and notes
            reset({
                date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : '',
                notes: initialData.notes || ''
            });
        } else {
            reset({
                date: new Date().toISOString().split('T')[0],
                notes: ''
            });
            setSelectedCampaignId('');
        }
    }, [initialData, reset]);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            if (initialData?.id) {
                // Update mode (only notes and date)
                return await api.patch(`/client-portal/tracking/meta-ads/${initialData.id}`, {
                    notes: data.notes,
                    date: data.date
                });
            } else {
                // Create mode: Needs marketing_campaign_id
                if (!selectedCampaignId) throw new Error("Please select a Campaign");
                return await api.post('/client-portal/tracking/meta-ads', {
                    client_id: clientId,
                    marketing_campaign_id: selectedCampaignId,
                    date: data.date,
                    notes: data.notes
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta-ads-logs'] });
            Swal.fire('Saved', `Entry ${initialData ? 'updated' : 'added'} successfully`, 'success');
            if (!initialData) {
                reset();
                setSelectedCampaignId('');
            }
            if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || err.message || 'Failed to save', 'error');
        }
    });

    const onSubmit = (data: any) => {
        mutation.mutate(data);
    };

    const selectedCampaignObj = campaigns?.find((c: any) => c.id === selectedCampaignId);
    const latestMetric = selectedCampaignObj?.marketingMetrics?.[0];

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    const formatNumber = (val: number) => new Intl.NumberFormat('en-IN').format(val || 0);

    return (
        <Card className={`mb-8 border-primary/20 shadow-sm ${initialData ? 'bg-yellow-50' : 'bg-primary/5'}`}>
            <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-xl">{initialData ? 'Edit Meta Entry (Notes Only)' : 'Add Daily Meta Entry'}</CardTitle>
                        {!initialData && (
                            <CardDescription>Select a synced campaign to automatically log its snapshot.</CardDescription>
                        )}
                    </div>
                    {onCancel && (
                        <Button variant="ghost" size="sm" onClick={onCancel} type="button">Cancel Edit</Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* LEFT COLUMN - FORM */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="font-semibold text-foreground">Date</Label>
                                <Input type="date" {...register('date')} defaultValue={new Date().toISOString().split('T')[0]} required />
                            </div>

                            {!initialData ? (
                                <div className="space-y-2">
                                    <Label className="font-semibold text-foreground">Select Campaign <span className="text-red-500">*</span></Label>
                                    <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                                        <SelectTrigger className="w-full bg-background border border-input rounded-lg h-11">
                                            <SelectValue placeholder={isLoading ? "Loading campaigns..." : "-- Choose Meta Campaign --"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {campaigns?.map((c: any) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name} ({c.status})
                                                </SelectItem>
                                            ))}
                                            {campaigns?.length === 0 && (
                                                <SelectItem value="empty" disabled>No synced campaigns found.</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label className="font-semibold text-foreground">Campaign Logged</Label>
                                    <Input value={initialData.campaign_name} disabled className="bg-gray-100 font-medium" />
                                    <p className="text-xs text-muted-foreground mt-1">Snapshot metrics cannot be edited after creation. Please delete and recreate if necessary.</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="font-semibold text-foreground">Notes / Observations</Label>
                                <Textarea {...register('notes')} placeholder="Any specific notes for this snapshot update..." className="min-h-[100px] resize-y" />
                            </div>
                        </div>

                        {/* RIGHT COLUMN - SUMMARY CARD */}
                        <div className="bg-white/50 rounded-xl p-5 border shadow-sm">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-primary" /> 
                                {initialData ? 'Historical Snapshot Data' : 'Live Snapshot Preview'}
                            </h3>
                            
                            {/* WHEN EDITING */}
                            {initialData && (
                                <div className="space-y-4">
                                    <div className="flex items-end gap-2 text-2xl font-bold bg-muted/30 p-4 rounded-lg">
                                        <ArrowRight className="w-5 h-5 text-green-500 mb-1" />
                                        {formatCurrency(initialData.spend || 0)} <span className="text-sm font-normal text-muted-foreground mb-1">Spent</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        {(() => {
                                            const r = typeof initialData.results_json === 'string' ? JSON.parse(initialData.results_json) : (initialData.results_json || {});
                                            return Object.entries(r).map(([k, v]) => (
                                                <div key={k} className="bg-background rounded-md px-3 py-2 border flex justify-between capitalize">
                                                    <span className="text-muted-foreground">{k.replace(/_/g, ' ')}:</span> 
                                                    <span className="font-semibold">{v as React.ReactNode}</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* WHEN CREATING */}
                            {!initialData && !selectedCampaignId && (
                                <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
                                    Select a campaign to preview current metrics
                                </div>
                            )}
                            
                            {!initialData && selectedCampaignId && selectedCampaignObj && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold truncate max-w-[200px] lg:max-w-xs">{selectedCampaignObj.name}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                ID: {selectedCampaignObj.externalCampaignId}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${selectedCampaignObj.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600'}`}>
                                            {selectedCampaignObj.status}
                                        </span>
                                    </div>

                                    {latestMetric ? (
                                        <>
                                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                                                <div className="text-sm text-primary mb-1 font-medium">Total Spend</div>
                                                <div className="text-3xl font-bold tracking-tight text-primary">{formatCurrency(latestMetric.spend)}</div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-white border rounded-lg p-3 flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground flex gap-1 items-center"><MousePointerClick className="w-3 h-3"/> Clicks</span>
                                                    <span className="font-semibold text-lg">{formatNumber(latestMetric.clicks)}</span>
                                                </div>
                                                <div className="bg-white border rounded-lg p-3 flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground flex gap-1 items-center"><Target className="w-3 h-3"/> Results</span>
                                                    <span className="font-semibold text-lg">{formatNumber(latestMetric.results)}</span>
                                                </div>
                                                <div className="bg-white border rounded-lg p-3 flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground flex gap-1 items-center"><Eye className="w-3 h-3"/> Impressions</span>
                                                    <span className="font-semibold text-lg">{formatNumber(latestMetric.impressions)}</span>
                                                </div>
                                                <div className="bg-white border rounded-lg p-3 flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground flex gap-1 items-center"><Activity className="w-3 h-3"/> Reach</span>
                                                    <span className="font-semibold text-lg">{formatNumber(latestMetric.reach)}</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-4 bg-orange-50 border border-orange-200 text-orange-700 text-sm rounded-lg flex items-center justify-center">
                                            No recent metrics synced for this campaign.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                        {onCancel && (
                            <Button variant="outline" type="button" onClick={onCancel} className="px-6">
                                Cancel
                            </Button>
                        )}
                        <Button 
                            type="submit" 
                            disabled={mutation.isPending || (!initialData && !selectedCampaignId)}
                            className="px-8 shadow-md hover:shadow-lg transition-all"
                        >
                            {mutation.isPending ? 'Saving...' : initialData ? 'Save Changes' : 'Record Snapshot'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default MetaAdsLogForm;
