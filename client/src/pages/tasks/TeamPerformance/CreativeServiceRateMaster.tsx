import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { format } from 'date-fns';
import { Edit2, Save, X, Settings2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import Swal from 'sweetalert2';

interface Rate {
    id: string;
    task_type: string;
    standard_value: number;
    effective_from: string;
    updatedAt: string;
}

const CREATIVE_CATEGORIES = {
    'Graphics Work': ['Poster', 'Carousel', 'Web Img', 'Other Graphics'],
    'Branding Works': ['Logo', 'Book', 'Mockups', 'Other Branding'],
    'Video Works': ['AI Video', 'Motion', 'Logo Anim', 'Corporate', 'Reel Edit', 'Podcast', 'Testimonial', 'Normal Video', 'Other Video'],
    'Printables': ['Brochure', 'Flyer', 'Flex', 'Van Ad', 'Biz Card', 'Letterhead', 'ID Card', 'Corp Profile', 'Catalogue', 'Menu', 'Other Print'],
    'Edu Project': ['Animated', 'Shoot', 'Other Edu']
};

const CreativeServiceRateMaster = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    
    // Only Developer Admin, Admin, and Manager can edit
    const canEdit = ['DEVELOPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role || '');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<number>(0);

    const { data: rates, isLoading } = useQuery<Rate[]>({
        queryKey: ['creative-service-rates'],
        queryFn: async () => (await api.get('/creative-performance/rates')).data,
    });

    const updateMutation = useMutation({
        mutationFn: async (data: { task_type: string; standard_value: number }) => {
            return (await api.post('/creative-performance/rates', data)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['creative-service-rates'] });
            setEditingId(null);
            Swal.fire('Success', 'Rate updated successfully', 'success');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.error || err.message, 'error');
        }
    });

    const handleEdit = (rate: Rate) => {
        setEditingId(rate.id);
        setEditValue(rate.standard_value);
    };

    const handleSave = (rate: Rate) => {
        if (editValue < 0) {
            Swal.fire('Error', 'Value cannot be negative', 'error');
            return;
        }
        updateMutation.mutate({
            task_type: rate.task_type,
            standard_value: editValue
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditValue(0);
    };

    if (isLoading || !rates) return <div className="p-8 text-center">Loading Configuration...</div>;

    if (!canEdit) {
        return (
            <Card>
                <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
                    <Settings2 size={48} className="mb-4 opacity-50" />
                    <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                    <p>You do not have permission to view or manage the Creative Service Rate Master.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm">
            <CardHeader className="bg-gray-50/50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-indigo-500" />
                    Creative Service Rate Master
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                    Configure the monetary value assigned to each creative task type. Changes take effect immediately for all newly completed tasks. Historical tasks will preserve their original values.
                </p>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto p-4 space-y-8">
                    {Object.entries(CREATIVE_CATEGORIES).map(([groupName, types]) => {
                        const groupRate = rates.find(r => r.task_type === `GROUP:${groupName}`);
                        const typeRates = types.map(t => rates.find(r => r.task_type === t)).filter(Boolean) as Rate[];

                        return (
                            <div key={groupName} className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-6 py-3 border-b flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 text-lg">{groupName} (Base Rate)</h3>
                                    {groupRate && (
                                        <div className="flex items-center gap-4">
                                            {editingId === groupRate.id ? (
                                                <div className="flex items-center gap-2 bg-white rounded shadow-sm px-2 py-1">
                                                    <span className="text-gray-500 font-medium">₹</span>
                                                    <Input 
                                                        type="number" 
                                                        value={editValue} 
                                                        onChange={(e) => setEditValue(Number(e.target.value))}
                                                        className="w-24 h-8 text-sm"
                                                        disabled={updateMutation.isPending}
                                                    />
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={handleCancel} disabled={updateMutation.isPending}>
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" onClick={() => handleSave(groupRate)} disabled={updateMutation.isPending}>
                                                        <Save className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <span className="font-semibold text-gray-900 bg-white px-3 py-1 rounded border shadow-sm">₹{groupRate.standard_value.toLocaleString()}</span>
                                                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleEdit(groupRate)}>
                                                        <Edit2 className="w-3 h-3 mr-2" /> Edit Base
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <table className="w-full text-sm text-left bg-white">
                                    <thead className="text-gray-500 font-medium border-b bg-gray-50/50">
                                        <tr>
                                            <th className="px-6 py-3 w-1/3">Task Type Specific Override</th>
                                            <th className="px-6 py-3 w-1/4">Override Value (₹)</th>
                                            <th className="px-6 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {typeRates.map((rate) => (
                                            <tr key={rate.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-3 font-medium text-gray-700">{rate.task_type}</td>
                                                <td className="px-6 py-3">
                                                    {editingId === rate.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-500">₹</span>
                                                            <Input 
                                                                type="number" 
                                                                value={editValue} 
                                                                onChange={(e) => setEditValue(Number(e.target.value))}
                                                                className="w-24 h-8"
                                                                disabled={updateMutation.isPending}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="font-medium text-gray-800">
                                                            {rate.standard_value > 0 ? `₹${rate.standard_value.toLocaleString()}` : <span className="text-gray-400 italic">Uses base rate</span>}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    {editingId === rate.id ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleCancel} disabled={updateMutation.isPending}>
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="sm" className="h-8 w-8 p-0" onClick={() => handleSave(rate)} disabled={updateMutation.isPending}>
                                                                <Save className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button size="sm" variant="ghost" className="h-8" onClick={() => handleEdit(rate)}>
                                                            <Edit2 className="w-3 h-3 mr-2" /> Edit
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default CreativeServiceRateMaster;
