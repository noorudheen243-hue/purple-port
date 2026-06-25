import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { 
    LayoutDashboard, List, KanbanSquare, Calendar, Megaphone, 
    Link2, FileText, Settings, RefreshCw, Plus, Search, Filter, 
    User, DollarSign, Award, Percent, Users, ChevronRight, Check, 
    X, Phone, MessageCircle, Mail, MapPin, Tag, PlusCircle, 
    Sliders, Download, Upload, Trash, GitMerge, FileSpreadsheet, Eye, Play, CheckCircle,
    BarChart3, UserPlus, Edit2, Trash2, Folder, CheckCircle2, TrendingUp
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Swal from 'sweetalert2';
import MarketingDashboard from '../marketing/MarketingDashboard';
import CrmMetaAdsManager from './CrmMetaAdsManager';

// Recharts components
import { 
    ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Cell 
} from 'recharts';

// CRM Stages
const CRM_STAGES = [
    'New Lead',
    'Contacted',
    'Qualified',
    'Follow-up Required',
    'Meeting Scheduled',
    'Proposal Sent',
    'Converted',
    'Lost',
    'Not Qualified'
];

interface Lead {
    id: string;
    client_id: string;
    source: string;
    date: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    location: string | null;
    campaign_name: string | null;
    campaignId: string | null;
    group_id?: string | null;
    quality: string | null;
    status: string;
    feedback: string | null;
    assigned_to: string | null;
    stage: string | null;
    conversion_val: number | null;
    lost_reason: string | null;
    tags: string | null;
    last_contacted_at: string | null;
    follow_ups: any[];
    leadNotes: any[];
    activities: any[];
}

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: string;
}

const ClientCrmWorkspace: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuthStore();
    
    const [activeTab, setActiveTab] = useState<
        'dashboard' | 'active_campaigns' | 'campaign_groups' | 'generated_leads' | 'manual_leads' | 'leads' | 'followups' | 'pipeline' | 'roas_report' | 'sales-team' | 'reports' |
        'campaign-mgmt' | 'meta-ads' | 'integrations' | 'settings'
    >('dashboard');
    
    // Group Selection State
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    // Date filter state (default to past 30 days)
    const [startDate, setStartDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    });

    // Reset selected group when client changes
    useEffect(() => {
        setSelectedGroupId(null);
    }, [clientId]);

    // Check permissions and direct CLIENT users to their linked client workspace
    useEffect(() => {
        if (currentUser?.role === 'CLIENT') {
            if (currentUser.linked_client_id !== clientId) {
                // Security violation
                Swal.fire({
                    icon: 'error',
                    title: 'Access Denied',
                    text: 'You do not have access to this client database.',
                    confirmButtonColor: '#4F46E5'
                }).then(() => {
                    navigate('/dashboard/crm');
                });
            }
        }
    }, [currentUser, clientId, navigate]);

    // Fetch Client Details
    const { data: clientDetails } = useQuery({
        queryKey: ['client-details', clientId],
        queryFn: async () => {
            const { data } = await api.get(`/clients/${clientId}`);
            return data;
        },
        enabled: !!clientId
    });

    // Fetch marketing groups under client
    const { data: groups = [] } = useQuery<any[]>({
        queryKey: ['client-groups', clientId],
        queryFn: async () => {
            const { data } = await api.get('/marketing/groups', { params: { clientId } });
            return data;
        },
        enabled: !!clientId
    });

    
    // Check if this client has a Meta account connected
    const { data: integrationStatus } = useQuery({
        queryKey: ['integration-status', clientId],
        queryFn: async () => {
            const { data } = await api.get('/marketing/status', { params: { clientId } });
            return data;
        },
        enabled: !!clientId,
        staleTime: 5 * 60 * 1000 // cache for 5 min
    });
    const hasMetaAccount = !!(integrationStatus?.meta);

    // Handle manual refresh
    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['client-groups', clientId] });
        queryClient.invalidateQueries({ queryKey: ['crm-stats', clientId] });
        queryClient.invalidateQueries({ queryKey: ['crm-leads', clientId] });
        queryClient.invalidateQueries({ queryKey: ['crm-followups', clientId] });
        queryClient.invalidateQueries({ queryKey: ['crm-campaigns', clientId] });
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Data refreshed successfully',
            showConfirmButton: false,
            timer: 1500
        });
    };

    const handleTabChange = (tab: typeof activeTab) => {
        setActiveTab(tab);
    };

    return (
        <div className="p-6 w-full space-y-6 animate-in fade-in duration-500 text-slate-800">
            {/* Main Header Banner */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-2xl shrink-0">
                        {clientDetails?.logo_url ? (
                            <img src={clientDetails.logo_url} alt={clientDetails.name} className="h-full w-full object-contain p-2 rounded-2xl" />
                        ) : (
                            clientDetails?.name.substring(0, 2).toUpperCase() || 'CRM'
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
                                {clientDetails?.name || 'CRM Workspace'}
                            </h1>
                            <Badge className="bg-indigo-100 text-indigo-700 font-bold border-none" variant="outline">
                                CRM Active
                            </Badge>
                            {clientDetails?.client_code && (
                                <Badge className="bg-slate-100 text-slate-600 font-semibold border-none" variant="outline">
                                    {clientDetails.client_code}
                                </Badge>
                            )}
                        </div>
                        <p className="text-slate-500 mt-1 text-sm font-medium">
                            Multi-Tenant Workspace | Sales Pipeline & Performance Tracker
                        </p>
                    </div>
                </div>

                {/* Filters and Actions */}
                <div className="flex flex-wrap items-center gap-4 lg:self-center">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl text-xs font-semibold">
                        <span className="text-slate-500 pl-2">Range:</span>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            className="bg-transparent border-none focus:ring-0 text-slate-700 font-bold cursor-pointer"
                        />
                        <span className="text-slate-400">to</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            className="bg-transparent border-none focus:ring-0 text-slate-700 font-bold cursor-pointer"
                        />
                    </div>

                    <Button 
                        onClick={handleRefresh}
                        variant="outline"
                        className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold flex items-center gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        <span className="hidden sm:inline">Sync Data</span>
                    </Button>

                    {/* Campaign Group Selector */}
                    {groups && groups.length > 0 ? (
                        <Select
                            value={selectedGroupId || 'ALL'}
                            onValueChange={(val) => setSelectedGroupId(val === 'ALL' ? null : val)}
                        >
                            <SelectTrigger className="w-56 text-xs h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-700 shadow-sm flex items-center justify-between gap-2">
                                <SelectValue placeholder="All Groups" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-xl">
                                <SelectItem value="ALL" className="font-semibold text-slate-500 italic">
                                    All Groups
                                </SelectItem>
                                {groups.map((group: any) => (
                                    <SelectItem key={group.id} value={group.id} className="font-semibold text-slate-700">
                                        {group.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Button
                            disabled
                            variant="outline"
                            className="rounded-xl border-slate-200 text-slate-400 bg-slate-50 font-bold opacity-60 cursor-not-allowed h-10 text-xs px-4"
                        >
                            Select Group
                        </Button>
                    )}
                </div>
            </div>

            {/* Sidebar + Main Content Split */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
                
                {/* SIDEBAR NAVIGATION */}
                <aside className="w-full md:w-64 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-1 shrink-0 self-start shadow-sm">
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Client CRM
                    </div>
                    <button 
                        onClick={() => handleTabChange('dashboard')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                    </button>
                    <button 
                        onClick={() => handleTabChange('active_campaigns')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'active_campaigns' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Megaphone className="h-4 w-4" />
                        <span>Campaigns</span>
                    </button>
                    <button 
                        onClick={() => handleTabChange('campaign_groups')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'campaign_groups' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Folder className="h-4 w-4" />
                        <span>Campaign Groups</span>
                    </button>
                    <button 
                        onClick={() => handleTabChange('generated_leads')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'generated_leads' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Generated Leads</span>
                    </button>
                    <button 
                        onClick={() => handleTabChange('manual_leads')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'manual_leads' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Plus className="h-4 w-4" />
                        <span>Manual Leads</span>
                    </button>
                    <button 
                        onClick={() => handleTabChange('leads')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'leads' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <List className="h-4 w-4" />
                        <span>Lead List</span>
                    </button>
                    <button 
                        onClick={() => handleTabChange('followups')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'followups' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Calendar className="h-4 w-4" />
                        <span>Follow-Ups</span>
                    </button>
                    <button 
                        onClick={() => handleTabChange('pipeline')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'pipeline' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <KanbanSquare className="h-4 w-4" />
                        <span>Lead Board</span>
                    </button>
                    <button 
                        onClick={() => handleTabChange('roas_report')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'roas_report' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <TrendingUp className="h-4 w-4" />
                        <span>Campaign Spend vs Conversion Value</span>
                    </button>
                    <button 
                        onClick={() => handleTabChange('sales-team')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'sales-team' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <User className="h-4 w-4" />
                        <span>CRM Team Assignment</span>
                    </button>
                    <button 
                        onClick={() => handleTabChange('reports')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span>Reports</span>
                    </button>

                    <div className="h-px bg-slate-200 my-2" />
                    
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Agency Admin Tools
                    </div>
                    <button 
                        onClick={() => handleTabChange('campaign-mgmt')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'campaign-mgmt' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Sliders className="h-4 w-4" />
                        <span>Client-Campaign Management</span>
                    </button>
                    <button 
                        onClick={() => handleTabChange('meta-ads')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'meta-ads' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Play className="h-4 w-4" />
                        <span>Meta Ads Manager</span>
                    </button>
                    <button 
                        onClick={() => handleTabChange('integrations')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'integrations' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Link2 className="h-4 w-4" />
                        <span>Webhooks</span>
                    </button>
                    <button 
                        onClick={() => handleTabChange('settings')}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                    </button>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 min-w-0">
                    <div className="space-y-6">
                        {activeTab === 'dashboard' && (
                            <CrmDashboardTab clientId={clientId!} startDate={startDate} endDate={endDate} groupId={selectedGroupId} />
                        )}
                        {activeTab === 'active_campaigns' && (
                            <CrmActiveCampaignsTab clientId={clientId!} groupId={selectedGroupId} />
                        )}
                        {activeTab === 'campaign_groups' && (
                            <CrmCampaignGroupsTab clientId={clientId!} />
                        )}
                        {activeTab === 'generated_leads' && (
                            <CrmLeadsTab clientId={clientId!} startDate={startDate} endDate={endDate} groupId={selectedGroupId} hasMetaAccount={hasMetaAccount} forcedSource="GENERATED" groups={groups} />
                        )}
                        {activeTab === 'manual_leads' && (
                            <CrmLeadsTab clientId={clientId!} startDate={startDate} endDate={endDate} groupId={selectedGroupId} hasMetaAccount={hasMetaAccount} forcedSource="MANUAL" groups={groups} />
                        )}
                        {activeTab === 'leads' && (
                            <CrmLeadsTab clientId={clientId!} startDate={startDate} endDate={endDate} groupId={selectedGroupId} hasMetaAccount={hasMetaAccount} groups={groups} />
                        )}
                        {activeTab === 'pipeline' && (
                            <CrmPipelineTab clientId={clientId!} groupId={selectedGroupId} />
                        )}
                        {activeTab === 'followups' && (
                            <CrmFollowUpsTab clientId={clientId!} groupId={selectedGroupId} />
                        )}
                        {activeTab === 'roas_report' && (
                            <CrmCampaignsTab clientId={clientId!} groupId={selectedGroupId} />
                        )}
                        {activeTab === 'sales-team' && (
                            <CrmSalesTeamTab clientId={clientId!} />
                        )}
                        {activeTab === 'reports' && (
                            <CrmReportsTab clientId={clientId!} clientName={clientDetails?.name || 'Client'} startDate={startDate} endDate={endDate} groupId={selectedGroupId} />
                        )}
                        {activeTab === 'campaign-mgmt' && (
                            <MarketingDashboard externalClientId={clientId!} />
                        )}
                        {activeTab === 'meta-ads' && (
                            <CrmMetaAdsManager clientId={clientId!} />
                        )}
                        {activeTab === 'integrations' && (
                            <CrmIntegrationsTab clientId={clientId!} />
                        )}
                        {activeTab === 'settings' && (
                            <CrmSettingsTab clientId={clientId!} />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ClientCrmWorkspace;


// ==========================================
// 1. DASHBOARD TAB COMPONENT
// ==========================================
interface DashboardData {
    stages: Record<string, number>;
    quality: Record<string, number>;
    platforms: Record<string, number>;
    financials: {
        totalSpend: number;
        totalConversions: number;
        conversionValueSum: number;
        costPerLead: number;
        costPerConversion: number;
        conversionRate: number;
        roas: number;
    };
    followUps: {
        today: number;
        overdue: number;
        upcoming: number;
        completed: number;
    };
    execPerformance: Array<{
        userId: string;
        name: string;
        leadsCount: number;
        convertedCount: number;
        conversionRate: number;
    }>;
    recentActivities: Array<{
        id: string;
        action: string;
        details: string | null;
        createdAt: string;
        lead: { name: string | null };
    }>;
}

const CrmDashboardTab: React.FC<{ clientId: string; startDate: string; endDate: string; groupId: string | null }> = ({ clientId, startDate, endDate, groupId }) => {
    const { data, isLoading } = useQuery<DashboardData>({
        queryKey: ['crm-stats', clientId, startDate, endDate, groupId],
        queryFn: async () => {
            const { data } = await api.get('/marketing/crm/dashboard-stats', { params: { clientId, startDate, endDate, groupId } });
            return data;
        }
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-white border border-slate-200 rounded-2xl animate-pulse p-6" />
                ))}
                <div className="col-span-1 lg:col-span-3 h-80 bg-white border border-slate-200 rounded-2xl animate-pulse" />
                <div className="h-80 bg-white border border-slate-200 rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (!data) return <div className="text-center text-slate-500 py-12">No data loaded.</div>;

    const { financials, stages, quality, platforms, followUps, execPerformance, recentActivities } = data;

    // Funnel chart calculations
    const funnelChartData = [
        { value: stages.total, name: 'Total leads', fill: '#4F46E5' },
        { value: stages.new, name: 'New Leads', fill: '#6366F1' },
        { value: stages.contacted, name: 'Contacted', fill: '#3B82F6' },
        { value: stages.qualified, name: 'Qualified', fill: '#10B981' },
        { value: stages.proposal, name: 'Proposal Sent', fill: '#F59E0B' },
        { value: stages.converted, name: 'Converted', fill: '#10B981' }
    ].filter(item => item.value > 0);

    const platformChartData = Object.entries(platforms || {})
        .map(([name, count]) => ({ name: name.toUpperCase(), count: count as number }))
        .filter(item => item.count > 0);

    return (
        <div className="space-y-6">
            {/* Highlighted KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white hover:border-slate-300 transition-all">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Leads</span>
                            <h3 className="text-3xl font-extrabold text-slate-900">{stages.total}</h3>
                            <p className="text-slate-500 text-xs font-semibold">In selected date range</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Users className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white hover:border-slate-300 transition-all">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ad Spend</span>
                            <h3 className="text-3xl font-extrabold text-slate-900">₹{financials.totalSpend.toLocaleString('en-IN')}</h3>
                            <p className="text-slate-500 text-xs font-semibold">Meta & Google Campaign spend</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                            <DollarSign className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white hover:border-slate-300 transition-all">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Converted Value</span>
                            <h3 className="text-3xl font-extrabold text-green-600">₹{financials.conversionValueSum.toLocaleString('en-IN')}</h3>
                            <p className="text-slate-500 text-xs font-semibold">Value of converted CRM leads</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold">
                            <Award className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white hover:border-slate-300 transition-all">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Campaign ROAS</span>
                            <h3 className={`text-3xl font-extrabold ${financials.roas >= 2 ? 'text-green-600' : financials.roas > 0 ? 'text-amber-500' : 'text-slate-700'}`}>
                                {financials.roas.toFixed(2)}x
                            </h3>
                            <p className="text-slate-500 text-xs font-semibold">Value generated / Ad spend</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <Percent className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Financial Performance details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border border-slate-200 bg-white rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            CPL
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold">Cost per Lead (CPL)</p>
                            <p className="text-xl font-bold text-slate-800">₹{financials.costPerLead.toFixed(1)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="border border-slate-200 bg-white rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
                            CR%
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold">Lead Conversion Rate</p>
                            <p className="text-xl font-bold text-slate-800">{financials.conversionRate.toFixed(1)}%</p>
                        </div>
                    </div>
                </Card>
                <Card className="border border-slate-200 bg-white rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            Alert
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold">Overdue Follow-ups</p>
                            <p className={`text-xl font-bold ${followUps.overdue > 0 ? 'text-red-500' : 'text-slate-800'}`}>{followUps.overdue} Tasks</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Visual Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Funnel Chart */}
                <Card className="col-span-1 lg:col-span-2 border border-slate-200/80 shadow-sm rounded-2xl bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800">Sales Funnel Analysis</CardTitle>
                        <CardDescription className="text-xs">Visual breakdown of leads moving through key conversion stages</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80 flex items-center justify-center">
                        {funnelChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="95%">
                                <FunnelChart>
                                    <Tooltip formatter={(value) => [`${value} Leads`]} />
                                    <Funnel
                                        dataKey="value"
                                        data={funnelChartData}
                                        isAnimationActive
                                    >
                                        <LabelList position="right" fill="#334155" dataKey="name" stroke="none" />
                                    </Funnel>
                                </FunnelChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-slate-400 italic text-sm">Not enough data to render funnel chart.</div>
                        )}
                    </CardContent>
                </Card>

                {/* Lead Platform Source Distribution */}
                <Card className="border border-slate-200/80 shadow-sm rounded-2xl bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800">Lead Platform Source</CardTitle>
                        <CardDescription className="text-xs">Leads split by campaign origin channel</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80 flex items-center justify-center">
                        {platformChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="95%">
                                <BarChart data={platformChartData} margin={{ left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 'bold' }} stroke="#CBD5E1" />
                                    <YAxis tick={{ fill: '#64748B', fontSize: 10 }} stroke="#CBD5E1" />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]}>
                                        {platformChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.name === 'META' ? '#1877F2' : entry.name === 'GOOGLE' ? '#EA4335' : '#4F46E5'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-slate-400 italic text-sm">No lead platform breakdown available.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Grid: Team Performance & Lead Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Executive Performance */}
                <Card className="col-span-1 border border-slate-200/80 shadow-sm rounded-2xl bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800">CRM Assignee Performance</CardTitle>
                        <CardDescription className="text-xs">Lead conversions by staff member</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 overflow-hidden">
                        {execPerformance.length > 0 ? (
                            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                                {execPerformance.map((u) => (
                                    <div key={u.userId} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                                                {u.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 leading-tight">{u.name}</p>
                                                <p className="text-slate-400 text-xs font-semibold">{u.leadsCount} Assigned</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-800 leading-tight">{u.convertedCount} Converted</p>
                                            <p className="text-green-600 text-xs font-bold">{u.conversionRate.toFixed(0)}% Rate</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-slate-400 italic text-sm">No assignees have handled leads yet in this period.</div>
                        )}
                    </CardContent>
                </Card>

                {/* Lead activity feed */}
                <Card className="col-span-1 lg:col-span-2 border border-slate-200/80 shadow-sm rounded-2xl bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800">Recent Lead Activity Feed</CardTitle>
                        <CardDescription className="text-xs">Real-time pipeline logs and notes</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 overflow-hidden">
                        {recentActivities.length > 0 ? (
                            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                                {recentActivities.map((act) => (
                                    <div key={act.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                                        <div className={`mt-0.5 h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold
                                            ${act.action === 'LEAD_CREATED' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}
                                        `}>
                                            {act.action === 'LEAD_CREATED' ? '+' : '✏️'}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-400 font-semibold">{new Date(act.createdAt).toLocaleString()}</p>
                                            <p className="text-sm font-semibold text-slate-800">
                                                <span className="text-indigo-600 font-bold">{act.lead.name || 'Unknown Lead'}</span>: {act.details}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-slate-400 italic text-sm">No activity logged yet for this client.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};


// ==========================================
// 2. LEADS LIST TAB COMPONENT
// ==========================================
const CrmLeadsTab: React.FC<{ 
    clientId: string; 
    startDate: string; 
    endDate: string; 
    groupId: string | null; 
    hasMetaAccount: boolean; 
    forcedSource?: 'GENERATED' | 'MANUAL';
    groups?: any[];
}> = ({ clientId, startDate, endDate, groupId, hasMetaAccount, forcedSource, groups }) => {
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuthStore();
    
    // Filters state
    const [search, setSearch] = useState('');
    const [stage, setStage] = useState('ALL');
    const [quality, setQuality] = useState('ALL');
    const [source, setSource] = useState(forcedSource || 'ALL');
    const [assignee, setAssignee] = useState('ALL');

    React.useEffect(() => {
        if (forcedSource) {
            setSource(forcedSource);
        } else {
            setSource('ALL');
        }
    }, [forcedSource]);

    // Selection state for bulk operations
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    
    // Details drawer/dialog state
    const [selectedLeadDetails, setSelectedLeadDetails] = useState<Lead | null>(null);
    const [newNote, setNewNote] = useState('');

    // Modal state
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
    const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isMergeOpen, setIsMergeOpen] = useState(false);

    // Form inputs for Manual Add
    const [addForm, setAddForm] = useState({
        name: '', phone: '', email: '', location: '', campaign_name: '',
        quality: 'MEDIUM', stage: 'New Lead', notes: '', tags: '', conversion_val: '0', assigned_to: ''
    });

    // Form inputs for Bulk updates
    const [bulkAssignUser, setBulkAssignUser] = useState('');
    const [bulkUpdateStage, setBulkUpdateStage] = useState('');
    const [bulkUpdateQuality, setBulkUpdateQuality] = useState('');

    // Form inputs for Merge
    const [mergePrimary, setMergePrimary] = useState('');
    const [mergeDuplicate, setMergeDuplicate] = useState('');

    // Form inputs for CSV Import
    const [csvText, setCsvText] = useState('');

    // Fetch leads
    const { data: leads = [], isLoading, refetch } = useQuery<Lead[]>({
        queryKey: ['crm-leads', clientId, search, stage, quality, source, assignee, startDate, endDate, groupId],
        queryFn: async () => {
            const params: any = { clientId, startDate, endDate };
            if (search) params.search = search;
            if (stage !== 'ALL') params.stage = stage;
            if (quality !== 'ALL') params.quality = quality;
            if (source !== 'ALL') params.source = source;
            if (assignee !== 'ALL') params.assignee = assignee;
            if (groupId) params.groupId = groupId;

            const { data } = await api.get('/marketing/crm/leads', { params });
            return data;
        }
    });

    // Reset selection if list changes
    useEffect(() => {
        setSelectedLeads([]);
    }, [leads]);

    // Group leads by Campaign Group and then Campaign Name for the "Generated Leads" view
    const groupedLeads = React.useMemo(() => {
        if (forcedSource !== 'GENERATED' || !groups) return null;
        
        const grouped: Record<string, { groupName: string; campaigns: Record<string, Lead[]> }> = {};
        
        leads.forEach(lead => {
            const groupId = lead.group_id;
            const groupName = groups.find(g => g.id === groupId)?.name || 'Unassigned';
            const campaignName = lead.campaign_name || 'Direct Lead (No Campaign)';
            
            if (!grouped[groupName]) {
                grouped[groupName] = { groupName, campaigns: {} };
            }
            if (!grouped[groupName].campaigns[campaignName]) {
                grouped[groupName].campaigns[campaignName] = [];
            }
            grouped[groupName].campaigns[campaignName].push(lead);
        });
        
        return grouped;
    }, [leads, groups, forcedSource]);

    // Fetch Lead Details when selected
    const fetchLeadDetails = async (leadId: string) => {
        try {
            // Find in current list
            const lead = leads.find(l => l.id === leadId);
            if (lead) setSelectedLeadDetails(lead);
        } catch (error) {
            console.error(error);
        }
    };

    // Toggle select lead
    const toggleSelectLead = (id: string) => {
        setSelectedLeads(prev => 
            prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLeads.length === leads.length) {
            setSelectedLeads([]);
        } else {
            setSelectedLeads(leads.map(l => l.id));
        }
    };

    // 1. Create manual lead mutation
    const createLeadMutation = useMutation({
        mutationFn: async (payload: any) => {
            return api.post('/marketing/crm/leads', { ...payload, clientId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
            setIsAddOpen(false);
            setAddForm({
                name: '', phone: '', email: '', location: '', campaign_name: '',
                quality: 'MEDIUM', stage: 'New Lead', notes: '', tags: '', conversion_val: '0', assigned_to: ''
            });
            Swal.fire('Created', 'Lead created successfully', 'success');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || err.message, 'error');
        }
    });

    // 2. Add lead note mutation
    const addNoteMutation = useMutation({
        mutationFn: async ({ leadId, content }: { leadId: string; content: string }) => {
            return api.post(`/marketing/crm/leads/${leadId}/notes`, { content, clientId });
        },
        onSuccess: (data, variables) => {
            setNewNote('');
            fetchLeadDetails(variables.leadId); // Refresh drawer
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
        }
    });

    // 3. Edit Lead Stage/Details mutation
    const updateDetailsMutation = useMutation({
        mutationFn: async ({ leadId, data }: { leadId: string; data: any }) => {
            return api.patch(`/marketing/crm/leads/${leadId}`, { ...data, clientId });
        },
        onSuccess: (res, variables) => {
            fetchLeadDetails(variables.leadId);
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
        }
    });

    // 4. Bulk Assign leads
    const bulkAssignMutation = useMutation({
        mutationFn: async () => {
            return api.post('/marketing/crm/leads/bulk-assign', { leadIds: selectedLeads, userId: bulkAssignUser, clientId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            setSelectedLeads([]);
            setIsBulkAssignOpen(false);
            setBulkAssignUser('');
            Swal.fire('Assigned', 'Leads assigned successfully', 'success');
        }
    });

    // 5. Bulk Update status
    const bulkUpdateMutation = useMutation({
        mutationFn: async () => {
            return api.post('/marketing/crm/leads/bulk-update', { 
                leadIds: selectedLeads, 
                stage: bulkUpdateStage || undefined, 
                quality: bulkUpdateQuality || undefined, 
                clientId 
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            setSelectedLeads([]);
            setIsBulkUpdateOpen(false);
            setBulkUpdateStage('');
            setBulkUpdateQuality('');
            Swal.fire('Updated', 'Leads updated successfully', 'success');
        }
    });

    // 5.5. Bulk Delete Leads Mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: async () => {
            return api.post('/marketing/crm/leads/bulk-delete', { 
                leadIds: selectedLeads, 
                clientId 
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
            setSelectedLeads([]);
            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Selected leads deleted successfully',
                confirmButtonColor: '#4F46E5'
            });
        },
        onError: (error: any) => {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to delete leads',
                confirmButtonColor: '#4F46E5'
            });
        }
    });

    const handleBulkDelete = async () => {
        const result = await Swal.fire({
            title: 'Delete Selected Leads?',
            text: `Are you sure you want to delete ${selectedLeads.length} selected leads? This action is permanent and cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, delete them!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            Swal.fire({
                title: 'Deleting...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            bulkDeleteMutation.mutate();
        }
    };

    // 6. Merge Leads Mutation
    const mergeMutation = useMutation({
        mutationFn: async () => {
            return api.post('/marketing/crm/leads/merge', { 
                primaryLeadId: mergePrimary, 
                duplicateLeadId: mergeDuplicate,
                clientId 
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            setIsMergeOpen(false);
            setMergePrimary('');
            setMergeDuplicate('');
            Swal.fire('Merged', 'Leads merged successfully. Duplicate record removed.', 'success');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || err.message, 'error');
        }
    });

    // 7. Parse & Import CSV/Excel paste
    const importMutation = useMutation({
        mutationFn: async (rows: any[]) => {
            return api.post('/marketing/crm/leads/import', { rows, clientId });
        },
        onSuccess: (res: any) => {
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
            setIsImportOpen(false);
            setCsvText('');
            Swal.fire('Import Complete', `Successfully imported ${res.data.imported} leads. Skipped ${res.data.skipped} empty rows.`, 'success');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || err.message, 'error');
        }
    });

    const handleCsvParseAndImport = () => {
        if (!csvText.trim()) return;
        
        // Parse CSV text: expects Header row (name, phone, email, location, campaign, quality, stage, notes, tags)
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const rows: any[] = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // simple CSV parsing handling split by commas
            const cols = lines[i].split(',').map(c => c.trim());
            const rowObj: any = {};
            
            headers.forEach((header, index) => {
                if (cols[index]) {
                    // Map headers
                    if (header === 'name') rowObj.name = cols[index];
                    else if (header === 'phone' || header === 'mobile') rowObj.phone = cols[index];
                    else if (header === 'email') rowObj.email = cols[index];
                    else if (header === 'location' || header === 'city') rowObj.location = cols[index];
                    else if (header === 'campaign') rowObj.campaign_name = cols[index];
                    else if (header === 'quality') rowObj.quality = cols[index].toUpperCase();
                    else if (header === 'stage') rowObj.stage = cols[index];
                    else if (header === 'notes' || header === 'note') rowObj.notes = cols[index];
                    else if (header === 'tags') rowObj.tags = cols[index];
                }
            });
            rows.push(rowObj);
        }

        if (rows.length === 0) {
            Swal.fire('No Rows', 'No parsed rows found in CSV text.', 'warning');
            return;
        }

        importMutation.mutate(rows);
    };

    // 8. Sync Meta Leads mutation
    const syncMetaMutation = useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/marketing/crm/leads/sync-meta', { clientId });
            return data;
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: data.synced > 0
                    ? `\u{1F4E5} Synced ${data.synced} leads from Meta Ads`
                    : 'Meta sync complete — no new leads',
                showConfirmButton: false,
                timer: 3500
            });
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message || err.message || 'Failed to sync Meta leads';
            const isNoAccount = err.response?.status === 404;
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: isNoAccount ? 'warning' : 'error',
                title: isNoAccount ? 'No Meta account connected for this client' : msg,
                showConfirmButton: false,
                timer: 4000
            });
        }
    });

    // Auto-sync Meta leads once per clientId mount — only if Meta account is connected
    useEffect(() => {
        if (!clientId || !hasMetaAccount) return;
        api.post('/marketing/crm/leads/sync-meta', { clientId })
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            })
            .catch(() => {
                // Silent — suppressed
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId, hasMetaAccount]);

    return (
        <div className="space-y-6">
            {/* Header Operations Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                {/* Search & filters */}
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input
                            placeholder="Search name, phone, campaign..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 text-xs rounded-lg font-medium text-slate-700 bg-slate-50 border-slate-200"
                        />
                    </div>

                    <Select value={stage} onValueChange={setStage}>
                        <SelectTrigger className="w-36 text-xs h-9 rounded-lg border-slate-200 bg-slate-50 font-semibold">
                            <SelectValue placeholder="Stage" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Stages</SelectItem>
                            {CRM_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={quality} onValueChange={setQuality}>
                        <SelectTrigger className="w-32 text-xs h-9 rounded-lg border-slate-200 bg-slate-50 font-semibold">
                            <SelectValue placeholder="Quality" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Qualities</SelectItem>
                            <SelectItem value="HIGH">High (Hot)</SelectItem>
                            <SelectItem value="MEDIUM">Medium (Warm)</SelectItem>
                            <SelectItem value="LOW">Low (Cold)</SelectItem>
                            <SelectItem value="JUNK">Junk/Invalid</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={assignee} onValueChange={setAssignee}>
                        <SelectTrigger className="w-36 text-xs h-9 rounded-lg border-slate-200 bg-slate-50 font-semibold">
                            <SelectValue placeholder="Assignee" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Staff</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            
                        </SelectContent>
                    </Select>
                </div>

                {/* Operations buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Button 
                        onClick={() => setIsAddOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs h-9 px-4 flex items-center gap-1.5"
                    >
                        <Plus className="h-4 w-4" /> Add Lead
                    </Button>

                    <Button 
                        onClick={() => setIsImportOpen(true)}
                        variant="outline"
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs h-9 rounded-lg px-4 flex items-center gap-1.5"
                    >
                        <Upload className="h-4 w-4" /> Import CSV
                    </Button>

                    {/* Meta Leads Sync Button */}
                    <div className="relative group">
                        <Button
                            onClick={() => {
                                if (!hasMetaAccount) {
                                    Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'info',
                                        title: 'No Meta Ads account connected for this client',
                                        text: 'Go to Integrations tab to connect a Meta account.',
                                        showConfirmButton: false,
                                        timer: 4000
                                    });
                                    return;
                                }
                                syncMetaMutation.mutate();
                            }}
                            disabled={syncMetaMutation.isPending}
                            className={`font-bold text-xs h-9 rounded-lg px-4 flex items-center gap-1.5 shadow-sm transition-all ${
                                hasMetaAccount
                                    ? 'bg-[#1877F2] hover:bg-[#1565D8] text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed'
                            } disabled:opacity-60`}
                        >
                            {syncMetaMutation.isPending ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className={`h-4 w-4 ${!hasMetaAccount ? 'opacity-50' : ''}`} />
                            )}
                            {syncMetaMutation.isPending ? 'Syncing...' : 'Sync Meta Leads'}
                        </Button>
                        {!hasMetaAccount && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                                No Meta account connected. Go to Integrations tab.
                            </div>
                        )}
                    </div>

                    <Button 
                        onClick={() => setIsMergeOpen(true)}
                        variant="outline"
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs h-9 rounded-lg px-4 flex items-center gap-1.5"
                    >
                        <GitMerge className="h-4 w-4" /> Merge Duplicates
                    </Button>
                </div>
            </div>

            {/* Bulk actions banner if leads are selected */}
            {selectedLeads.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-600 text-white font-bold">{selectedLeads.length}</Badge>
                        <span className="text-sm font-bold text-indigo-900">leads selected for bulk actions:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={() => setIsBulkAssignOpen(true)}
                            size="sm"
                            className="bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-lg px-3 py-1.5"
                        >
                            Assign to Staff
                        </Button>
                        <Button 
                            onClick={() => setIsBulkUpdateOpen(true)}
                            size="sm"
                            className="bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-lg px-3 py-1.5"
                        >
                            Update Stage/Quality
                        </Button>
                        {currentUser?.role === 'DEVELOPER_ADMIN' && (
                            <Button 
                                onClick={handleBulkDelete}
                                size="sm"
                                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs rounded-lg px-3 py-1.5 flex items-center gap-1"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Leads
                            </Button>
                        )}
                        <Button 
                            onClick={() => setSelectedLeads([])}
                            size="sm"
                            variant="ghost"
                            className="text-slate-500 hover:text-slate-800 font-bold text-xs"
                        >
                            Deselect All
                        </Button>
                    </div>
                </div>
            )}

            {/* Leads Table Container */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-slate-500 animate-pulse font-medium">Loading leads database...</div>
                ) : leads.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 italic font-medium">
                        No leads captured matching current filters. Click "Add Lead" or import a file.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {groupedLeads ? (
                            <div className="flex flex-col gap-6 p-4">
                                {Object.values(groupedLeads).map((groupBlock: any, idx: number) => (
                                    <div key={idx} className="border border-indigo-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                        <div className="bg-indigo-50/50 px-4 py-3 border-b border-indigo-100 flex items-center gap-2">
                                            <Folder className="h-5 w-5 text-indigo-500" />
                                            <h3 className="font-bold text-indigo-900">{groupBlock.groupName}</h3>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {Object.entries(groupBlock.campaigns).map(([campaignName, campaignLeads]: [string, any], cIdx: number) => (
                                                <div key={cIdx} className="p-4 bg-white">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 pl-2 border-l-2 border-indigo-200">
                                                        Campaign: <span className="text-slate-700">{campaignName}</span> 
                                                        <span className="ml-2 font-normal lowercase bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                                                            {campaignLeads.length} leads
                                                        </span>
                                                    </h4>
                                                    <Table>
                                                        <TableHeader className="bg-slate-50/50">
                                                            <TableRow className="border-slate-100">
                                                                <TableHead className="w-10">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={campaignLeads.every((l: Lead) => selectedLeads.includes(l.id))} 
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedLeads(prev => Array.from(new Set([...prev, ...campaignLeads.map((l: Lead) => l.id)])));
                                                                            } else {
                                                                                setSelectedLeads(prev => prev.filter(id => !campaignLeads.some((l: Lead) => l.id === id)));
                                                                            }
                                                                        }}
                                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                    />
                                                                </TableHead>
                                                                <TableHead className="font-bold text-slate-700 text-xs uppercase">Name</TableHead>
                                                                <TableHead className="font-bold text-slate-700 text-xs uppercase">Contact Number</TableHead>
                                                                <TableHead className="font-bold text-slate-700 text-xs uppercase">Source</TableHead>
                                                                <TableHead className="font-bold text-slate-700 text-xs uppercase">CRM Stage</TableHead>
                                                                <TableHead className="font-bold text-slate-700 text-xs uppercase">Quality</TableHead>
                                                                <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">Value</TableHead>
                                                                <TableHead className="w-16" />
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {campaignLeads.map((lead: Lead) => {
                                                                return (
                                                                    <TableRow key={lead.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                                        <TableCell>
                                                                            <input 
                                                                                type="checkbox" 
                                                                                checked={selectedLeads.includes(lead.id)} 
                                                                                onChange={() => toggleSelectLead(lead.id)}
                                                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell className="py-2.5">
                                                                            <div className="flex flex-col">
                                                                                <span className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer" onClick={() => fetchLeadDetails(lead.id)}>
                                                                                    {lead.name || 'Unnamed Lead'}
                                                                                </span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <div className="flex flex-col text-[11px] text-slate-600">
                                                                                <span className="font-medium text-xs">{lead.phone || '—'}</span>
                                                                                <span className="text-slate-400">{lead.email || '—'}</span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Badge className="bg-slate-100 text-slate-600 font-bold border-none text-[10px] w-fit" variant="outline">
                                                                                {lead.source}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Badge className={`border-none font-bold text-[10px]
                                                                                ${lead.stage === 'Converted' ? 'bg-green-100 text-green-700' :
                                                                                  lead.stage === 'Lost' || lead.stage === 'Not Qualified' ? 'bg-red-100 text-red-700' :
                                                                                  lead.stage === 'Proposal Sent' || lead.stage === 'Meeting Scheduled' ? 'bg-amber-100 text-amber-700' :
                                                                                  'bg-blue-100 text-blue-700'}
                                                                            `} variant="outline">
                                                                                {lead.stage || 'New Lead'}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <span className={`inline-flex items-center gap-1 text-xs font-bold
                                                                                ${lead.quality === 'HIGH' ? 'text-red-500' :
                                                                                  lead.quality === 'MEDIUM' ? 'text-amber-500' : 'text-slate-500'}
                                                                            `}>
                                                                                <span className={`h-2.5 w-2.5 rounded-full
                                                                                    ${lead.quality === 'HIGH' ? 'bg-red-500' :
                                                                                      lead.quality === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-400'}
                                                                                `} />
                                                                                {lead.quality || 'MEDIUM'}
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-bold text-sm text-slate-800">
                                                                            {lead.conversion_val ? `₹${lead.conversion_val.toLocaleString('en-IN')}` : '₹0'}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Button 
                                                                                onClick={() => fetchLeadDetails(lead.id)}
                                                                                variant="ghost" 
                                                                                className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 rounded-lg"
                                                                            >
                                                                                <Eye className="h-4 w-4" />
                                                                            </Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow className="border-slate-200">
                                        <TableHead className="w-10">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedLeads.length === leads.length} 
                                                onChange={toggleSelectAll}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase">Name</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase">Contact Number</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase">Source & Campaign</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase">CRM Stage</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase">Quality</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase">Assigned To</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">Value</TableHead>
                                        <TableHead className="w-16" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leads.map((lead) => {
                                        const assigneeUser: any = null;
                                        return (
                                            <TableRow key={lead.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                <TableCell>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedLeads.includes(lead.id)} 
                                                        onChange={() => toggleSelectLead(lead.id)}
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-3.5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer" onClick={() => fetchLeadDetails(lead.id)}>
                                                            {lead.name || 'Unnamed Lead'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-[11px] text-slate-600">
                                                        <span className="font-medium text-xs">{lead.phone || '—'}</span>
                                                        <span className="text-slate-400">{lead.email || '—'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <Badge className="bg-slate-100 text-slate-600 font-bold border-none text-[10px] w-fit" variant="outline">
                                                            {lead.source}
                                                        </Badge>
                                                        {lead.campaign_name && (
                                                            <span className="text-slate-400 text-xs font-semibold mt-1 truncate max-w-[150px]">{lead.campaign_name}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`border-none font-bold text-[10px]
                                                        ${lead.stage === 'Converted' ? 'bg-green-100 text-green-700' :
                                                          lead.stage === 'Lost' || lead.stage === 'Not Qualified' ? 'bg-red-100 text-red-700' :
                                                          lead.stage === 'Proposal Sent' || lead.stage === 'Meeting Scheduled' ? 'bg-amber-100 text-amber-700' :
                                                          'bg-blue-100 text-blue-700'}
                                                    `} variant="outline">
                                                        {lead.stage || 'New Lead'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center gap-1 text-xs font-bold
                                                        ${lead.quality === 'HIGH' ? 'text-red-500' :
                                                          lead.quality === 'MEDIUM' ? 'text-amber-500' : 'text-slate-500'}
                                                    `}>
                                                        <span className={`h-2.5 w-2.5 rounded-full
                                                            ${lead.quality === 'HIGH' ? 'bg-red-500' :
                                                              lead.quality === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-400'}
                                                        `} />
                                                        {lead.quality || 'MEDIUM'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-sm font-semibold text-slate-700">
                                                    {assigneeUser ? assigneeUser.full_name : <span className="text-slate-400 italic">Unassigned</span>}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-sm text-slate-800">
                                                    {lead.conversion_val ? `₹${lead.conversion_val.toLocaleString('en-IN')}` : '₹0'}
                                                </TableCell>
                                                <TableCell>
                                                    <Button 
                                                        onClick={() => fetchLeadDetails(lead.id)}
                                                        variant="ghost" 
                                                        className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 rounded-lg"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                )}
            </div>

            {/* ===================================== */}
            {/* ADD MANUAL LEAD DIALOG */}
            {/* ===================================== */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent initialWidth={500} title="Add New CRM Lead">
                    <DialogHeader>
                        <DialogDescription className="text-xs">Create a manual lead record. Round-robin assignment runs if unassigned.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 my-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Lead Name *</Label>
                            <Input 
                                value={addForm.name} 
                                onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Full Name"
                                className="rounded-lg text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Phone Number *</Label>
                            <Input 
                                value={addForm.phone} 
                                onChange={(e) => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+91 98765 43210"
                                className="rounded-lg text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Email Address</Label>
                            <Input 
                                value={addForm.email} 
                                onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="name@company.com"
                                className="rounded-lg text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Location/City</Label>
                            <Input 
                                value={addForm.location} 
                                onChange={(e) => setAddForm(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="e.g. Bangalore"
                                className="rounded-lg text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Campaign Name</Label>
                            <Input 
                                value={addForm.campaign_name} 
                                onChange={(e) => setAddForm(prev => ({ ...prev, campaign_name: e.target.value }))}
                                placeholder="Meta Ads Campaign"
                                className="rounded-lg text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Conversion Value (₹)</Label>
                            <Input 
                                type="number"
                                value={addForm.conversion_val} 
                                onChange={(e) => setAddForm(prev => ({ ...prev, conversion_val: e.target.value }))}
                                placeholder="0"
                                className="rounded-lg text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Lead Quality</Label>
                            <Select value={addForm.quality} onValueChange={(val) => setAddForm(p => ({ ...p, quality: val }))}>
                                <SelectTrigger className="rounded-lg text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="HIGH">High (Hot)</SelectItem>
                                    <SelectItem value="MEDIUM">Medium (Warm)</SelectItem>
                                    <SelectItem value="LOW">Low (Cold)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">CRM Stage</Label>
                            <Select value={addForm.stage} onValueChange={(val) => setAddForm(p => ({ ...p, stage: val }))}>
                                <SelectTrigger className="rounded-lg text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CRM_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Assigned Agent</Label>
                            <Select value={addForm.assigned_to} onValueChange={(val) => setAddForm(p => ({ ...p, assigned_to: val }))}>
                                <SelectTrigger className="rounded-lg text-xs">
                                    <SelectValue placeholder="Round-Robin auto-distribution" />
                                </SelectTrigger>
                                <SelectContent>
                                    
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Additional Notes / Notes Log</Label>
                            <Textarea 
                                value={addForm.notes} 
                                onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Lead enquiry details..."
                                className="rounded-lg text-xs h-16 resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-lg text-xs font-bold">Cancel</Button>
                        <Button 
                            onClick={() => createLeadMutation.mutate(addForm)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                            disabled={createLeadMutation.isPending || !addForm.name || !addForm.phone}
                        >
                            {createLeadMutation.isPending ? 'Creating...' : 'Save Lead'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ===================================== */}
            {/* BULK ASSIGN DIALOG */}
            {/* ===================================== */}
            <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
                <DialogContent initialWidth={380} title="Bulk Reassign Leads">
                    <DialogHeader>
                        <DialogDescription className="text-xs">Assign {selectedLeads.length} leads to an agent.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 my-4">
                        <Label className="text-xs font-bold text-slate-600">Select Staff Agent</Label>
                        <Select value={bulkAssignUser} onValueChange={setBulkAssignUser}>
                            <SelectTrigger className="rounded-lg text-xs">
                                <SelectValue placeholder="Select staff..." />
                            </SelectTrigger>
                            <SelectContent>
                                
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkAssignOpen(false)} className="rounded-lg text-xs font-bold">Cancel</Button>
                        <Button 
                            onClick={() => bulkAssignMutation.mutate()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                            disabled={bulkAssignMutation.isPending || !bulkAssignUser}
                        >
                            Reassign Leads
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ===================================== */}
            {/* BULK UPDATE STATUS DIALOG */}
            {/* ===================================== */}
            <Dialog open={isBulkUpdateOpen} onOpenChange={setIsBulkUpdateOpen}>
                <DialogContent initialWidth={380} title="Bulk Update Leads">
                    <DialogHeader>
                        <DialogDescription className="text-xs">Modify CRM Stage or Quality for {selectedLeads.length} leads.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 my-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Update CRM Stage (Optional)</Label>
                            <Select value={bulkUpdateStage} onValueChange={setBulkUpdateStage}>
                                <SelectTrigger className="rounded-lg text-xs">
                                    <SelectValue placeholder="Keep current stage" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CRM_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Update Quality (Optional)</Label>
                            <Select value={bulkUpdateQuality} onValueChange={setBulkUpdateQuality}>
                                <SelectTrigger className="rounded-lg text-xs">
                                    <SelectValue placeholder="Keep current quality" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="HIGH">High (Hot)</SelectItem>
                                    <SelectItem value="MEDIUM">Medium (Warm)</SelectItem>
                                    <SelectItem value="LOW">Low (Cold)</SelectItem>
                                    <SelectItem value="JUNK">Junk/Invalid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkUpdateOpen(false)} className="rounded-lg text-xs font-bold">Cancel</Button>
                        <Button 
                            onClick={() => bulkUpdateMutation.mutate()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                            disabled={bulkUpdateMutation.isPending || (!bulkUpdateStage && !bulkUpdateQuality)}
                        >
                            Update Leads
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ===================================== */}
            {/* MERGE DUPLICATES DIALOG */}
            {/* ===================================== */}
            <Dialog open={isMergeOpen} onOpenChange={setIsMergeOpen}>
                <DialogContent initialWidth={450} title="Merge Duplicate Leads">
                    <DialogHeader>
                        <DialogDescription className="text-xs">
                            Select two leads. Notes, activity logs, and follow-ups from the duplicate lead will be combined into the primary lead.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 my-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Primary Lead (Keep this record)</Label>
                            <Select value={mergePrimary} onValueChange={setMergePrimary}>
                                <SelectTrigger className="rounded-lg text-xs">
                                    <SelectValue placeholder="Select primary lead..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {leads.map(l => (
                                        <SelectItem key={l.id} value={l.id}>{l.name || 'Unnamed'} ({l.phone || 'no phone'})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Duplicate Lead (To be merged & deleted)</Label>
                            <Select value={mergeDuplicate} onValueChange={setMergeDuplicate}>
                                <SelectTrigger className="rounded-lg text-xs">
                                    <SelectValue placeholder="Select duplicate lead..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {leads.filter(l => l.id !== mergePrimary).map(l => (
                                        <SelectItem key={l.id} value={l.id}>{l.name || 'Unnamed'} ({l.phone || 'no phone'})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMergeOpen(false)} className="rounded-lg text-xs font-bold">Cancel</Button>
                        <Button 
                            onClick={() => mergeMutation.mutate()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                            disabled={mergeMutation.isPending || !mergePrimary || !mergeDuplicate}
                        >
                            Merge Records
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ===================================== */}
            {/* CSV IMPORT DIALOG */}
            {/* ===================================== */}
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogContent initialWidth={550} title="Paste CSV Data to Import">
                    <DialogHeader>
                        <DialogDescription className="text-xs">
                            Format requires a header row. Example: <br />
                            <code className="text-indigo-600 font-bold">name, phone, email, location, campaign, quality, stage, notes, tags</code>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 my-4">
                        <Label className="text-xs font-bold text-slate-600">Raw Comma-Separated Values</Label>
                        <Textarea 
                            value={csvText} 
                            onChange={(e) => setCsvText(e.target.value)}
                            placeholder="name, phone, email, location, campaign, quality, stage, notes, tags&#10;John Doe, 9876543210, john@doe.com, Delhi, Google Search, HIGH, New Lead, Looking for web dev, #hot"
                            className="rounded-lg text-xs font-mono h-48 resize-none"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsImportOpen(false)} className="rounded-lg text-xs font-bold">Cancel</Button>
                        <Button 
                            onClick={handleCsvParseAndImport}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                            disabled={importMutation.isPending || !csvText}
                        >
                            {importMutation.isPending ? 'Importing...' : 'Parse & Import Leads'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ===================================== */}
            {/* LEAD DETAIL & LOGS SIDE DRAWER */}
            {/* ===================================== */}
            <Dialog open={!!selectedLeadDetails} onOpenChange={(open) => !open && setSelectedLeadDetails(null)}>
                <DialogContent initialWidth={650} initialHeight="85vh" title="Lead Details & History">
                    {selectedLeadDetails && (
                        <>
                            <DialogHeader className="border-b pb-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-extrabold text-slate-900">{selectedLeadDetails.name || 'Unnamed Lead'}</h3>
                                        <DialogDescription className="text-xs font-bold text-slate-400">Captured on {new Date(selectedLeadDetails.date).toLocaleString()}</DialogDescription>
                                    </div>
                                    <Badge className="bg-slate-100 text-indigo-700 font-bold border-none text-[10px]" variant="outline">
                                        {selectedLeadDetails.source}
                                    </Badge>
                                </div>
                            </DialogHeader>

                            {/* Core Scroll Area */}
                            <div className="flex-1 overflow-y-auto my-4 space-y-6 pr-2">
                                {/* Lead Details Form Card */}
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="space-y-1">
                                        <span className="text-slate-400 text-[10px] font-bold uppercase">Phone</span>
                                        <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                                            {selectedLeadDetails.phone || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-slate-400 text-[10px] font-bold uppercase">Email</span>
                                        <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                                            {selectedLeadDetails.email || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-slate-400 text-[10px] font-bold uppercase">City/Location</span>
                                        <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                            {selectedLeadDetails.location || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-slate-400 text-[10px] font-bold uppercase">Campaign</span>
                                        <p className="text-xs font-semibold text-slate-800 truncate">
                                            {selectedLeadDetails.campaign_name || 'N/A'}
                                        </p>
                                    </div>
                                    
                                    {/* Editable pipeline settings */}
                                    <div className="space-y-1 col-span-2 pt-2 border-t border-slate-200 grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <span className="text-slate-400 text-[10px] font-bold uppercase">CRM Stage</span>
                                            <Select 
                                                value={selectedLeadDetails.stage || 'New Lead'} 
                                                onValueChange={(val) => updateDetailsMutation.mutate({ leadId: selectedLeadDetails.id, data: { stage: val } })}
                                            >
                                                <SelectTrigger className="h-8 text-xs bg-white rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {CRM_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-slate-400 text-[10px] font-bold uppercase">Assignee</span>
                                            <Select 
                                                value={selectedLeadDetails.assigned_to || ''} 
                                                onValueChange={(val) => updateDetailsMutation.mutate({ leadId: selectedLeadDetails.id, data: { assigned_to: val } })}
                                            >
                                                <SelectTrigger className="h-8 text-xs bg-white rounded-lg">
                                                    <SelectValue placeholder="Unassigned" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-slate-400 text-[10px] font-bold uppercase">Lead Quality</span>
                                            <Select 
                                                value={selectedLeadDetails.quality || 'MEDIUM'} 
                                                onValueChange={(val) => updateDetailsMutation.mutate({ leadId: selectedLeadDetails.id, data: { quality: val } })}
                                            >
                                                <SelectTrigger className="h-8 text-xs bg-white rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="HIGH">High (Hot)</SelectItem>
                                                    <SelectItem value="MEDIUM">Medium (Warm)</SelectItem>
                                                    <SelectItem value="LOW">Low (Cold)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-slate-400 text-[10px] font-bold uppercase">Deals/Conversion Value (₹)</span>
                                            <Input 
                                                type="number"
                                                defaultValue={selectedLeadDetails.conversion_val || 0}
                                                onBlur={(e) => updateDetailsMutation.mutate({ leadId: selectedLeadDetails.id, data: { conversion_val: e.target.value } })}
                                                className="h-8 text-xs bg-white rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Notes section */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b pb-1.5">
                                        <FileText className="h-4 w-4 text-indigo-500" /> Staff Follow-up Notes
                                    </h4>
                                    <div className="flex gap-2">
                                        <Input 
                                            value={newNote} 
                                            onChange={(e) => setNewNote(e.target.value)} 
                                            placeholder="Write a follow-up summary note..."
                                            className="text-xs h-9 rounded-lg"
                                        />
                                        <Button 
                                            onClick={() => addNoteMutation.mutate({ leadId: selectedLeadDetails.id, content: newNote })}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-4 rounded-lg text-xs"
                                            disabled={!newNote.trim() || addNoteMutation.isPending}
                                        >
                                            Log Note
                                        </Button>
                                    </div>

                                    {/* Notes display */}
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {selectedLeadDetails.leadNotes && selectedLeadDetails.leadNotes.length > 0 ? (
                                            selectedLeadDetails.leadNotes.map((note: any) => {
                                                const writer: any = null;
                                                return (
                                                    <div key={note.id} className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/50 text-xs">
                                                        <div className="flex justify-between font-bold text-slate-500 mb-1">
                                                            <span>{writer ? writer.full_name : 'System'}</span>
                                                            <span>{new Date(note.createdAt).toLocaleString()}</span>
                                                        </div>
                                                        <p className="text-slate-700 font-medium">{note.content}</p>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-slate-400 text-xs italic">No notes logged yet for this lead.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Activity Logs Feed */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b pb-1.5">
                                        <Sliders className="h-4 w-4 text-indigo-500" /> Lead Activity Log
                                    </h4>
                                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                        {selectedLeadDetails.activities && selectedLeadDetails.activities.length > 0 ? (
                                            selectedLeadDetails.activities.map((act: any) => (
                                                <div key={act.id} className="text-[11px] text-slate-500 flex justify-between gap-4 py-1 border-b border-dashed border-slate-100">
                                                    <span className="font-semibold text-slate-700">{act.details}</span>
                                                    <span className="shrink-0">{new Date(act.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-slate-400 text-xs italic">No lifecycle activities logged.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="border-t pt-4">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setSelectedLeadDetails(null)}
                                    className="rounded-lg text-xs font-bold"
                                >
                                    Close Details
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};


// ==========================================
// 3. PIPELINE KANBAN TAB COMPONENT
// ==========================================
const CrmPipelineTab: React.FC<{ clientId: string; groupId: string | null }> = ({ clientId, groupId }) => {
    const queryClient = useQueryClient();
    
    // Fetch all leads for client (without strict filter dates to ensure complete pipeline viewing)
    const { data: leads = [], isLoading } = useQuery<Lead[]>({
        queryKey: ['crm-pipeline-leads', clientId, groupId],
        queryFn: async () => {
            const params: any = { clientId };
            if (groupId) params.groupId = groupId;
            const { data } = await api.get('/marketing/crm/leads', { params });
            return data;
        }
    });

    // Handle Drag Start
    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('text/plain', leadId);
    };

    // Update lead stage on drop mutation
    const updateStageMutation = useMutation({
        mutationFn: async ({ leadId, stage }: { leadId: string; stage: string }) => {
            return api.patch(`/marketing/crm/leads/${leadId}`, { stage, clientId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-pipeline-leads'] });
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
        }
    });

    const handleDrop = (e: React.DragEvent, targetStage: string) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('text/plain');
        if (leadId) {
            updateStageMutation.mutate({ leadId, stage: targetStage });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    if (isLoading) {
        return <div className="p-12 text-center text-slate-500 animate-pulse font-medium">Loading sales pipelines...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="text-md font-bold text-slate-800">Visual Sales Kanban Board</h3>
                    <p className="text-xs text-slate-500">Drag and drop leads between columns to update their sales journey status.</p>
                </div>
            </div>

            {/* Kanban Columns Grid */}
            <div className="flex gap-4 overflow-x-auto pb-6 min-h-[500px]">
                {CRM_STAGES.map((columnStage) => {
                    const columnLeads = leads.filter(l => (l.stage || 'New Lead') === columnStage);
                    const totalVal = columnLeads.reduce((acc, curr) => acc + (curr.conversion_val || 0), 0);

                    return (
                        <div 
                            key={columnStage}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, columnStage)}
                            className="bg-slate-50/80 border border-slate-200 rounded-2xl w-72 shrink-0 flex flex-col p-4 space-y-3"
                        >
                            {/* Column Header */}
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <div className="space-y-0.5">
                                    <h4 className="text-xs font-black text-slate-800 truncate max-w-[150px]">{columnStage}</h4>
                                    <p className="text-[10px] font-bold text-slate-500">₹{totalVal.toLocaleString('en-IN')}</p>
                                </div>
                                <Badge className="bg-slate-200 text-slate-700 font-bold text-[10px] border-none">
                                    {columnLeads.length}
                                </Badge>
                            </div>

                            {/* Column Cards */}
                            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] pr-1">
                                {columnLeads.map((lead) => {
                                    const agent: any = null;
                                    return (
                                        <div 
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                            className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-indigo-400 cursor-grab active:cursor-grabbing transition-all duration-300 space-y-3"
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <h5 className="text-xs font-bold text-slate-800 leading-snug truncate max-w-[170px]">{lead.name || 'Unnamed'}</h5>
                                                <Badge className={`border-none font-bold text-[9px] scale-90 px-1.5 py-0.5 shrink-0
                                                    ${lead.quality === 'HIGH' ? 'bg-red-100 text-red-700' :
                                                      lead.quality === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}
                                                `} variant="outline">
                                                    {lead.quality || 'WARM'}
                                                </Badge>
                                            </div>

                                            <div className="text-[10px] text-slate-400 flex flex-col gap-0.5">
                                                <span>Source: <b>{lead.source}</b></span>
                                                {agent && <span>Agent: <b>{agent.full_name}</b></span>}
                                            </div>

                                            {lead.conversion_val && lead.conversion_val > 0 ? (
                                                <div className="border-t border-dashed border-slate-150 pt-2 flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-slate-400">Value</span>
                                                    <span className="text-xs font-extrabold text-slate-800">₹{lead.conversion_val.toLocaleString('en-IN')}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}

                                {columnLeads.length === 0 && (
                                    <div className="h-24 border border-dashed border-slate-250 rounded-xl flex items-center justify-center text-slate-400 italic text-[11px]">
                                        Drag leads here
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


// ==========================================
// 4. FOLLOW-UPS TAB COMPONENT
// ==========================================
interface FollowUpData {
    overdue: any[];
    today: any[];
    upcoming: any[];
    completed: any[];
}

const CrmFollowUpsTab: React.FC<{ clientId: string; groupId: string | null }> = ({ clientId, groupId }) => {
    const queryClient = useQueryClient();
    const [selectedAssignee, setSelectedAssignee] = useState('ALL');

    // Fetch followups
    const { data: followUpsData, isLoading } = useQuery<FollowUpData>({
        queryKey: ['crm-followups', clientId, selectedAssignee, groupId],
        queryFn: async () => {
            const params: any = { clientId };
            if (selectedAssignee !== 'ALL') params.assignee = selectedAssignee;
            if (groupId) params.groupId = groupId;
            const { data } = await api.get('/marketing/crm/follow-ups', { params });
            return data;
        }
    });

    // Update follow-up status mutation
    const updateFollowUpMutation = useMutation({
        mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
            return api.patch(`/marketing/crm/follow-ups/${id}`, { status, notes, clientId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-followups'] });
            queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Follow-up logged successfully',
                showConfirmButton: false,
                timer: 1500
            });
        }
    });

    const handleMarkComplete = (id: string, leadName: string) => {
        Swal.fire({
            title: `Log Follow-up outcome for ${leadName}`,
            input: 'textarea',
            inputPlaceholder: 'Enter call outcome notes here...',
            inputAttributes: {
                'aria-label': 'Outcome notes'
            },
            showCancelButton: true,
            confirmButtonText: 'Mark Completed',
            confirmButtonColor: '#4F46E5',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                updateFollowUpMutation.mutate({ 
                    id, 
                    status: 'COMPLETED', 
                    notes: result.value || 'Call completed successfully.' 
                });
            }
        });
    };

    if (isLoading) {
        return <div className="p-12 text-center text-slate-500 animate-pulse font-medium">Loading call lists...</div>;
    }

    const sections = [
        { title: 'Overdue Follow-ups', data: followUpsData?.overdue || [], color: 'border-red-500 text-red-700 bg-red-50/40' },
        { title: 'Today Tasks', data: followUpsData?.today || [], color: 'border-blue-500 text-blue-700 bg-blue-50/40' },
        { title: 'Upcoming Pipeline', data: followUpsData?.upcoming || [], color: 'border-slate-300 text-slate-700 bg-slate-50/40' }
    ];

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-md font-bold text-slate-800">Daily Follow-ups Scheduler</h3>
                    <p className="text-xs text-slate-500">Track and log customer call schedules logged across your leads.</p>
                </div>
                
            </div>

            {/* 3 Column layouts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {sections.map((sec) => (
                    <Card key={sec.title} className="border border-slate-200/80 bg-white rounded-2xl p-4 flex flex-col min-h-[400px]">
                        <div className={`p-3 border-l-4 rounded-r-xl ${sec.color} flex justify-between items-center mb-4`}>
                            <h4 className="text-xs font-black uppercase tracking-wider">{sec.title}</h4>
                            <Badge className="bg-white text-slate-800 border-none font-bold text-[10px]">
                                {sec.data.length}
                            </Badge>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 max-h-[450px] pr-1">
                            {sec.data.map((item: any) => {
                                const leadAgent: any = null;
                                return (
                                    <div key={item.id} className="p-3.5 border border-slate-200/70 hover:border-indigo-400 bg-white rounded-xl shadow-sm space-y-3 transition-colors duration-300">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="space-y-0.5">
                                                <h5 className="text-xs font-bold text-slate-800">{item.lead.name || 'Unnamed Lead'}</h5>
                                                <p className="text-[10px] text-slate-400 font-bold">{new Date(item.date).toLocaleString()}</p>
                                            </div>
                                            <Badge className="bg-indigo-50 text-indigo-700 font-black border-none text-[8px] uppercase">
                                                Call #{item.follow_up_number}
                                            </Badge>
                                        </div>

                                        <div className="text-[10px] text-slate-500 font-semibold space-y-1">
                                            <div className="flex items-center gap-1">
                                                <Phone className="h-3 w-3 text-slate-400" />
                                                <span>{item.lead.phone || 'no phone'}</span>
                                            </div>
                                            {leadAgent && (
                                                <div className="flex items-center gap-1">
                                                    <User className="h-3 w-3 text-slate-400" />
                                                    <span>Agent: {leadAgent.full_name}</span>
                                                </div>
                                            )}
                                        </div>

                                        {item.notes && (
                                            <p className="text-[10px] italic text-slate-400 bg-slate-50 p-2 rounded-lg truncate">
                                                "{item.notes}"
                                            </p>
                                        )}

                                        <Button 
                                            onClick={() => handleMarkComplete(item.id, item.lead.name || 'Unnamed')}
                                            className="w-full bg-slate-50 hover:bg-green-600 hover:text-white border border-slate-200 text-slate-700 font-black rounded-lg text-[10px] h-8 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5 text-green-500 group-hover:text-white" />
                                            <span>Mark Done</span>
                                        </Button>
                                    </div>
                                );
                            })}

                            {sec.data.length === 0 && (
                                <div className="text-center py-12 text-slate-400 italic text-[11px]">
                                    No follow-ups scheduled.
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};


// ==========================================
// 5. CAMPAIGNS ROAS TAB COMPONENT
// ==========================================
interface CampaignPerformance {
    campaignId: string;
    name: string;
    platform: string;
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
    convertedLeads: number;
    lostLeads: number;
    conversionValue: number;
    cpl: number;
    conversionRate: number;
    roas: number;
    status: string;
}

const CrmCampaignsTab: React.FC<{ clientId: string; groupId: string | null }> = ({ clientId, groupId }) => {
    const { data: report = [], isLoading } = useQuery<CampaignPerformance[]>({
        queryKey: ['crm-campaigns', clientId, groupId],
        queryFn: async () => {
            const params: any = { clientId };
            if (groupId) params.groupId = groupId;
            const { data } = await api.get('/marketing/crm/campaign-performance', { params });
            return data;
        }
    });

    return (
        <Card className="border border-slate-200/80 bg-white rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <CardTitle className="text-lg font-bold text-slate-800">Campaign spent vs Conversion Value (ROAS)</CardTitle>
                    <CardDescription className="text-xs">Actual marketing metrics joined with CRM converted leads financial outcomes.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="p-12 text-center text-slate-500 animate-pulse font-medium">Loading campaigns reports...</div>
                ) : report.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 italic font-medium">
                        No platform campaign spent logs found connected with leads in this client workspace.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase">Campaign Name</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase">Platform</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">Ad Spend</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">Leads Count</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">CPL</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">Converted Leads</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">Conversion Val</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">ROAS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.map((c) => (
                                    <TableRow key={c.campaignId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="font-bold text-slate-850 py-3.5">{c.name}</TableCell>
                                        <TableCell>
                                            <Badge className="bg-blue-50 text-blue-700 font-bold border-none text-[9px]">
                                                {c.platform}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-slate-700">₹{c.spend.toLocaleString('en-IN')}</TableCell>
                                        <TableCell className="text-right font-semibold text-slate-700">{c.leads}</TableCell>
                                        <TableCell className="text-right font-semibold text-slate-700">₹{c.cpl.toFixed(0)}</TableCell>
                                        <TableCell className="text-right font-semibold text-slate-700">
                                            {c.convertedLeads} <span className="text-[10px] text-slate-400">({c.conversionRate.toFixed(0)}%)</span>
                                        </TableCell>
                                        <TableCell className="text-right font-extrabold text-green-600">₹{c.conversionValue.toLocaleString('en-IN')}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge className={`border-none font-bold text-xs px-2.5 py-1
                                                ${c.roas >= 2 ? 'bg-green-100 text-green-700' :
                                                  c.roas > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}
                                            `}>
                                                {c.roas.toFixed(2)}x
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


// ==========================================
// 6. INTEGRATIONS / WEBHOOKS TAB COMPONENT
// ==========================================
const CrmIntegrationsTab: React.FC<{ clientId: string }> = ({ clientId }) => {
    const queryClient = useQueryClient();
    const [metaAccountId, setMetaAccountId] = useState('');
    const [metaToken, setMetaToken] = useState('');

    const connectMetaMutation = useMutation({
        mutationFn: async () => {
            return api.post('/marketing/crm/external/meta-manager/connect', { clientId, accountId: metaAccountId, accessToken: metaToken });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integration-status'] });
            queryClient.invalidateQueries({ queryKey: ['meta-accounts'] });
            Swal.fire('Connected', 'Meta Ad Account connected successfully!', 'success');
            setMetaAccountId('');
            setMetaToken('');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || err.message, 'error');
        }
    });

    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Webhook URL copied!',
            showConfirmButton: false,
            timer: 1500
        });
    };

    const webhookUrl = `${window.location.origin}/api/marketing/crm/webhooks/incoming?clientId=${clientId}`;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border border-slate-200 bg-white rounded-2xl p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Incoming Leads Webhook API</h3>
                    <p className="text-xs text-slate-500 mt-1">Connect landing pages (Elementor, WordPress, Webflow, custom HTML) to push leads directly to this CRM.</p>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">POST Target Webhook URL</Label>
                    <div className="flex gap-2">
                        <Input 
                            value={webhookUrl}
                            readOnly
                            className="bg-slate-50 font-mono text-xs font-bold border-slate-200 flex-1"
                        />
                        <Button 
                            onClick={() => handleCopyUrl(webhookUrl)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                        >
                            Copy URL
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Expected JSON Request Payload Structure</Label>
                    <pre className="p-4 bg-slate-900 text-orange-400 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed">
{`{
  "name": "Jane Customer",
  "phone": "+919999988888",
  "email": "jane@customer.com",
  "location": "Mumbai",
  "campaign_name": "Summer Special Landing Page",
  "quality": "HIGH", // Optional: HIGH, MEDIUM, LOW
  "notes": "Enquiring about web development pack",
  "tags": "webdev, landingpage"
}`}
                    </pre>
                </div>
            </Card>

            <Card className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4">
                <h4 className="text-sm font-bold text-slate-800">Connect Platforms</h4>
                <p className="text-xs text-slate-500">Enable automatic background synch of leads from lead capture forms.</p>
                
                <div className="divide-y divide-slate-100">
                    <div className="py-3 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Meta Leads Forms</span>
                        <Badge className="bg-green-100 text-green-700 font-semibold text-[9px] border-none">Connected</Badge>
                    </div>
                    <div className="py-3 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Google Lead Ads Extension</span>
                        <Badge className="bg-slate-100 text-slate-600 font-semibold text-[9px] border-none">Setup Webhook</Badge>
                    </div>
                    <div className="py-3 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">WhatsApp Campaigns</span>
                        <Badge className="bg-slate-100 text-slate-600 font-semibold text-[9px] border-none">Integration Ready</Badge>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800">Connect Meta Ads Manager</h4>
                    <p className="text-xs text-slate-500">Enter your Ad Account ID to manage campaigns directly from the CRM.</p>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Ad Account ID</Label>
                        <Input 
                            placeholder="e.g. act_123456789"
                            value={metaAccountId}
                            onChange={(e) => setMetaAccountId(e.target.value)}
                            className="bg-slate-50 text-xs"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Access Token (Optional)</Label>
                        <Input 
                            placeholder="Leave blank to use global profile token"
                            type="password"
                            value={metaToken}
                            onChange={(e) => setMetaToken(e.target.value)}
                            className="bg-slate-50 text-xs"
                        />
                    </div>
                    <Button 
                        onClick={() => connectMetaMutation.mutate()} 
                        disabled={!metaAccountId || connectMetaMutation.isPending}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                        {connectMetaMutation.isPending ? 'Connecting...' : 'Connect Meta Account'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};


// ==========================================
// 7. REPORTS & EXPORTS TAB COMPONENT
// ==========================================
const CrmReportsTab: React.FC<{ clientId: string; clientName: string; startDate: string; endDate: string; groupId: string | null }> = ({ clientId, clientName, startDate, endDate, groupId }) => {
    
    // Download leads Excel/CSV
    const handleDownloadCSV = async () => {
        try {
            const { data } = await api.get('/marketing/crm/leads', { params: { clientId, startDate, endDate, groupId } });
            if (!data || data.length === 0) {
                Swal.fire('No Data', 'No leads found to download.', 'info');
                return;
            }

            // Convert to CSV string
            const headers = ['Name', 'Phone', 'Email', 'Location', 'Campaign', 'Source', 'Quality', 'Stage', 'Conversion Value', 'Date Captured'];
            const rows = data.map((l: any) => [
                l.name || '',
                l.phone || '',
                l.email || '',
                l.location || '',
                l.campaign_name || '',
                l.source || '',
                l.quality || '',
                l.stage || '',
                l.conversion_val || 0,
                new Date(l.date).toLocaleDateString()
            ]);

            const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.map(val => `"${val}"`).join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `${clientName.replace(/\s+/g, '_')}_Leads_${startDate}_to_${endDate}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            Swal.fire('Downloaded', 'CSV file downloaded successfully.', 'success');
        } catch (err) {
            console.error(err);
        }
    };

    // Download PDF report
    const handleDownloadPDF = async () => {
        try {
            const { data: stats } = await api.get('/marketing/crm/dashboard-stats', { params: { clientId, startDate, endDate, groupId } });
            if (!stats) return;

            // Import dynamically to reduce bundle load
            const { jsPDF } = await import('jspdf');
            
            const doc = new jsPDF();
            doc.setFont('Helvetica', 'bold');
            doc.text(`Client CRM Performance Report`, 20, 20);
            
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Client Name: ${clientName}`, 20, 30);
            doc.text(`Period: ${startDate} to ${endDate}`, 20, 35);
            doc.text(`Report Generated On: ${new Date().toLocaleDateString()}`, 20, 40);

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(`Core Marketing & Conversion KPIs`, 20, 55);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`- Total Leads Captured: ${stats.stages.total}`, 20, 65);
            doc.text(`- Converted Leads: ${stats.stages.converted} (${stats.financials.conversionRate.toFixed(1)}% Conversion Rate)`, 20, 70);
            doc.text(`- Ad Campaign Spend: INR ${stats.financials.totalSpend.toLocaleString('en-IN')}`, 20, 75);
            doc.text(`- Realized Conversion Value: INR ${stats.financials.conversionValueSum.toLocaleString('en-IN')}`, 20, 80);
            doc.text(`- Return on Ad Spend (ROAS): ${stats.financials.roas.toFixed(2)}x`, 20, 85);
            doc.text(`- Cost Per Lead (CPL): INR ${stats.financials.costPerLead.toFixed(1)}`, 20, 90);

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(`Leads by Platform Source`, 20, 105);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            let idx = 115;
            Object.entries(stats.platforms).forEach(([platform, count]) => {
                doc.text(`- ${platform.toUpperCase()}: ${count} Leads`, 20, idx);
                idx += 6;
            });

            doc.save(`${clientName.replace(/\s+/g, '_')}_CRM_Report.pdf`);
            Swal.fire('Downloaded', 'PDF performance report downloaded successfully.', 'success');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4 hover:border-slate-350 transition-colors">
                <div className="h-12 w-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-bold">
                    <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-md font-bold text-slate-800">Export Leads Database to CSV</h3>
                    <p className="text-xs text-slate-500 mt-1">Downloads complete spreadsheet table containing lead contacts, campaigns, assignment details, and outcomes.</p>
                </div>
                <Button 
                    onClick={handleDownloadCSV}
                    className="w-full bg-slate-50 hover:bg-indigo-600 border border-slate-200 text-slate-700 font-bold hover:text-white rounded-xl py-5 transition-colors"
                >
                    Download Excel CSV
                </Button>
            </Card>

            <Card className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4 hover:border-slate-350 transition-colors">
                <div className="h-12 w-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-bold">
                    <FileText className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-md font-bold text-slate-800">Download Executive PDF Summary</h3>
                    <p className="text-xs text-slate-500 mt-1">Generates a branded executive PDF reporting campaign results, funnel conversion rates, spend metrics, and source performance.</p>
                </div>
                <Button 
                    onClick={handleDownloadPDF}
                    className="w-full bg-slate-50 hover:bg-indigo-600 border border-slate-200 text-slate-700 font-bold hover:text-white rounded-xl py-5 transition-colors"
                >
                    Download Executive PDF
                </Button>
            </Card>
        </div>
    );
};


// ==========================================
// 8. SETTINGS & CRM CONFIG TAB COMPONENT
// ==========================================
const CrmSettingsTab: React.FC<{ clientId: string }> = ({ clientId }) => {
    const handleConnectMeta = () => {
        Swal.fire({
            icon: 'info',
            title: 'Meta Integration',
            text: 'Redirecting to Meta Ad Account authentication...',
            confirmButtonColor: '#4F46E5'
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border border-slate-200 bg-white rounded-2xl p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Connect Meta Ad Account</h3>
                    <p className="text-xs text-slate-500 mt-1">Authenticate and connect your client's Meta Ad Account to sync campaigns and track ROAS.</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                        <Label className="text-sm font-bold text-slate-800">Meta Facebook & Instagram Ads</Label>
                        <p className="text-xs text-slate-400">Not connected</p>
                    </div>
                    <Button 
                        onClick={handleConnectMeta}
                        className="bg-[#1877F2] hover:bg-[#1864D9] text-white font-bold rounded-lg text-xs"
                    >
                        Connect Meta Account
                    </Button>
                </div>
            </Card>

            <Card className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4">
                <h4 className="text-sm font-bold text-slate-800">Pipeline Stages Customization</h4>
                <p className="text-xs text-slate-500">View and rearrange the active workflow columns for your sales pipeline board.</p>
                
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {CRM_STAGES.map((s, idx) => (
                        <div key={s} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-3">
                            <span className="text-slate-400 font-semibold w-4">{idx + 1}.</span>
                            <span>{s}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

// =========================================================
// 9. SALES TEAM MANAGEMENT TAB COMPONENT
// =========================================================
interface CrmUser {
    id: string;
    full_name: string;
    designation: string | null;
    email: string;
    mobile: string | null;
    user_id: string;
    status: string;
    campaign_group_id: string | null;
    campaign_group?: {
        name: string;
    } | null;
}

const CrmSalesTeamTab: React.FC<{ clientId: string }> = ({ clientId }) => {
    const queryClient = useQueryClient();

    // Fetch CRM Users
    const { data: crmUsers = [], isLoading } = useQuery<CrmUser[]>({
        queryKey: ['crm-users-list', clientId],
        queryFn: async () => {
            const { data } = await api.get('/crm/users', { params: { clientId } });
            return data;
        }
    });

    // Fetch marketing groups
    const { data: groups = [] } = useQuery<any[]>({
        queryKey: ['client-groups', clientId],
        queryFn: async () => {
            const { data } = await api.get('/marketing/groups', { params: { clientId } });
            return data;
        }
    });

    // Mutations
    const createUser = useMutation({
        mutationFn: async (userData: any) => {
            return (await api.post('/crm/users', { ...userData, clientId })).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-users-list', clientId] });
            Swal.fire('Created!', 'Sales team user has been created.', 'success');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || 'Failed to create user', 'error');
        }
    });

    const updateUser = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            return (await api.put(`/crm/users/${id}`, { ...data, clientId })).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-users-list', clientId] });
            Swal.fire('Updated!', 'Sales team user details have been updated.', 'success');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || 'Failed to update user', 'error');
        }
    });

    const deleteUser = useMutation({
        mutationFn: async (id: string) => {
            return (await api.delete(`/crm/users/${id}`, { params: { clientId } })).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-users-list', clientId] });
            Swal.fire('Deleted!', 'Sales team user has been deleted.', 'success');
        }
    });

    // Toggle Status
    const handleToggleStatus = (user: CrmUser) => {
        const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        updateUser.mutate({
            id: user.id,
            data: { status: newStatus }
        });
    };

    // Delete confirmation
    const handleDeleteConfirm = (id: string) => {
        Swal.fire({
            title: 'Delete Sales User?',
            text: 'This user will no longer be able to log into the CRM portal. This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete',
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteUser.mutate(id);
            }
        });
    };

    // Open User Modal (Create/Edit)
    const handleOpenUserModal = (user?: CrmUser) => {
        const groupOptions = groups.map(g => `<option value="${g.id}" ${user?.campaign_group_id === g.id ? 'selected' : ''}>${g.name}</option>`).join('');

        Swal.fire({
            title: user ? 'Edit Sales Team User' : 'Create Sales Team User',
            html: `
                <div class="text-left space-y-3 p-2">
                    <input id="crm-full-name" class="swal2-input w-full" style="width: 100%; margin: 10px 0 0;" placeholder="Full Name" value="${user?.full_name || ''}">
                    <input id="crm-designation" class="swal2-input w-full" style="width: 100%; margin: 10px 0 0;" placeholder="Designation" value="${user?.designation || ''}">
                    <input id="crm-email" class="swal2-input w-full" style="width: 100%; margin: 10px 0 0;" placeholder="Email" type="email" value="${user?.email || ''}">
                    <input id="crm-mobile" class="swal2-input w-full" style="width: 100%; margin: 10px 0 0;" placeholder="Mobile" value="${user?.mobile || ''}">
                    <input id="crm-user-id" class="swal2-input w-full" style="width: 100%; margin: 10px 0 0;" placeholder="User ID (login)" value="${user?.user_id || ''}">
                    <input id="crm-password" class="swal2-input w-full" style="width: 100%; margin: 10px 0 0;" placeholder="${user ? 'New Password (leave blank to keep)' : 'Password'}" type="password">
                    
                    <div style="margin-top: 15px;">
                        <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Campaign Group Assignment</label>
                        <select id="crm-group-id" class="swal2-select w-full" style="margin: 0; width: 100%; height: 40px; border-radius: 6px;">
                            <option value="">No Group (Full CRM Access)</option>
                            ${groupOptions}
                        </select>
                    </div>

                    ${user ? `
                    <div style="margin-top: 15px;">
                        <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</label>
                        <select id="crm-status" class="swal2-select w-full" style="margin: 0; width: 100%; height: 40px; border-radius: 6px;">
                            <option value="ACTIVE" ${user.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
                            <option value="INACTIVE" ${user.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    ` : ''}
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: user ? 'Update User' : 'Create User',
            confirmButtonColor: '#4F46E5',
            preConfirm: () => {
                const full_name = (document.getElementById('crm-full-name') as HTMLInputElement).value;
                const designation = (document.getElementById('crm-designation') as HTMLInputElement).value;
                const email = (document.getElementById('crm-email') as HTMLInputElement).value;
                const mobile = (document.getElementById('crm-mobile') as HTMLInputElement).value;
                const user_id = (document.getElementById('crm-user-id') as HTMLInputElement).value;
                const password = (document.getElementById('crm-password') as HTMLInputElement).value;
                const campaign_group_id = (document.getElementById('crm-group-id') as HTMLSelectElement).value;
                
                const data: any = { full_name, designation, email, mobile, user_id, campaign_group_id };
                if (password) data.password = password;
                
                if (user) {
                    data.status = (document.getElementById('crm-status') as HTMLSelectElement).value;
                }

                if (!full_name || !user_id || (!user && !password)) {
                    Swal.showValidationMessage('Full Name, User ID, and Password are required');
                    return false;
                }

                return data;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                if (user) {
                    updateUser.mutate({ id: user.id, data: result.value });
                } else {
                    createUser.mutate(result.value);
                }
            }
        });
    };

    return (
        <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h3 className="text-base font-extrabold text-slate-900">Manage Sales Team Users</h3>
                    <p className="text-xs text-slate-500 mt-1">Create logins for external sales team members and scope their access to specific groups.</p>
                </div>
                <Button 
                    onClick={() => handleOpenUserModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-10 px-4 flex items-center gap-1.5 shadow-md shadow-indigo-600/10 active:scale-95 transition-all"
                >
                    <UserPlus size={16} />
                    <span>Create CRM User</span>
                </Button>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-250">
                            <th className="p-4 font-bold text-slate-600 uppercase tracking-wider">User Info</th>
                            <th className="p-4 font-bold text-slate-600 uppercase tracking-wider">Login Credentials</th>
                            <th className="p-4 font-bold text-slate-600 uppercase tracking-wider">Campaign Group</th>
                            <th className="p-4 font-bold text-slate-600 uppercase tracking-wider">Status</th>
                            <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-450" /></td>
                            </tr>
                        ) : crmUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 italic font-medium">No sales team users created yet.</td>
                            </tr>
                        ) : (
                            crmUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4">
                                        <p className="font-bold text-sm text-slate-900">{user.full_name}</p>
                                        <p className="text-slate-450 font-semibold">{user.designation || 'Sales Agent'}</p>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-0.5">
                                            <p className="font-medium text-slate-700">ID: <span className="font-bold text-slate-900">{user.user_id}</span></p>
                                            <p className="text-slate-400">{user.email}</p>
                                            {user.mobile && <p className="text-slate-400">{user.mobile}</p>}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <Badge className={`border-none font-bold text-[10px] ${user.campaign_group ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`} variant="outline">
                                            {user.campaign_group?.name || 'Full Access'}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => handleToggleStatus(user)}
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors
                                                ${user.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-150' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-150'}
                                            `}
                                        >
                                            {user.status}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <button 
                                                onClick={() => handleOpenUserModal(user)}
                                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                                                title="Edit Details"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteConfirm(user.id)}
                                                className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 hover:text-red-700 transition-colors"
                                                title="Delete User"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};


// ==========================================
// 11. ACTIVE CAMPAIGNS LIST TAB COMPONENT
// ==========================================
const CrmActiveCampaignsTab: React.FC<{ clientId: string; groupId: string | null }> = ({ clientId, groupId: initialGroupId }) => {
    const queryClient = useQueryClient();
    
    const { data: groups = [] } = useQuery<any[]>({
        queryKey: ['client-groups', clientId],
        queryFn: async () => {
            const { data } = await api.get('/marketing/groups', { params: { clientId } });
            return data;
        },
        enabled: !!clientId
    });

    const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [monthFilter, setMonthFilter] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Sync from parent groupId prop
    useEffect(() => {
        if (initialGroupId) {
            setSelectedGroup(initialGroupId);
        } else {
            setSelectedGroup('ALL');
        }
    }, [initialGroupId]);

    const assignGroupMutation = useMutation({
        mutationFn: async (data: { groupId: string | null; campaignId: string }) => {
            if (!data.groupId) {
                return api.post('/marketing/groups/unassign', { campaignId: data.campaignId });
            }
            return api.post('/marketing/groups/assign', { groupId: data.groupId, campaignIds: [data.campaignId] });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-campaigns'] });
            Swal.fire({ title: 'Assigned', text: 'Campaign group updated successfully', icon: 'success', timer: 1500, showConfirmButton: false });
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.error || err.message, 'error');
        }
    });

    const { data: report = [], isLoading, refetch } = useQuery<any[]>({
        queryKey: ['crm-campaigns', clientId, selectedGroup !== 'ALL' ? selectedGroup : null],
        queryFn: async () => {
            const params: any = { clientId };
            if (selectedGroup !== 'ALL') params.groupId = selectedGroup;
            const { data } = await api.get('/marketing/crm/campaign-performance', { params });
            return data;
        }
    });

    // Month lists for the filter dropdown
    const months = [
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' }
    ];

    // Client-side filtering for status, month, and date range
    const filteredReport = report.filter((c: any) => {
        // Status filter (Active/Paused/Stopped)
        if (statusFilter !== 'ALL') {
            const campaignStatus = c.status?.toUpperCase() || '';
            if (statusFilter === 'ACTIVE' && campaignStatus !== 'ACTIVE' && campaignStatus !== 'RUNNING') return false;
            if (statusFilter === 'PAUSED' && campaignStatus !== 'PAUSED') return false;
            if (statusFilter === 'STOPPED' && (campaignStatus === 'ACTIVE' || campaignStatus === 'RUNNING' || campaignStatus === 'PAUSED')) return false;
        }

        // Date filters
        const campaignDate = c.startDate ? new Date(c.startDate) : null;
        if (campaignDate) {
            // Month filter
            if (monthFilter !== 'ALL') {
                const campaignMonth = (campaignDate.getMonth() + 1).toString().padStart(2, '0');
                if (campaignMonth !== monthFilter) return false;
            }

            // Date Range From-To
            if (startDate) {
                const fromDate = new Date(startDate);
                if (campaignDate < fromDate) return false;
            }
            if (endDate) {
                const toDate = new Date(endDate);
                toDate.setHours(23, 59, 59, 999);
                if (campaignDate > toDate) return false;
            }
        } else {
            // If campaign has no start date, but date filters are active, filter it out
            if (monthFilter !== 'ALL' || startDate || endDate) return false;
        }

        return true;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Filter Bar Panel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Campaign Group filter */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign Group</label>
                        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                            <SelectTrigger className="w-48 text-xs h-9 rounded-lg border-slate-200 bg-slate-50 font-semibold text-slate-700">
                                <SelectValue placeholder="All Groups" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border">
                                <SelectItem value="ALL" className="font-semibold text-slate-500 italic">All Groups</SelectItem>
                                {groups.map((group: any) => (
                                    <SelectItem key={group.id} value={group.id} className="font-semibold text-slate-750">{group.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status filter */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign Status</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-40 text-xs h-9 rounded-lg border-slate-200 bg-slate-50 font-semibold text-slate-700">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border">
                                <SelectItem value="ALL" className="font-semibold text-slate-500">All Statuses</SelectItem>
                                <SelectItem value="ACTIVE" className="font-semibold text-green-700">Active / Running</SelectItem>
                                <SelectItem value="PAUSED" className="font-semibold text-amber-700">Paused</SelectItem>
                                <SelectItem value="STOPPED" className="font-semibold text-slate-600">Stopped / Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Month filter */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Month Wise</label>
                        <Select value={monthFilter} onValueChange={setMonthFilter}>
                            <SelectTrigger className="w-40 text-xs h-9 rounded-lg border-slate-200 bg-slate-50 font-semibold text-slate-700">
                                <SelectValue placeholder="All Months" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border">
                                <SelectItem value="ALL" className="font-semibold text-slate-500">All Months</SelectItem>
                                {months.map(m => (
                                    <SelectItem key={m.value} value={m.value} className="font-semibold text-slate-750">{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date wise range */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Started Date (From)</label>
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Started Date (To)</label>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {/* Clear Filters */}
                    {(selectedGroup !== 'ALL' || statusFilter !== 'ALL' || monthFilter !== 'ALL' || startDate || endDate) && (
                        <Button 
                            onClick={() => {
                                setSelectedGroup('ALL');
                                setStatusFilter('ALL');
                                setMonthFilter('ALL');
                                setStartDate('');
                                setEndDate('');
                            }}
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-bold self-end h-9"
                        >
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            {/* Campaign Table Card */}
            <Card className="border border-slate-200/80 bg-white rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-800">Campaigns Performance Tracker</CardTitle>
                        <CardDescription className="text-xs">Detailed view of marketing campaigns, spend metrics, and CRM leads outcome.</CardDescription>
                    </div>
                    <Button 
                        onClick={() => refetch()}
                        variant="outline"
                        className="border-slate-200 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse font-medium">Loading campaigns...</div>
                    ) : filteredReport.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 italic font-medium">
                            No campaigns matching the selected filters were found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase">Campaign Group</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase">Campaign Name</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase text-center">Status</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase">Started Date</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase">End Date</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">Amount Spend</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">Result (Clicks)</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">Leads Generated</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">Lead Cost (CPL)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(
                                        filteredReport.reduce((acc: any, c: any) => {
                                            const groupName = c.groupName || 'Unassigned';
                                            if (!acc[groupName]) acc[groupName] = [];
                                            acc[groupName].push(c);
                                            return acc;
                                        }, {})
                                    ).map(([groupName, groupCampaigns]: [string, any]) => (
                                        <React.Fragment key={groupName}>
                                            <TableRow className="bg-indigo-50/50 hover:bg-indigo-50/50 border-y border-indigo-100">
                                                <TableCell colSpan={9} className="font-bold text-indigo-900 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <Folder className="h-4 w-4 text-indigo-500" />
                                                        <span>{groupName}</span>
                                                        <Badge className="ml-2 bg-white text-indigo-700 hover:bg-white border border-indigo-100 shadow-sm">{groupCampaigns.length} Campaigns</Badge>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {groupCampaigns.map((c: any) => (
                                                <TableRow key={c.campaignId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-semibold py-3.5">
                                                <Select 
                                                    value={c.groupId || 'UNASSIGNED'} 
                                                    onValueChange={(val) => {
                                                        const targetGroupId = val === 'UNASSIGNED' ? null : val;
                                                        assignGroupMutation.mutate({ groupId: targetGroupId, campaignId: c.campaignId });
                                                    }}
                                                >
                                                    <SelectTrigger className="w-36 text-[10px] h-7 rounded-md border-slate-200 bg-indigo-50 text-indigo-750 font-bold border-none">
                                                        <SelectValue placeholder="Unassigned" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="UNASSIGNED" className="text-[10px] font-bold text-slate-500 italic">Unassigned</SelectItem>
                                                        {groups.map((group: any) => (
                                                            <SelectItem key={group.id} value={group.id} className="text-[10px] font-bold text-slate-700">{group.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-850">
                                                <div className="flex items-center gap-2">
                                                    <Megaphone className="h-4 w-4 text-indigo-500 shrink-0" />
                                                    <span>{c.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={`border-none font-bold text-[10px] px-2.5 py-0.5
                                                    ${(c.status?.toUpperCase() === 'ACTIVE' || c.status?.toUpperCase() === 'RUNNING') ? 'bg-green-100 text-green-700' :
                                                      c.status?.toUpperCase() === 'PAUSED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}
                                                `}>
                                                    {c.status?.toUpperCase() || 'UNKNOWN'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-500">
                                                {c.startDate ? new Date(c.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-500">
                                                {c.endDate ? new Date(c.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Continuous'}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-slate-800">
                                                ₹{c.spend.toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-slate-600">
                                                {c.clicks.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-extrabold text-indigo-650">
                                                {c.leads.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-slate-800">
                                                ₹{c.cpl > 0 ? c.cpl.toFixed(0) : '0'}
                                            </TableCell>
                                        </TableRow>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// ==========================================
// 12. CAMPAIGN GROUPS TAB COMPONENT
// ==========================================
const CrmCampaignGroupsTab: React.FC<{ clientId: string }> = ({ clientId }) => {
    const queryClient = useQueryClient();
    
    const { data: groups = [], isLoading } = useQuery<any[]>({
        queryKey: ['client-groups', clientId],
        queryFn: async () => {
            const { data } = await api.get('/marketing/groups', { params: { clientId } });
            return data;
        },
        enabled: !!clientId
    });

    const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    const createGroupMutation = useMutation({
        mutationFn: async (name: string) => {
            return api.post('/marketing/groups', { name, client_id: clientId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-groups'] });
            setIsAddGroupOpen(false);
            setNewGroupName('');
            Swal.fire('Created', 'Campaign group created successfully', 'success');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.error || err.message, 'error');
        }
    });

    const deleteGroupMutation = useMutation({
        mutationFn: async (groupId: string) => {
            return api.delete(`/marketing/groups/${groupId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-groups'] });
            Swal.fire('Deleted', 'Campaign group deleted successfully', 'success');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.error || err.message, 'error');
        }
    });

    const handleDeleteGroup = (groupId: string, groupName: string) => {
        Swal.fire({
            title: 'Delete Campaign Group?',
            text: `Are you sure you want to delete "${groupName}"? Campaigns in this group will be unassigned.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteGroupMutation.mutate(groupId);
            }
        });
    };

    return (
        <div className="space-y-6">
            <Card className="border border-slate-200/80 bg-white rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-800">Campaign Groups</CardTitle>
                        <CardDescription className="text-xs">Organize marketing campaigns into distinct client segments or groups.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => setIsAddGroupOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 rounded-lg px-4 flex items-center gap-1.5"
                        >
                            <Plus className="h-4 w-4" />
                            Create Group
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse font-medium">Loading groups...</div>
                    ) : groups.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 italic font-medium">
                            No campaign groups found. Create one to get started.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase">Group Name</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">Campaigns Count</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase text-right">Leads Count</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-xs uppercase text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groups.map((g: any) => (
                                        <TableRow key={g.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-bold text-slate-850 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <Folder className="h-4 w-4 text-indigo-500 shrink-0" />
                                                    <span>{g.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-slate-700">{g._count?.campaigns || 0}</TableCell>
                                            <TableCell className="text-right font-semibold text-slate-700">{g._count?.leads || 0}</TableCell>
                                            <TableCell className="text-center">
                                                <Button 
                                                    onClick={() => handleDeleteGroup(g.id, g.name)}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Group Dialog */}
            <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
                <DialogContent initialWidth={450} title="Create Campaign Group">
                    <DialogHeader>
                        <DialogDescription className="text-sm">Group your marketing campaigns and leads under a custom segment.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="groupName" className="font-semibold text-xs text-slate-600">Group Name</Label>
                            <Input
                                id="groupName"
                                placeholder="e.g. Real Estate Project A"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                className="rounded-lg text-xs"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsAddGroupOpen(false)}
                            className="rounded-lg font-bold text-xs"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={() => {
                                if (newGroupName.trim()) {
                                    createGroupMutation.mutate(newGroupName);
                                }
                            }}
                            disabled={createGroupMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                        >
                            {createGroupMutation.isPending ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
