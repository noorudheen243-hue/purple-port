import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Save, User, Briefcase, Lock, Heart, GraduationCap } from 'lucide-react';
import api from '../../lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import ImageUpload from '../../components/ui/ImageUpload';
import FormErrorAlert from '../../components/ui/FormErrorAlert';



// --- Configuration ---

const inputClass = "w-full p-2.5 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground text-foreground disabled:opacity-50 disabled:cursor-not-allowed";

const AGENCY_DESIGNATIONS = [
    "CO-FOUNDER",
    "Creative Director",
    "Art Director",
    "Senior Graphic Designer",
    "Graphic Designer",
    "Copywriter",
    "Content Strategist",
    "Social Media Manager",
    "Social Media Executive",
    "SEO Specialist",
    "Web Developer",
    "Account Director",
    "Account Manager",
    "Client Servicing Executive",
    "Media Planner",
    "Media Buyer",
    "Operations Manager",
    "HR Manager",
    "Office Administrator",
    "Intern"
];



// --- Schema ---

const staffSchema = z.object({
    // Account & System
    full_name: z.string().min(2, "Full Name is required"),
    email: z.string().email("Valid email is required"),
    password: z.string().nullish().or(z.literal('')),
    role: z.string().nullish().or(z.literal('')), // Not mandatory — managed via Settings
    avatar_url: z.string().nullish().or(z.literal('')),

    // Professional
    staff_number: z.string().min(1, "Staff ID is required (e.g., QIX001)"),
    designation: z.string().nullish().or(z.literal('')), // Optional
    custom_designation: z.string().nullish().or(z.literal('')),
    department: z.enum(['CREATIVE', 'MARKETING', 'WEB_SEO', 'WEB', 'MANAGEMENT', 'ADMIN']),
    date_of_joining: z.string().nullish().or(z.literal('')), // Optional
    reporting_manager_id: z.string().nullish().or(z.literal('')),

    // Personal & Contact
    personal_email: z.string().email().nullish().or(z.literal('')),
    personal_contact: z.string().nullish().or(z.literal('')),
    whatsapp_number: z.string().nullish().or(z.literal('')),
    official_contact: z.string().nullish().or(z.literal('')),
    date_of_birth: z.string().nullish().or(z.literal('')),
    marital_status: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']).nullish().or(z.literal('')),
    address: z.string().nullish().or(z.literal('')),
    pincode: z.string().nullish().or(z.literal('')),

    emergency_contact_name: z.string().nullish().or(z.literal('')),
    emergency_contact_number: z.string().nullish().or(z.literal('')),

    previous_company: z.string().nullish().or(z.literal('')),
    total_experience_years: z.coerce.number().nullish(),

    // Payroll
    base_salary: z.coerce.number().nullish(),
    salary_type: z.enum(['MONTHLY', 'DAILY', 'CONTRACT']).nullish().or(z.literal('')),
    incentive_eligible: z.boolean().optional(),
    payroll_status: z.enum(['ACTIVE', 'HOLD']).nullish().or(z.literal('')),
    ledger_options: z.object({
        create: z.boolean(),
        head_id: z.string().nullish().or(z.literal(''))
    }).optional(),

    // Banking
    bank_name: z.string().nullish().or(z.literal('')),
    account_holder_name: z.string().nullish().or(z.literal('')),
    account_number: z.string().nullish().or(z.literal('')),
    ifsc_code: z.string().nullish().or(z.literal('')),
    account_type: z.enum(['SAVINGS', 'CURRENT']).nullish().or(z.literal('')),
    pan_number: z.string().nullish().or(z.literal('')),
    upi_id: z.string().nullish().or(z.literal('')),
    upi_linked_mobile: z.string().nullish().or(z.literal('')),
    payment_method: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE', 'UPI']).nullish().or(z.literal('')),
}).superRefine((data, ctx) => {
    if (data.ledger_options?.create && !data.ledger_options.head_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Account Head is required",
            path: ["ledger_options", "head_id"]
        });
    }
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface StaffFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
}

const StaffFormModal = ({ isOpen, onClose, initialData }: StaffFormModalProps) => {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<'profile' | 'details' | 'payroll' | 'finance'>('profile');
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingData, setPendingData] = useState<StaffFormValues | null>(null);
    const [filterAccountType, setFilterAccountType] = useState<string>(''); // For Finance Section
    const isEditMode = !!initialData;

    const { data: staffList } = useQuery({
        queryKey: ['staff-list-simple'],
        queryFn: async () => (await api.get('/team/staff')).data
    });

    const { data: accountHeads } = useQuery({
        queryKey: ['accountHeads'],
        queryFn: async () => (await api.get('/accounting/heads')).data,
        enabled: isOpen
    });

    // Fetch next auto-generated staff ID (create mode only)
    const { data: nextIdData } = useQuery({
        queryKey: ['next-staff-id'],
        queryFn: async () => (await api.get('/team/staff/next-id')).data,
        enabled: isOpen && !isEditMode,
    });

    const form = useForm<StaffFormValues>({
        resolver: zodResolver(staffSchema) as any,
        defaultValues: {
            department: 'MARKETING',
            role: 'DM_EXECUTIVE',
            date_of_joining: new Date().toISOString().split('T')[0],
            marital_status: 'SINGLE',
            staff_number: '',
            designation: '',
            ledger_options: { create: false, head_id: '' },
            payment_method: 'BANK_TRANSFER'
        }
    });

    const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = form;

    const selectedDesignation = watch('designation');

    useEffect(() => {
        if (initialData) {
            let designation = initialData.designation || '';
            let custom_designation = '';

            // Logic: If designation value is NOT in the standard list, select "Other" and fill custom input
            if (designation && !AGENCY_DESIGNATIONS.includes(designation)) {
                custom_designation = designation;
                designation = 'Other';
            }

            reset({
                ...initialData.user,
                ...initialData,
                designation,
                custom_designation,
                date_of_joining: initialData.date_of_joining ? new Date(initialData.date_of_joining).toISOString().split('T')[0] : '',
                date_of_birth: initialData.date_of_birth ? new Date(initialData.date_of_birth).toISOString().split('T')[0] : '',
                reporting_manager_id: initialData.reporting_manager_id || '',
                // Keep current role — don't let it be changed here
                role: initialData.user?.role || 'DM_EXECUTIVE',
                password: undefined, // Don't pre-fill password
                ledger_options: initialData.ledger_options || { create: false, head_id: '' },
            });
        }
    }, [initialData, reset]);

    // Auto-fill Staff ID in create mode
    useEffect(() => {
        if (!isEditMode && nextIdData?.next_id) {
            setValue('staff_number', nextIdData.next_id);
        }
    }, [nextIdData, isEditMode, setValue]);


    const watchedHeadId = watch('ledger_options.head_id');

    // Fix: Initialize filterAccountType when editing and head is selected (Dynamic)
    useEffect(() => {
        if (watchedHeadId && accountHeads) {
            const head = accountHeads.find((h: any) => h.id === watchedHeadId);
            if (head) {
                setFilterAccountType(head.type);
            }
        }
    }, [watchedHeadId, accountHeads]);

    const onFormSubmit = (data: StaffFormValues) => {
        setPendingData(data);
        setShowConfirm(true);
    };

    const handleConfirmSave = () => {
        if (pendingData) {
            mutation.mutate(pendingData);
            setShowConfirm(false);
        }
    };

    const isSaveAndClose = React.useRef(false);

    const mutation = useMutation({
        mutationFn: async (data: StaffFormValues) => {
            const finalDesignation = data.designation === 'Other' ? data.custom_designation : data.designation;

            const payload: any = {
                ...data,
                designation: finalDesignation || undefined,
                // In edit mode, don't send role (managed via Settings)
                // In create mode, send default role
                role: isEditMode ? undefined : (data.role || 'DM_EXECUTIVE'),
                // Sanitize sensitive or empty fields
                password: (isEditMode && !data.password) ? undefined : data.password,
                reporting_manager_id: data.reporting_manager_id || undefined,
            };

            // Clean up temporary field
            delete payload.custom_designation;

            if (isEditMode) {
                return await api.patch(`/team/staff/${initialData.id}`, payload);
            } else {
                return await api.post('/team/staff/onboard', payload);
            }
        },
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['staff'] });

            if (isSaveAndClose.current) {
                onClose();
                reset();
                setTab('profile'); // Reset tab
            }

            Swal.fire({
                title: isSaveAndClose.current ? 'Success!' : 'Saved!',
                text: isSaveAndClose.current ? 'Staff profile updated successfully.' : 'Progress saved. You can continue editing.',
                icon: 'success',
                confirmButtonColor: '#8b5cf6', // Primary Purple
                timer: 1500,
                timerProgressBar: true
            });
        },
        onError: (err: any) => {
            console.error(err);
            let msg = err.response?.data?.message || err.message || "Failed to save.";

            // Format Zod Errors nicely
            if (Array.isArray(msg)) {
                msg = "Validation Errors:\n" + msg.map((e: any) => `- ${e.path.join('.')}: ${e.message}`).join('\n');
            } else if (typeof msg === 'object') {
                msg = JSON.stringify(msg, null, 2);
            }

            alert(msg);
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">

            {/* Confirmation Modal Overlay */}
            {showConfirm && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                    <div className="bg-white p-6 rounded-lg shadow-2xl border max-w-sm w-full animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-foreground mb-2">Confirm Save</h3>
                        <p className="text-gray-600 mb-6 text-sm">
                            Are you sure you want to {isEditMode ? 'update' : 'onboard'} this staff member? This will update the system immediately.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 text-muted-foreground hover:bg-muted/30 rounded-md font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSave}
                                className="px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-md font-medium text-sm"
                            >
                                Yes, Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Box */}
            <div className="bg-background text-foreground border border-border rounded-xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b bg-muted/30 border-border">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">{isEditMode ? 'Edit Staff Profile' : 'New Staff Onboarding'}</h2>
                        <p className="text-sm text-gray-500">Complete the profile to grant system access.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-white px-6 pt-2">
                    {[
                        { id: 'profile', label: '1. Profile & Access', icon: User },
                        { id: 'details', label: '2. Personal & HR', icon: Briefcase },
                        { id: 'payroll', label: '3. Payroll & Bank', icon: Lock },
                        { id: 'finance', label: '4. Finance Account', icon: GraduationCap }, // Swapped Icon for distinctness or use Coins/Dollar Sign if available
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-medium transition-all ${tab === t.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-foreground'
                                }`}
                        >
                            <t.icon size={16} />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Error Alert */}
                {Object.keys(errors).length > 0 && (
                    <div className="px-6 pt-4">
                        <FormErrorAlert errors={errors} />
                    </div>
                )}

                {/* Form Content - Scrollable */}
                <form onSubmit={handleSubmit(onFormSubmit as any)} className="flex-1 overflow-y-auto p-6 bg-gray-50/30">

                    {/* TAB 1: PROFILE & ACCESS */}
                    {tab === 'profile' && (
                        <div className="flex gap-5 animate-in fade-in slide-in-from-bottom-2">
                            {/* Left: Profile Photo - Compact */}
                            <div className="flex flex-col items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm w-36 shrink-0 h-fit">
                                <label className="block text-xs font-medium text-foreground mb-2 self-start">Photo</label>
                                <ImageUpload
                                    value={watch('avatar_url') || undefined}
                                    onChange={(url) => setValue('avatar_url', url)}
                                    label="Upload"
                                />
                                <p className="text-[10px] text-gray-400 mt-2 text-center">JPG/PNG · Max 2MB</p>
                            </div>

                            {/* Right: All Fields */}
                            <div className="flex-1 space-y-3">
                                {/* Row 1: Name */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Full Name <span className="text-red-500">*</span></label>
                                    <input {...register('full_name')} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. Sarah Jones" />
                                    {errors.full_name && <p className="text-red-500 text-xs mt-0.5">{errors.full_name.message}</p>}
                                </div>

                                {/* Row 2: Email + Mobile */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Email <span className="text-red-500">*</span></label>
                                        <input {...register('email')} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="sarah@qixads.com" />
                                        {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Mobile <span className="text-red-500">*</span></label>
                                        <input {...register('personal_contact')} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="+91 98765 43210" />
                                        {errors.personal_contact && <p className="text-red-500 text-xs mt-0.5">{errors.personal_contact.message}</p>}
                                    </div>
                                </div>

                                {/* Password - create mode only */}
                                {!isEditMode && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Password <span className="text-red-500">*</span></label>
                                            <input type="password" {...register('password')} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="******" />
                                            {errors.password && <p className="text-red-500 text-xs mt-0.5">{errors.password.message}</p>}
                                        </div>
                                    </div>
                                )}

                                {/* Work Identifiers */}
                                <div className="border-t pt-3">
                                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                                        <Briefcase size={14} className="text-gray-400" /> Work Identifiers
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Staff ID <span className="text-red-500">*</span>
                                                {!isEditMode && <span className="ml-2 text-[10px] bg-green-100 text-green-700 rounded px-1.5 py-0.5 font-medium">Auto</span>}
                                            </label>
                                            <input
                                                {...register('staff_number')}
                                                readOnly={!isEditMode}
                                                className={`w-full p-2.5 border rounded-lg outline-none transition-all uppercase ${!isEditMode ? 'bg-gray-50 text-gray-500 cursor-default border-gray-200' : 'focus:ring-2 focus:ring-primary/20'}`}
                                                placeholder="QIX0001"
                                            />
                                            {errors.staff_number && <p className="text-red-500 text-xs mt-0.5">{errors.staff_number.message}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Designation</label>
                                            <select {...register('designation')} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white">
                                                <option value="">Select...</option>
                                                {AGENCY_DESIGNATIONS.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                                <option value="Other">Other (Type below)</option>
                                            </select>
                                            {selectedDesignation === 'Other' && (
                                                <input {...register('custom_designation')} placeholder="Enter Custom Designation" className="w-full mt-1 p-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all animate-in fade-in" />
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Department <span className="text-red-500">*</span></label>
                                            <select {...register('department')} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white">
                                                <option value="MARKETING">Marketing</option>
                                                <option value="CREATIVE">Creative</option>
                                                <option value="WEB_SEO">Web & SEO</option>
                                                <option value="MANAGEMENT">Management</option>
                                                <option value="ADMIN">Admin / HR</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Date of Joining</label>
                                            <input type="date" {...register('date_of_joining')} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-foreground mb-1">Reporting Manager</label>
                                            <select {...register('reporting_manager_id')} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white">
                                                <option value="">None (Self-Managed)</option>
                                                {staffList?.map((s: any) => (
                                                    <option key={s.user.id} value={s.user.id}>{s.user.full_name} ({s.designation})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: PERSONAL & HR */}
                    {tab === 'details' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                            {/* Personal Info */}
                            <div>
                                <h4 className="font-semibold text-foreground mb-4 pb-2 border-b flex items-center gap-2">
                                    <User size={18} className="text-blue-500" /> Personal Information
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label className="label">Personal Mobile</label>
                                        <input {...register('personal_contact')} className={inputClass} placeholder="+91 98765 43210" />
                                    </div>
                                    <div>
                                        <label className="label">WhatsApp</label>
                                        <input {...register('whatsapp_number')} className={inputClass} placeholder="+91 98765 43210" />
                                    </div>
                                    <div>
                                        <label className="label">Personal Email</label>
                                        <input {...register('personal_email')} className={inputClass} placeholder="personal@gmail.com" />
                                    </div>
                                    <div>
                                        <label className="label">Date of Birth</label>
                                        <input type="date" {...register('date_of_birth')} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="label">Marital Status</label>
                                        <select {...register('marital_status')} className={inputClass}>
                                            <option value="SINGLE">Single</option>
                                            <option value="MARRIED">Married</option>
                                            <option value="DIVORCED">Divorced</option>
                                            <option value="WIDOWED">Widowed</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <label className="label">Residential Address</label>
                                        <textarea {...register('address')} rows={2} className={inputClass} placeholder="Full address..." />
                                    </div>
                                </div>
                            </div>

                            {/* Emergency & Past */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="font-semibold text-foreground mb-4 pb-2 border-b flex items-center gap-2">
                                        <Heart size={18} className="text-red-500" /> Emergency Contact
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="label">Contact Person</label>
                                            <input {...register('emergency_contact_name')} className={inputClass} placeholder="Name" />
                                        </div>
                                        <div>
                                            <label className="label">Emergency Number</label>
                                            <input {...register('emergency_contact_number')} className={inputClass} placeholder="Phone" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-foreground mb-4 pb-2 border-b flex items-center gap-2">
                                        <GraduationCap size={18} className="text-gray-500" /> Experience
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="label">Previous Company</label>
                                            <input {...register('previous_company')} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className="label">Total Expr (Years)</label>
                                            <input type="number" step="0.1" {...register('total_experience_years')} className={inputClass} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: PAYROLL & BANKING */}
                    {tab === 'payroll' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                            {/* Salary Config */}
                            <div className="bg-muted/30 p-6 rounded-xl border border-border">
                                <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                                    <Lock size={18} /> Salary Configuration
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        {/* Base Salary Removed - Managed in Payroll Module */}
                                        <label className="label text-gray-400">Base Salary</label>
                                        <input disabled className={`${inputClass} bg-muted text-muted-foreground cursor-not-allowed`} value="Manage in Payroll" />
                                    </div>
                                    <div>
                                        <label className="label">Salary Type</label>
                                        <select {...register('salary_type')} className={`${inputClass} border-blue-200`}>
                                            <option value="MONTHLY">Monthly</option>
                                            <option value="DAILY">Daily</option>
                                            <option value="CONTRACT">Contract</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Payroll Status</label>
                                        <select {...register('payroll_status')} className={`${inputClass} border-blue-200`}>
                                            <option value="ACTIVE">Active</option>
                                            <option value="HOLD">Hold (No Payout)</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-3 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" {...register('incentive_eligible')} className="w-4 h-4 text-blue-600 rounded" />
                                            <span className="text-sm text-foreground">Eligible for Performance Incentives/Commissions</span>
                                        </div>
                                    </div>
                                </div>
                            </div>




                            {/* Bank Details */}
                            <div>
                                <h4 className="font-semibold text-foreground mb-4 pb-2 border-b">Bank Account Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="label">Bank Name</label>
                                        <input {...register('bank_name')} className={inputClass} placeholder="e.g. HDFC Bank" />
                                    </div>
                                    <div>
                                        <label className="label">Account Holder</label>
                                        <input {...register('account_holder_name')} className={inputClass} placeholder="As on Passbook" />
                                    </div>
                                    <div>
                                        <label className="label">Account Number</label>
                                        <input {...register('account_number')} className={inputClass} placeholder="XXXXXXX" />
                                    </div>
                                    <div>
                                        <label className="label">IFSC Code</label>
                                        <input {...register('ifsc_code')} className="input-std uppercase" placeholder="Upper Case" />
                                    </div>
                                    <div>
                                        <label className="label">Payment Mode</label>
                                        <select {...register('payment_method')} className={inputClass}>
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                            <option value="CASH">Cash</option>
                                            <option value="CHEQUE">Cheque</option>
                                            <option value="UPI">UPI</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Account Type</label>
                                        <select {...register('account_type')} className={inputClass}>
                                            <option value="SAVINGS">Savings</option>
                                            <option value="CURRENT">Current</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">PAN Number</label>
                                        <input {...register('pan_number')} className={inputClass} placeholder="ABCDE1234F" />
                                    </div>
                                </div>
                            </div>

                            {/* UPI */}
                            <div>
                                <h4 className="font-semibold text-foreground mb-4 pb-2 border-b">UPI / Digital Payment</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="label">UPI ID</label>
                                        <input {...register('upi_id')} className={inputClass} placeholder="user@bank" />
                                    </div>
                                    <div>
                                        <label className="label">Linked Mobile</label>
                                        <input {...register('upi_linked_mobile')} className={inputClass} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* TAB 4: FINANCE ACCOUNT (Recovered) */}
                    {tab === 'finance' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                            <div className="bg-muted/30 p-6 rounded-xl border border-border">
                                <h4 className="font-semibold text-primary mb-4 flex items-center gap-2">
                                    <Briefcase size={18} /> Finance Account / Ledger
                                </h4>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Create or link a ledger account for this staff member to track payroll, expenses, and payments.
                                </p>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <input
                                            type="checkbox"
                                            id="create_ledger"
                                            {...register('ledger_options.create')}
                                            disabled={initialData?.ledger_options?.create}
                                            className="w-4 h-4 text-primary border-primary/20 rounded focus:ring-purple-500 disabled:opacity-50"
                                        />
                                        <label htmlFor="create_ledger" className={`text-sm font-medium ${initialData?.ledger_options?.create ? 'text-gray-500' : 'text-foreground'}`}>
                                            {initialData?.ledger_options?.create
                                                ? "Finance Account / Ledger (Already Linked)"
                                                : "Create Finance Account / Ledger"
                                            }
                                        </label>
                                    </div>

                                    {(watch('ledger_options.create') || initialData?.ledger_options?.create) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white rounded-lg border border-purple-100 animate-in fade-in slide-in-from-top-2">
                                            <div>
                                                <label className="label">Account Type</label>
                                                <select
                                                    className={inputClass}
                                                    value={filterAccountType}
                                                    disabled={!!initialData?.ledger_options?.create}
                                                    onChange={(e) => setFilterAccountType(e.target.value)}
                                                >
                                                    <option value="">All Types</option>
                                                    <option value="ASSET">Asset</option>
                                                    <option value="LIABILITY">Liability</option>
                                                    <option value="EXPENSE">Expense</option>
                                                    <option value="INCOME">Income</option>
                                                </select>
                                                <p className="text-xs text-gray-400 mt-1">Filter heads by type</p>
                                            </div>
                                            <div>
                                                <label className="label">Account Head</label>
                                                <select
                                                    {...register('ledger_options.head_id')}
                                                    disabled={!!initialData?.ledger_options?.create}
                                                    className={inputClass}
                                                >
                                                    <option value="">Select Head...</option>
                                                    {accountHeads
                                                        ?.filter((h: any) => !filterAccountType || h.type === filterAccountType)
                                                        .map((h: any) => (
                                                            <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                                                        ))}
                                                </select>
                                                <p className="text-xs text-gray-400 mt-1">Select the parent ledger Head</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </form>

                {/* Footer Actions */}
                <div className="p-5 border-t bg-muted/30 border-border flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        Cancel
                    </button>

                    {tab === 'profile' && (
                        <>
                            <button
                                onClick={() => {
                                    isSaveAndClose.current = false;
                                    handleSubmit(onFormSubmit as any)();
                                }}
                                className="px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 rounded-md shadow-sm transition-colors flex items-center gap-2"
                            >
                                <Save size={16} /> Save
                            </button>
                            <button onClick={() => setTab('details')} className="btn-primary">
                                Next: Personal & HR
                            </button>
                        </>
                    )}
                    {tab === 'details' && (
                        <>
                            <button onClick={() => setTab('profile')} className="btn-secondary">Back</button>
                            <button
                                onClick={() => {
                                    isSaveAndClose.current = false;
                                    handleSubmit(onFormSubmit as any)();
                                }}
                                className="px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 rounded-md shadow-sm transition-colors flex items-center gap-2"
                            >
                                <Save size={16} /> Save
                            </button>
                            <button onClick={() => setTab('payroll')} className="btn-primary">Next: Payroll</button>
                        </>
                    )}
                    {tab === 'payroll' && (
                        <>
                            <button onClick={() => setTab('details')} className="btn-secondary">Back</button>
                            <button
                                onClick={() => {
                                    isSaveAndClose.current = false;
                                    handleSubmit(onFormSubmit as any)();
                                }}
                                className="px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 rounded-md shadow-sm transition-colors flex items-center gap-2"
                            >
                                <Save size={16} /> Save
                            </button>
                            <button onClick={() => setTab('finance')} className="btn-primary">Next: Finance</button>
                        </>
                    )}
                    {tab === 'finance' && (
                        <>
                            <button onClick={() => setTab('payroll')} className="btn-secondary">Back</button>
                            <button
                                onClick={() => {
                                    isSaveAndClose.current = true;
                                    handleSubmit(onFormSubmit as any, (errors) => {
                                        console.error("Frontend Validation Errors:", errors);
                                        let msg = "Please check the form for errors:\n";
                                        Object.keys(errors).forEach(key => {
                                            const err = errors[key as keyof StaffFormValues];
                                            if (err?.message) msg += `- ${key}: ${err.message}\n`;
                                            else if (key === 'ledger_options') msg += `- Finance Account: Check details\n`;
                                        });
                                        alert(msg);
                                    })();
                                }}
                                disabled={isSubmitting}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Save size={18} />
                                {isSubmitting ? 'Saving...' : (isEditMode ? 'Save and Close' : 'Complete Onboarding')}
                            </button>
                        </>
                    )}
                </div>

            </div >

            {/* Custom Styles Scoped to this Component */}
            < style > {`
                .label { display: block; font-size: 0.85rem; font-weight: 500; color: #4b5563; margin-bottom: 0.25rem; }
                .input-std { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; outline: none; transition: all 0.2s; font-size: 0.9rem; }
                .input-std:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
                .btn-primary { background-color: #0f172a; color: white; padding: 0.6rem 1.5rem; border-radius: 0.5rem; font-weight: 500; font-size: 0.9rem; transition: background 0.2s; }
                .btn-primary:hover { background-color: #1e293b; }
                .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
                .btn-secondary { background-color: transparent; color: #4b5563; padding: 0.6rem 1.25rem; font-weight: 500; font-size: 0.9rem; border: 1px solid #d1d5db; border-radius: 0.5rem; }
                .btn-secondary:hover { background-color: #f3f4f6; }
            `}</style >
        </div >
    );
};

export default StaffFormModal;
