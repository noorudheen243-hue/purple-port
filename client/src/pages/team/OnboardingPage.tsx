import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, FileText, CheckCircle, ArrowRight, ArrowLeft, Upload, Lock as LockIcon, GraduationCap, Edit2 } from 'lucide-react';
import api from '../../lib/api';
import ImageUpload from '../../components/ui/ImageUpload';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import FormErrorAlert from '../../components/ui/FormErrorAlert';

// --- Configuration & Constants ---
const AGENCY_DESIGNATIONS = [
    "CO-FOUNDER", "Creative Director", "Art Director", "Senior Graphic Designer", "Graphic Designer",
    "Copywriter", "Content Strategist", "Social Media Manager", "Social Media Executive",
    "SEO Specialist", "Web Developer", "Account Director", "Account Manager",
    "Client Servicing Executive", "Media Planner", "Media Buyer", "Operations Manager",
    "HR Manager", "Office Administrator", "Intern"
];

const SHIFT_TIMINGS = [
    "09:00 AM – 05:00 PM",
    "09:30 AM – 05:30 PM",
    "10:00 AM – 06:00 PM",
    "10:30 AM – 06:30 PM",
    "11:00 AM – 07:00 PM",
    "Flexible / On-Demand"
];

const STEPS = [
    { id: 1, label: 'Profile & Contact', icon: User },
    { id: 2, label: 'Role & Department', icon: Briefcase },
    { id: 3, label: 'Payroll & Bank', icon: LockIcon },
    { id: 4, label: 'Documents & Review', icon: FileText },
];

// --- Extended Schema with "New Fields" ---
const onboardingSchema = z.object({
    // Step 1: Personal
    full_name: z.string().min(1, "Name is required"), // Keep minimal check
    email: z.string().email().optional().or(z.literal('')),
    avatar_url: z.string().optional(),
    personal_contact: z.string().optional(),
    whatsapp_number: z.string().optional(),
    date_of_birth: z.string().optional(), // Relaxed
    gender: z.string().optional().nullable(),
    blood_group: z.string().optional().nullable(),
    current_address: z.string().optional().nullable(), // Relaxed & Nullable
    permanent_address: z.string().optional().nullable(), // Relaxed & Nullable

    // Step 2: Professional
    staff_number: z.string().optional(),
    designation: z.string().optional(),
    custom_designation: z.string().optional(),
    department: z.string().optional(),
    date_of_joining: z.string().optional(),
    reporting_manager_id: z.string().optional(),
    shift_timing: z.string().optional(),

    // Step 3: Payroll
    base_salary: z.any().optional(),
    salary_type: z.string().optional(),
    payment_method: z.string().optional(),
    bank_name: z.string().optional(),
    account_number: z.string().optional(),
    ifsc_code: z.string().optional(),
    pan_number: z.string().optional(),
    aadhar_number: z.string().optional(),
    ledger_options: z.object({
        create: z.boolean(),
        head_id: z.string().optional()
    }).optional(),

    // Step 4: Documents
    resume_url: z.string().optional(),
    id_proof_url: z.string().optional(),
    password: z.string().optional(),
    confirm_password: z.string().optional(),
    role: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.password || data.confirm_password) {
        if (data.password !== data.confirm_password) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Passwords must match",
                path: ["confirm_password"]
            });
        }
    }
    if (data.ledger_options?.create && !data.ledger_options.head_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Account Head is required to link ledger",
            path: ["ledger_options", "head_id"]
        });
    }
});

type FormValues = z.infer<typeof onboardingSchema>;

const OnboardingPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [currentStep, setCurrentStep] = useState(1);

    // Animation Variants
    const variants = {
        enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0 }),
    };
    const [direction, setDirection] = useState(0);

    const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(onboardingSchema) as any,
        mode: 'onChange',
        defaultValues: {
            salary_type: 'MONTHLY',
            department: 'MARKETING',
            staff_number: '',
            designation: '',
            ledger_options: {
                create: true,
                head_id: ''
            }
        }
    });

    const formData = watch();
    const [filterAccountType, setFilterAccountType] = useState<string>('');

    const { data: accountHeads } = useQuery({
        queryKey: ['accountHeads'],
        queryFn: async () => (await api.get('/accounting/heads')).data
    });

    const watchedHeadId = watch('ledger_options.head_id');

    // Fix: Initialize filterAccountType when editing and head is selected
    useEffect(() => {
        if (watchedHeadId && accountHeads) {
            const head = accountHeads.find((h: any) => h.id === watchedHeadId);
            if (head) {
                setFilterAccountType(head.type);
            }
        }
    }, [watchedHeadId, accountHeads]);

    const handleNext = async () => {
        // Validate current step fields before moving
        let fieldsToValidate: any[] = [];
        if (currentStep === 1) fieldsToValidate = ['full_name', 'email', 'personal_contact', 'date_of_birth', 'current_address'];
        if (currentStep === 2) fieldsToValidate = ['staff_number', 'designation', 'department', 'date_of_joining', 'role'];
        if (currentStep === 3) fieldsToValidate = ['base_salary', 'salary_type', 'ledger_options'];

        const isValid = await trigger(fieldsToValidate);
        if (isValid) {
            setDirection(1);
            setCurrentStep(prev => Math.min(prev + 1, 4));
        }
    };

    const handleBack = () => {
        setDirection(-1);
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const mutation = useMutation({
        mutationFn: async (data: FormValues) => {
            const finalDesignation = data.designation === 'Other' ? data.custom_designation : data.designation;
            if (!finalDesignation) throw new Error("Designation is required");

            const payload = {
                ...data,
                designation: finalDesignation,
                // Clean up UI-only fields
                confirm_password: undefined,
                custom_designation: undefined
            };

            if (isEditMode) {
                // UPDATE logic
                return await api.patch(`/team/staff/${id}`, payload);
            } else {
                // CREATE logic
                return await api.post('/team/staff/onboard', payload);
            }
        },
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['staff'] });
            alert(isEditMode ? "Staff Profile Updated Successfully!" : "Staff Onboarded Successfully!");
            navigate('/dashboard/team');
        },
        onError: (err: any) => {
            console.error("Submission Error:", err);
            const msg = err.response?.data?.message || err.message || "Operation Failed";
            // Check if specific field errors are returned
            if (err.response?.data?.errors) {
                alert(`Validation Failed:\n${JSON.stringify(err.response.data.errors, null, 2)}`);
            } else {
                alert(typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg);
            }
        }
    });

    // --- EDIT MODE LOGIC ---
    const { id } = useParams();
    const isEditMode = Boolean(id);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLedgerLocked, setIsLedgerLocked] = useState(false);

    // Initialize isLedgerLocked when fetching existing staff details
    useEffect(() => {
        if (id && id !== 'new') {
            // Check if ledger was created.
            // Since we don't have the full object here yet until `getStaffById` runs,
            // we will set it inside the `api.get` call below.
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            api.get(`/team/staff/${id}`).then(res => {
                const data = res.data;
                // Transform API data to Form values
                // e.g. handle Dates, set custom designation logic
                if (data.designation && !AGENCY_DESIGNATIONS.includes(data.designation)) {
                    setValue('custom_designation', data.designation);
                    setValue('designation', 'Other');
                } else {
                    setValue('designation', data.designation);
                }

                // Set other fields
                Object.keys(data).forEach(key => {
                    // Care with Dates, might need formatting yyyy-MM-dd
                    if (key === 'date_of_birth' || key === 'date_of_joining') {
                        if (data[key]) setValue(key as any, new Date(data[key]).toISOString().split('T')[0]);
                    } else if (key === 'shift_timing') {
                        // Ensure we set the shift timing if present
                        setValue('shift_timing', data[key]);
                    } else {
                        setValue(key as any, data[key]);
                    }
                });
                if (data.department) setValue('department', data.department);

                // Set User fields if nested
                if (data.user) {
                    setValue('full_name', data.user.full_name);
                    setValue('email', data.user.email);
                    setValue('role', data.user.role);
                    setValue('avatar_url', data.user.avatar_url);
                }

                // Explicitly set ledger options
                if (data.ledger_options) {
                    setValue('ledger_options', data.ledger_options);
                    // Force update specific fields if nested setValue is quirky
                    setValue('ledger_options.create', data.ledger_options.create);
                    setValue('ledger_options.head_id', data.ledger_options.head_id);
                    if (data.ledger_options.create) {
                        setIsLedgerLocked(true);
                    }
                }

            }).catch(err => console.error("Failed to fetch staff details", err));
        }
    }, [id, setValue]);

    const title = isEditMode ? "Edit Team Member" : "Onboard New Team Member";
    const subtitle = isEditMode ? "Update profile details and role permissions." : "Complete the 4-step process to grant system access.";

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            {/* Header */}
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
                <p className="text-gray-500 mt-2">{subtitle}</p>
            </div>

            {/* Stepper */}
            <div className="relative flex justify-between items-center w-full max-w-3xl mx-auto mb-12">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2 rounded-full" />
                <div
                    className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-500"
                    style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                />

                {STEPS.map((step) => {
                    const isActive = currentStep >= step.id;
                    const isCurrent = currentStep === step.id;
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-white border-gray-300 text-gray-400'
                                } ${isCurrent ? 'ring-4 ring-primary/20 scale-110' : ''}`}>
                                <step.icon size={18} />
                            </div>
                            <span className={`text-xs font-semibold whitespace-nowrap ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Form Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[500px] flex flex-col">
                <div className="flex-1 overflow-x-hidden">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="h-full"
                        >
                            {/* --- STEP 1: PERSONAL --- */}
                            {currentStep === 1 && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="col-span-1 space-y-4 text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <label className="block text-sm font-semibold text-gray-700">Profile Photo</label>
                                        <div className="flex justify-center">
                                            <ImageUpload
                                                value={watch('avatar_url')}
                                                onChange={(url) => setValue('avatar_url', url)}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="label">Full Legal Name <span className="text-red-500">*</span></label>
                                            <input {...register('full_name')} className="input-field" placeholder="As per Id Proof" />
                                            {errors.full_name && <span className="error">{errors.full_name.message}</span>}
                                        </div>
                                        <div>
                                            <label className="label">Personal Email <span className="text-red-500">*</span></label>
                                            <input {...register('email')} className="input-field" placeholder="For login & contact" />
                                            {errors.email && <span className="error">{errors.email.message}</span>}
                                        </div>
                                        <div>
                                            <label className="label">Date of Birth <span className="text-red-500">*</span></label>
                                            <input type="date" {...register('date_of_birth')} className="input-field" />
                                            {errors.date_of_birth && <span className="error">{errors.date_of_birth.message}</span>}
                                        </div>
                                        <div>
                                            <label className="label">Phone Number <span className="text-red-500">*</span></label>
                                            <input {...register('personal_contact')} className="input-field" placeholder="+91..." />
                                            {errors.personal_contact && <span className="error">{errors.personal_contact.message}</span>}
                                        </div>
                                        <div>
                                            <label className="label">Blood Group</label>
                                            <select {...register('blood_group')} className="input-field">
                                                <option value="">Select...</option>
                                                <option value="A+">A+</option>
                                                <option value="B+">B+</option>
                                                <option value="O+">O+</option>
                                                <option value="AB+">AB+</option>
                                                <option value="A-">A-</option>
                                                <option value="B-">B-</option>
                                                <option value="O-">O-</option>
                                                <option value="AB-">AB-</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="label">Current Address</label>
                                            <textarea {...register('current_address')} className="input-field" rows={2} placeholder="Full residential address" />
                                            {errors.current_address && <span className="error">{errors.current_address.message}</span>}
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="label">Permanent Address</label>
                                            <textarea {...register('permanent_address')} className="input-field" rows={2} placeholder="Same as current if applicable" />
                                            {errors.permanent_address && <span className="error">{errors.permanent_address.message}</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- STEP 2: PROFESSIONAL --- */}
                            {currentStep === 2 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                                    <div>
                                        <label className="label">Staff ID <span className="text-red-500">*</span></label>
                                        <input {...register('staff_number')} className="input-field font-mono uppercase" placeholder="e.g. QIX-001" />
                                        {errors.staff_number && <span className="error">{errors.staff_number.message}</span>}
                                    </div>
                                    <div>
                                        <label className="label">Department <span className="text-red-500">*</span></label>
                                        <select {...register('department')} className="input-field">
                                            <option value="MARKETING">Marketing</option>
                                            <option value="CREATIVE">Creative</option>
                                            <option value="WEB_SEO">Web & SEO</option>
                                            <option value="MANAGEMENT">Management</option>
                                            <option value="ADMIN">Admin / HR</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="label">Designation <span className="text-red-500">*</span></label>
                                        <div className="space-y-2">
                                            <select {...register('designation')} className="input-field">
                                                <option value="">Select Role...</option>
                                                {AGENCY_DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                                <option value="Other">Other (Custom)</option>
                                            </select>
                                            {watch('designation') === 'Other' && (
                                                <input {...register('custom_designation')} className="input-field animate-in fade-in" placeholder="Type custom designation..." />
                                            )}
                                        </div>
                                        {errors.designation && <span className="error">{errors.designation.message}</span>}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="label">System Access Role <span className="text-red-500">*</span></label>
                                        {watch('role') === 'DEVELOPER_ADMIN' ? (
                                            <div className="relative">
                                                <input
                                                    disabled
                                                    value="Developer Admin (Super User)"
                                                    className="input-field bg-red-50 text-red-700 font-bold border-red-200 opacity-100 cursor-not-allowed"
                                                />
                                                <LockIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" size={16} />
                                                <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                                                    <LockIcon size={10} /> This role is permanently locked to this account.
                                                </p>
                                                {/* Hidden input to maintain form state */}
                                                <input type="hidden" {...register('role')} />
                                            </div>
                                        ) : (
                                            <>
                                                <select {...register('role')} className="input-field bg-blue-50/50 border-blue-200">
                                                    <option value="">Select System Permission...</option>
                                                    <option value="ADMIN">Admin (Full Access)</option>
                                                    <option value="MANAGER">Manager (Team & Clients)</option>
                                                    <option value="DM_EXECUTIVE">DM Executive</option>
                                                    <option value="WEB_SEO_EXECUTIVE">Web & SEO Executive</option>
                                                    <option value="CREATIVE_DESIGNER">Creative Designer</option>
                                                    <option value="OPERATIONS_EXECUTIVE">Operations Executive</option>
                                                </select>
                                                <p className="text-xs text-gray-500 mt-1">Determines what they can see in the dashboard.</p>
                                            </>
                                        )}
                                        {errors.role && <span className="error">{errors.role.message}</span>}
                                    </div>
                                    <div>
                                        <label className="label">Date of Joining <span className="text-red-500">*</span></label>
                                        <input type="date" {...register('date_of_joining')} className="input-field" />
                                        {errors.date_of_joining && <span className="error">{errors.date_of_joining.message}</span>}
                                    </div>
                                    <div>
                                        <label className="label">Shift Timing</label>
                                        <select {...register('shift_timing')} className="input-field">
                                            <option value="">Select Shift...</option>
                                            {SHIFT_TIMINGS.map(shift => (
                                                <option key={shift} value={shift}>{shift}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* --- STEP 3: PAYROLL --- */}
                            {currentStep === 3 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                                    <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100 mb-2">
                                        <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2"><LockIcon size={16} /> Salary Configuration</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label text-gray-500">Base Salary (Monthly)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                                                    <input disabled className="input-field pl-8 bg-gray-100 text-gray-400 cursor-not-allowed" value="0 (Manage in Payroll)" />
                                                    {/* Hidden input to satisfy form if needed, or update schema to optional */}
                                                    <input type="hidden" {...register('base_salary')} value={0} />
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-1">Set in Salary Calculator after onboarding.</p>
                                            </div>
                                            <div>
                                                <label className="label">Type</label>
                                                <select {...register('salary_type')} className="input-field">
                                                    <option value="MONTHLY">Monthly Salaried</option>
                                                    <option value="CONTRACT">Contract / Retainer</option>
                                                    <option value="DAILY">Daily Wage</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* NEW: Finance Ledger Section */}
                                    <div className="md:col-span-2 bg-purple-50 p-4 rounded-lg border border-purple-100">
                                        <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                            <GraduationCap size={18} /> Finance Account (Ledger)
                                        </h4>

                                        <div className="flex items-start gap-3 mb-4">
                                            <input
                                                type="checkbox"
                                                {...register('ledger_options.create')}
                                                className="mt-1 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                                id="create_staff_ledger_page"
                                            />
                                            <div>
                                                <label htmlFor="create_staff_ledger_page" className="font-medium text-gray-900 cursor-pointer text-sm">Create/Link Ledger Account</label>
                                                <p className="text-xs text-gray-500">Track salary payable & advances automatically.</p>
                                            </div>
                                        </div>

                                        {watch('ledger_options.create') && (
                                            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                                <div className="col-span-2 flex justify-end">
                                                    {isLedgerLocked && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsLedgerLocked(false)}
                                                            className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-100 transition-colors"
                                                        >
                                                            <Edit2 size={12} /> Edit
                                                        </button>
                                                    )}
                                                </div>
                                                <div className={isLedgerLocked ? "opacity-60 pointer-events-none grayscale" : ""}>
                                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Filter Type</label>
                                                    <select
                                                        value={filterAccountType}
                                                        disabled={isLedgerLocked}
                                                        onChange={(e) => setFilterAccountType(e.target.value)}
                                                        className="w-full border p-2 rounded text-sm bg-white"
                                                    >
                                                        <option value="">All Types</option>
                                                        <option value="LIABILITY">Liability</option>
                                                        <option value="ASSET">Asset (Advances)</option>
                                                        <option value="EXPENSE">Expense</option>
                                                        <option value="SoW">Salary & Wages</option>
                                                    </select>
                                                </div>
                                                <div className={isLedgerLocked ? "opacity-60 pointer-events-none grayscale" : ""}>
                                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Select Account Head <span className="text-red-500">*</span></label>
                                                    {/* We need to use `ledger_options.head_id` but schema currently uses `create_ledger` boolean separately. 
                                                        Wait, `onboardSchema` in this file doesn't have `ledger_options`. 
                                                        I need to update Schema too, or just map it. 
                                                        The backend `updateStaffFull` expects `ledger_options: { create, head_id }`.
                                                        The backend `createStaffProfile` (which is /team/staff/onboard) uses `onboardSchema` which I updated earlier.
                                                        So I SHOULD structure the form data as `ledger_options`.
                                                    */}
                                                    <select
                                                        {...register('ledger_options.head_id')}
                                                        className="w-full border p-2 rounded text-sm bg-white"
                                                        disabled={isLedgerLocked}
                                                    >
                                                        <option value="">-- Select Head --</option>
                                                        {accountHeads
                                                            ?.filter((h: any) => !filterAccountType || h.type === filterAccountType || (filterAccountType === 'SoW' && h.name.includes('Salary')))
                                                            .map((head: any) => (
                                                                <option key={head.id} value={head.id}>
                                                                    {head.name} ({head.code})
                                                                </option>
                                                            ))}
                                                    </select>
                                                    {isLedgerLocked && <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1"><LockIcon size={8} /> Linked to active ledger</p>}
                                                </div>
                                            </div>
                                        )}                                                </div>
                                </div>
                            )}

                            {/* --- STEP 4: REVIEW & DOCS --- */}
                            {currentStep === 4 && (
                                <div className="max-w-3xl mx-auto space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer group">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                                                <Upload size={24} />
                                            </div>
                                            <h4 className="font-semibold text-gray-900">Upload Resume</h4>
                                            <p className="text-xs text-gray-500 mt-1">PDF or DOCX upto 5MB</p>
                                        </div>
                                        <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer group">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                                                <Upload size={24} />
                                            </div>
                                            <h4 className="font-semibold text-gray-900">ID Proof (Aadhar/PAN)</h4>
                                            <p className="text-xs text-gray-500 mt-1">JPG, PNG or PDF</p>
                                        </div>
                                    </div>

                                    <div className="bg-orange-50 p-6 rounded-lg border border-orange-100">
                                        <h3 className="font-bold text-orange-900 mb-4 flex items-center gap-2"><LockIcon size={16} /> Set Initial Password</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="label">Password <span className="text-red-500">*</span></label>
                                                <input type="password" {...register('password')} className="input-field" />
                                                {errors.password && <span className="error">{errors.password.message}</span>}
                                            </div>
                                            <div>
                                                <label className="label">Confirm Password <span className="text-red-500">*</span></label>
                                                <input type="password" {...register('confirm_password')} className="input-field" />
                                                {errors.confirm_password && <span className="error">{errors.confirm_password.message}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-gray-900 mb-2">Review Summary</h4>
                                        <ul className="text-sm space-y-1 text-gray-600">
                                            <li><span className="font-medium text-gray-900">Name:</span> {formData.full_name}</li>
                                            <li><span className="font-medium text-gray-900">Role:</span> {formData.designation} ({formData.department})</li>
                                            <li><span className="font-medium text-gray-900">Email:</span> {formData.email}</li>
                                            <li><span className="font-medium text-gray-900">Salary:</span> ₹{formData.base_salary} / {formData.salary_type}</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Controls */}
                <div className="pt-6 mt-8 border-t flex justify-between items-center">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className="flex items-center gap-2 px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors font-medium"
                    >
                        <ArrowLeft size={18} /> Back
                    </button>

                    {currentStep < 4 ? (
                        <button
                            onClick={handleNext}
                            className="bg-primary text-primary-foreground px-8 py-2.5 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors font-medium shadow-sm"
                        >
                            Next Step <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit((data) => mutation.mutate(data), (errors) => {
                                console.error("Validation Errors:", errors);
                            })}
                            className="bg-green-600 text-white px-8 py-2.5 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors font-bold shadow-md shadow-green-200"
                        >
                            <CheckCircle size={18} /> {isEditMode ? "Update Member" : "Confirm Onboarding"}
                        </button>
                    )}
                </div>
            </div>

            {/* Global Error Summary at Bottom */}
            <div className="px-8 pb-8">
                <FormErrorAlert errors={errors} />
            </div>

            <style>{`
                .label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
                .input-field { width: 100%; padding: 0.625rem 0.875rem; background-color: #fff; border: 1px solid #d1d5db; border-radius: 0.5rem; color: #111827; font-size: 0.93rem; transition: all 0.2s; outline: none; }
                .input-field:focus { border-color: #3b82f6; ring: 2px solid #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                .error { font-size: 0.75rem; color: #ef4444; margin-top: 0.25rem; display: block; }
            `}</style>
        </div>
    );
};

export default OnboardingPage;
