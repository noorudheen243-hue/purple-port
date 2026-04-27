import React, { useState, useMemo } from 'react';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';
import { Switch } from '../../../components/ui/switch';
import { Button } from '../../../components/ui/button';
import { ChevronDown, ChevronUp, Target, BarChart, Crosshair, TrendingUp, Sparkles } from 'lucide-react';
import api from '../../../lib/api';
import Swal from 'sweetalert2';
import InfoTooltip from '../../../components/ui/InfoTooltip';

const FIELD_DESCRIPTIONS = {
    problem_solved: "The specific pain point or friction your customer faces that your service eliminates.",
    usp: "What makes you fundamentally different and better than the closest alternative?",
    customer_transformation: "The emotional and functional journey from the 'Before' state to the 'After' state.",
    brand_category: "Your market positioning strategy, from mass-market affordability to elite premium services.",
    avg_cpl: "Average Cost Per Lead in your industry (how much it costs to get one inquiry).",
    conversion_rate: "Percentage of leads that turn into paying customers or target actions.",
    cac: "Maximum Customer Acquisition Cost you are willing to pay for a new client.",
    ltv: "Lifetime Value of a customer (total revenue expected over their relationship with you).",
    seasonality: "When demand peaks during the year and how long the decision cycle takes.",
    top_competitors: "The specific companies your target audience is most likely to compare you with.",
    weaknesses: "Gaps in their service, pricing, or customer experience that you can exploit.",
    trend: "Whether the total demand for your category is growing, shrinking, or remains flat.",
    product_nature: "Is your product a basic necessity, a luxury/desire, or something required by law?",
    awareness_level: "How much the customer already knows about their problem and your potential solution."
};

interface Step3Props {
    marketData: any;
    setMarketData: (data: any) => void;
    clientId: string;
}

const Step3MarketData: React.FC<Step3Props> = ({ marketData, setMarketData, clientId }) => {
    const [expanded, setExpanded] = useState<string | null>('BUSINESS_POSITIONING');
    const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});

    const positioning = useMemo(() => {
        try { return JSON.parse(marketData?.positioning?.data_json || '{}'); } catch { return {}; }
    }, [marketData]);

    const benchmarks = useMemo(() => {
        try { return JSON.parse(marketData?.industry_benchmarks || '{}'); } catch { return {}; }
    }, [marketData]);

    const competitor = useMemo(() => {
        try { return JSON.parse(marketData?.competitor?.data_json || '{}'); } catch { return {}; }
    }, [marketData]);

    const demand = useMemo(() => {
        try { return JSON.parse(marketData?.demand?.data_json || '{}'); } catch { return {}; }
    }, [marketData]);

    const updateSection = (sectionName: string, field: string, value: any) => {
        const newData = { ...marketData };
        if (sectionName === 'industry_benchmarks') {
            const current = { ...benchmarks, [field]: value };
            newData.industry_benchmarks = JSON.stringify(current);
        } else {
            const currentObj = newData[sectionName] ? JSON.parse(newData[sectionName].data_json || '{}') : {};
            newData[sectionName] = { data_json: JSON.stringify({ ...currentObj, [field]: value }) };
        }
        setMarketData(newData);
    };

    const handleAutoSuggest = async () => {
        setIsGenerating({ GLOBAL: true });
        try {
            const response = await api.post(`/marketing/strategy/${clientId}/auto-suggest`, { step: 'MARKET' });
            const s = response.data.suggestion;
            
            if (!s) throw new Error("No suggestion returned from server");

            setMarketData({
                ...marketData,
                industry_benchmarks: JSON.stringify(s.industry_benchmarks || {}),
                positioning: { data_json: JSON.stringify(s.positioning || {}) },
                competitor: { data_json: JSON.stringify(s.competitor || {}) },
                demand: { data_json: JSON.stringify(s.demand || {}) }
            });

            Swal.fire({ title: 'AI Insights Applied', text: 'Market positioning and industry benchmarks have been updated based on available research.', icon: 'success', timer: 2500, showConfirmButton: false });
        } catch (error) {
            Swal.fire('Error', 'Failed to generate AI suggestions. Please try again.', 'error');
        } finally { setIsGenerating({}); }
    };

    const renderSectionHeader = (id: string, title: string, icon: any, isActive: boolean) => {
        const isExpanded = expanded === id;
        return (
            <div 
                className="p-6 flex flex-col md:flex-row md:items-center justify-between cursor-pointer border-b border-gray-100"
                onClick={() => setExpanded(isExpanded ? null : id)}
            >
                <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isActive ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-gray-100 text-gray-400'}`}>
                        {React.createElement(icon, { size: 24 })}
                    </div>
                    <div>
                        <h4 className={`text-md font-black flex items-center gap-3 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                            {title}
                            <InfoTooltip content={`Strategic analysis for ${title}. ${isActive ? 'Data is present.' : 'No data yet.'}`} />
                            {isActive && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                        </h4>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-[0.2em] mt-1">{id.replace('_', ' ')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0" onClick={e => e.stopPropagation()}>
                    <div className="text-gray-400">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-indigo-900 text-sm font-medium">
                <strong>Market Understanding:</strong> This data provides the AI with essential context about your business environment before calculating strategies.
            </div>

            {/* SECTION 1: BUSINESS POSITIONING */}
            <div className={`border rounded-2xl transition-all duration-300 relative ${expanded === 'BUSINESS_POSITIONING' ? 'z-10 shadow-lg ring-1 ring-indigo-100 bg-white' : 'z-0 border-gray-100 bg-gray-50/50'}`}>
                {renderSectionHeader('BUSINESS_POSITIONING', 'Business Positioning', Target, Object.keys(positioning).length > 0)}
                {expanded === 'BUSINESS_POSITIONING' && (
                    <div className="p-6 pt-4 space-y-6 animate-in slide-in-from-top-2 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-gray-500 flex items-center">
                                    Problem Solved (Specific)
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.problem_solved} />
                                </Label>
                                <Textarea 
                                    placeholder="What acute problem do you solve?"
                                    value={positioning.problem_solved || ''} 
                                    onChange={e => updateSection('positioning', 'problem_solved', e.target.value)} 
                                    className="min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-gray-500 flex items-center">
                                    Unique Selling Proposition (USP)
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.usp} />
                                </Label>
                                <Textarea 
                                    placeholder="Why should they choose you over competitors?"
                                    value={positioning.usp || ''} 
                                    onChange={e => updateSection('positioning', 'usp', e.target.value)} 
                                    className="min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-gray-500 flex items-center">
                                    Customer Transformation
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.customer_transformation} />
                                </Label>
                                <Input 
                                    placeholder="From [Before State] to [After State]"
                                    value={positioning.customer_transformation || ''} 
                                    onChange={e => updateSection('positioning', 'customer_transformation', e.target.value)} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-gray-500 flex items-center">
                                    Brand Category
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.brand_category} />
                                </Label>
                                <select 
                                    className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-500" 
                                    value={positioning.brand_category || ''} 
                                    onChange={e => updateSection('positioning', 'brand_category', e.target.value)}
                                >
                                    <option value="">Select...</option>
                                    <option value="Premium / Luxury">Premium / Luxury</option>
                                    <option value="Affordable / Value">Affordable / Value</option>
                                    <option value="Niche / Specialized">Niche / Specialized</option>
                                    <option value="Mass Market">Mass Market</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SECTION 2: INDUSTRY BENCHMARKS */}
            <div className={`border rounded-2xl transition-all duration-300 relative ${expanded === 'INDUSTRY_BENCHMARKS' ? 'z-10 shadow-lg ring-1 ring-indigo-100 bg-white' : 'z-0 border-gray-100 bg-gray-50/50'}`}>
                {renderSectionHeader('INDUSTRY_BENCHMARKS', 'Industry Benchmarks', BarChart, Object.keys(benchmarks).length > 0)}
                {expanded === 'INDUSTRY_BENCHMARKS' && (
                    <div className="p-6 pt-4 space-y-6 animate-in slide-in-from-top-2 duration-500">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-500 flex items-center">
                                    Avg. CPL
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.avg_cpl} />
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                                    <Input 
                                        placeholder="200" 
                                        className="pl-7"
                                        value={benchmarks.avg_cpl || ''} 
                                        onChange={e => updateSection('industry_benchmarks', 'avg_cpl', e.target.value)} 
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-500 flex items-center">
                                    Conversion Rate
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.conversion_rate} />
                                </Label>
                                <div className="relative">
                                    <Input 
                                        placeholder="3" 
                                        className="pr-7"
                                        value={benchmarks.conversion_rate || ''} 
                                        onChange={e => updateSection('industry_benchmarks', 'conversion_rate', e.target.value)} 
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">%</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-500 flex items-center">
                                    Target CAC
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.cac} />
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                                    <Input 
                                        placeholder="2000" 
                                        className="pl-7"
                                        value={benchmarks.cac || ''} 
                                        onChange={e => updateSection('industry_benchmarks', 'cac', e.target.value)} 
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-500 flex items-center">
                                    Customer LTV
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.ltv} />
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                                    <Input 
                                        placeholder="50000" 
                                        className="pl-7"
                                        value={benchmarks.ltv || ''} 
                                        onChange={e => updateSection('industry_benchmarks', 'ltv', e.target.value)} 
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-gray-500 flex items-center">
                                    Seasonality / Sales Cycle
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.seasonality} />
                                </Label>
                                <Input 
                                    placeholder="e.g. Q4 Peak, 30-day decision cycle"
                                    value={benchmarks.seasonality || ''} 
                                    onChange={e => updateSection('industry_benchmarks', 'seasonality', e.target.value)} 
                                />
                        </div>
                    </div>
                )}
            </div>

            {/* SECTION 3: COMPETITOR INTELLIGENCE */}
            <div className={`border rounded-2xl transition-all duration-300 relative ${expanded === 'COMPETITOR_INTELLIGENCE' ? 'z-10 shadow-lg ring-1 ring-indigo-100 bg-white' : 'z-0 border-gray-100 bg-gray-50/50'}`}>
                {renderSectionHeader('COMPETITOR_INTELLIGENCE', 'Competitor Intelligence', Crosshair, Object.keys(competitor).length > 0)}
                {expanded === 'COMPETITOR_INTELLIGENCE' && (
                    <div className="p-6 pt-4 space-y-6 animate-in slide-in-from-top-2 duration-500">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-gray-500 flex items-center">
                                    Top Direct Competitors
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.top_competitors} />
                                </Label>
                                <Textarea 
                                    placeholder="Names / URLs"
                                    value={competitor.top_competitors || ''} 
                                    onChange={e => updateSection('competitor', 'top_competitors', e.target.value)} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-gray-500 flex items-center">
                                    Competitors' Weaknesses
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.weaknesses} />
                                </Label>
                                <Textarea 
                                    placeholder="What do they fail at?"
                                    value={competitor.weaknesses || ''} 
                                    onChange={e => updateSection('competitor', 'weaknesses', e.target.value)} 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SECTION 4: DEMAND ANALYSIS */}
            <div className={`border rounded-2xl transition-all duration-300 relative ${expanded === 'DEMAND_ANALYSIS' ? 'z-10 shadow-lg ring-1 ring-indigo-100 bg-white' : 'z-0 border-gray-100 bg-gray-50/50'}`}>
                {renderSectionHeader('DEMAND_ANALYSIS', 'Demand Analysis', TrendingUp, Object.keys(demand).length > 0)}
                {expanded === 'DEMAND_ANALYSIS' && (
                    <div className="p-6 pt-4 space-y-6 animate-in slide-in-from-top-2 duration-500">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-gray-500 flex items-center">
                                    Trend Direction
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.trend} />
                                </Label>
                                <select 
                                    className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-500" 
                                    value={demand.trend || ''} 
                                    onChange={e => updateSection('demand', 'trend', e.target.value)}
                                >
                                    <option value="">Select...</option>
                                    <option value="Growing Rapidly">Growing Rapidly</option>
                                    <option value="Stable / Flat">Stable / Flat</option>
                                    <option value="Declining">Declining</option>
                                    <option value="Highly Volatile">Highly Volatile</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-gray-500 flex items-center">
                                    Product Nature
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.product_nature} />
                                </Label>
                                <select 
                                    className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-500" 
                                    value={demand.product_nature || ''} 
                                    onChange={e => updateSection('demand', 'product_nature', e.target.value)}
                                >
                                    <option value="">Select...</option>
                                    <option value="Essential Need">Essential Need</option>
                                    <option value="Discretionary Desire">Discretionary Desire</option>
                                    <option value="Regulatory / Forced">Regulatory / Forced</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-gray-500 flex items-center">
                                    Target Awareness
                                    <InfoTooltip content={FIELD_DESCRIPTIONS.awareness_level} />
                                </Label>
                                <select 
                                    className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-500" 
                                    value={demand.awareness_level || ''} 
                                    onChange={e => updateSection('demand', 'awareness_level', e.target.value)}
                                >
                                    <option value="">Select...</option>
                                    <option value="Problem Aware">Problem Aware</option>
                                    <option value="Solution Aware">Solution Aware</option>
                                    <option value="Product Aware">Product Aware</option>
                                    <option value="Unaware">Unaware (Education needed)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Step3MarketData;
