import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { 
    Loader2, 
    ChevronRight, 
    ChevronLeft, 
    Brain, 
    Target, 
    Compass, 
    Users, 
    Layout, 
    Globe,
    Sparkles,
    CheckCircle2,
    Save,
    TrendingUp
} from 'lucide-react';
import Step1PrimaryData from './Step1PrimaryData';
import Step2DigitalPresence from './Step2DigitalPresence';
import Step3MarketData from './Step3MarketData';
import Step3CustomerAvatar from './Step3CustomerAvatar';
import Step4GoalSetting from './Step4GoalSetting';
import Step5Processing from './Step5Processing';
import StrategyDashboard from './StrategyDashboard';
import Step8DocsReports from './Step8DocsReports';
import Swal from 'sweetalert2';
import { useAuthStore } from '../../../store/authStore';
import { ROLES } from '../../../utils/roles';
import { FileText } from 'lucide-react';

interface StrategyWizardProps {
    clientId: string;
    selectedClient?: any;
    initialData?: any;
    onSaveSuccess?: () => void;
}

const STEPS = [
    { id: 1, label: 'Primary Data', icon: Compass },
    { id: 2, label: 'Presence', icon: Globe },
    { id: 3, label: 'Market', icon: TrendingUp },
    { id: 4, label: 'ICA', icon: Users },
    { id: 5, label: 'Goals', icon: Target },
    { id: 6, label: 'Generate', icon: Brain },
    { id: 7, label: 'Outcome', icon: Layout },
    { id: 8, label: 'Docs & Reports', icon: FileText }
];

const StrategyWizard: React.FC<StrategyWizardProps> = ({ clientId, selectedClient, initialData, onSaveSuccess }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const isDeveloperAdmin = user?.role === ROLES.DEVELOPER_ADMIN;
    const [activeMasterId, setActiveMasterId] = useState<string | null>(null);

    // Fetch existing strategy data
    const { data: strategyData, isLoading: isLoadingStrat } = useQuery({
        queryKey: ['strategy', clientId],
        queryFn: async () => (await api.get(`/marketing/strategy/${clientId}`)).data,
        enabled: !!clientId
    });

    const { data: globalMarketData, isLoading: isLoadingMarket } = useQuery({
        queryKey: ['strategy-market', clientId],
        queryFn: async () => (await api.get(`/marketing/strategy/${clientId}/market`)).data,
        enabled: !!clientId
    });

    const isLoading = isLoadingStrat || isLoadingMarket;

    const [formData, setFormData] = useState<any>({
        business_name: '',
        industry: '',
        website_url: '',
        competitor_urls: '',
        location: '',
        business_age: JSON.stringify({ category: 'Growing', years: 0, months: 0 }),
        services_json: '[]',
        digital_presence: '{}',
        ica_data: '{}',
        goals_json: '{}'
    });

    const [marketData, setMarketData] = useState<any>({});
    const [hasSaved, setHasSaved] = useState(false);

    // Auto-fill from selectedClient if drafting new strategy
    useEffect(() => {
        // Priority 1: Loading from a specific Version Snapshot (Archive View/Edit)
        // ONLY if it actually contains snapshot data
        if (initialData && (initialData.input_snapshot || initialData.input)) {
            const baseInput = initialData.input || (initialData.input_snapshot ? JSON.parse(initialData.input_snapshot) : {});
            setFormData((prev: any) => ({
                ...prev,
                ...baseInput,
                business_name: baseInput.business_name || strategyData?.client?.name || selectedClient?.name || prev.business_name,
                location: baseInput.location || strategyData?.client?.operating_country || selectedClient?.operating_country || prev.location,
                industry: baseInput.industry || strategyData?.client?.industry || selectedClient?.industry || prev.industry
            }));
            
            if (initialData.output && currentStep === 1) {
                setCurrentStep(7);
            }
            return;
        }

        // Priority 2: Loading from previously saved WIP inputs (The "Live" draft)
        if (strategyData?.input) {
            setFormData((prev: any) => ({
                ...prev,
                ...strategyData.input
            }));
            // If we have saved input but are on step 1, maybe they want to continue?
            // (Optional: can add logic to jump to last step)
        }

        // Priority 3: Fresh start using Client/Prospect details
        const clientRef = strategyData?.client || selectedClient;
        if (clientRef) {
            setFormData((prev: any) => ({
                ...prev,
                business_name: prev.business_name || clientRef.name || '',
                location: prev.location || clientRef.operating_country || '',
                industry: prev.industry || clientRef.industry || '',
            }));
        }
    }, [initialData, strategyData, selectedClient]);

    useEffect(() => {
        if (globalMarketData?.marketInput) {
            setMarketData(globalMarketData.marketInput);
        }
    }, [globalMarketData]);

    // Fetch existing Master for progressive saving
    useEffect(() => {
        if (isDeveloperAdmin && clientId) {
            api.get(`/marketing/strategy/data/masters?clientId=${clientId}`).then(res => {
                if (res.data && res.data.length > 0) {
                    setActiveMasterId(res.data[0].id);
                }
            });
        }
    }, [clientId, isDeveloperAdmin]);

    const handleProgressiveSave = async (stepId: number, data: any) => {
        if (!isDeveloperAdmin) return;
        
        let mId = activeMasterId;
        if (!mId) {
            const res = await api.post('/marketing/strategy/data/master', {
                clientId,
                strategy_name: formData.business_name || 'Wizard Progress',
                status: 'Draft'
            });
            mId = res.data.id;
            setActiveMasterId(mId);
        }

        const sectionName = STEPS.find(s => s.id === stepId)?.label.toUpperCase().replace(/\s+/g, '_') || `STEP_${stepId}`;
        await api.post('/marketing/strategy/data/save-section', {
            masterId: mId,
            sectionName,
            data
        });
    };

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            return (await api.post(`/marketing/strategy/${clientId}/inputs`, data)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strategy', clientId] });
        }
    });

    const saveMarketMutation = useMutation({
        mutationFn: async (data: any) => {
            return (await api.post(`/marketing/strategy/${clientId}/market`, data)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strategy-market', clientId] });
        }
    });

    const handleNext = async () => {
        if (currentStep < 6) {
            if (currentStep === 3) {
                await saveMarketMutation.mutateAsync(marketData);
                handleProgressiveSave(3, marketData);
            } else {
                await saveMutation.mutateAsync(formData);
                let stepData = formData;
                // Extract relevant section data
                if (currentStep === 1) stepData = { ...formData };
                if (currentStep === 2) stepData = JSON.parse(formData.digital_presence || '{}');
                if (currentStep === 4) stepData = JSON.parse(formData.ica_data || '{}');
                if (currentStep === 5) stepData = JSON.parse(formData.goals_json || '{}');
                handleProgressiveSave(currentStep, stepData);
            }
            setCurrentStep((prev: number) => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep((prev: number) => prev - 1);
    };

    const handleStepClick = (targetStep: number) => {
        if (targetStep === currentStep) return;
        
        // Save current progress in the background before navigating away
        if (currentStep === 3) {
            saveMarketMutation.mutate(marketData);
        } else if (currentStep <= 6) {
            saveMutation.mutate(formData);
        }
        
        setCurrentStep(targetStep);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 size={40} className="animate-spin text-indigo-600" />
                <p className="text-gray-500 font-bold">Loading Strategy Engine...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[98%] mx-auto py-8 px-2 md:px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Wizard Header */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4">
                    {STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        
                        return (
                            <React.Fragment key={step.id}>
                                <div 
                                    className="flex flex-col items-center group relative min-w-[100px] cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleStepClick(step.id)}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                        isActive ? 'bg-[#2c185a] text-white shadow-xl scale-110' : 
                                        isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        {isCompleted ? <CheckCircle2 size={24} /> : <Icon size={24} />}
                                    </div>
                                    <span className={`text-[10px] uppercase tracking-wider font-black mt-3 ${
                                        isActive ? 'text-[#2c185a]' : isCompleted ? 'text-green-600' : 'text-gray-400'
                                    }`}>
                                        {step.label}
                                    </span>
                                    {isActive && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full animate-ping" />
                                    )}
                                    {step.id === 7 && !hasSaved && !initialData && (
                                        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
                                    )}
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className={`h-[2px] flex-1 min-w-[20px] mx-4 self-center mt-[-20px] transition-colors duration-500 ${
                                        isCompleted ? 'bg-green-200' : 'bg-gray-100'
                                    }`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                <div className="text-center">
                    <h2 className="text-3xl font-black text-gray-900 flex items-center justify-center gap-3">
                        {currentStep === 7 ? <Sparkles className="text-yellow-500" /> : null}
                        {STEPS.find(s => s.id === currentStep)?.label}
                    </h2>
                    <p className="text-gray-500 font-medium mt-2">
                        {currentStep === 1 && "Start by identifying the core business details."}
                        {currentStep === 2 && "Analyze current digital footprints and assets."}
                        {currentStep === 3 && "Establish market positioning, demand, and competitor insights."}
                        {currentStep === 4 && "Deep dive into who the ideal customer is."}
                        {currentStep === 5 && "Define targets and timeline for the strategy."}
                        {currentStep === 6 && "Review and trigger the AI generation engine."}
                        {currentStep === 7 && "Your data-driven marketing strategy is ready."}
                        {currentStep === 8 && "Generate and download strategy documents and reports."}
                    </p>
                </div>
            </div>

            {/* Step Content */}
            <Card className="border-none shadow-2xl shadow-indigo-100/50 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm border border-white">
                <CardContent className="p-8">
                    {currentStep === 1 && <Step1PrimaryData formData={formData} setFormData={setFormData} />}
                    {currentStep === 2 && <Step2DigitalPresence formData={formData} setFormData={setFormData} />}
                    {currentStep === 3 && <Step3MarketData marketData={marketData} setMarketData={setMarketData} clientId={clientId} />}
                    {currentStep === 4 && <Step3CustomerAvatar formData={formData} setFormData={setFormData} clientId={clientId} />}
                    {currentStep === 5 && <Step4GoalSetting formData={formData} setFormData={setFormData} clientId={clientId} />}
                    {currentStep === 6 && <Step5Processing clientId={clientId} formData={formData} onComplete={() => setCurrentStep(7)} />}
                    {currentStep === 7 && (
                        <StrategyDashboard 
                            strategy={initialData || strategyData} 
                            onReset={() => setCurrentStep(1)} 
                            onSaveSuccess={() => {
                                setHasSaved(true);
                                if (onSaveSuccess) onSaveSuccess();
                            }}
                            isSaved={hasSaved || !!initialData}
                        />
                    )}
                    {currentStep === 8 && <Step8DocsReports clientId={clientId} strategyData={strategyData} marketData={globalMarketData} />}
                </CardContent>
            </Card>

            {/* Navigation Buttons */}
            {currentStep < 7 && (
                <div className="mt-8 flex justify-between items-center bg-white/50 p-4 rounded-2xl backdrop-blur-sm">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentStep === 1 || saveMutation.isPending || saveMarketMutation.isPending}
                        className="rounded-xl px-10 h-14 font-bold text-gray-400 hover:text-[#2c185a] hover:bg-white"
                    >
                        <ChevronLeft className="mr-2" /> Back
                    </Button>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (currentStep === 3) saveMarketMutation.mutate(marketData);
                                else saveMutation.mutate(formData);
                                Swal.fire({
                                    title: 'Saved!',
                                    text: 'Progress has been saved successfully.',
                                    icon: 'success',
                                    timer: 1500,
                                    showConfirmButton: false,
                                    position: 'top-end',
                                    toast: true
                                });
                            }}
                            disabled={saveMutation.isPending || saveMarketMutation.isPending}
                            className="rounded-xl px-8 h-14 font-bold border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                        >
                            {(saveMutation.isPending || saveMarketMutation.isPending) ? <Loader2 size={20} className="animate-spin mr-2" /> : <Save size={20} className="mr-2" />}
                            Save Progress
                        </Button>
                        <Button
                            onClick={handleNext}
                            disabled={saveMutation.isPending || saveMarketMutation.isPending}
                            className="bg-[#2c185a] hover:bg-[#1a0f35] text-white rounded-xl px-12 h-14 font-bold shadow-xl shadow-indigo-200"
                        >
                            {(saveMutation.isPending || saveMarketMutation.isPending) ? (
                                <Loader2 size={20} className="animate-spin mr-2" />
                            ) : (
                                <>Next <ChevronRight className="ml-2" /></>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrategyWizard;
