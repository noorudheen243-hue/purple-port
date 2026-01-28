import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { ContentDeliverableForm } from '../forms/ContentDeliverableForm';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useAuthStore } from '../../../store/authStore';
import { ArrowLeft, ExternalLink, FileText, Image as ImageIcon, PenTool, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import Swal from 'sweetalert2';

const ContentBrandingView = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Manage Mode
    const urlClientId = searchParams.get('clientId');
    const mode = searchParams.get('mode');

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

    const { data: deliverables, isLoading } = useQuery({
        queryKey: ['content-deliverables', clientId],
        queryFn: async () => {
            if (!clientId) return [];
            const { data } = await api.get(`/client-portal/tracking/content?clientId=${clientId}`);
            return data;
        },
        enabled: !!clientId
    });

    const { data: clientDetails } = useQuery({
        queryKey: ['client-details-content', clientId],
        queryFn: async () => (await api.get(`/clients/${clientId}`)).data,
        enabled: !!clientId
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            return await api.patch(`/client-portal/tracking/content/${id}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content-deliverables'] });
            Swal.fire({
                title: 'Status Updated',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        }
    });

    if (!clientId) return <div className="p-8 text-center">No Client Selected</div>;

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'CREATIVE': return <ImageIcon size={16} className="text-purple-500" />;
            case 'COPY': return <FileText size={16} className="text-blue-500" />;
            case 'BLOG': return <PenTool size={16} className="text-orange-500" />;
            case 'BRANDING_ASSET': return <ImageIcon size={16} className="text-pink-500" />;
            default: return <FileText size={16} className="text-gray-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle size={12} className="mr-1" /> Approved</Badge>;
            case 'SUBMITTED': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock size={12} className="mr-1" /> In Review</Badge>;
            case 'REJECTED': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle size={12} className="mr-1" /> Changes Req</Badge>;
            default: return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Draft</Badge>;
        }
    };

    const renderList = (filterType?: string) => {
        const list = filterType
            ? deliverables?.filter((d: any) => d.type === filterType)
            : deliverables;

        if (!list || list.length === 0) return (
            <div className="text-center py-12 text-muted-foreground italic flex flex-col items-center gap-4">
                <span>No deliverables found.</span>
                {canManage && !isManageMode && (
                    <Button variant="outline" size="sm" onClick={() => navigate(`?mode=manage&clientId=${clientId}`)}>
                        Add First Daily Entry
                    </Button>
                )}
            </div>
        );

        return (
            <div className="grid grid-cols-1 gap-4">
                {list.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-gray-50 rounded-lg border">
                                {getTypeIcon(item.type)}
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-gray-900">{item.title}</h4>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{item.type.replace('_', ' ')}</span>
                                </div>
                                {item.notes && <p className="text-xs text-gray-500 mt-1 max-w-md truncate">{item.notes}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {item.link && (
                                <a href={item.link} target="_blank" rel="noreferrer">
                                    <Button variant="ghost" size="sm" className="h-8 text-blue-600">
                                        Open <ExternalLink size={12} className="ml-1" />
                                    </Button>
                                </a>
                            )}
                            <div>
                                {getStatusBadge(item.status)}
                            </div>
                            {/* Actions for Admin/Client */}
                            {(canManage || isManageMode) && (
                                <div className="flex flex-col gap-1 items-end">
                                    {/* Simple Status Toggles for quick management */}
                                    {item.status === 'SUBMITTED' && (
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 bg-green-50" onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'APPROVED' })} title="Approve"><CheckCircle size={14} /></Button>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600 bg-red-50" onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'REJECTED' })} title="Reject"><XCircle size={14} /></Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Content & Branding</h1>
                            <div className="text-[10px] text-red-500 font-mono">
                                DEBUG: Role=[{user?.role}] Manage=[{canManage ? 'YES' : 'NO'}] Client=[{clientId}]
                            </div>
                            {clientDetails && <p className="text-muted-foreground">{clientDetails.name}</p>}
                        </div>
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
                <ContentDeliverableForm clientId={clientId} />
            )}

            <Tabs defaultValue="ALL" className="w-full">
                <TabsList className="bg-muted/50 p-1 mb-6">
                    <TabsTrigger value="ALL" className="px-4">All Items</TabsTrigger>
                    <TabsTrigger value="CREATIVE" className="px-4">Creatives</TabsTrigger>
                    <TabsTrigger value="COPY" className="px-4">Copywriting</TabsTrigger>
                    <TabsTrigger value="BLOG" className="px-4">Blogs</TabsTrigger>
                    <TabsTrigger value="BRANDING_ASSET" className="px-4">Branding</TabsTrigger>
                </TabsList>
                <TabsContent value="ALL" className="space-y-4">{renderList()}</TabsContent>
                <TabsContent value="CREATIVE" className="space-y-4">{renderList('CREATIVE')}</TabsContent>
                <TabsContent value="COPY" className="space-y-4">{renderList('COPY')}</TabsContent>
                <TabsContent value="BLOG" className="space-y-4">{renderList('BLOG')}</TabsContent>
                <TabsContent value="BRANDING_ASSET" className="space-y-4">{renderList('BRANDING_ASSET')}</TabsContent>
            </Tabs>
        </div>
    );
};

export default ContentBrandingView;
