import React, { useState } from 'react';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Sparkles, Brain, Loader2 } from 'lucide-react';
import api from '../../../lib/api';
import Swal from 'sweetalert2';

interface Step4Props {
    formData: any;
    setFormData: (data: any) => void;
    clientId: string;
}

const Step4GoalSetting: React.FC<Step4Props> = ({ formData, setFormData, clientId }) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const data = React.useMemo(() => {
        try {
            return JSON.parse(formData.goals_json || '{}');
        } catch {
            return {};
        }
    }, [formData.goals_json]);

    const updateData = (key: string, value: any) => {
        const newData = { ...data, [key]: value };
        setFormData({ ...formData, goals_json: JSON.stringify(newData) });
    };

    const handleAutoSuggest = async () => {
        setIsGenerating(true);
        try {
            const response = await api.post(`/marketing/strategy/${clientId}/auto-suggest`, { step: 'GOALS' });
            const s = response.data.suggestion;
            
            setFormData({ ...formData, goals_json: JSON.stringify(s) });
            
            Swal.fire({ 
                title: 'Targets Calibrated', 
                text: 'Realistic revenue and budget targets have been suggested based on your industry benchmarks.', 
                icon: 'success', 
                timer: 2000, 
                showConfirmButton: false 
            });
        } catch (error) {
            Swal.fire('Error', 'Failed to generate suggestions. Please try again.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-indigo-900">Target Monthly Revenue</Label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">₹</span>
                        <Input 
                            type="number"
                            placeholder="500000" 
                            value={data.target_revenue || ''} 
                            onChange={(e) => updateData('target_revenue', e.target.value)}
                            className="h-12 pl-10 rounded-xl bg-indigo-50/30 border-indigo-100 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-indigo-900">Budget Constraint</Label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">₹</span>
                        <Input 
                            type="number"
                            placeholder="50000" 
                            value={data.monthly_budget || ''} 
                            onChange={(e) => updateData('monthly_budget', e.target.value)}
                            className="h-12 pl-10 rounded-xl bg-indigo-50/30 border-indigo-100 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-indigo-900">Strategy Timeframe</Label>
                    <select 
                        className="flex h-12 w-full rounded-xl border border-indigo-100 bg-indigo-50/30 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        value={data.timeframe || '3 Months'}
                        onChange={(e) => updateData('timeframe', e.target.value)}
                    >
                        <option value="1 Month">1 Month (Sprint)</option>
                        <option value="3 Months">3 Months (Standard)</option>
                        <option value="6 Months">6 Months (Growth)</option>
                        <option value="12 Months">12 Months (Scale)</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-indigo-900">Primary Objective</Label>
                    <select 
                        className="flex h-12 w-full rounded-xl border border-indigo-100 bg-indigo-50/30 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        value={data.objective || 'Lead Generation'}
                        onChange={(e) => updateData('objective', e.target.value)}
                    >
                        <option value="Lead Generation">Lead Generation</option>
                        <option value="Direct Sales">Direct Sales (Ecom)</option>
                        <option value="Brand Awareness">Brand Awareness</option>
                        <option value="App Installs">App Installs</option>
                        <option value="Offline Store Visits">Offline Store Visits</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-amber-900">Success KPI (Most Important)</Label>
                <Input 
                    placeholder="e.g. Cost per Qualified Lead below ₹200" 
                    value={data.success_kpi || ''} 
                    onChange={(e) => updateData('success_kpi', e.target.value)}
                    className="h-12 rounded-xl bg-amber-50/30 border-amber-100 focus:ring-2 focus:ring-amber-500"
                />
            </div>
        </div>
    );
};

export default Step4GoalSetting;
