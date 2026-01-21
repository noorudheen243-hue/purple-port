import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
    LayoutDashboard,
    TrendingUp,
    Search,
    Globe,
    PenTool,
    Palette,
    Settings,
    ChevronDown,
    ArrowRight,
    Activity,
    DollarSign,
    Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import api from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import Swal from 'sweetalert2';

const SERVICE_DEF: Record<string, { title: string; icon: any; path: string }> = {
    'META_ADS': { title: 'Meta Ads', icon: TrendingUp, path: '/dashboard/client-portal/meta-ads' },
    'GOOGLE_ADS': { title: 'Google Ads', icon: Search, path: '/dashboard/client-portal/google-ads' },
    'SEO': { title: 'SEO', icon: Globe, path: '/dashboard/client-portal/seo' },
    'WEB_DEV': { title: 'Web Development', icon: LayoutDashboard, path: '/dashboard/client-portal/web-dev' },
    'CONTENT': { title: 'Content Creation', icon: PenTool, path: '/dashboard/client-portal/content' },
    'BRANDING': { title: 'Branding', icon: Palette, path: '/dashboard/client-portal/branding' }
};

const PortalDashboard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'DEVELOPER_ADMIN';

    // State for Management
    const [manageClientId, setManageClientId] = useState<string | null>(null);

    // Fetch Clients for Selector
    const { data: clients, isLoading: isClientsLoading } = useQuery({
        queryKey: ['clients-list-simple'],
        queryFn: async () => (await api.get('/clients')).data
    });

    // Fetch Client Details & Stats
    const { data: clientDetails, isLoading: isManageLoading } = useQuery({
        queryKey: ['client-manage-services', manageClientId],
        queryFn: async () => {
            if (!manageClientId) return null;
            const { data } = await api.get(`/clients/${manageClientId}`);
            return data;
        },
        enabled: !!manageClientId
    });

    const { data: portalStats, isLoading: isStatsLoading } = useQuery({
        queryKey: ['portal-stats', manageClientId],
        queryFn: async () => {
            if (!manageClientId) return null;
            const { data } = await api.get(`/client-portal/dashboard?clientId=${manageClientId}`);
            return data;
        },
        enabled: !!manageClientId
    });

    // Mutation for Service Updates
    const updateServicesMutation = useMutation({
        mutationFn: async ({ clientId, services }: { clientId: string, services: string[] }) => {
            return await api.patch(`/clients/${clientId}`, { service_engagement: services });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients-list-simple'] });
            queryClient.invalidateQueries({ queryKey: ['client-manage-services'] });
            queryClient.invalidateQueries({ queryKey: ['portal-stats'] });
            Swal.fire({
                title: 'Services Updated',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        },
        onError: (error: any) => {
            Swal.fire('Error', error.response?.data?.message || 'Failed to update services', 'error');
        }
    });

    // Handle Service Toggle
    const toggleService = (serviceId: string) => {
        if (!clientDetails) return;

        let currentServices: string[] = [];
        if (Array.isArray(clientDetails.service_engagement)) {
            currentServices = clientDetails.service_engagement;
        } else if (typeof clientDetails.service_engagement === 'string') {
            try {
                currentServices = JSON.parse(clientDetails.service_engagement);
            } catch (e) { currentServices = [] }
        }

        const isEnabled = currentServices.includes(serviceId);
        const newServices = isEnabled
            ? currentServices.filter(s => s !== serviceId)
            : [...currentServices, serviceId];

        updateServicesMutation.mutate({ clientId: clientDetails.id, services: newServices });
    };

    const getServiceOverview = (serviceKey: string) => {
        if (!portalStats) return null;
        switch (serviceKey) {
            case 'META_ADS':
                const m = portalStats.meta_ads;
                if (!m) return null;
                return (
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div className="bg-white/50 p-1.5 rounded border border-blue-100">
                            <div className="text-muted-foreground scale-90 origin-left">Total Spend</div>
                            <div className="font-bold text-blue-700">₹{m.total_spend?.toLocaleString() || 0}</div>
                        </div>
                        <div className="bg-white/50 p-1.5 rounded border border-purple-100">
                            <div className="text-muted-foreground scale-90 origin-left">Last Campaign</div>
                            <div className="font-bold truncate text-purple-700">{m.last_campaign || '-'}</div>
                        </div>
                    </div>
                );
            case 'GOOGLE_ADS':
                const g = portalStats.google_ads;
                if (!g) return null;
                return (
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div className="bg-white/50 p-1.5 rounded border border-orange-100">
                            <div className="text-muted-foreground scale-90 origin-left">Total Spend</div>
                            <div className="font-bold text-orange-700">₹{g.total_spend?.toLocaleString() || 0}</div>
                        </div>
                        <div className="bg-white/50 p-1.5 rounded border border-yellow-100">
                            <div className="text-muted-foreground scale-90 origin-left">Conversions</div>
                            <div className="font-bold text-yellow-700">{g.conversions || 0}</div>
                        </div>
                    </div>
                );
            case 'SEO':
                const s = portalStats.seo;
                if (!s) return null;
                return (
                    <div className="mt-2 text-xs bg-white/50 p-1.5 rounded border border-green-100 flex items-center justify-between">
                        <div>
                            <div className="text-muted-foreground scale-90 origin-left">Traffic ({s.month})</div>
                            <div className="font-bold text-green-700">{s.traffic?.toLocaleString()} Visits</div>
                        </div>
                        <Activity size={14} className="text-green-500" />
                    </div>
                );
            case 'WEB_DEV':
                const w = portalStats.web_dev;
                if (!w) return null;
                return (
                    <div className="mt-2 text-xs">
                        <div className="font-medium text-gray-700 truncate">{w.active_project}</div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit">
                            {w.status}
                        </div>
                    </div>
                );
            case 'CONTENT':
            case 'BRANDING':
                const c = portalStats.content;
                if (!c) return null;
                return (
                    <div className="mt-2 text-xs bg-white/50 p-1.5 rounded border border-pink-100 flex items-center justify-between">
                        <span className="text-pink-700 font-medium">Pending Items</span>
                        <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full font-bold">{c.pending_items}</span>
                    </div>
                );
            default: return null;
        }
    };

    if (isClientsLoading) return <div className="p-8 text-center text-gray-500">Loading clients...</div>;

    return (
        <div className="animate-in fade-in w-full">
            {/* Header Area */}
            <div className="bg-yellow-50 border-b border-yellow-200 py-6 px-8 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-yellow-900 drop-shadow-sm">Manage Client Services</h2>
                    <p className="text-yellow-700/80 mt-1 font-medium">Configure active services and monitor tracking overviews.</p>
                </div>

                {/* Purple Client Selector */}
                <div className="relative w-full md:w-96">
                    <select
                        className="w-full h-12 pl-5 pr-12 rounded-xl border-2 border-purple-200 bg-purple-50 text-purple-900 font-bold text-lg ring-offset-background focus-visible:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-200 transition-all appearance-none cursor-pointer hover:bg-purple-100"
                        onChange={(e) => setManageClientId(e.target.value || null)}
                        value={manageClientId || ''}
                    >
                        <option value="">-- Select A Client --</option>
                        {clients?.sort((a: any, b: any) => a.name.localeCompare(b.name)).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-2 top-2 h-8 w-8 bg-purple-200 rounded-lg flex items-center justify-center pointer-events-none text-purple-700">
                        <ChevronDown className="h-5 w-5" />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-8 pb-8">
                {manageClientId && clientDetails ? (
                    <div className="space-y-6">
                        {/* Client Header */}
                        <div className="flex items-center gap-4 mb-8">
                            {clientDetails.logo_url ? (
                                <img src={(clientDetails.logo_url.startsWith('http')) ? clientDetails.logo_url : `${(import.meta as any).env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000'}${clientDetails.logo_url}`} className="w-16 h-16 rounded-full border-2 border-gray-100 object-cover shadow-sm" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                                    {clientDetails.name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">{clientDetails.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">ID: {clientDetails.client_code || 'N/A'}</span>
                                    {clientDetails.industry && <span className="text-sm px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{clientDetails.industry}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Object.keys(SERVICE_DEF).map(serviceKey => {
                                let currentServices: string[] = [];
                                if (Array.isArray(clientDetails.service_engagement)) {
                                    currentServices = clientDetails.service_engagement;
                                } else if (typeof clientDetails.service_engagement === 'string') {
                                    try { currentServices = JSON.parse(clientDetails.service_engagement); } catch { }
                                }

                                const isActive = currentServices.includes(serviceKey);
                                const ServiceIcon = SERVICE_DEF[serviceKey].icon;

                                return (
                                    <Card
                                        key={serviceKey}
                                        className={`flex flex-col border-2 transition-all duration-200 overflow-hidden ${isActive
                                            ? 'bg-gradient-to-b from-white to-gray-50 border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                                            : 'bg-gray-50/50 border-dashed border-gray-200 opacity-70 hover:opacity-100'
                                            }`}
                                    >
                                        <div className="p-5 flex-1 relative">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg shadow-sm ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                        <ServiceIcon size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-bold text-base ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{SERVICE_DEF[serviceKey].title}</h4>
                                                    </div>
                                                </div>
                                                <div
                                                    onClick={() => toggleService(serviceKey)}
                                                    className={`cursor-pointer w-10 h-6 rounded-full flex items-center transition-colors p-1 ${isActive ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}
                                                >
                                                    <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            <div className="mb-4">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>

                                            {/* Overview Stats (Only if Active) */}
                                            {isActive && portalStats ? (
                                                <div className="min-h-[60px]">
                                                    {getServiceOverview(serviceKey)}
                                                </div>
                                            ) : (
                                                <div className="min-h-[60px] flex items-center justify-center text-xs text-gray-400 italic">
                                                    {isActive ? 'Loading stats...' : 'Enable to track data'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer Actions */}
                                        {isActive && (
                                            <div className="bg-gray-50 p-2 border-t border-gray-100">
                                                <Button
                                                    size="sm"
                                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-8 text-xs font-semibold"
                                                    onClick={() => navigate(SERVICE_DEF[serviceKey].path + '?mode=manage&clientId=' + clientDetails.id)}
                                                >
                                                    Manage Data <ArrowRight size={12} className="ml-1 opacity-80" />
                                                </Button>
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-20 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 h-[60vh]">
                        <div className="bg-white p-6 rounded-full shadow-lg mb-6 text-purple-200">
                            <Settings size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Start Here</h3>
                        <p className="text-gray-500 text-center max-w-md mt-2">
                            Select a client from the purple menu above to begin managing their services.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PortalDashboard;
