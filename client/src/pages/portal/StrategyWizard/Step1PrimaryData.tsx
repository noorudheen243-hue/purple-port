import React from 'react';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';

interface Step1Props {
    formData: any;
    setFormData: (data: any) => void;
}

const INDUSTRIES = [
    "Real Estate", "E-commerce", "Healthcare", "Education", "Technology", 
    "Hospitality", "Finance", "D2C Brand", "B2B SaaS", "Manufacturing",
    "Digital Marketing Agency", "Retail", "Automotive", "Logistics", "Other"
];

const SERVICES = [
    { id: 'meta', label: 'Meta Ads' },
    { id: 'google', label: 'Google Ads' },
    { id: 'seo', label: 'SEO' },
    { id: 'web', label: 'Website' },
    { id: 'content', label: 'Content Management' }
];

const Step1PrimaryData: React.FC<Step1Props> = ({ formData, setFormData }) => {
    const [isCustom, setIsCustom] = React.useState(!INDUSTRIES.includes(formData.industry) && formData.industry !== "");
    const ageData = React.useMemo(() => {
        try {
            return JSON.parse(formData.business_age || '{}');
        } catch {
            return { category: 'Growing', years: 0, months: 0 };
        }
    }, [formData.business_age]);

    const servicesData = React.useMemo(() => {
        try {
            return JSON.parse(formData.services_json || '[]');
        } catch {
            return [];
        }
    }, [formData.services_json]);

    const updateAge = (key: string, value: any) => {
        const newData = { ...ageData, [key]: value };
        setFormData({ ...formData, business_age: JSON.stringify(newData) });
    };

    const toggleService = (serviceId: string) => {
        let newServices = [...servicesData];
        if (newServices.includes(serviceId)) {
            newServices = newServices.filter(id => id !== serviceId);
        } else {
            newServices.push(serviceId);
        }
        setFormData({ ...formData, services_json: JSON.stringify(newServices) });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-[#2c185a]">Strategy Name / Client Name</Label>
                    <Input 
                        placeholder="Enter Name..." 
                        value={formData.business_name || ''} 
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        className="h-12 rounded-xl bg-indigo-50/30 border-indigo-100 focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-[#2c185a]">Industry</Label>
                    {!isCustom ? (
                        <select 
                            className="flex h-12 w-full rounded-xl border border-indigo-100 bg-indigo-50/30 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                            value={formData.industry || ''}
                            onChange={(e) => {
                                if (e.target.value === 'Other') {
                                    setIsCustom(true);
                                    setFormData({ ...formData, industry: '' });
                                } else {
                                    setFormData({ ...formData, industry: e.target.value });
                                }
                            }}
                        >
                            <option value="">Select Industry...</option>
                            {INDUSTRIES.filter(i => i !== 'Other').map(ind => <option key={ind} value={ind}>{ind}</option>)}
                            <option value="Other">Other (Specify...)</option>
                        </select>
                    ) : (
                        <div className="relative">
                            <Input 
                                placeholder="Enter custom industry name..." 
                                value={formData.industry || ''} 
                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                className="h-12 rounded-xl bg-indigo-50/30 border-indigo-100 focus:ring-2 focus:ring-indigo-500 pr-24"
                                autoFocus
                            />
                            <button 
                                onClick={() => {
                                    setIsCustom(false);
                                    setFormData({ ...formData, industry: '' });
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Back to List
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-[#2c185a]">Location (Country)</Label>
                <Input 
                    placeholder="e.g. India, UAE, USA" 
                    value={formData.location || ''} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="h-12 rounded-xl bg-indigo-50/30 border-indigo-100 focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            <div className="space-y-4 pt-2 border-t border-gray-50">
                <Label className="text-xs font-black uppercase tracking-widest text-[#2c185a]">Business Age Category</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <select 
                            className="flex h-12 w-full rounded-xl border border-indigo-100 bg-indigo-50/30 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                            value={ageData.category || 'Growing'}
                            onChange={(e) => updateAge('category', e.target.value)}
                        >
                            <option value="New">New (0–6 months)</option>
                            <option value="Growing">Growing</option>
                            <option value="Established">Established</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-1">
                            <Label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Years</Label>
                            <Input 
                                type="number" 
                                value={ageData.years} 
                                onChange={(e) => updateAge('years', parseInt(e.target.value) || 0)}
                                className="h-10 rounded-lg bg-white border-gray-100"
                            />
                        </div>
                        <div className="flex-1 space-y-1">
                            <Label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Months</Label>
                            <Input 
                                type="number" 
                                value={ageData.months} 
                                onChange={(e) => updateAge('months', parseInt(e.target.value) || 0)}
                                className="h-10 rounded-lg bg-white border-gray-100"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
                <Label className="text-xs font-black uppercase tracking-widest text-[#2c185a]">Services Required</Label>
                <div className="flex flex-wrap gap-6 p-4 bg-indigo-50/20 rounded-2xl border border-indigo-50/50">
                    {SERVICES.map((service) => (
                        <label key={service.id} className="flex items-center space-x-2 cursor-pointer">
                            <Checkbox 
                                checked={servicesData.includes(service.id)}
                                onCheckedChange={() => toggleService(service.id)}
                            />
                            <span className="text-sm font-bold text-gray-700">
                                {service.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Step1PrimaryData;
