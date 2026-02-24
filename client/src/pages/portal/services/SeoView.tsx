import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import { SeoLogForm } from '../forms/SeoLogForm';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useAuthStore } from '../../../store/authStore';
import { ArrowLeft, TrendingUp, CheckCircle, Search } from 'lucide-react';
import {
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';

const SeoView = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const urlClientId = searchParams.get('clientId');
    const mode = searchParams.get('mode');

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
        queryKey: ['seo-logs', clientId],
        queryFn: async () => {
            if (!clientId) return [];
            const { data } = await api.get(`/client-portal/tracking/seo?clientId=${clientId}`);
            return data;
        },
        enabled: !!clientId
    });

    const { data: clientDetails } = useQuery({
        queryKey: ['client-details-seo', clientId],
        queryFn: async () => (await api.get(`/clients/${clientId}`)).data,
        enabled: !!clientId
    });

    if (!clientId) return <div className="p-8 text-center">No Client Selected</div>;

    // Get latest log for High-level KPI
    const latestLog = logs && logs.length > 0 ? logs[0] : null;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">SEO Performance</h1>
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

            {isManageMode && (
                <SeoLogForm clientId={clientId} />
            )}

            {/* KPI Overview (Latest Month) */}
            {latestLog && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                                <TrendingUp size={16} /> Organic Traffic ({new Date(0, latestLog.month - 1).toLocaleString('default', { month: 'short' })})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-blue-900">{latestLog.organic_traffic.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                <CheckCircle size={16} /> Key Activities
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {(typeof latestLog.activities_json === 'string' ? JSON.parse(latestLog.activities_json) : latestLog.activities_json)?.length || 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                <Search size={16} /> Keywords Tracked
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {(typeof latestLog.keyword_rankings_json === 'string' ? JSON.parse(latestLog.keyword_rankings_json) : latestLog.keyword_rankings_json)?.length || 0}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Monthly Reports List */}
            <div className="space-y-8">
                {isLoading && <div className="text-center py-8">Loading SEO data...</div>}

                {!isLoading && (!logs || logs.length === 0) && (
                    <div className="text-center py-12 border rounded-lg bg-gray-50 border-dashed">
                        <p className="text-muted-foreground mb-4">No SEO reports found.</p>
                        {canManage && !isManageMode && (
                            <Button onClick={() => navigate(`?mode=manage&clientId=${clientId}`)}>
                                Add First Daily Entry
                            </Button>
                        )}
                    </div>
                )}

                {logs?.map((log: any, idx: number) => {
                    const activities = typeof log.activities_json === 'string' ? JSON.parse(log.activities_json) : log.activities_json;
                    const rankings = typeof log.keyword_rankings_json === 'string' ? JSON.parse(log.keyword_rankings_json) : log.keyword_rankings_json;
                    const monthName = new Date(0, log.month - 1).toLocaleString('default', { month: 'long' });

                    return (
                        <Card key={log.id} className="overflow-hidden">
                            <CardHeader className="bg-gray-50/50 border-b">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        {canManage && !isManageMode && logs && logs.length > 0 && idx === 0 && (
                                            <Button size="sm" variant="ghost" onClick={() => navigate(`?mode=manage&clientId=${clientId}`)}>Add New</Button>
                                        )}
                                        <div className="bg-white border rounded-lg px-3 py-1.5 text-center shadow-sm">
                                            <div className="text-xs font-bold text-gray-500 uppercase">{monthName.slice(0, 3)}</div>
                                            <div className="text-lg font-bold text-gray-900">{log.year}</div>
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{monthName} Report</CardTitle>
                                            <CardDescription>Generated on {new Date(log.updatedAt).toLocaleDateString()}</CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-white">
                                        Traffic: {log.organic_traffic.toLocaleString()}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                {/* Summary */}
                                {log.summary && (
                                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 text-sm text-blue-900">
                                        <span className="font-bold block mb-1">Executive Summary:</span>
                                        {log.summary}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Activities */}
                                    <div>
                                        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
                                            <CheckCircle size={14} className="text-green-600" /> Completed Activities
                                        </h3>
                                        <ul className="space-y-2">
                                            {activities?.map((act: string, idx: number) => (
                                                <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0"></span>
                                                    {act}
                                                </li>
                                            ))}
                                            {(!activities || activities.length === 0) && <li className="text-xs text-muted-foreground italic">No activities recorded.</li>}
                                        </ul>
                                    </div>

                                    {/* Rankings */}
                                    <div>
                                        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
                                            <TrendingUp size={14} className="text-indigo-600" /> Keyword Rankings
                                        </h3>
                                        <div className="border rounded-md overflow-x-auto">
                                            <div className="min-w-[400px]">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-gray-50 hover:bg-gray-50 h-8">
                                                            <TableHead className="h-8 text-xs">Keyword</TableHead>
                                                            <TableHead className="h-8 text-xs text-right">Rank</TableHead>
                                                            <TableHead className="h-8 text-xs text-right">Change</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {rankings?.map((r: any, idx: number) => (
                                                            <TableRow key={idx} className="h-8 text-xs">
                                                                <TableCell className="font-medium p-2">{r.keyword}</TableCell>
                                                                <TableCell className="text-right p-2">{r.rank}</TableCell>
                                                                <TableCell className={`text-right p-2 font-medium ${r.change?.includes('+') ? 'text-green-600' : (r.change?.includes('-') ? 'text-red-500' : 'text-gray-500')}`}>
                                                                    {r.change}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {(!rankings || rankings.length === 0) && (
                                                            <TableRow>
                                                                <TableCell colSpan={3} className="text-center text-xs text-muted-foreground p-4">No rankings recorded.</TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
};

export default SeoView;
