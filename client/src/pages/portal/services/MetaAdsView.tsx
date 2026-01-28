import React, { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import Swal from 'sweetalert2';
import { MetaAdsLogForm } from '../forms/MetaAdsLogForm';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useAuthStore } from '../../../store/authStore';
import { ArrowLeft } from 'lucide-react';
import {
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from '../../../components/ui/table';

const MetaAdsView = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [editingLog, setEditingLog] = React.useState<any>(null);

    // Determine context (Admin managing vs Client viewing)
    const urlClientId = searchParams.get('clientId');
    const mode = searchParams.get('mode'); // 'manage' or null

    // If client is logged in, use their linked_client_id. If admin, use url param.
    const clientId = (user?.role === 'CLIENT' || user?.role === 'STAFF')
        ? (user as any)?.linked_client_id
        : urlClientId;

    const canManage = user?.role === 'ADMIN'
        || user?.role === 'MANAGER'
        || user?.role === 'DEVELOPER_ADMIN'
        || user?.role === 'MARKETING_EXEC'
        || user?.role === 'DM_EXECUTIVE'
        || user?.role === 'WEB_SEO_EXECUTIVE'
        || user?.role === 'CREATIVE_DESIGNER'
        || user?.role === 'OPERATIONS_EXECUTIVE';

    const isManageMode = canManage && mode === 'manage';

    const { data: logs, isLoading } = useQuery({
        queryKey: ['meta-ads-logs', clientId],
        queryFn: async () => {
            if (!clientId) return [];
            const { data } = await api.get(`/client-portal/tracking/meta-ads?clientId=${clientId}`);
            return data;
        },
        enabled: !!clientId
    });

    const { data: clientDetails } = useQuery({
        queryKey: ['client-details-meta', clientId],
        queryFn: async () => (await api.get(`/clients/${clientId}`)).data,
        enabled: !!clientId
    });

    // Helper to extract JSON results safely
    const getResultVal = (log: any, key: string) => {
        try {
            const res = typeof log.results_json === 'string' ? JSON.parse(log.results_json) : log.results_json;
            return res?.[key] || '-';
        } catch { return '-' }
    };

    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/client-portal/tracking/meta-ads/${id}`);
                queryClient.invalidateQueries({ queryKey: ['meta-ads-logs'] });
                Swal.fire('Deleted!', 'Record has been deleted.', 'success');
            } catch (error: any) {
                Swal.fire('Error', error.response?.data?.message || 'Failed to delete', 'error');
            }
        }
    };

    if (!clientId) return <div className="p-8 text-center">No Client Selected</div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Meta Ads Performance</h1>
                        {clientDetails && <p className="text-muted-foreground">{clientDetails.name}</p>}
                    </div>
                </div>
                {canManage && !isManageMode && (
                    <Button variant="outline" onClick={() => navigate(`?mode=manage&clientId=${clientId}`)}>
                        Add Entry / Manage
                    </Button>
                )}
                {isManageMode && (
                    <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
                        Management Mode
                    </div>
                )}
            </div>

            {/* Management Form */}
            {isManageMode && (
                <MetaAdsLogForm
                    clientId={clientId}
                    initialData={editingLog}
                    onSuccess={() => setEditingLog(null)}
                    onCancel={() => setEditingLog(null)}
                />
            )}

            {/* Performance Stats Cards (Aggregated) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total Spend</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₹{logs?.reduce((acc: number, curr: any) => acc + (curr.spend || 0), 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Impressions</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {logs?.reduce((acc: number, curr: any) => acc + (Number(getResultVal(curr, 'impressions')) || 0), 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                {/* Add more cards as needed */}
            </div>

            {/* History Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Campaign History</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="text-center py-8">Loading data...</div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Campaign</TableHead>
                                    <TableHead>Platform</TableHead>
                                    <TableHead>Objective</TableHead>
                                    <TableHead className="text-right">Spend</TableHead>
                                    <TableHead className="text-right">Results</TableHead>
                                    <TableHead>Notes</TableHead>
                                    {isManageMode && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs?.length > 0 ? logs.map((log: any) => {
                                    const results = typeof log.results_json === 'string' ? JSON.parse(log.results_json) : log.results_json;
                                    return (
                                        <TableRow key={log.id} className={editingLog?.id === log.id ? "bg-yellow-50" : ""}>
                                            <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-medium">{log.campaign_name}</TableCell>
                                            <TableCell>{log.platform}</TableCell>
                                            <TableCell>{log.objective}</TableCell>
                                            <TableCell className="text-right font-mono">₹{log.spend?.toLocaleString()}</TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">
                                                {Object.entries(results || {}).map(([k, v]) => (
                                                    <div key={k}>{k}: <b>{v as any}</b></div>
                                                ))}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={log.notes}>{log.notes || '-'}</TableCell>
                                            {isManageMode && (
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="ghost" size="sm" onClick={() => {
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        setEditingLog(log);
                                                    }}>
                                                        Edit
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(log.id)}>
                                                        Delete
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    )
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={isManageMode ? 8 : 7} className="text-center h-32 text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <p>No records found.</p>
                                                {canManage && !isManageMode && (
                                                    <Button variant="outline" size="sm" onClick={() => navigate(`?mode=manage&clientId=${clientId}`)}>
                                                        Add First Daily Entry
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default MetaAdsView;
