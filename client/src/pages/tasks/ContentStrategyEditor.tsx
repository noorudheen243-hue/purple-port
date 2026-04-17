import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save, Target, Check } from 'lucide-react';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils';
import { User } from 'lucide-react';
import Swal from 'sweetalert2';

const ContentStrategyEditor = () => {
    const queryClient = useQueryClient();
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [strategies, setStrategies] = useState<{content_type_id: string, monthly_target: number, notes: string}[]>([]);
    
    const { data: clients, isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => (await api.get('/clients')).data
    });

    const { data: globalContentTypes = [], isLoading: typesLoading } = useQuery({
        queryKey: ['content-types'],
        queryFn: async () => (await api.get('/content-types')).data
    });
    
    const activeClients = clients?.filter((c: any) => c.status === 'ACTIVE' || c.status === 'LEAD') || [];

    // State for local sync with form
    useEffect(() => {
        if (selectedClientId && clients) {
            const client = clients.find((c: any) => c.id === selectedClientId);
            if (client && client.content_strategies) {
                // Support legacy data during rollout gracefully
                const parsed = typeof client.content_strategies === 'string' 
                   ? JSON.parse(client.content_strategies || '[]') 
                   : (client.content_strategies || []);

                // Transform legacy structures if any
                const normalized = parsed.map((s: any) => {
                    // Modern format: { content_type_id, monthly_target, notes }
                    if (s.content_type_id) return s;
                    
                    // Legacy Format: { type: 'Poster', quantity: 20 }
                    // Match by name
                    const matchType = globalContentTypes.find((ct: any) => ct.name === s.type);
                    if (matchType) {
                        return { content_type_id: matchType.id, monthly_target: s.quantity || 0, notes: '' };
                    }

                    return null;
                }).filter(Boolean);

                setStrategies(normalized);
            } else {
                setStrategies([]);
            }
        } else {
            setStrategies([]);
        }
    }, [selectedClientId, clients, globalContentTypes]);

    const mutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            return await api.patch(`/clients/${id}`, { content_strategies: data });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            Swal.fire({
                title: 'Success!',
                text: 'Content Strategy updated successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || err.message, 'error');
        }
    });

    const addCustomTypeMutation = useMutation({
        mutationFn: async (name: string) => {
            return await api.post('/content-types', { name, is_custom: true });
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['content-types'] });
            setStrategies([...strategies, { content_type_id: res.data.id, monthly_target: 0, notes: '' }]);
            Swal.fire('Success', 'Custom Type Added', 'success');
        }
    });

    const generateTasksMutation = useMutation({
        mutationFn: async (clientId: string) => {
            return await api.post('/tasks/generate-content-tasks', { client_id: clientId });
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            Swal.fire({
                title: 'Tasks Generated!',
                text: `Successfully created ${res.data.createdCount} tasks to meet targets.`,
                icon: 'success'
            });
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || 'Generation failed', 'error');
        }
    });

    const handleAddType = () => {
        if (globalContentTypes.length > 0) {
            setStrategies([...strategies, { content_type_id: globalContentTypes[0].id, monthly_target: 0, notes: '' }]);
        }
    };
    
    const handleAddCustomType = () => {
        Swal.fire({
            title: 'Add New Content Type',
            input: 'text',
            inputPlaceholder: 'Enter custom content type',
            showCancelButton: true,
            confirmButtonText: 'Add',
            confirmButtonColor: '#ec4899', 
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const newType = result.value.trim();
                const exists = globalContentTypes.find((ct: any) => ct.name.toLowerCase() === newType.toLowerCase());
                if (exists) {
                    Swal.fire('Info', 'This type already exists', 'info');
                    setStrategies([...strategies, { content_type_id: exists.id, monthly_target: 0, notes: '' }]);
                } else {
                    addCustomTypeMutation.mutate(newType);
                }
            }
        });
    };

    const handleRemove = (index: number) => {
        setStrategies(strategies.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, field: keyof typeof strategies[0], value: any) => {
        const updated = [...strategies];
        if (field === 'monthly_target') updated[index][field] = Number(value);
        else (updated[index] as any)[field] = value;
        setStrategies(updated);
    };

    const handleSave = () => {
        if (!selectedClientId) return;
        mutation.mutate({ id: selectedClientId, data: strategies });
    };

    const handleGenerateTasks = () => {
        if (!selectedClientId) return;
        Swal.fire({
            title: 'Generate Missing Tasks?',
            text: "This will automatically create planned tasks (Graphic Design) to fill the gap between the monthly target and currently created tasks for this month.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, generate them!'
        }).then((res) => {
            if (res.isConfirmed) {
                generateTasksMutation.mutate(selectedClientId);
            }
        });
    };

    if (isLoading || typesLoading) {
        return <div className="p-8 text-center text-gray-500">Loading editor...</div>;
    }

    return (
        <div className="flex flex-col md:flex-row gap-6 bg-white rounded-xl shadow-sm border p-4 min-h-[60vh]">
            {/* Sidebar */}
            <div className="w-full md:w-1/3 border-r pr-4 flex flex-col h-[60vh]">
                <h3 className="font-semibold text-lg mb-4 text-gray-800 border-b pb-2">Select Client</h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {activeClients.map((client: any) => (
                        <button
                            key={client.id}
                            onClick={() => setSelectedClientId(client.id)}
                            className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                                selectedClientId === client.id 
                                ? 'bg-pink-50 border-pink-300 text-pink-900 shadow-sm' 
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                            <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-white">
                                {client.profile_picture ? (
                                    <img 
                                        src={getAssetUrl(client.profile_picture)} 
                                        alt={client.name} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as any).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(client.name); }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                                        <User size={20} />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-bold truncate text-sm">{client.name}</div>
                                <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider font-semibold">{client.client_code} • {client.status}</div>
                            </div>
                        </button>
                    ))}
                    {activeClients.length === 0 && (
                        <p className="text-sm text-gray-500 text-center p-4">No active clients found.</p>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="w-full md:w-2/3 pl-2 flex flex-col h-[60vh]">
                {!selectedClientId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Target size={48} className="mb-4 opacity-20" />
                        <p>Select a client from the list to set their content targets.</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {clients?.find((c:any) => c.id === selectedClientId)?.name}
                                </h2>
                                <p className="text-sm text-gray-500">Monthly Content Strategy Commitments</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleGenerateTasks}
                                    disabled={generateTasksMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md shadow-sm transition-colors font-medium disabled:opacity-50"
                                >
                                    <Target size={16} />
                                    {generateTasksMutation.isPending ? 'Generating...' : 'Generate Tasks'}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={mutation.isPending}
                                    className="flex items-center gap-2 px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-md shadow-sm transition-colors font-medium disabled:opacity-50"
                                >
                                    <Save size={16} />
                                    {mutation.isPending ? 'Saving...' : 'Save Strategy'}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                            {strategies.map((strategy, index) => (
                                <div key={index} className="flex gap-4 items-start bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Content Type</label>
                                        <select 
                                            value={strategy.content_type_id}
                                            onChange={(e) => handleChange(index, 'content_type_id', e.target.value)}
                                            className="w-full p-2 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                                        >
                                            {globalContentTypes.map((type: any) => (
                                                <option key={type.id} value={type.id}>
                                                    {type.name} {type.is_custom ? '(Custom)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                        
                                        <div className="mt-3">
                                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Notes (Optional)</label>
                                            <input
                                                type="text"
                                                value={strategy.notes || ''}
                                                onChange={(e) => handleChange(index, 'notes', e.target.value)}
                                                placeholder="Specific requirements..."
                                                className="w-full p-2 border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-pink-300"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-32">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Monthly Target</label>
                                        <input
                                            type="number"
                                            value={strategy.monthly_target}
                                            onChange={(e) => handleChange(index, 'monthly_target', e.target.value)}
                                            className="w-full p-2 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                                            min={0}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => handleRemove(index)} 
                                        className="text-red-500 hover:text-red-700 p-2 mt-5 bg-gray-50 rounded-md hover:bg-red-50 hover:border-red-100 transition-colors"
                                        title="Remove Type"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}

                            {strategies.length === 0 && (
                                <div className="text-center p-12 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 bg-white">
                                    <p className="mb-2 font-medium">No content strategies defined.</p>
                                    <p className="text-sm">Click "Add Standard Type" to get started.</p>
                                </div>
                            )}
                            
                            <div className="flex flex-wrap gap-3 mt-6">
                                <button
                                    onClick={handleAddType}
                                    className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-700 border border-pink-200 rounded-md hover:bg-pink-100 transition-colors text-sm font-medium"
                                >
                                    <Plus size={16} /> Add Standard Type
                                </button>
                                <button
                                    onClick={handleAddCustomType}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                                    disabled={addCustomTypeMutation.isPending}
                                >
                                    <Plus size={16} /> {addCustomTypeMutation.isPending ? 'Adding...' : 'Add Custom Type'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentStrategyEditor;
