import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Checkbox } from '../../../components/ui/checkbox';
import { Switch } from '../../../components/ui/switch';
import { 
    Save, 
    FileDown, 
    ChevronDown, 
    ChevronUp, 
    Sparkles, 
    Loader2, 
    CheckCircle2, 
    X,
    LayoutDashboard,
    Compass,
    Globe,
    TrendingUp,
    Users,
    Target
} from 'lucide-react';
import api from '../../../lib/api';
import Swal from 'sweetalert2';
import Step1PrimaryData from './Step1PrimaryData';
import Step2DigitalPresence from './Step2DigitalPresence';
import Step3MarketData from './Step3MarketData';
import Step3CustomerAvatar from './Step3CustomerAvatar';
import Step4GoalSetting from './Step4GoalSetting';
import { exportDataSheetToPDF, exportStrategyTemplateDOCX, exportDataSheetToDOCX } from '../../../utils/strategyExport';
import { FileText } from 'lucide-react';

interface DataSheetFormProps {
    clientId: string;
    masterId?: string;
    onClose: () => void;
    onSaveSuccess?: (masterId: string) => void;
}

const DataSheetForm: React.FC<DataSheetFormProps> = ({ clientId, masterId: initialMasterId, onClose, onSaveSuccess }) => {
    const [masterId, setMasterId] = useState<string | undefined>(initialMasterId);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

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

    // Load data if masterId is provided
    useEffect(() => {
        if (masterId) {
            loadData(masterId);
        }
    }, [masterId]);

    const loadData = async (id: string) => {
        setIsLoading(true);
        try {
            const res = await api.get(`/marketing/strategy/data/${id}`);
            const data = res.data;
            const sections = data.parsedSections || {};
            
            setFormData({
                business_name: data.strategy_name || '',
                industry: sections.PRIMARY_DATA?.industry || '',
                website_url: sections.DIGITAL_PRESENCE?.website_url || '',
                competitor_urls: sections.PRIMARY_DATA?.competitor_urls || '',
                location: sections.PRIMARY_DATA?.location || '',
                business_age: sections.PRIMARY_DATA?.business_age || JSON.stringify({ category: 'Growing', years: 0, months: 0 }),
                services_json: sections.PRIMARY_DATA?.services_json || '[]',
                digital_presence: JSON.stringify(sections.DIGITAL_PRESENCE || {}),
                ica_data: JSON.stringify(sections.ICA || {}),
                goals_json: JSON.stringify(sections.GOALS || {})
            });

            setMarketData(sections.MARKET || {});
        } catch (error) {
            Swal.fire('Error', 'Failed to load strategy data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoSave = async (sectionName: string, data: any) => {
        if (!masterId) {
            // First save: Create Master
            try {
                const res = await api.post('/marketing/strategy/data/master', {
                    clientId,
                    strategy_name: formData.business_name || 'Untitled Strategy',
                    status: 'Draft'
                });
                setMasterId(res.data.id);
                // After creating master, save the section
                await api.post('/marketing/strategy/data/save-section', {
                    masterId: res.data.id,
                    sectionName,
                    data
                });
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        } else {
            try {
                await api.post('/marketing/strategy/data/save-section', {
                    masterId,
                    sectionName,
                    data
                });
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }
        setLastSaved(new Date());
    };

    const handleExportPDF = async () => {
        const fullData = {
            PRIMARY_DATA: {
                industry: formData.industry,
                location: formData.location,
                business_age: formData.business_age,
                services_json: formData.services_json,
                competitor_urls: formData.competitor_urls
            },
            DIGITAL_PRESENCE: JSON.parse(formData.digital_presence || '{}'),
            MARKET: marketData,
            ICA: JSON.parse(formData.ica_data || '{}'),
            GOALS: JSON.parse(formData.goals_json || '{}')
        };
        exportDataSheetToPDF(formData.business_name || 'Untitled Strategy', fullData);
    };

    const handleExportTemplate = async () => {
        await exportStrategyTemplateDOCX();
    };

    const handleExportWord = async () => {
        const fullData = {
            PRIMARY_DATA: {
                industry: formData.industry,
                location: formData.location,
                business_age: formData.business_age,
                services_json: formData.services_json,
                competitor_urls: formData.competitor_urls
            },
            DIGITAL_PRESENCE: JSON.parse(formData.digital_presence || '{}'),
            MARKET: marketData,
            ICA: JSON.parse(formData.ica_data || '{}'),
            GOALS: JSON.parse(formData.goals_json || '{}')
        };
        await exportDataSheetToDOCX(formData.business_name || 'Untitled Strategy', fullData);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4 h-full">
                <Loader2 size={40} className="animate-spin text-indigo-600" />
                <p className="text-gray-500 font-bold">Initializing Data Sheet...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50/50 rounded-3xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl">
                        <LayoutDashboard size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Unified Data Sheet</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                            {lastSaved ? `Last Saved: ${lastSaved.toLocaleTimeString()}` : 'All-in-One Strategic Entry'}
                            {lastSaved && <CheckCircle2 size={12} className="text-green-500" />}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={handleExportTemplate}
                        className="rounded-xl h-11 px-6 border-amber-100 text-amber-600 font-bold hover:bg-amber-50"
                    >
                        <FileText className="w-4 h-4 mr-2" /> Download Template
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleExportPDF}
                        className="rounded-xl h-11 px-6 border-indigo-100 text-indigo-600 font-bold"
                    >
                        <FileDown className="w-4 h-4 mr-2" /> PDF
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleExportWord}
                        className="rounded-xl h-11 px-6 border-blue-100 text-blue-600 font-bold hover:bg-blue-50"
                    >
                        <FileText className="w-4 h-4 mr-2" /> Word
                    </Button>
                    <Button 
                        onClick={onClose}
                        variant="ghost"
                        className="rounded-xl h-11 w-11 p-0 text-gray-400 hover:text-gray-600"
                    >
                        <X size={24} />
                    </Button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
                
                {/* Section 1: Primary Data */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-indigo-100 pb-4">
                        <Compass className="text-indigo-600" size={24} />
                        <h3 className="text-lg font-black text-indigo-900 uppercase tracking-tight">01. Primary Business Data</h3>
                    </div>
                    <Step1PrimaryData 
                        formData={formData} 
                        setFormData={(newData: any) => {
                            setFormData(newData);
                            handleAutoSave('PRIMARY_DATA', {
                                industry: newData.industry,
                                location: newData.location,
                                business_age: newData.business_age,
                                services_json: newData.services_json,
                                competitor_urls: newData.competitor_urls
                            });
                        }} 
                    />
                </div>

                {/* Section 2: Digital Presence */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-indigo-100 pb-4">
                        <Globe className="text-indigo-600" size={24} />
                        <h3 className="text-lg font-black text-indigo-900 uppercase tracking-tight">02. Digital Presence & Audit</h3>
                    </div>
                    <Step2DigitalPresence 
                        formData={formData} 
                        setFormData={(newData: any) => {
                            setFormData(newData);
                            handleAutoSave('DIGITAL_PRESENCE', JSON.parse(newData.digital_presence || '{}'));
                        }} 
                    />
                </div>

                {/* Section 3: Market Intelligence */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-indigo-100 pb-4">
                        <TrendingUp className="text-indigo-600" size={24} />
                        <h3 className="text-lg font-black text-indigo-900 uppercase tracking-tight">03. Market Intelligence</h3>
                    </div>
                    <Step3MarketData 
                        marketData={marketData} 
                        setMarketData={(newData: any) => {
                            setMarketData(newData);
                            handleAutoSave('MARKET', newData);
                        }} 
                        clientId={clientId} 
                    />
                </div>

                {/* Section 4: Ideal Customer Avatar */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-indigo-100 pb-4">
                        <Users className="text-indigo-600" size={24} />
                        <h3 className="text-lg font-black text-indigo-900 uppercase tracking-tight">04. Ideal Customer Avatar (ICA)</h3>
                    </div>
                    <Step3CustomerAvatar 
                        formData={formData} 
                        setFormData={(newData: any) => {
                            setFormData(newData);
                            handleAutoSave('ICA', JSON.parse(newData.ica_data || '{}'));
                        }} 
                        clientId={clientId} 
                    />
                </div>

                {/* Section 5: Strategic Goals */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-indigo-100 pb-4">
                        <Target className="text-indigo-600" size={24} />
                        <h3 className="text-lg font-black text-indigo-900 uppercase tracking-tight">05. Strategic Goals & KPIs</h3>
                    </div>
                    <Step4GoalSetting 
                        formData={formData} 
                        setFormData={(newData: any) => {
                            setFormData(newData);
                            handleAutoSave('GOALS', JSON.parse(newData.goals_json || '{}'));
                        }} 
                        clientId={clientId} 
                    />
                </div>

                <div className="pt-10 border-t border-gray-100 flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                        <Sparkles size={40} />
                    </div>
                    <h4 className="text-xl font-black text-gray-900">All data is progressively saved</h4>
                    <p className="text-gray-500 text-center max-w-md font-medium">
                        You can close this form anytime. Your progress is stored in the Data Centre and can be used to generate a full strategy whenever you're ready.
                    </p>
                    <Button 
                        onClick={onClose}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-10 h-12 font-bold shadow-lg shadow-indigo-100 mt-4"
                    >
                        Finish and Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DataSheetForm;
