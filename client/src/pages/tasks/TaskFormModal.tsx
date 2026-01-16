import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Briefcase, FileText, Layers, RefreshCw, User, Calendar as CalendarIcon, Check, Plus, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import ClientFormModal from '../clients/ClientFormModal';
import FormErrorAlert from '../../components/ui/FormErrorAlert';

// Enhanced Schema with Phase 3 Logic (Mandatory Client for ALL)
const schema = z.object({
    title: z.string().min(3, "Title is required"),
    description: z.string().optional(),
    type: z.enum(['GENERIC', 'GRAPHIC', 'VIDEO', 'COPY', 'STRATEGY', 'DEV', 'CONTENT_SHOOTING']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    category: z.enum(['CAMPAIGN', 'INTERNAL']),
    nature: z.enum(['NEW', 'REWORK']),
    campaign_id: z.string().optional(),
    content_type: z.string().optional(), // Added
    client_id: z.string().optional(), // Now Optional for "General" tasks
    assignee_id: z.string().min(1, "Assigned To is required"), // Mandatory for ALL
    due_date: z.string().optional(), // Soft optional
});

type TaskFormData = z.infer<typeof schema>;

interface NewTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const NewTaskModal: React.FC<NewTaskModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);

    // Fetch Data
    const { data: campaigns } = useQuery({ queryKey: ['campaigns'], queryFn: () => api.get('/campaigns').then(res => res.data) });
    const { data: clients, refetch: refetchClients } = useQuery({ queryKey: ['clients'], queryFn: () => api.get('/clients').then(res => res.data) });
    const { data: staff } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(res => res.data) });

    const { register, handleSubmit, watch, setValue, formState: { errors, isValid }, reset } = useForm<TaskFormData>({
        resolver: zodResolver(schema),
        mode: 'onChange',
        defaultValues: {
            priority: 'MEDIUM',
            type: 'GENERIC',
            category: 'CAMPAIGN',
            nature: 'NEW',
            description: ''
        }
    });

    const category = watch('category');
    const nature = watch('nature');
    const selectedClientId = watch('client_id');

    // Filter campaigns by selected client
    const filteredCampaigns = campaigns?.filter((c: any) => c.client_id === selectedClientId) || [];

    const createMutation = useMutation({
        mutationFn: async (data: TaskFormData) => {
            const payload: any = { ...data };

            // Campaign ID Logic Removed as per request (or kept optional if needed, but UI hidden)
            // if (data.campaign_id) ...

            // Content Type is passed directly
            if (data.content_type) payload.content_type = data.content_type;

            // Handle General/Empty Client
            if (!data.client_id) delete payload.client_id;

            payload.assignee = { connect: { id: data.assignee_id } };
            delete payload.assignee_id;

            payload.reporter = { connect: { id: user?.id } };

            if (data.due_date) payload.due_date = new Date(data.due_date);

            return await api.post('/tasks', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            reset();
            onClose();
        }
    });

    const onSubmit = (data: TaskFormData) => {
        createMutation.mutate(data);
    };

    const handleClientCreated = (newClient: any) => {
        // Refresh clients and select the new one
        refetchClients().then(() => {
            setValue('client_id', newClient.id);
        });
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden gap-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-800">
                            <Layers className="text-purple-600" />
                            Create New Task
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit, (errors) => {
                        console.error("Task Validation Failed:", errors);
                    })} className="p-6 pt-2 space-y-5">

                        <FormErrorAlert errors={errors} />

                        {/* 1. Category & Nature (Visual Ticks) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Category</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setValue('category', 'CAMPAIGN')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border transition-all ${category === 'CAMPAIGN' ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        Campaign
                                        {category === 'CAMPAIGN' && <Check size={16} className="text-purple-600" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setValue('category', 'INTERNAL')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border transition-all ${category === 'INTERNAL' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        Internal
                                        {category === 'INTERNAL' && <Check size={16} className="text-blue-600" />}
                                    </button>
                                </div>
                                <input type="hidden" {...register('category')} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Nature</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setValue('nature', 'NEW')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border transition-all ${nature === 'NEW' ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        New Task
                                        {nature === 'NEW' && <Check size={16} className="text-green-600" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setValue('nature', 'REWORK')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border transition-all ${nature === 'REWORK' ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <RefreshCw size={14} className={nature === 'REWORK' ? 'text-red-600' : 'text-gray-400'} />
                                        Rework
                                        {nature === 'REWORK' && <Check size={16} className="text-red-600" />}
                                    </button>
                                </div>
                                <input type="hidden" {...register('nature')} />
                            </div>
                        </div>

                        {/* Title (Always visible) */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Task Title <span className="text-red-500">*</span></label>
                            <input
                                {...register('title')}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none transition-shadow"
                                placeholder="e.g. Design Holiday Banner"
                            />
                            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Task Type</label>
                                <select {...register('type')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-200 outline-none">
                                    <option value="GENERIC">Generic</option>
                                    <option value="GRAPHIC">Graphic Design</option>
                                    <option value="VIDEO">Video Editing</option>
                                    <option value="COPY">Copywriting</option>
                                    <option value="STRATEGY">Strategy</option>
                                    <option value="DEV">Development</option>
                                    <option value="CONTENT_SHOOTING">Content Shooting</option> {/* Added */}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Priority</label>
                                <select {...register('priority')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-200 outline-none">
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                    <option value="LOW">Low</option>
                                </select>
                            </div>
                        </div>

                        {/* Client & Campaign Section */}
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                            {/* Client (Mandatory for ALL) */}
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700 flex justify-between">
                                    <span>Select Client <span className="text-red-500">*</span></span>
                                    <button
                                        type="button"
                                        onClick={() => setIsClientModalOpen(true)}
                                        className="text-xs text-purple-600 font-semibold hover:underline flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add New Client
                                    </button>
                                </label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <select
                                        {...register('client_id')}
                                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-purple-200 outline-none ${errors.client_id ? 'border-red-300' : 'border-gray-300'}`}
                                        onChange={(e) => {
                                            setValue('client_id', e.target.value);
                                            setValue('campaign_id', ''); // Reset campaign on client change
                                        }}
                                    >
                                        <option value="">-- Choose Client --</option>
                                        <option value="">General (Walk-in / No Client)</option> {/* Added */}
                                        {clients?.map((client: any) => (
                                            <option key={client.id} value={client.id}>{client.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {errors.client_id && <p className="text-red-500 text-xs mt-1">{errors.client_id.message}</p>}
                            </div>

                            {/* Content Strategy (Visual Selection of Pending Commitments) */}
                            {selectedClientId && (
                                <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                                    <label className="text-sm font-medium text-gray-700">Content Type (Strategy) <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Layers className="absolute left-3 top-3 text-gray-400" size={18} />
                                        <select
                                            {...register('content_type')}
                                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-purple-200 outline-none border-gray-300`}
                                        >
                                            <option value="">-- Select Content Type --</option>
                                            {clients?.find((c: any) => c.id === selectedClientId)?.content_strategies?.map((strategy: any) => (
                                                <option key={strategy.type} value={strategy.type}>
                                                    {strategy.type} (Qty: {strategy.quantity})
                                                </option>
                                            ))}
                                            <option value="General">General / Other</option>
                                        </select>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Select from agreed monthly deliverables.</p>
                                </div>
                            )}
                        </div>

                        {/* Assigned To (Mandatory) & Due Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Assigned To <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <select
                                        {...register('assignee_id')}
                                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-purple-200 outline-none ${errors.assignee_id ? 'border-red-300' : 'border-gray-300'}`}
                                    >
                                        <option value="">-- Select Staff --</option>
                                        {staff?.filter((u: any) => u.role !== 'CLIENT' && !['9c2c3b09-1a4d-4e9f-a00a-fdcae89806a1', '0f602110-d76e-4f21-8bcf-c71959dd4015'].includes(u.id)).map((u: any) => (
                                            <option key={u.id} value={u.id}>{u.full_name} ({u.department || 'General'})</option>
                                        ))}
                                    </select>
                                </div>
                                {errors.assignee_id && <p className="text-red-500 text-xs mt-1">{errors.assignee_id.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Due Date</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input
                                        type="date"
                                        {...register('due_date')}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-200 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
                            >
                                {createMutation.isPending ? 'Creating...' : 'Create Task'}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Client Creation Modal */}
            <ClientFormModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onSuccess={handleClientCreated}
            />
        </>
    );
};

export default NewTaskModal;
