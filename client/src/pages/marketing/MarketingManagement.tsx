import React, { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, BarChart3, Zap, Megaphone, Target, Loader2, AlertCircle, RefreshCw, Search, Building2, Plus, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ROLES } from '../../utils/roles';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Swal from 'sweetalert2';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input';

// Components
import ManageServicesView from '../portal/ManageServicesView';
import MarketingDashboard from './MarketingDashboard';
import MarketingCoreBeta from '../MarketingCoreBeta';
import StrategyManager from '../portal/StrategyWizard/StrategyManager';

const MarketingManagement = () => {
    const { user } = useAuthStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'services');
    const [isCreating, setIsCreating] = useState(false);

    const clientId = useMemo(() => {
        if (user?.role === 'CLIENT') return user.linked_client_id || '';
        return searchParams.get('clientId') || '';
    }, [user, searchParams]);

    const isDeveloperAdmin = user?.role === ROLES.DEVELOPER_ADMIN;

    // Fetch all clients for selection - ONLY ACTIVE for Marketing Management
    const { data: clients, isLoading: clientsLoading } = useQuery({
        queryKey: ['clients-active'],
        queryFn: async () => (await api.get('/clients?status=ACTIVE')).data,
        enabled: user?.role !== 'CLIENT'
    });

    const selectedClient = useMemo(() => {
        return clients?.find((c: any) => c.id === clientId);
    }, [clients, clientId]);

    const handleClientChange = (newId: string) => {
        const params = new URLSearchParams(searchParams);
        if (newId) {
            params.set('clientId', newId);
        } else {
            params.delete('clientId');
        }
        setSearchParams(params);
    };

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab);
        const params = new URLSearchParams(searchParams);
        params.set('tab', newTab);
        setSearchParams(params);
    };

    const tabs = [
        { 
            id: 'services', 
            label: 'Client-Marketing Services', 
            icon: TrendingUp, 
            activeClass: 'data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-purple-600' 
        },
        { 
            id: 'campaigns', 
            label: 'Client-Campaign Management', 
            icon: BarChart3, 
            activeClass: 'data-[state=active]:bg-yellow-400 data-[state=active]:text-purple-900 data-[state=active]:border-purple-600' 
        },
        { 
            id: 'strategy', 
            label: 'Strategy', 
            icon: Target, 
            activeClass: 'data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-600' 
        },
    ];

    // Only add Marketing Core for Developer Admin
    if (isDeveloperAdmin) {
        tabs.push({ 
            id: 'beta', 
            label: 'Marketing Core', 
            icon: Zap, 
            activeClass: 'data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600' 
        });
    }

    return (
        <div className="w-full space-y-4 p-2 md:p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        <Megaphone className="w-8 h-8 text-purple-600" />
                        Marketing Management
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium">Centralized control for marketing services, campaigns, and advanced tools.</p>
                </div>

                {/* Global Client Selector - Hidden on Strategy tab as it has its own switcher */}
                {user?.role !== 'CLIENT' && activeTab !== 'strategy' && (
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 w-full md:w-auto min-w-[300px]">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl text-purple-600 shrink-0">
                            <Building2 size={18} />
                        </div>
                        <Select value={clientId} onValueChange={handleClientChange}>
                            <SelectTrigger className="border-none shadow-none focus:ring-0 font-bold text-sm h-10 w-full">
                                <SelectValue placeholder="Select a client to manage..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                <div className="px-3 py-2 border-b border-gray-50 mb-1">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Available Clients</p>
                                </div>
                                {clients?.map((client: any) => (
                                    <SelectItem key={client.id} value={client.id} className="rounded-lg font-semibold py-2.5">
                                        <div className="flex items-center justify-between w-full gap-4">
                                            <span>{client.name}</span>
                                            {client.status === 'ACTIVE' ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[8px] font-black uppercase tracking-tighter px-1.5 leading-none">
                                                    Active
                                                </Badge>
                                            ) : client.status === 'LEAD' ? (
                                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[8px] font-black uppercase tracking-tighter px-1.5 leading-none">
                                                    Lead
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 mb-8 w-full justify-start border-b pb-4">
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all shadow-sm border-2 data-[state=inactive]:border-transparent data-[state=inactive]:bg-gray-100/50 data-[state=inactive]:text-gray-500 hover:data-[state=inactive]:bg-gray-200/50 hover:data-[state=inactive]:text-gray-700 ${tab.activeClass}`}
                        >
                            <tab.icon className="w-4 h-4 mr-2 stroke-[3px]" /> {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <div className="bg-transparent min-h-[700px] w-full">
                    {!clientId && user?.role !== 'CLIENT' && activeTab !== 'strategy' ? (
                        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 shadow-sm animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6 text-purple-200">
                                <Search size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">No Client Selected</h2>
                            <p className="text-gray-500 font-medium text-center max-w-sm mb-8">
                                Please select a client using the dropdown above to view and manage their marketing data.
                            </p>
                        </div>
                    ) : (
                        <>
                            <TabsContent value="services" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                                <ManageServicesView externalClientId={clientId} />
                            </TabsContent>
                            <TabsContent value="campaigns" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                                <MarketingDashboard externalClientId={clientId} />
                            </TabsContent>
                            <TabsContent value="strategy" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                                <StrategyManager clientId={clientId} selectedClient={selectedClient} clients={clients} />
                            </TabsContent>
                            {isDeveloperAdmin && (
                                <TabsContent value="beta" className="mt-0 focus-visible:outline-none animate-in fade-in duration-300">
                                    <MarketingCoreBeta externalClientId={clientId} />
                                </TabsContent>
                            )}
                        </>
                    )}
                </div>
            </Tabs>
        </div>
    );
};

export default MarketingManagement;
