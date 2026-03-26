import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Check, X, Eye } from 'lucide-react';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';

const AdminInbox = () => {
    const queryClient = useQueryClient();

    const { data: moms, isLoading } = useQuery({
        queryKey: ['admin-mom-inbox'],
        queryFn: async () => {
            const res = await api.get('/meetings/admin/inbox');
            return res.data;
        }
    });

    const reviewMutation = useMutation({
        mutationFn: async ({ id, status, remarks }: { id: string, status: string, remarks: string }) => {
            const res = await api.patch(`/meetings/mom/${id}/review`, { status, remarks });
            return res.data;
        },
        onSuccess: () => {
            Swal.fire('Success', 'MoM reviewed successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['admin-mom-inbox'] });
        }
    });

    const handleReview = async (id: string, action: 'APPROVE' | 'REJECT') => {
        const { value: remarks } = await Swal.fire({
            title: action === 'APPROVE' ? 'Approve MoM' : 'Request Changes',
            input: 'textarea',
            inputLabel: 'Add Remarks (Optional for approval, required for changes)',
            inputPlaceholder: 'Type your remarks here...',
            showCancelButton: true,
            inputValidator: (value) => {
                if (action === 'REJECT' && !value) {
                    return 'You need to write something!';
                }
            }
        });

        if (remarks !== undefined) {
            reviewMutation.mutate({
                id,
                status: action === 'APPROVE' ? 'APPROVED' : 'DRAFT',
                remarks
            });
        }
    };

    if (isLoading) return <div className="p-8">Loading inbox...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold border-b pb-4">Admin MoM Inbox</h1>
            
            {moms?.length === 0 ? (
                <div className="text-center p-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No MoMs pending review.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {moms?.map((mom: any) => (
                        <Card key={mom.id} className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition">
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">{mom.meeting?.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Submitted by: <span className="font-medium text-gray-800">{mom.creator?.full_name}</span> 
                                    <span className="mx-2">•</span> 
                                    {new Date(mom.createdAt).toLocaleString()}
                                </p>
                                <p className="text-sm mt-2 line-clamp-1 bg-gray-50 p-2 rounded max-w-2xl">{mom.summary}</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Link 
                                    to={`/dashboard/meetings/mom?meetingId=${mom.meeting_id}`}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition border border-transparent hover:border-blue-200"
                                    title="View Full Details"
                                >
                                    <Eye size={20} />
                                </Link>
                                <button
                                    onClick={() => handleReview(mom.id, 'APPROVE')}
                                    className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white rounded-md transition flex items-center gap-2 border border-green-200 hover:border-green-600"
                                >
                                    <Check size={18} /> Approve
                                </button>
                                <button
                                    onClick={() => handleReview(mom.id, 'REJECT')}
                                    className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white rounded-md transition flex items-center gap-2 border border-red-200 hover:border-red-600"
                                >
                                    <X size={18} /> Reject
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminInbox;
