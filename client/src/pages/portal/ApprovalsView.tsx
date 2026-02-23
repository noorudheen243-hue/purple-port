import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { CheckCircle, XCircle, AlertCircle, FileText, ExternalLink, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Badge } from '../../components/ui/badge';
import Swal from 'sweetalert2';

// Props are optional now, as it can be self-contained or embedded
interface ApprovalsViewProps {
    clientIdProp?: string;
}

const ApprovalsView: React.FC<ApprovalsViewProps> = ({ clientIdProp }) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [searchParams] = useSearchParams();
    const [feedback, setFeedback] = useState<Record<string, string>>({});

    // Determine Client ID
    // 1. Prop (Embedded Mode)
    // 2. Query Param (Manage Mode)
    // 3. User Context (Client Mode)
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'DEVELOPER_ADMIN';
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    const urlClientId = searchParams.get('clientId');

    // Effective Client ID
    const clientId = clientIdProp || (isAdmin ? (selectedClientId || urlClientId) : user?.linked_client_id);

    // Fetch Clients for Selector (Admin only)
    const { data: clients } = useQuery({
        queryKey: ['clients-list-simple'],
        queryFn: async () => (await api.get('/clients')).data,
        enabled: isAdmin && !clientIdProp
    });

    const { data: pendingItems = [], isLoading } = useQuery({
        queryKey: ['client-approvals', clientId],
        queryFn: async () => {
            // If we are admin and no client selected, don't fetch or fetch empty
            if (isAdmin && !clientId) return [];

            // Allow fetching if client is logged in OR if admin has selected a client
            const { data } = await api.get(`/client-portal/approvals?clientId=${clientId || ''}`);
            return data.content || [];
        },
        enabled: !!clientId // Only fetch if we have a client context
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, comment }: { id: string, status: string, comment?: string }) => {
            await api.patch(`/client-portal/approvals/${id}`, { status, feedback: comment });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-approvals'] });
            Swal.fire({
                icon: 'success',
                title: 'Status Updated',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || 'Update failed', 'error');
        }
    });

    const handleAction = (id: string, status: string) => {
        updateStatusMutation.mutate({ id, status, comment: feedback[id] });
    };

    // --- RENDER ---

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Pending Approvals</h2>
                    {isAdmin && clientId && (
                        <p className="text-xs text-muted-foreground mt-1">Viewing items for Client ID: {clientId.substring(0, 8)}...</p>
                    )}
                </div>

                {/* Admin Client Selector */}
                {isAdmin && !clientIdProp && (
                    <div className="relative w-full md:w-64">
                        <select
                            className="w-full h-10 pl-3 pr-10 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onChange={(e) => setSelectedClientId(e.target.value || null)}
                            value={clientId || ''}
                        >
                            <option value="">-- Select Client --</option>
                            {clients?.sort((a: any, b: any) => a.name.localeCompare(b.name)).map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    {c.client_code ? `${c.client_code} - ` : ''}{c.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
                    </div>
                )}
            </div>

            {!clientId ? (
                <div className="p-12 text-center border-2 border-dashed rounded-xl bg-gray-50/50">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Select a Client</h3>
                    <p className="text-muted-foreground mt-1">Please select a client from the dropdown to manage their approvals.</p>
                </div>
            ) : isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map(i => <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-lg"></div>)}
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingItems.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                            <CheckCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">All Caught Up!</h3>
                            <p className="text-sm text-muted-foreground">No pending items requiring attention for this client.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {pendingItems.map((item: any) => (
                                <Card key={item.id} className="overflow-hidden border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="md:flex">
                                        {/* Preview Section */}
                                        <div className="md:w-1/3 bg-gray-50/50 border-r p-6 flex items-center justify-center">
                                            {item.link ? (
                                                <div className="text-center space-y-3 w-full">
                                                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-blue-50">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div className="px-3">
                                                        <h4 className="font-medium text-sm text-gray-900 truncate max-w-full" title={item.title}>{item.title}</h4>
                                                        <a href={item.link} target="_blank" rel="noreferrer" className="inline-block mt-2">
                                                            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                                                View Deliverable <ExternalLink size={12} className="ml-1" />
                                                            </Button>
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-400">
                                                    <FileText size={48} className="mx-auto opacity-20" />
                                                    <span className="text-sm mt-2 block">No Preview Link</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content & Action Section */}
                                        <div className="md:w-2/3 p-6 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="outline" className="bg-white">{item.type.replace('_', ' ')}</Badge>
                                                            <span className="text-xs text-gray-500 font-mono">{new Date(item.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <h3 className="text-xl font-bold text-gray-900 leading-tight">{item.title}</h3>
                                                    </div>
                                                    <Badge className={`border ${item.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-200' :
                                                        item.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                                                            'bg-yellow-100 text-yellow-800 border-yellow-200'
                                                        }`}>
                                                        {item.status.replace('_', ' ')}
                                                    </Badge>
                                                </div>

                                                {item.notes && (
                                                    <div className="mb-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-600 border relative">
                                                        <span className="absolute top-2 left-2 text-gray-300 text-xl font-serif">"</span>
                                                        <p className="px-2 italic">{item.notes}</p>
                                                    </div>
                                                )}

                                                <div className="space-y-2 mt-4">
                                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Your Feedback / Comments</label>
                                                    <textarea
                                                        className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[80px] bg-white"
                                                        placeholder="Enter feedback prior to approval or rejection..."
                                                        value={feedback[item.id] || ''}
                                                        onChange={(e) => setFeedback({ ...feedback, [item.id]: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                                <Button
                                                    variant="ghost"
                                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    onClick={() => handleAction(item.id, 'REJECTED')}
                                                >
                                                    <XCircle className="mr-2 h-4 w-4" /> Reject
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                                                    onClick={() => handleAction(item.id, 'CHANGES_REQUESTED')}
                                                >
                                                    <AlertCircle className="mr-2 h-4 w-4" /> Request Changes
                                                </Button>
                                                <Button
                                                    className="bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow"
                                                    onClick={() => handleAction(item.id, 'APPROVED')}
                                                >
                                                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ApprovalsView;
