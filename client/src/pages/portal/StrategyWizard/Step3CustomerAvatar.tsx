import React, { useState, useMemo, useEffect } from 'react';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';
import { Switch } from '../../../components/ui/switch';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import { Badge } from '../../../components/ui/badge';
import { 
    ChevronDown, ChevronUp, User, Users, Brain, Heart, 
    AlertCircle, ShoppingCart, Globe, Eye, Search, X, MapPin,
    Target, Zap, Stethoscope, Plus, Pencil, Trash2, Award, 
    LayoutDashboard, UserCheck, Sparkles, Loader2
} from 'lucide-react';
import api from '../../../lib/api';
import Swal from 'sweetalert2';
import InfoTooltip from '../../../components/ui/InfoTooltip';

const ICA_DESCRIPTIONS = {
    IDEAL_CUSTOMER_PROFILE: "A summarized visualization of your target customer based on all data points entered below.",
    DEMOGRAPHICS: "Statistical data including age, gender, location, and profession that defines your core audience.",
    PSYCHOGRAPHICS: "Deep psychological traits like interests, values, and lifestyle choices that drive buying decisions.",
    PAIN_POINTS: "The specific problems and frustrations that your customers are trying to solve.",
    OBJECTIONS: "The common hesitations or reasons why a customer might not choose your service.",
    BUYING_BEHAVIOUR: "How and why your customers buy, including their decision cycle and research habits.",
    DIGITAL_BEHAVIOUR: "The platforms, apps, and online habits that define where your customers spend their time.",
    AWARENESS_LEVEL: "The customer's current understanding of their problem and your potential solution."
};

const FIELD_DESCRIPTIONS = {
    age_range: "The typical age bracket of your ideal customer (e.g., 25-45).",
    gender: "Whether your audience leans towards a specific gender or is universal.",
    locations: "The geographical areas where your customers live and operate.",
    occupations: "The professional backgrounds or job roles of your target audience.",
    education: "The highest level of education typically achieved by your customer.",
    income: "The estimated annual income bracket of your target segment.",
    interests: "Topics and activities your customers are naturally drawn to.",
    values: "The core principles and ethical standards your customers hold dear.",
    lifestyle: "The daily habits and social status that define your customer's day-to-day life.",
    personality: "Inherent traits like 'Analytical' or 'Adventurous' that affect communication style.",
    beliefs: "Strongly held views about your industry or products (e.g., 'Quality over Price').",
    points: "What keeps your customer up at night? The friction they need to remove.",
    objections: "Internal or external barriers like 'Too expensive' or 'Tried it before'.",
    patterns: "Purchasing habits like 'Impulse buyer' vs 'Intensive research driven'.",
    habits: "Favorite social networks, devices, and online media consumption patterns.",
    level: "Where they are in the journey: Unaware -> Most Aware."
};

interface Step3Props {
    formData: any;
    setFormData: (data: any) => void;
    clientId: string;
}

const OCCUPATIONS = [
    "All Profiles (Any Profession)",
    "C-Suite / Executive", "Small Business Owner", "Freelancer / Solopreneur",
    "IT / Tech Professional", "Marketing / PR Professional", "Sales / BD Manager",
    "Doctor / Healthcare", "Nurse / Medical Staff", "Medical Researcher",
    "Engineer / Architect", "Educator / Teacher",
    "Student", "Retired", "Home-maker", "Real Estate Agent", "Legal Professional",
    "Finance / Accounting", "Construction / Trades", "Creative / Artist",
    "Hospitality / Tourism", "E-commerce Seller", "Logistics / Supply Chain",
    "Other"
];

const PSYCHOGRAPHIC_OPTIONS = {
    interests: [
        "Technology", "Fitness & Wellness", "Luxury Living", "Sustainability", "Finance & Investing", "Travel & Adventure", "Fashion & Beauty", "Home Improvement", "Gaming", "Education & Learning", "Business Networking", "Arts & Culture", "Outdoor Activities", "Personal Development", "Cooking & Foodie", "Pet Ownership",
        "Medical News & Research", "Holistic Healing", "Mental Health Awareness", "Biohacking", "Public Health", "Organic Nutrition", "Preventive Medicine"
    ],
    values: [
        "Innovation", "Freedom & Autonomy", "Security & Stability", "Family & Tradition", "Community & Belonging", "Achievement & Success", "Integrity & Ethics", "Adventure & Exploration", "Simplicity", "Diversity & Inclusion", "Environmental Protection", "Social Justice",
        "Longevity & Vitality", "Patient Privacy", "Scientific Evidence", "Compassion & Empathy", "Physical Well-being"
    ],
    lifestyle: [
        "Urban Professional", "Minimalist", "Family-Oriented", "Active & Athletic", "Digital Nomad / Remote", "Eco-conscious", "Luxury / High-End", "Career-Driven", "Creative & Artistic", "Suburban Family", "Rural / Off-grid",
        "Wellness-Focused", "Vegan / Plant-based", "Bio-hacker Lifestyle", "Caring / Caregiver", "Healthy Work-Life Balance", "Patient-Centric Life"
    ],
    personality_traits: [
        "Analytical", "Creative / Imaginative", "Introverted", "Extraverted", "Risk-taker", "Conscientious", "Adventurous", "Open-minded", "Empathetic", "Direct / Decisive", "Optimistic", "Skeptical",
        "Nurturing / Caring", "Patient & Resilient", "Scientific-minded", "Health-conscious", "Detail-oriented"
    ],
    attitudes_beliefs: [
        "Early Adopter of Tech", "Quality Over Quantity", "Price-Sensitive", "Brand Loyal", "Environmentally Aware", "Growth Mindset", "Traditionalist", "Experimenter", "Skeptical of Marketing", "Value-Driven Player", "Work-Life Balance Focused",
        "Preventive over Curative", "Trust in Medical Science", "Holistic Health Beliefs", "Data-driven Wellness", "Proactive Health Management"
    ]
};

const PAIN_POINTS_OPTIONS = [
    "High Marketing Costs", "Poor Lead Quality", "Low Brand Awareness", "Manual Data Entry / Busywork", "Technical Complexity", "Declining Organic Traffic", "High Customer Acquisition Cost (CAC)", "Complexity of Google/Meta Ads", "Lack of Strategy / 'Post & Pray'",
    "Patient No-shows (Healthcare)", "Regulatory / HIPAA Compliance (Healthcare)", "High Staff Turnover (Healthcare)", "Patient Trust Issues (Healthcare)", "Insurance Payout Delays (Healthcare)", "Outdated Medical Equipment", "Lack of Patient Feedback"
];

const OBJECTIONS_OPTIONS = [
    "It is too expensive", "I don't have the time", "I tried ads before and they didn't work", "We are already doing fine with referrals", "I don't understand how it works", "I am worried about my data privacy", "Content production is too hard", "Agency trust issues",
    "Advertising medical services legal risks (Healthcare)", "Patient data security concerns (Healthcare)", "Brand reputation risks", "Long-term commitment fear"
];

const BUYING_BEHAVIOUR_OPTIONS = [
    "Impulse Purchaser", "Intensive Research Driven", "Price-Sensitive Buyer", "High Value / ROI Focused", "Referral / Word-of-Mouth Dependent", "Review & Rating Reader", "Comparison Shopper (Seeks 3+ quotes)", "Long Decision Cycle (>1 month)", "Immediate Need / Urgent Buyer", "Brand-Driven (Prefers big names)",
    "Consultation-First (Healthcare)", "Insurance-Covered Only (Healthcare)", "Proximity-Based Choice (Healthcare)", "Appointment-Based Speed"
];

const DIGITAL_BEHAVIOUR_OPTIONS = [
    "Active on Instagram", "Professional Presence on LinkedIn", "Heavy Google Search User", "Video Content Consumer (YouTube/TikTok)", "Podcast Listener", "Newsletter Subscriber", "Online Community Member (Reddit/FB Groups)", "Webinar Attendee", "Desktop User (Work Hours)", "Mobile-First Browser (Evening/Weekend)",
    "Patient Portal User (Healthcare)", "Health App Enthusiast (Healthcare)", "Tele-medicine Adopter (Healthcare)"
];

const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
    "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
    "Denmark", "Djibouti", "Dominica", "Dominican Republic",
    "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
    "Fiji", "Finland", "France",
    "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Honduras", "Hungary",
    "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
    "Jamaica", "Japan", "Jordan",
    "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan",
    "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
    "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
    "Oman",
    "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar",
    "Romania", "Russia", "Rwanda",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
    "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
    "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
    "Yemen",
    "Zambia", "Zimbabwe"
];

const Step3CustomerAvatar: React.FC<Step3Props> = ({ formData, setFormData, clientId }) => {
    const [expanded, setExpanded] = useState<string | null>('IDEAL_CUSTOMER_PROFILE');
    const [isGenerating, setIsGenerating] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
    const [customItems, setCustomItems] = useState<Record<string, string[]>>({});

    const data = React.useMemo(() => {
        try {
            return JSON.parse(formData.ica_data || '{}');
        } catch {
            return {};
        }
    }, [formData.ica_data]);

    useEffect(() => {
        const newCustom: Record<string, string[]> = {};
        const scan = (segmentId: string, field: string, predefined: string[]) => {
            const selected = data[segmentId]?.data?.[field] || [];
            const custom = selected.filter((s: string) => !predefined.includes(s));
            if (custom.length > 0) newCustom[`${segmentId}_${field}`] = custom;
        };

        Object.entries(PSYCHOGRAPHIC_OPTIONS).forEach(([key, opts]) => scan('PSYCHOGRAPHICS', key, opts));
        scan('PAIN_POINTS', 'points', PAIN_POINTS_OPTIONS);
        scan('OBJECTIONS', 'items', OBJECTIONS_OPTIONS);
        scan('BUYING_BEHAVIOUR', 'patterns', BUYING_BEHAVIOUR_OPTIONS);
        scan('DIGITAL_BEHAVIOUR', 'habits', DIGITAL_BEHAVIOUR_OPTIONS);

        setCustomItems(newCustom);
    }, []);

    const updateSegment = (segmentId: string, segmentData: any) => {
        const newData = { ...data, [segmentId]: segmentData };
        setFormData({ ...formData, ica_data: JSON.stringify(newData) });
    };

    const toggleSegment = (segmentId: string) => {
        const segment = data[segmentId] || { enabled: false, data: {} };
        updateSegment(segmentId, { ...segment, enabled: !segment.enabled });
    };

    const renderSection = (id: string, title: string, icon: any, children: React.ReactNode, hideToggle = false) => {
        const segment = data[id] || { enabled: id === 'IDEAL_CUSTOMER_PROFILE' ? true : false, data: {} };
        const isExpanded = expanded === id || id === 'IDEAL_CUSTOMER_PROFILE';

        return (
            <div className={`border rounded-2xl transition-all duration-300 relative ${isExpanded ? 'z-10 shadow-lg ring-1 ring-indigo-100 bg-white' : 'z-0 border-gray-100 bg-gray-50/50'}`}>
                <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => id !== 'IDEAL_CUSTOMER_PROFILE' && setExpanded(isExpanded ? null : id)}>
                    <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${segment.enabled ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-gray-200 text-gray-400'}`}>
                            {React.createElement(icon, { size: 24 })}
                        </div>
                        <div>
                            <h4 className={`text-md font-black flex items-center gap-3 ${segment.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                                {title}
                                <InfoTooltip content={ICA_DESCRIPTIONS[id as keyof typeof ICA_DESCRIPTIONS] || "Strategic ICA segment."} />
                                {segment.enabled && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                            </h4>
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-[0.2em] mt-1">{id.replace('_', ' ')}</p>
                        </div>
                    </div>
                    {!hideToggle && (
                        <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2 mr-4">
                                <span className="text-[10px] font-black uppercase text-gray-400">Section {segment.enabled ? 'ON' : 'OFF'}</span>
                                <Switch checked={segment.enabled} onCheckedChange={() => toggleSegment(id)} />
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => setExpanded(isExpanded ? null : id)}
                            >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </Button>
                        </div>
                    )}
                </div>

                {isExpanded && (
                    <div className="p-6 pt-0 border-t border-gray-50 animate-in slide-in-from-top-2 duration-500">
                        {id !== 'IDEAL_CUSTOMER_PROFILE' && (
                            <div className="mb-6 pt-4">
                                <p className="text-xs text-gray-400 font-medium italic">Configure the underlying data to build your ideal customer profile dashboard.</p>
                            </div>
                        )}
                        {children}
                    </div>
                )}
            </div>
        );
    };

    const updateField = (segmentId: string, field: string, value: any) => {
        const segment = data[segmentId] || { enabled: true, data: {} };
        updateSegment(segmentId, {
            ...segment,
            data: { ...segment.data, [field]: value }
        });
    };

    const toggleMultiSelect = (segmentId: string, field: string, option: string) => {
        const segment = data[segmentId] || { enabled: true, data: {} };
        let currentOptions = Array.isArray(segment.data[field]) ? segment.data[field] : [];

        if (currentOptions.includes(option)) {
            currentOptions = currentOptions.filter((o: string) => o !== option);
        } else {
            currentOptions.push(option);
        }
        updateField(segmentId, field, currentOptions);
    };

    const handleAddCustomItem = async (segmentId: string, field: string) => {
        const { value: text } = await Swal.fire({
            title: 'Add Custom Item',
            input: 'text',
            inputLabel: 'Enter your custom item label',
            inputPlaceholder: 'Type here...',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            inputValidator: (value) => {
                if (!value) return 'You need to write something!';
                return null;
            }
        });

        if (text) {
            const key = `${segmentId}_${field}`;
            setCustomItems(prev => ({
                ...prev,
                [key]: [...(prev[key] || []), text]
            }));
            toggleMultiSelect(segmentId, field, text);
        }
    };

    const handleEditCustomItem = async (segmentId: string, field: string, oldOption: string) => {
        const { value: text } = await Swal.fire({
            title: 'Edit Custom Item',
            input: 'text',
            inputValue: oldOption,
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            inputValidator: (value) => {
                if (!value) return 'Label cannot be empty!';
                return null;
            }
        });

        if (text && text !== oldOption) {
            const dropdownKey = `${segmentId}_${field}`;
            setCustomItems(prev => ({
                ...prev,
                [dropdownKey]: (prev[dropdownKey] || []).map(it => it === oldOption ? text : it)
            }));
            
            const segment = data[segmentId] || { enabled: true, data: {} };
            const selected = Array.isArray(segment.data[field]) ? segment.data[field] : [];
            if (selected.includes(oldOption)) {
                const updatedSelected = selected.map((s: string) => s === oldOption ? text : s);
                updateField(segmentId, field, updatedSelected);
            }
        }
    };

    const handleDeleteCustomItem = async (segmentId: string, field: string, option: string) => {
        const result = await Swal.fire({
            title: 'Delete Item?',
            text: `Are you sure you want to remove "${option}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete'
        });

        if (result.isConfirmed) {
            const dropdownKey = `${segmentId}_${field}`;
            setCustomItems(prev => ({
                ...prev,
                [dropdownKey]: (prev[dropdownKey] || []).filter(it => it !== option)
            }));

            const segment = data[segmentId] || { enabled: true, data: {} };
            const selected = Array.isArray(segment.data[field]) ? segment.data[field] : [];
            if (selected.includes(option)) {
                updateField(segmentId, field, selected.filter((s: string) => s !== option));
            }
        }
    };

    const toggleOccupation = async (occ: string) => {
        const segment = data.DEMOGRAPHICS || { enabled: true, data: {} };
        let occupations = segment.data.occupations || [];

        if (occ === "All Profiles (Any Profession)") {
            occupations = occupations.includes(occ) ? [] : [occ];
        } else if (occ === "Other") {
            const { value: customOcc } = await Swal.fire({
                title: 'Specify Occupation',
                input: 'text',
                inputPlaceholder: 'Enter occupation name...',
                showCancelButton: true,
                confirmButtonColor: '#4f46e5',
            });
            if (customOcc) {
                if (!occupations.includes(customOcc)) occupations.push(customOcc);
            }
        } else {
            occupations = occupations.filter((o: string) => o !== "All Profiles (Any Profession)");
            if (occupations.includes(occ)) {
                occupations = occupations.filter((o: string) => o !== occ);
            } else {
                occupations.push(occ);
            }
        }
        updateField('DEMOGRAPHICS', 'occupations', occupations);
    };

    const toggleCountry = (country: string) => {
        const segment = data.DEMOGRAPHICS || { enabled: true, data: {} };
        let countries = segment.data.countries || [];

        if (countries.includes(country)) {
            countries = countries.filter((c: string) => c !== country);
            // Also remove any pinpoints for this country if it's being removed
            if (segment.data.pinpoints) {
                const updatedPinpoints = (segment.data.pinpoints || []).filter((p: any) => p.country !== country);
                updateField('DEMOGRAPHICS', 'pinpoints', updatedPinpoints);
            }
        } else {
            countries.push(country);
        }
        updateField('DEMOGRAPHICS', 'countries', countries);
    };

    const addPinpoint = async (country: string) => {
        const { value: formValues } = await Swal.fire({
            title: `Pinpoint in ${country}`,
            html:
                '<input id="swal-input1" class="swal2-input" placeholder="City / Area Name">' +
                '<input id="swal-input2" type="number" class="swal2-input" placeholder="Radius in km (e.g. 50)">',
            focusConfirm: false,
            confirmButtonColor: '#4f46e5',
            preConfirm: () => {
                const city = (document.getElementById('swal-input1') as HTMLInputElement).value;
                const radius = (document.getElementById('swal-input2') as HTMLInputElement).value;
                if (!city) { Swal.showValidationMessage('City name is required'); return false; }
                return { city, radius: radius ? parseInt(radius) : null };
            }
        });

        if (formValues) {
            const segment = data.DEMOGRAPHICS || { enabled: true, data: {} };
            const currentPinpoints = segment.data.pinpoints || [];
            updateField('DEMOGRAPHICS', 'pinpoints', [...currentPinpoints, { country, ...formValues, id: Math.random().toString(36).substr(2, 9) }]);
        }
    };

    const removePinpoint = (id: string) => {
        const segment = data.DEMOGRAPHICS || { enabled: true, data: {} };
        const updatedPinpoints = (segment.data.pinpoints || []).filter((p: any) => p.id !== id);
        updateField('DEMOGRAPHICS', 'pinpoints', updatedPinpoints);
    };

    const handleMasterSuggest = async () => {
        setIsGenerating(true);
        try {
            const response = await api.post(`/marketing/strategy/${clientId}/auto-suggest`, { step: 'ICA' });
            const s = response.data.suggestion;
            
            // Map the AI response to the structure required by ICA step
            const newIcaData: any = {};
            Object.keys(s).forEach(key => {
                newIcaData[key] = { enabled: true, data: s[key] };
            });

            setFormData({ ...formData, ica_data: JSON.stringify(newIcaData) });
            
            Swal.fire({ 
                title: 'ICA Profile Synthesized', 
                text: 'Based on your business model, the AI has generated a complete Ideal Customer Avatar profile.', 
                icon: 'success', 
                timer: 3000, 
                showConfirmButton: false 
            });
        } catch (error) {
            Swal.fire('Error', 'Failed to generate ICA profile. Please try again.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleDropdown = (field: string) => {
        setOpenDropdowns(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const filteredCountries = useMemo(() => {
        const popular = ["India", "United Arab Emirates", "Saudi Arabia", "United States", "United Kingdom", "Qatar", "Oman", "Kuwait"];
        if (!countrySearch) return COUNTRIES.filter(c => popular.includes(c));
        return COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase())).slice(0, 20);
    }, [countrySearch]);

    const renderMultiSelectDropdown = (segmentId: string, field: string, predefinedOptions: string[], label: string, descriptionKey?: keyof typeof FIELD_DESCRIPTIONS) => {
        const selectedOptions = data[segmentId]?.data?.[field] || [];
        const dropdownKey = `${segmentId}_${field}`;
        const isOpen = openDropdowns[dropdownKey];
        const allOptions = [...predefinedOptions, ...(customItems[dropdownKey] || [])];

        return (
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#2c185a] flex items-center">
                    {label}
                    {descriptionKey && <InfoTooltip content={FIELD_DESCRIPTIONS[descriptionKey]} />}
                </Label>
                <div className="relative">
                    <button 
                        onClick={() => toggleDropdown(dropdownKey)}
                        className="w-full min-h-[55px] p-3 pl-4 pr-10 rounded-2xl border border-gray-100 bg-white text-left flex flex-wrap gap-2 items-center hover:border-indigo-200 transition-all shadow-sm ring-1 ring-transparent hover:ring-indigo-50"
                    >
                        {selectedOptions.length > 0 ? (
                            selectedOptions.map((opt: string) => (
                                <Badge key={opt} className="bg-indigo-600 text-white hover:bg-indigo-700 border-none px-3 py-1 rounded-xl text-[10px] font-bold shadow-sm">
                                    {opt}
                                    <X size={10} className="ml-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleMultiSelect(segmentId, field, opt); }} />
                                </Badge>
                            ))
                        ) : (
                            <span className="text-gray-400 text-xs font-medium">Select {label}...</span>
                        )}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                    </button>

                    {isOpen && (
                        <div className="mt-3 p-4 bg-gray-50/80 border border-indigo-100 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-300 relative z-10 transition-all">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {allOptions.map(option => {
                                    const isSelected = selectedOptions.includes(option);
                                    const isHealthcare = option.includes("(Healthcare)");
                                    const isCustom = !predefinedOptions.includes(option);
                                    
                                    return (
                                        <div 
                                            key={option}
                                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-white border-indigo-200 shadow-sm text-indigo-700' : 'bg-transparent border-transparent hover:bg-white/50 text-gray-600'}`}
                                            onClick={() => toggleMultiSelect(segmentId, field, option)}
                                        >
                                            <Checkbox checked={isSelected} onCheckedChange={() => toggleMultiSelect(segmentId, field, option)} />
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {isHealthcare && <Stethoscope size={14} className="text-pink-500 shrink-0" />}
                                                {isCustom && <Zap size={12} className="text-amber-500 shrink-0" />}
                                                <span className={`text-[11px] font-bold truncate`}>{option}</span>
                                            </div>
                                            {isCustom && (
                                                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                                    <button 
                                                        onClick={() => handleEditCustomItem(segmentId, field, option)}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    >
                                                        <Pencil size={11} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteCustomItem(segmentId, field, option)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleAddCustomItem(segmentId, field); }}
                                className="flex items-center gap-2 p-3 mt-4 rounded-xl border border-dashed border-indigo-300 bg-white text-indigo-600 hover:bg-indigo-50 transition-all text-[10px] font-black uppercase tracking-widest w-full justify-center shadow-sm"
                            >
                                <Plus size={14} />
                                Add Your Own Item
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderICPVisualization = () => {
        const demo = data.DEMOGRAPHICS?.data || {};
        const psycho = data.PSYCHOGRAPHICS?.data || {};
        const pain = data.PAIN_POINTS?.data?.points || [];
        const obj = data.OBJECTIONS?.data?.items || [];
        const buying = data.BUYING_BEHAVIOUR?.data?.patterns || [];
        const digital = data.DIGITAL_BEHAVIOUR?.data?.habits || [];
        const awareness = data.AWARENESS_LEVEL?.data?.level || 'Not Set';

        const summaryItems = [
            { icon: Users, label: 'Identity', val: `${demo.age_range || 'Any Age'} | ${demo.gender || 'Any Gender'} | ${demo.occupations?.length || 0} Occupations` },
            { icon: Globe, label: 'Geography', val: `${demo.countries?.length || 0} Countries Selected` },
            { icon: Brain, label: 'Psychology', val: `${ psycho.interests?.length || 0} Interests | ${psycho.values?.length || 0} Values` },
            { icon: Target, label: 'Awareness', val: awareness }
        ];

        return (
            <div className="space-y-6 pt-4 animate-in fade-in duration-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {summaryItems.map((item, idx) => (
                        <div key={idx} className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex flex-col items-center text-center">
                            <item.icon size={20} className="text-indigo-600 mb-2" />
                            <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider ">{item.label}</span>
                            <span className="text-[11px] font-bold text-indigo-900 mt-1">{item.val}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Visual Card 1: Core Drivers */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Brain size={120} className="text-indigo-900" />
                        </div>
                        <h5 className="text-xs font-black uppercase tracking-widest text-[#2c185a] mb-5 flex items-center gap-2">
                             <ZapIcon className="w-4 h-4 text-amber-500" />
                             Core Psychological Drivers
                        </h5>
                        <div className="flex flex-wrap gap-2">
                            {psycho.interests?.slice(0, 5).map((it: string) => <Badge key={it} className="bg-indigo-50 text-indigo-700 border-none px-3 py-1 font-bold text-[10px] rounded-lg"># {it}</Badge>)}
                            {psycho.values?.slice(0, 5).map((it: string) => <Badge key={it} className="bg-emerald-50 text-emerald-700 border-none px-3 py-1 font-bold text-[10px] rounded-lg">◈ {it}</Badge>)}
                            {psycho.lifestyle?.slice(0, 5).map((it: string) => <Badge key={it} className="bg-amber-50 text-amber-700 border-none px-3 py-1 font-bold text-[10px] rounded-lg">⚡ {it}</Badge>)}
                            {psycho.interests?.length > 5 && <span className="text-[10px] font-bold text-gray-400 mt-1">+{psycho.interests.length - 5} more</span>}
                        </div>
                    </div>

                    {/* Visual Card 2: Market Challenges */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <AlertCircle size={120} className="text-red-900" />
                        </div>
                        <h5 className="text-xs font-black uppercase tracking-widest text-[#2c185a] mb-5 flex items-center gap-2">
                             <Target className="w-4 h-4 text-red-500" />
                             Primary Market Barriers
                        </h5>
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {pain.slice(0, 4).map((it: string) => (
                                    <div key={it} className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-xl border border-red-100 text-[10px] font-black">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                        {it}
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {obj.slice(0, 4).map((it: string) => (
                                    <div key={it} className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-100 text-[10px] font-black">
                                        <X size={12} />
                                        {it}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5 bg-[#2c185a] rounded-3xl text-white relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-150 opacity-10 pointer-events-none">
                         <MapPin size={200} />
                    </div>
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div>
                            <p className="text-[10px] font-black uppercase text-indigo-300 tracking-widest mb-1 text-center md:text-left">Target Professions</p>
                            <div className="flex flex-wrap gap-1 justify-center md:justify-start">
                                {demo.occupations?.slice(0, 3).map((occ: string) => <span key={occ} className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-md">{occ}</span>)}
                                {demo.occupations?.length > 3 && <span className="text-[10px] font-bold opacity-50">+{demo.occupations.length - 3}</span>}
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <Award className="text-amber-400 mb-2" size={32} />
                            <h3 className="text-lg font-black tracking-tight">{demo.countries?.length || 0} Global Markets</h3>
                            <p className="text-[10px] text-indigo-200">Across {demo.gender || 'Any'} Gender Profiles</p>
                        </div>
                        <div>
                             <p className="text-[10px] font-black uppercase text-indigo-300 tracking-widest mb-1 text-center md:text-right">Digital Presence</p>
                             <div className="flex flex-wrap gap-1 justify-center md:justify-end">
                                {digital.slice(0, 3).map((hab: string) => <span key={hab} className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-md">{hab}</span>)}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const ZapIcon = ({ className }: { className?: string }) => (
        <Zap className={className} />
    );

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-20">

            {/* DATASET 01: IDEAL CUSTOMER PROFILE (AUTOMATED SUMMARY) */}
            {renderSection('IDEAL_CUSTOMER_PROFILE', 'Ideal Customer Profile', LayoutDashboard, (
                renderICPVisualization()
            ), true)}

            {/* DATASET 02: DEMOGRAPHICS */}
            {renderSection('DEMOGRAPHICS', 'Demographics', Users, (
                <div className="space-y-8 text-indigo-900">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-gray-500 flex items-center">
                                Age Range
                                <InfoTooltip content={FIELD_DESCRIPTIONS.age_range} />
                            </Label>
                            <Input placeholder="e.g. 25-35" value={data.DEMOGRAPHICS?.data?.age_range || ''} onChange={e => updateField('DEMOGRAPHICS', 'age_range', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            {renderMultiSelectDropdown('DEMOGRAPHICS', 'gender', ["Male", "Female", "Non-binary", "Other", "All"], 'Gender', 'gender')}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-gray-500 flex items-center">
                            Target Locations / Countries
                            <InfoTooltip content={FIELD_DESCRIPTIONS.locations} />
                        </Label>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <Input 
                                        placeholder="Search countries..." 
                                        className="pl-10 h-11 rounded-xl bg-white border-gray-200"
                                        value={countrySearch}
                                        onChange={e => setCountrySearch(e.target.value)}
                                    />
                                </div>
                                <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                    {filteredCountries.map(country => {
                                        const isSelected = data.DEMOGRAPHICS?.data?.countries?.includes(country);
                                        return (
                                            <div 
                                                key={country} 
                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-white'}`}
                                                onClick={() => toggleCountry(country)}
                                            >
                                                <Checkbox checked={isSelected} onCheckedChange={() => toggleCountry(country)} />
                                                <span className={`text-sm ${isSelected ? 'font-bold text-indigo-700' : 'text-gray-600'}`}>{country}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                    <h5 className="text-[10px] font-black uppercase text-indigo-900 tracking-wider">Selected ({data.DEMOGRAPHICS?.data?.countries?.length || 0})</h5>
                                    {data.DEMOGRAPHICS?.data?.countries?.length > 0 && (
                                        <button onClick={() => updateField('DEMOGRAPHICS', 'countries', [])} className="text-[10px] font-bold text-red-500 hover:underline">Clear All</button>
                                    )}
                                </div>
                                <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    {data.DEMOGRAPHICS?.data?.countries?.length > 0 ? (
                                        data.DEMOGRAPHICS?.data?.countries?.map((country: string) => (
                                            <div key={country} className="space-y-2 p-3 bg-white border border-gray-100 rounded-xl shadow-sm group/loc">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-indigo-900">{country}</span>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => addPinpoint(country)}
                                                            className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md border border-indigo-100 transition-colors flex items-center gap-1"
                                                        >
                                                            <MapPin size={10} />
                                                            Pinpoint
                                                        </button>
                                                        <X size={12} className="text-gray-400 cursor-pointer hover:text-red-500" onClick={() => toggleCountry(country)} />
                                                    </div>
                                                </div>
                                                
                                                {/* Pinpoints list for this country */}
                                                <div className="flex flex-wrap gap-2">
                                                    {(data.DEMOGRAPHICS?.data?.pinpoints || [])
                                                        .filter((p: any) => p.country === country)
                                                        .map((p: any) => (
                                                            <div key={p.id} className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg border border-amber-100 text-[10px] font-bold">
                                                                <Target size={8} />
                                                                <span>{p.city}{p.radius ? ` (${p.radius}km)` : ''}</span>
                                                                <X size={10} className="cursor-pointer hover:text-red-500 ml-1" onClick={() => removePinpoint(p.id)} />
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="w-full h-[100px] flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-xl">
                                            <MapPin size={24} />
                                            <p className="text-[10px] mt-2 font-medium uppercase tracking-tighter">No countries selected</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <Label className="text-[10px] font-black uppercase text-gray-500 flex items-center">
                            Occupation / Profession (Multi-select)
                            <InfoTooltip content={FIELD_DESCRIPTIONS.occupations} />
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            {[...OCCUPATIONS, ...(data.DEMOGRAPHICS?.data?.occupations || []).filter((o: string) => !OCCUPATIONS.includes(o))].map(occ => {
                                const isSelected = data.DEMOGRAPHICS?.data?.occupations?.includes(occ);
                                return (
                                    <label key={occ} className="flex items-center space-x-2 cursor-pointer group">
                                        <Checkbox checked={isSelected} onCheckedChange={() => toggleOccupation(occ)} />
                                        <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-indigo-600' : 'text-gray-600 group-hover:text-gray-900'}`}>{occ}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-gray-500 flex items-center">
                                Education Level
                                <InfoTooltip content={FIELD_DESCRIPTIONS.education} />
                            </Label>
                            <select className="w-full h-10 rounded-xl border border-gray-100 bg-gray-50 px-3 text-sm focus:ring-2 focus:ring-indigo-500" value={data.DEMOGRAPHICS?.data?.education || ''} onChange={e => updateField('DEMOGRAPHICS', 'education', e.target.value)}>
                                <option value="">Select...</option>
                                <option value="All">All</option>
                                <option value="High School">High School</option>
                                <option value="Undergraduate">Undergraduate / Bachelor's</option>
                                <option value="Postgraduate">Postgraduate / Master's</option>
                                <option value="Doctorate">Doctorate / PhD</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-gray-500 flex items-center">
                                Income Level
                                <InfoTooltip content={FIELD_DESCRIPTIONS.income} />
                            </Label>
                            <select className="w-full h-10 rounded-xl border border-gray-100 bg-gray-50 px-3 text-sm focus:ring-2 focus:ring-indigo-500" value={data.DEMOGRAPHICS?.data?.income || ''} onChange={e => updateField('DEMOGRAPHICS', 'income', e.target.value)}>
                                <option value="">Select...</option>
                                <option value="All">All</option>
                                <option value="Low Income">Low Income</option>
                                <option value="Lower Middle Class">Lower Middle Class</option>
                                <option value="Middle Class">Middle Class</option>
                                <option value="Upper Middle Class">Upper Middle Class</option>
                                <option value="High Income / HNI">High Income / HNI</option>
                            </select>
                        </div>
                    </div>
                </div>
            ))}

            {/* DATASET 03: PSYCHOGRAPHICS */}
            {renderSection('PSYCHOGRAPHICS', 'Psychographics', Brain, (
                <div className="grid grid-cols-1 gap-6">
                    {Object.entries(PSYCHOGRAPHIC_OPTIONS).map(([key, options]) => 
                        renderMultiSelectDropdown('PSYCHOGRAPHICS', key, options, key.replace('_', ' '), key as keyof typeof FIELD_DESCRIPTIONS)
                    )}
                </div>
            ))}

            {/* DATASET 04: PAIN POINTS */}
            {renderSection('PAIN_POINTS', 'Pain Points', AlertCircle, (
                <div className="grid grid-cols-1 gap-6">
                    {renderMultiSelectDropdown('PAIN_POINTS', 'points', PAIN_POINTS_OPTIONS, 'Key Pain Points', 'points')}
                </div>
            ))}

            {/* DATASET 05: OBJECTIONS */}
            {renderSection('OBJECTIONS', 'Objections', Heart, (
                <div className="grid grid-cols-1 gap-6">
                    {renderMultiSelectDropdown('OBJECTIONS', 'items', OBJECTIONS_OPTIONS, 'Key Objections', 'objections')}
                </div>
            ))}

            {/* DATASET 06: BUYING BEHAVIOUR */}
            {renderSection('BUYING_BEHAVIOUR', 'Buying Behaviour', ShoppingCart, (
                <div className="grid grid-cols-1 gap-6">
                    {renderMultiSelectDropdown('BUYING_BEHAVIOUR', 'patterns', BUYING_BEHAVIOUR_OPTIONS, 'Buying Patterns', 'patterns')}
                </div>
            ))}

            {/* DATASET 07: DIGITAL BEHAVIOUR */}
            {renderSection('DIGITAL_BEHAVIOUR', 'Digital Behaviour', Globe, (
                <div className="grid grid-cols-1 gap-6">
                    {renderMultiSelectDropdown('DIGITAL_BEHAVIOUR', 'habits', DIGITAL_BEHAVIOUR_OPTIONS, 'Digital Habits', 'habits')}
                </div>
            ))}

            {/* DATASET 08: AWARENESS LEVEL */}
            {renderSection('AWARENESS_LEVEL', 'Awareness Level', Eye, (
                <div className="space-y-3">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-gray-400">Current Level</span>
                        <InfoTooltip content={FIELD_DESCRIPTIONS.level} />
                    </div>
                    {['Unaware', 'Problem Aware', 'Solution Aware', 'Product Aware', 'Most Aware'].map(level => (
                        <div key={level} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => updateField('AWARENESS_LEVEL', 'level', level)}>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${data.AWARENESS_LEVEL?.data?.level === level ? 'border-indigo-600' : 'border-gray-200'}`}>
                                {data.AWARENESS_LEVEL?.data?.level === level && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                            </div>
                            <span className={`text-sm font-bold ${data.AWARENESS_LEVEL?.data?.level === level ? 'text-indigo-600' : 'text-gray-600'}`}>{level}</span>
                        </div>
                    ))}
                    {data.AWARENESS_LEVEL?.data?.explanation && (
                        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100 italic text-xs text-amber-700">
                            <strong>AI Insight:</strong> {data.AWARENESS_LEVEL?.data?.explanation}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default Step3CustomerAvatar;
