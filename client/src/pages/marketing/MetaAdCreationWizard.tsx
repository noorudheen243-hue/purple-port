import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, X, AlertCircle, CheckCircle, ChevronRight, Target, DollarSign, Users } from 'lucide-react';
import api from '../../lib/api';

interface MetaAdCreationWizardProps {
    accountId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const MetaAdCreationWizard: React.FC<MetaAdCreationWizardProps> = ({ accountId, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    
    // Step 1: Campaign state
    const [campaignName, setCampaignName] = useState('');
    const [objective, setObjective] = useState('OUTCOME_LEADS');
    const [campaignStatus, setCampaignStatus] = useState('PAUSED');
    
    // Step 2: Ad Set state
    const [adSetName, setAdSetName] = useState('');
    const [dailyBudget, setDailyBudget] = useState('500'); // in rupees (needs to be converted to paise (*100))
    const [billingEvent, setBillingEvent] = useState('IMPRESSIONS');
    const [optimizationGoal, setOptimizationGoal] = useState('LEAD_GENERATION');

    const [error, setError] = useState<string | null>(null);

    const createFullCampaignMutation = useMutation({
        mutationFn: async () => {
             // 1. Create Campaign
             const campRes = await api.post('/marketing/meta/manager/campaigns', {
                 accountId,
                 name: campaignName,
                 objective,
                 status: campaignStatus
             });
             const newCampaignId = campRes.data.id;

             // 2. Create Ad Set under this campaign
             // Construct targeting (Broad for MVP)
             const targeting = {
                 geo_locations: { countries: ['IN'] },
                 age_min: 18,
                 age_max: 65,
             };

             const adSetRes = await api.post('/marketing/meta/manager/adsets', {
                 accountId,
                 payload: {
                     name: adSetName,
                     campaign_id: newCampaignId,
                     daily_budget: parseInt(dailyBudget) * 100, // Meta uses cents/paise
                     billing_event: billingEvent,
                     optimization_goal: optimizationGoal,
                     targeting,
                     status: campaignStatus, // inherit campaign status
                     promoted_object: objective === 'OUTCOME_LEADS' ? { page_id: '123456789' } : undefined, // Mock page id for now
                     start_time: new Date().toISOString()
                 }
             });

             return { campaign: campRes.data, adSet: adSetRes.data };
        },
        onSuccess: () => {
            onSuccess();
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || err.message || 'Failed to create campaign flow');
        }
    });

    const handleNext = () => {
        if (step === 1) {
            if (!campaignName) return setError('Campaign Name is required');
            // Suggest an ad set name based on campaign name
            if (!adSetName) setAdSetName(`${campaignName} - AdSet 1`);
            setStep(2);
            setError(null);
        } else if (step === 2) {
            if (!adSetName) return setError('Ad Set Name is required');
            if (!dailyBudget || isNaN(Number(dailyBudget))) return setError('Valid Daily Budget is required');
            setError(null);
            createFullCampaignMutation.mutate();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-500" />
                        Create New Campaign
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 py-4 flex items-center border-b border-gray-100 dark:border-gray-700">
                    <div className={`flex items-center gap-2 ${step >= 1 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>1</div>
                        <span className="font-semibold text-sm">Campaign Setup</span>
                    </div>
                    <div className="flex-1 h-0.5 mx-4 bg-gray-200 dark:bg-gray-700">
                        <div className={`h-full bg-purple-500 transition-all duration-300 ${step >= 2 ? 'w-full' : 'w-0'}`} />
                    </div>
                    <div className={`flex items-center gap-2 ${step >= 2 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>2</div>
                        <span className="font-semibold text-sm">Ad Set Configuration</span>
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-3 border border-red-100 dark:border-red-900/30">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Campaign Name <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={campaignName}
                                    onChange={e => setCampaignName(e.target.value)}
                                    placeholder="e.g. Q3 Lead Generation - Real Estate"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Objective</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setObjective('OUTCOME_LEADS'); setOptimizationGoal('LEAD_GENERATION'); }}
                                        className={`p-4 border rounded-xl text-left transition-all ${objective === 'OUTCOME_LEADS' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                    >
                                        <div className="font-semibold text-gray-900 dark:text-white mb-1">Leads</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Collect leads for your business or brand.</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setObjective('OUTCOME_AWARENESS'); setOptimizationGoal('REACH'); setBillingEvent('IMPRESSIONS'); }}
                                        className={`p-4 border rounded-xl text-left transition-all ${objective === 'OUTCOME_AWARENESS' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                    >
                                        <div className="font-semibold text-gray-900 dark:text-white mb-1">Awareness</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Show your ads to people who are most likely to remember them.</div>
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Initial Status</label>
                                <select
                                    value={campaignStatus}
                                    onChange={e => setCampaignStatus(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="PAUSED">Paused (Safe)</option>
                                    <option value="ACTIVE">Active (Live immediately)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                             <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ad Set Name <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={adSetName}
                                    onChange={e => setAdSetName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Daily Budget ({"\u20B9"}) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-gray-500">{"\u20B9"}</span>
                                    </div>
                                    <input 
                                        type="number" 
                                        value={dailyBudget}
                                        onChange={e => setDailyBudget(e.target.value)}
                                        min="100"
                                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Minimum budget depends on your primary optimization goal.</p>
                            </div>

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Targeting Overview
                                </h4>
                                <p className="text-xs text-blue-800/80 dark:text-blue-200/80">
                                    This ad set will be created with Broad Targeting (India, 18-65). You can refine detailed custom audiences later directly in the Meta Ads Manager platform for better performance.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
                    <button 
                        onClick={step === 1 ? onClose : () => setStep(1)}
                        className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                        disabled={createFullCampaignMutation.isPending}
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>
                    
                    <button 
                        onClick={handleNext}
                        disabled={createFullCampaignMutation.isPending}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-70"
                    >
                        {createFullCampaignMutation.isPending ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                        ) : step === 1 ? (
                            <>Continue <ChevronRight className="w-4 h-4" /></>
                        ) : (
                            <>Publish Campaign <CheckCircle className="w-4 h-4" /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
