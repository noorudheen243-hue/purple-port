import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import { GoogleAdsLogForm } from '../forms/GoogleAdsLogForm';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useAuthStore } from '../../../store/authStore';
import { ArrowLeft } from 'lucide-react';
import {
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from '../../../components/ui/table';

const GoogleAdsView = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Determine context (Admin managing vs Client viewing)
    const urlClientId = searchParams.get('clientId');
    const mode = searchParams.get('mode'); // 'manage' or null

    // If client is logged in, use their linked_client_id. If admin, use url param.
    const clientId = user?.role === 'CLIENT'
        ? user?.linked_client_id
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
        queryKey: ['google-ads-logs', clientId],
        queryFn: async () => {
            if (!clientId) return [];
            const { data } = await api.get(`/client-portal/tracking/google-ads?clientId=${clientId}`);
            return data;
        },
        enabled: !!clientId
    });

    const { data: clientDetails } = useQuery({
        queryKey: ['client-details-google', clientId],
        queryFn: async () => (await api.get(`/clients/${clientId}`)).data,
        enabled: !!clientId
    });

    if (!clientId) return <div className="p-8 text-center">No Client Selected</div>;

    const totalSpend = logs?.reduce((acc: number, curr: any) => acc + (curr.spend || 0), 0) || 0;
    const totalClicks = logs?.reduce((acc: number, curr: any) => acc + (curr.clicks || 0), 0) || 0;
    const totalConversions = logs?.reduce((acc: number, curr: any) => acc + (curr.conversions || 0), 0) || 0;
    const avgCpa = logs?.length > 0 ? (logs.reduce((acc: number, curr: any) => acc + (curr.cpa || 0), 0) / logs.length) : 0;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Google Ads Performance</h1>
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
                <GoogleAdsLogForm clientId={clientId} />
            )}

            {/* Performance Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total Spend</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalSpend.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Clicks</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Conversions</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalConversions.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Avg CPA</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{avgCpa.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* History Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Campaign History</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="text-center py-8">Loading data...</div> : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Campaign</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Spend</TableHead>
                                        <TableHead className="text-right">Clicks</TableHead>
                                        <TableHead className="text-right">Impressions</TableHead>
                                        <TableHead className="text-right">Conversions</TableHead>
                                        <TableHead className="text-right">CPA</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs?.length > 0 ? logs.map((log: any) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-medium">{log.campaign_name}</TableCell>
                                            <TableCell>{log.campaign_type}</TableCell>
                                            <TableCell className="text-right font-mono">₹{log.spend?.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{log.clicks}</TableCell>
                                            <TableCell className="text-right">{log.impressions}</TableCell>
                                            <TableCell className="text-right">{log.conversions}</TableCell>
                                            <TableCell className="text-right">₹{log.cpa}</TableCell>
                                            <TableCell className="max-w-[150px] truncate" title={log.notes}>{log.notes || '-'}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center h-32 text-muted-foreground">
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
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default GoogleAdsView;
