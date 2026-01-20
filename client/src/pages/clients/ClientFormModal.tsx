import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Save, Building, Users, Globe, Target, Briefcase, Plus, Trash2, DollarSign, Lock as LockIcon, Edit2 } from 'lucide-react';
import api from '../../lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import Swal from 'sweetalert2';

import ImageUpload from '../../components/ui/ImageUpload';
import FormErrorAlert from '../../components/ui/FormErrorAlert';

// --- Validation Schemas ---
const clientSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    industry: z.string().optional(),
    status: z.enum(["LEAD", "ACTIVE", "ON_HOLD", "COMPLETED", "INACTIVE"]).default("LEAD"),
    brand_colors: z.string().optional(),
    logo_url: z.string().optional(),

    // Contacts
    contact_person: z.string().optional(),
    contact_number: z.string().optional(),
    company_email: z.string().email("Invalid email").optional().or(z.literal('')),
    address: z.string().optional(), // Added Address

    // Operating Locations (Multi)
    operating_locations: z.array(z.object({
        country: z.string().min(1, "Country required"),
        state: z.string().optional()
    })).default([]),
    // operating_country: z.string().optional(), // REMOVED
    // operating_state: z.string().optional(), // REMOVED

    // Team
    account_manager_id: z.string().optional().or(z.literal('')),
    assigned_staff_ids: z.array(z.string()).default([]),

    // Services (Multi-select)
    service_engagement: z.array(z.string()).default([]),

    // Ad Accounts
    ad_accounts: z.array(z.object({
        id: z.string().optional(), // For updates
        platform: z.enum(['GOOGLE', 'META', 'LINKEDIN', 'TIKTOK', 'OTHER']).default('META'),
        name: z.string().min(1, "Account Name Required"),
        external_id: z.string().min(1, "Account ID Required"),
        status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
    })).default([]),

    // Extended
    social_links: z.object({
        website: z.string().optional(),
        facebook: z.string().optional(),
        instagram: z.string().optional(),
        linkedin: z.string().optional(),
        twitter: z.string().optional(),
    }).optional(),

    competitor_info: z.array(z.object({
        name: z.string(),
        website: z.string().optional()
    })).default([]),

    customer_avatar: z.object({
        description: z.string().optional(),
        pain_points: z.string().optional(),
    }).optional(),

    content_strategies: z.array(z.object({
        type: z.string(),
        quantity: z.number().min(0)
    })).default([]),

    // Ledger Options
    ledger_options: z.object({
        create: z.boolean(),
        head_id: z.string().optional()
    }).optional()
});

type ClientFormValues = z.infer<typeof clientSchema>;

const SERVICE_OPTIONS = [
    "Meta Ads", "Google Ads", "SEO", "Web Development",
    "Graphic Design", "Video Production", "Video Editing",
    "AI Video Making", "Motion Graphics", "Branding & Logo Design",
    "Content Creation & Page Handling"
];

const COUNTRY_LIST = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
    "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)",
    "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
    "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini (fmr. 'Swaziland')", "Ethiopia",
    "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Holy See", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
    "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
    "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)",
    "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
    "Oman", "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
    "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const ClientCodeField = ({ clientToEdit }: { clientToEdit?: any }) => {
    const { data: nextCodeData, isLoading } = useQuery({
        queryKey: ['next-client-code'],
        queryFn: async () => (await api.get('/clients/next-code')).data,
        enabled: !clientToEdit,
        staleTime: 0
    });

    const displayValue = clientToEdit
        ? clientToEdit.client_code
        : isLoading
            ? "Loading..."
            : nextCodeData?.code || "Auto-Generated";

    return (
        <div className="relative">
            <input
                value={displayValue}
                disabled
                className="input bg-gray-100 text-gray-600 font-mono font-bold"
            />
            {!clientToEdit && (
                <span className="absolute right-3 top-2.5 text-[10px] text-gray-400">
                    PREVIEW
                </span>
            )}
        </div>
    );
};

interface ClientFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientToEdit?: any;
}

const ClientFormModal = ({ isOpen, onClose, clientToEdit, onSuccess }: ClientFormModalProps & { onSuccess?: (client: any) => void }) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const STEPS = ['core', 'services', 'team', 'ad_accounts', 'finance', 'extended', 'strategy'];

    // Helper to get current step name
    const currentStep = STEPS[currentStepIndex];

    // Define fields validation per step
    const STEP_FIELDS: Record<string, any[]> = {
        'core': ['name', 'industry', 'status', 'brand_colors', 'logo_url', 'contact_person', 'contact_number', 'company_email', 'address', 'operating_locations'],
        'services': ['service_engagement'],
        'team': ['account_manager_id', 'assigned_staff_ids'],
        'ad_accounts': ['ad_accounts'],
        'finance': ['ledger_options'],
        'extended': ['social_links', 'customer_avatar'],
        'strategy': ['competitor_info']
    };

    const { register, control, handleSubmit, reset, watch, setValue, trigger, formState: { errors, isSubmitting } } = useForm<ClientFormValues>({
        resolver: zodResolver(clientSchema) as any,
        mode: 'onChange', // Validate on change for better feedback
        defaultValues: {
            name: '',
            status: 'LEAD',
            service_engagement: [],
            assigned_staff_ids: [],
            ad_accounts: [],
            competitor_info: [],
            social_links: {},
            operating_locations: [],
            customer_avatar: { description: '', pain_points: '' },
            content_strategies: [],

            address: '',
            ledger_options: { create: false, head_id: '' }
        }
    });

    const handleNext = async () => {
        const fields = STEP_FIELDS[currentStep];
        const isValid = await trigger(fields as any);

        if (isValid) {
            if (currentStepIndex < STEPS.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
            }
        } else {
            // Show errors for current step if trigger fails
            const currentErrors = Object.keys(errors);
            if (currentErrors.length > 0) {
                // Trigger re-validation to ensure errors object is populated
                // (trigger returns boolean but also updates state)
                alert("Please complete all required fields in this step before proceeding.");
                console.log("Step validation failed", errors);
            }
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
    const [isLedgerLocked, setIsLedgerLocked] = useState(false);

    useEffect(() => {
        if (clientToEdit) {
            // ... existing reset logic ...
            // Lock ledger if it was already created
            setIsLedgerLocked(!!clientToEdit.ledger_options?.create);
        } else {
            setIsLedgerLocked(false);
        }
    }, [clientToEdit, reset, isOpen]);
    const [staffSearch, setStaffSearch] = useState("");

    // Fetch Staff for assignment
    // Fetch Staff for assignment
    const { data: staffList } = useQuery({
        queryKey: ['staff'],
        queryFn: async () => (await api.get('/team/staff')).data,
        enabled: !!isOpen // Only fetch when open
    });

    // Fetch Account Heads
    const { data: accountHeads } = useQuery({
        queryKey: ['accountHeads'],
        queryFn: async () => (await api.get('/accounting/heads')).data,
        enabled: !!isOpen
    });

    // Array fields for Competitors
    const { fields: competitorFields, append: appendCompetitor, remove: removeCompetitor } = useFieldArray({
        control,
        name: "competitor_info"
    });

    // Ad Accounts Array
    const { fields: adAccountFields, append: appendAdAccount, remove: removeAdAccount } = useFieldArray({
        control,
        name: "ad_accounts"
    });

    // Content Strategy Array
    const { fields: contentStrategyFields, append: appendContentStrategy, remove: removeContentStrategy } = useFieldArray({
        control,
        name: "content_strategies"
    });

    const { fields: locationFields, append: appendLocation, remove: removeLocation } = useFieldArray({
        control,
        name: "operating_locations"
    });

    // Populate form if editing
    useEffect(() => {
        if (clientToEdit) {
            // Normalize legacy services
            const rawServices = parseJsonSafe(clientToEdit.service_engagement, []);
            const normalizedServices = rawServices.map((s: string) => {
                if (s === 'Meta Ads') return 'META_ADS';
                if (s === 'Google Ads') return 'GOOGLE_ADS';
                if (s === 'SEO') return 'SEO';
                if (s === 'Web Development' || s === 'Web Design / Development') return 'WEB_DEV';
                if (s === 'Graphic Design') return 'GRAPHIC_DESIGN';
                if (s === 'Content Creation' || s === 'Content Creation & Page Handling') return 'CONTENT';
                if (s === 'Branding' || s === 'Branding & Logo Design') return 'BRANDING';
                if (s === 'Video Production') return 'VIDEO_PROD';
                if (s === 'Video Editing') return 'VIDEO_EDIT';
                return s;
            });

            reset({
                name: clientToEdit.name,
                industry: clientToEdit.industry || '',
                status: clientToEdit.status,
                logo_url: clientToEdit.logo_url || '',
                contact_person: clientToEdit.contact_person || '',
                contact_number: clientToEdit.contact_number || '',
                company_email: clientToEdit.company_email || '',
                account_manager_id: clientToEdit.account_manager_id || '',
                assigned_staff_ids: clientToEdit.assigned_staff?.map((s: any) => s.id) || [],
                ad_accounts: clientToEdit.ad_accounts || [],
                service_engagement: normalizedServices,
                social_links: parseJsonSafe(clientToEdit.social_links, {}),
                competitor_info: parseJsonSafe(clientToEdit.competitor_info, []),
                customer_avatar: parseJsonSafe(clientToEdit.customer_avatar, { description: '', pain_points: '' }),
                content_strategies: clientToEdit.content_strategies || [],
                operating_locations: parseJsonSafe(clientToEdit.operating_locations_json, []),
                address: clientToEdit.address || '',
                ledger_options: {
                    create: clientToEdit.ledger_options?.create || false,
                    head_id: clientToEdit.ledger_options?.head_id || ''
                }
            });
        } else {
            reset({
                name: '',
                status: 'LEAD',
                service_engagement: [],
                assigned_staff_ids: [],
                ad_accounts: [],
                competitor_info: [],
                social_links: {},
                customer_avatar: { description: '', pain_points: '' },
                content_strategies: []
            });
        }
    }, [clientToEdit, reset, isOpen]);

    const parseJsonSafe = (val: any, fallback: any) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch { return fallback; }
        }
        return val || fallback;
    };

    const mutation = useMutation({
        mutationFn: async (data: ClientFormValues) => {
            if (clientToEdit) {
                return await api.patch(`/clients/${clientToEdit.id}`, data);
            } else {
                return await api.post('/clients', data);
            }
        },
        // Add at top: import Swal from 'sweetalert2';

        // In mutation onSuccess:
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['client'] }); // Refresh Detail View
            queryClient.invalidateQueries({ queryKey: ['clients-list-simple'] }); // Refresh Portal Overview
            queryClient.invalidateQueries({ queryKey: ['client-portal-dashboard'] }); // Refresh active portal view
            if (onSuccess) {
                onSuccess(data.data);
            }
            onClose();
            reset();
            setCurrentStepIndex(0);

            Swal.fire({
                title: 'Success!',
                text: clientToEdit ? 'Client profile updated successfully.' : 'New client added successfully.',
                icon: 'success',
                confirmButtonColor: '#8b5cf6', // Primary Purple
                timer: 2000,
                timerProgressBar: true
            });
        },
        onError: (err: any) => {
            console.error("Mutation Error:", err);
            alert("Failed: " + (err.response?.data?.message || err.message));
        }
    });

    // Reset step on open
    useEffect(() => {
        if (isOpen) setCurrentStepIndex(0);
    }, [isOpen]);

    // Tab Button now just indicates progress, disable click or make it navigate if viewed
    const TabButton = ({ id, label, icon: Icon, index }: any) => {
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;

        return (
            <button
                type="button"
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${isActive ? "border-primary text-primary" :
                    isCompleted ? "border-green-500 text-green-600" :
                        "border-transparent text-gray-400"
                    }`}
                disabled // Disable direct navigation to enforce Flow
            >
                <Icon size={16} />
                {label}
                {isCompleted && <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1" />}
            </button>
        );
    };

    const onSubmit = (data: ClientFormValues) => {
        // Clean empty strings
        const cleanedData = {
            ...data,
            account_manager_id: data.account_manager_id || undefined,
            logo_url: data.logo_url || undefined,
            industry: data.industry || undefined,
            contact_person: data.contact_person || undefined,
            contact_number: data.contact_number || undefined,
            company_email: data.company_email || undefined,
            address: data.address || undefined
        };
        mutation.mutate(cleanedData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {clientToEdit ? 'Edit Client' : 'Add New Client'}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Wizard Steps Header */}
                <div className="flex border-b px-4 overflow-x-auto bg-gray-50/50">
                    <TabButton id="core" label="Core Info" icon={Building} index={0} />
                    <TabButton id="services" label="Services" icon={Target} index={1} />
                    <TabButton id="team" label="Team" icon={Users} index={2} />
                    <TabButton id="ad_accounts" label="Ad Accounts" icon={DollarSign} index={3} />
                    <TabButton id="finance" label="Finance" icon={DollarSign} index={4} />
                    <TabButton id="extended" label="Extended" icon={Briefcase} index={5} />
                    <TabButton id="strategy" label="Strategy" icon={Globe} index={6} />
                </div>

                <form className="flex-1 overflow-y-auto p-6">

                    {/* CORE TAB */}
                    {currentStep === 'core' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Company Name *</label>
                                        <input {...register('name')} className={`input ${errors.name ? 'border-red-500' : ''}`} placeholder="Acme Corp" autoFocus />
                                        {errors.name && <p className="error">{errors.name.message}</p>}
                                    </div>
                                    <div>
                                        <label className="label">Client ID {clientToEdit ? '' : '(Auto-Generated)'}</label>
                                        <ClientCodeField clientToEdit={clientToEdit} />
                                    </div>
                                    <div>
                                        <label className="label">Industry</label>
                                        <input {...register('industry')} className="input" placeholder="Software, Retail, etc." />
                                    </div>
                                    <div>
                                        <label className="label">Status</label>
                                        <select {...register('status')} className="input">
                                            <option value="LEAD">Lead</option>
                                            <option value="ACTIVE">Active</option>
                                            <option value="ON_HOLD">On Hold</option>
                                            <option value="COMPLETED">Completed</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="label">Client Logo</label>
                                        <Controller
                                            control={control}
                                            name="logo_url"
                                            render={({ field }) => (
                                                <ImageUpload
                                                    label=""
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                        {errors.logo_url && <p className="error">{errors.logo_url.message}</p>}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="font-medium text-gray-900 border-b pb-2">Primary Contact</h4>
                                    <div>
                                        <label className="label">Contact Person</label>
                                        <input {...register('contact_person')} className="input" placeholder="Full Name" />
                                    </div>
                                    <div>
                                        <label className="label">Email Address</label>
                                        <input {...register('company_email')} className={`input ${errors.company_email ? 'border-red-500' : ''}`} placeholder="email@company.com" />
                                        {errors.company_email && <p className="error">{errors.company_email.message}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="label">Mobile Number</label>
                                            <input {...register('contact_number')} className="input" placeholder="+1 234..." />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="label">Business Address</label>
                                        <textarea {...register('address')} className="input min-h-[60px]" placeholder="Full street address..." />
                                    </div>

                                    <div className="flex justify-between items-center border-b pb-2 mt-2">
                                        <h4 className="font-medium text-gray-900">Operating Locations</h4>
                                        <button type="button" onClick={() => appendLocation({ country: '', state: '' })} className="text-xs text-primary flex items-center gap-1 hover:underline">
                                            <Plus size={12} /> Add Location
                                        </button>
                                    </div>
                                    <div className="space-y-3 mt-3">
                                        {locationFields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-[1fr,1fr,auto] gap-3 items-end bg-gray-50 p-2 rounded relative group animate-in slide-in-from-bottom-2">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] uppercase font-bold text-gray-500">Country</label>
                                                    <select {...register(`operating_locations.${index}.country`)} className="input text-sm py-1.5 h-9">
                                                        <option value="">Select...</option>
                                                        {COUNTRY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>

                                                {watch(`operating_locations.${index}.country`) === 'India' ? (
                                                    <div className="space-y-1 animate-in fade-in">
                                                        <label className="text-[10px] uppercase font-bold text-gray-500">State</label>
                                                        <select {...register(`operating_locations.${index}.state`)} className="input text-sm py-1.5 h-9">
                                                            <option value="">Select...</option>
                                                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1 opacity-50 pointer-events-none">
                                                        <label className="text-[10px] uppercase font-bold text-gray-500">State</label>
                                                        <input disabled className="input text-sm py-1.5 h-9 bg-gray-100" placeholder="N/A" />
                                                    </div>
                                                )}

                                                <button type="button" onClick={() => removeLocation(index)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-gray-100 rounded-lg mb-0.5">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        {locationFields.length === 0 && (
                                            <div className="text-center p-4 border-2 border-dashed rounded text-sm text-gray-400">
                                                No locations added. <button type="button" onClick={() => appendLocation({ country: '', state: '' })} className="text-primary hover:underline">Add Primary Location</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SERVICES TAB */}
                    {currentStep === 'services' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Service Engagement</h3>
                                <div className="space-y-3">
                                    {[
                                        { id: 'META_ADS', label: 'Meta Ads' },
                                        { id: 'GOOGLE_ADS', label: 'Google Ads' },
                                        { id: 'SEO', label: 'SEO' },
                                        { id: 'WEB_DEV', label: 'Web Design / Development' },
                                        { id: 'GRAPHIC_DESIGN', label: 'Graphic Design' },
                                        { id: 'CONTENT', label: 'Content Creation' },
                                        { id: 'BRANDING', label: 'Branding' },
                                        { id: 'VIDEO_PROD', label: 'Video Production' },
                                        { id: 'VIDEO_EDIT', label: 'Video Editing' }
                                    ].map((service) => {
                                        const isActive = watch('service_engagement').includes(service.id);
                                        return (
                                            <div key={service.id} className={`flex items-center justify-between p-4 border rounded-lg transition-all ${isActive ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white hover:bg-gray-50'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 shadow-sm shadow-green-200' : 'bg-gray-300'}`}></div>
                                                    <span className={`font-medium ${isActive ? 'text-green-900' : 'text-gray-700'}`}>{service.label}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = watch('service_engagement');
                                                        if (isActive) {
                                                            setValue('service_engagement', current.filter((s: string) => s !== service.id));
                                                        } else {
                                                            setValue('service_engagement', [...current, service.id]);
                                                        }
                                                    }}
                                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive
                                                        ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
                                                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                        }`}
                                                >
                                                    {isActive ? 'Deactivate' : 'Activate'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TEAM TAB */}
                    {currentStep === 'team' && (
                        <div className="space-y-6 animate-in fade-in max-w-2xl pb-64">
                            <div>
                                <label className="label">Account Manager (Lead)</label>
                                <select {...register('account_manager_id')} className={`input ${errors.account_manager_id ? 'border-red-500' : ''}`}>
                                    <option value="">Select Manager...</option>
                                    {staffList?.sort((a: any, b: any) => a.user?.full_name.localeCompare(b.user?.full_name))
                                        .filter((s: any) => (
                                            s.department === 'MANAGEMENT' ||
                                            s.department === 'MARKETING' || // Requested: Entire Marketing Dept
                                            s.department === 'WEB' ||       // Requested: Entire Web Dept
                                            s.user?.role === 'ADMIN' ||
                                            s.user?.role === 'MANAGER' ||
                                            s.user?.role === 'DEVELOPER_ADMIN' ||
                                            s.user?.role === 'DM_EXECUTIVE' ||
                                            s.user?.role === 'WEB_SEO_EXECUTIVE' ||
                                            s.user?.role === 'MARKETING_EXEC'
                                        ) && s.payroll_status === 'ACTIVE')
                                        .map((s: any) => (
                                            <option key={s.id} value={s.user_id}>{s.user?.full_name} ({s.user?.role})</option>
                                        ))}
                                </select>
                                {errors.account_manager_id && <p className="error">{errors.account_manager_id.message}</p>}
                                <p className="text-xs text-muted-foreground mt-1">Responsible for overall client relationship.</p>
                            </div>

                            <div>
                                <label className="label">Assigned Staff (Execution Team)</label>

                                <div className="relative">
                                    <button
                                        type="button"
                                        className="input text-left flex justify-between items-center bg-white min-h-[42px]"
                                        onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                                        // Allow Admins, Managers, and Marketing/SEO Execs to assign staff
                                        disabled={
                                            user?.role !== 'ADMIN' &&
                                            user?.role !== 'MANAGER' &&
                                            user?.role !== 'DEVELOPER_ADMIN' &&
                                            user?.role !== 'DM_EXECUTIVE' &&
                                            user?.role !== 'WEB_SEO_EXECUTIVE' &&
                                            user?.role !== 'MARKETING_EXEC'
                                        }
                                    >
                                        <span className="text-sm truncate">
                                            {watch('assigned_staff_ids').length === 0
                                                ? <span className="text-gray-400">Select execution team...</span>
                                                : `${watch('assigned_staff_ids').length} Member${watch('assigned_staff_ids').length > 1 ? 's' : ''} Selected`
                                            }
                                        </span>
                                        <Users size={16} className="text-gray-400 flex-shrink-0" />
                                    </button>

                                    {isTeamDropdownOpen && (
                                        user?.role === 'ADMIN' ||
                                        user?.role === 'MANAGER' ||
                                        user?.role === 'DEVELOPER_ADMIN' ||
                                        user?.role === 'DM_EXECUTIVE' ||
                                        user?.role === 'WEB_SEO_EXECUTIVE' ||
                                        user?.role === 'MARKETING_EXEC'
                                    ) && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsTeamDropdownOpen(false)}></div>
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-20 max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                                                    <div className="p-2 border-b bg-gray-50">
                                                        <input
                                                            type="text"
                                                            placeholder="Search by name or dept..."
                                                            className="w-full text-xs p-2 border rounded focus:outline-none focus:border-primary"
                                                            value={staffSearch}
                                                            onChange={(e) => setStaffSearch(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="overflow-y-auto p-1 max-h-48">
                                                        {staffList
                                                            ?.filter((s: any) => s.user && s.payroll_status === 'ACTIVE')
                                                            .filter((s: any) =>
                                                                s.user.full_name.toLowerCase().includes(staffSearch.toLowerCase()) ||
                                                                s.department.toLowerCase().includes(staffSearch.toLowerCase())
                                                            )
                                                            .map((s: any) => {
                                                                const isSelected = watch('assigned_staff_ids').includes(s.user_id);
                                                                return (
                                                                    <label key={s.id} className={`flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-gray-50 rounded text-sm group ${isSelected ? 'bg-blue-50' : ''}`}>
                                                                        <input
                                                                            type="checkbox"
                                                                            value={s.user_id}
                                                                            {...register('assigned_staff_ids')}
                                                                            className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                                                                        />
                                                                        <div className="flex-1 flex justify-between items-center">
                                                                            <span className={`font-medium ${isSelected ? 'text-primary' : 'text-gray-700'}`}>{s.user?.full_name}</span>
                                                                            <span className="text-[10px] uppercase bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{s.department}</span>
                                                                        </div>
                                                                    </label>
                                                                );
                                                            })}
                                                        {staffList?.length === 0 && <p className="text-xs text-center p-4 text-gray-400">No staff found.</p>}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                </div>

                                {/* Selected Chips */}
                                {watch('assigned_staff_ids').length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3 p-2 bg-gray-50/50 rounded-md border border-dashed">
                                        {watch('assigned_staff_ids').map((id: string) => {
                                            const staff = staffList?.find((s: any) => s.user_id === id);
                                            if (!staff) return null;
                                            return (
                                                <span key={id} className="inline-flex items-center gap-1.5 bg-white border px-2 py-1 rounded-full text-xs shadow-sm group hover:border-red-200 hover:bg-red-50 transition-colors">
                                                    {staff.user?.avatar_url ? (
                                                        <img src={staff.user.avatar_url} className="w-4 h-4 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-600">{staff.user?.full_name?.charAt(0)}</div>
                                                    )}
                                                    <span className="font-medium text-gray-700 group-hover:text-red-600">{staff.user?.full_name}</span>
                                                    {(user?.role === 'ADMIN' || user?.role === 'DEVELOPER_ADMIN') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const current = watch('assigned_staff_ids');
                                                                setValue('assigned_staff_ids', current.filter((cid: string) => cid !== id));
                                                            }}
                                                            className="ml-1 text-gray-400 hover:text-red-500 rounded-full p-0.5"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">These users will see task suggestions for this client.</p>
                            </div>
                        </div>
                    )}

                    {/* AD ACCOUNTS TAB */}
                    {currentStep === 'ad_accounts' && (
                        <div className="animate-in fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h4 className="font-medium text-gray-900">Linked Ad Accounts</h4>
                                    <p className="text-xs text-gray-500">Connect client ad accounts for Campaign Manager syncing.</p>
                                </div>
                                <button type="button" onClick={() => appendAdAccount({ platform: 'META', name: '', external_id: '', status: 'ACTIVE' })} className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-md flex items-center gap-1 hover:bg-primary/20 transition-colors">
                                    <Plus size={14} /> Add Account
                                </button>
                            </div>

                            <div className="space-y-3">
                                {adAccountFields.map((field, index) => (
                                    <div key={field.id} className="flex flex-col md:flex-row gap-3 items-start bg-gray-50 p-3 rounded-md border border-gray-100 animate-in slide-in-from-bottom-2">
                                        <div className="w-full md:w-32">
                                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Platform</label>
                                            <select {...register(`ad_accounts.${index}.platform`)} className="input text-sm py-1.5">
                                                <option value="META">Meta (FB)</option>
                                                <option value="GOOGLE">Google Ads</option>
                                                <option value="LINKEDIN">LinkedIn</option>
                                                <option value="TIKTOK">TikTok</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                        <div className="flex-1 w-full">
                                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Account Name</label>
                                            <input {...register(`ad_accounts.${index}.name`)} className="input text-sm py-1.5" placeholder="e.g. Qix Ads - Q1" />
                                            {errors.ad_accounts?.[index]?.name && <p className="error">{errors.ad_accounts[index]?.name?.message}</p>}
                                        </div>
                                        <div className="flex-1 w-full">
                                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Account ID</label>
                                            <input {...register(`ad_accounts.${index}.external_id`)} className="input text-sm py-1.5 font-mono" placeholder="e.g. act_123456789" />
                                            {errors.ad_accounts?.[index]?.external_id && <p className="error">{errors.ad_accounts[index]?.external_id?.message}</p>}
                                        </div>
                                        <div className="w-full md:w-auto flex justify-end mt-4 md:mt-0">
                                            <button type="button" onClick={() => removeAdAccount(index)} className="text-red-500 hover:text-red-700 p-2 bg-white rounded border border-gray-200 hover:bg-red-50 transition-colors" title="Remove Account">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {adAccountFields.length === 0 && (
                                    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                                            <DollarSign size={24} />
                                        </div>
                                        <p className="text-sm text-gray-500 mb-1">No ad accounts linked.</p>
                                        <button type="button" onClick={() => appendAdAccount({ platform: 'META', name: '', external_id: '', status: 'ACTIVE' })} className="text-xs text-primary hover:underline font-medium">
                                            Click to add one
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* FINANCE TAB */}
                    {currentStep === 'finance' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="p-4 bg-gray-50 border rounded-lg">
                                <div className="flex items-center gap-2 mb-4">
                                    <input
                                        type="checkbox"
                                        {...register('ledger_options.create')}
                                        className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary"
                                        id="create_ledger"
                                    />
                                    <label htmlFor="create_ledger" className="font-medium text-gray-900 cursor-pointer select-none">Create a dedicated Ledger Account for this client?</label>
                                </div>

                                {watch('ledger_options.create') && (
                                    <div className="pl-7 space-y-4 animate-in slide-in-from-top-2">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm text-gray-500">
                                                A new ledger will be created named <strong>{watch('name') || 'Client Name'}</strong>.
                                                Please select the parent Account Head (Category).
                                            </p>
                                            {isLedgerLocked && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsLedgerLocked(false)}
                                                    className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 transition-colors"
                                                >
                                                    <Edit2 size={12} /> Edit
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className={isLedgerLocked ? "opacity-60 pointer-events-none grayscale" : ""}>
                                                <label className="label">Account Type</label>
                                                <select
                                                    className="input"
                                                    disabled={isLedgerLocked}
                                                    onChange={(e) => {
                                                        // Filter heads logic could be here, but simpler to just show all sorted or grouped
                                                        // For now let's just use the head selector directly as Type is implied by Head
                                                    }}
                                                >
                                                    <option value="">All Types</option>
                                                    <option value="ASSET">Assets (debtors)</option>
                                                    <option value="LIABILITY">Liabilities</option>
                                                    <option value="INCOME">Income</option>
                                                    <option value="Income from Client">Income from Client</option>
                                                    <option value="EXPENSE">Expense</option>
                                                </select>
                                                <p className="text-xs text-muted-foreground mt-1">Filter the list of Account Heads.</p>
                                            </div>

                                            <div className={isLedgerLocked ? "opacity-60 pointer-events-none grayscale" : ""}>
                                                <label className="label">Account Head *</label>
                                                <select
                                                    {...register('ledger_options.head_id')}
                                                    className={`input ${errors.ledger_options?.head_id ? 'border-red-500' : ''}`}
                                                    disabled={isLedgerLocked}
                                                >
                                                    <option value="">Select Head...</option>
                                                    {accountHeads?.map((head: any) => (
                                                        <option key={head.id} value={head.id}>
                                                            {head.name} ({head.code})
                                                        </option>
                                                    ))}
                                                </select>
                                                {isLedgerLocked && <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1"><LockIcon size={8} /> Linked to active ledger</p>}
                                                {errors.ledger_options?.head_id && <p className="error">{errors.ledger_options.head_id.message}</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!watch('ledger_options.create') && (
                                    <p className="text-xs text-gray-400 pl-7">
                                        Note: If skipped, a default Ledger (Income - 4000) might be reused or auto-created depending on system settings.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* EXTENDED TAB */}
                    {currentStep === 'extended' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="space-y-4">
                                <h4 className="font-medium border-b pb-2">Social Presence</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="label">Website</label>
                                        <div className="relative">
                                            <Globe size={16} className="absolute left-3 top-3 text-gray-400" />
                                            <input {...register('social_links.website')} className="input pl-9" placeholder="https://" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="label">Facebook</label>
                                        <input {...register('social_links.facebook')} className="input" placeholder="https://facebook.com/..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="label">Instagram</label>
                                        <input {...register('social_links.instagram')} className="input" placeholder="https://instagram.com/..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="label">LinkedIn</label>
                                        <input {...register('social_links.linkedin')} className="input" placeholder="https://linkedin.com/..." />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-medium border-b pb-2">Customer Avatar</h4>
                                <div>
                                    <label className="label">Description / Demographics</label>
                                    <textarea {...register('customer_avatar.description')} className="input min-h-[80px]" placeholder="Who is the ideal customer?"></textarea>
                                </div>
                                <div>
                                    <label className="label">Pain Points</label>
                                    <textarea {...register('customer_avatar.pain_points')} className="input min-h-[80px]" placeholder="What problems do they face?"></textarea>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STRATEGY TAB */}
                    {currentStep === 'strategy' && (
                        <div className="animate-in fade-in space-y-6">
                            {/* CONTENT STRATEGY SECTION */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-3 border-b pb-2">Content Strategy (Monthly Commitments)</h4>
                                <div className="space-y-3">
                                    {contentStrategyFields.map((field, index) => (
                                        <div key={field.id} className="flex gap-3 items-center bg-gray-50 p-3 rounded-md border border-gray-100">
                                            <div className="flex-1">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Content Type</label>
                                                <select {...register(`content_strategies.${index}.type`)} className="input text-sm py-1.5">
                                                    <option value="Poster Design">Poster Design</option>
                                                    <option value="Reel Video">Reel Video</option>
                                                    <option value="Motion Graphic Video">Motion Graphic Video</option>
                                                    <option value="AI Video">AI Video</option>
                                                    <option value="Anchor Ads">Anchor Ads</option>
                                                    <option value="Carousel">Carousel</option>
                                                    <option value="Logo Design">Logo Design</option>
                                                    <option value="Brochure Design">Brochure Design</option>
                                                    <option value="Flyer Design">Flyer Design</option>
                                                    <option value="Flex / Billboard Design">Flex / Billboard Design</option>
                                                    <option value="Business Card">Business Card</option>
                                                    <option value="Letter Head">Letter Head</option>
                                                </select>
                                            </div>
                                            <div className="w-24">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Quantity</label>
                                                <input
                                                    type="number"
                                                    {...register(`content_strategies.${index}.quantity`, { valueAsNumber: true })}
                                                    className="input text-sm py-1.5"
                                                    min={0}
                                                />
                                            </div>
                                            <button type="button" onClick={() => removeContentStrategy(index)} className="text-red-500 hover:text-red-700 p-2 mt-4 bg-white rounded border border-gray-200">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => appendContentStrategy({ type: 'Poster Design', quantity: 0 })} className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-md flex items-center gap-1 hover:bg-primary/20 transition-colors">
                                        <Plus size={14} /> Add Content Type
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-medium">Competitor Analysis</h4>
                                    <button type="button" onClick={() => appendCompetitor({ name: '', website: '' })} className="text-sm text-primary flex items-center gap-1 hover:underline">
                                        <Plus size={14} /> Add Competitor
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {competitorFields.map((field, index) => (
                                        <div key={field.id} className="flex gap-3 items-start bg-gray-50 p-3 rounded-md">
                                            <div className="flex-1">
                                                <input {...register(`competitor_info.${index}.name`)} className="input mb-2" placeholder="Competitor Name" />
                                                <input {...register(`competitor_info.${index}.website`)} className="input" placeholder="Competitor Website" />
                                            </div>
                                            <button type="button" onClick={() => removeCompetitor(index)} className="text-red-500 hover:text-red-700 p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {competitorFields.length === 0 && <p className="text-sm text-gray-500 italic">No competitors added.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                </form>

                {/* Footer - Wizard Navigation */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {currentStepIndex > 0 && (
                            <button
                                type="button"
                                onClick={handleBack}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                Back
                            </button>
                        )}
                        <span className="text-xs text-gray-500">Step {currentStepIndex + 1} of {STEPS.length}</span>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                            >
                                Cancel
                            </button>

                            {currentStepIndex < STEPS.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-sm transition-colors"
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit(onSubmit, (errors) => {
                                        console.error("Form Validation Errors:", errors);
                                        // FormErrorAlert will display details
                                    })}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50 shadow-sm animate-in fade-in"
                                >
                                    <Save size={16} />
                                    {isSubmitting ? 'Saving...' : 'Save and Close'}
                                </button>
                            )}
                        </div>
                        {/* Display Errors Here */}
                        <div className="w-full max-w-md">
                            <FormErrorAlert errors={errors} />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
                .input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; }
                .input:focus { outline: none; border-color: #3b82f6; ring: 2px solid #93c5fd; }
                .error { font-size: 0.75rem; color: #ef4444; margin-top: 0.25rem; }
            `}</style>
        </div >
    );
};

export default ClientFormModal;
