import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import {
    Calendar,
    TrendingUp,
    Search,
    Globe,
    LayoutDashboard,
    PenTool,
    Plus,
    Trash2,
    Save,
    X,
    MessageSquare,
    Phone,
    User,
    Users,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Clock,
    Activity,
    Palette,
    Code2,
    Megaphone,
    LineChart,
    PlusCircle,
    ExternalLink,
    Loader2,
    Check,
    BarChart3,
    Facebook,
    RefreshCw
} from 'lucide-react';

import { format } from 'date-fns';
import Swal from 'sweetalert2';
import NewTaskModal from '../tasks/TaskFormModal';

// --- TYPES ---

interface FollowUp {
    id?: string;
    follow_up_number: number;
    status: string;
    notes: string;
    channel?: string;
    date: string;
}

interface Lead {
    id?: string;
    date: string;
    campaign_name: string;
    phone: string;
    name: string;
    address: string;
    quality: string;
    status: string;
    is_positive?: boolean | null;
    follow_ups: FollowUp[];
}

interface HistoryItem {
    id: string;
    date: string;
    service: string;
    title: string;
    description: string;
    badge?: string;
    status?: string;
    type: 'META' | 'GOOGLE' | 'SEO' | 'WEB' | 'CONTENT';
    originalData?: any; // To populate form on Edit
}

// --- CONSTANTS ---

const SERVICE_ICONS: Record<string, any> = {
    'META': TrendingUp,
    'GOOGLE': Search,
    'SEO': Globe,
    'WEB': Code2,
    'CONTENT': Palette
};

const SERVICE_TAB_CONFIG: Record<string, { icon: any; label: string; bg: string; text: string; activeBg: string; activeText: string }> = {
    'meta': { icon: Megaphone, label: 'Meta Ads', bg: 'bg-blue-50', text: 'text-blue-600', activeBg: 'bg-blue-600', activeText: 'text-white' },
    'google': { icon: Search, label: 'Google Ads', bg: 'bg-red-50', text: 'text-red-500', activeBg: 'bg-red-500', activeText: 'text-white' },
    'seo': { icon: LineChart, label: 'SEO', bg: 'bg-green-50', text: 'text-green-600', activeBg: 'bg-green-600', activeText: 'text-white' },
    'web': { icon: Code2, label: 'Web Dev', bg: 'bg-indigo-50', text: 'text-indigo-600', activeBg: 'bg-indigo-600', activeText: 'text-white' },
    'content': { icon: Palette, label: 'Creative Task', bg: 'bg-purple-50', text: 'text-purple-600', activeBg: 'bg-purple-600', activeText: 'text-white' },
};

const QUALITY_COLORS: Record<string, string> = {
    'HIGH': 'bg-green-100 text-green-700 border-green-200',
    'MEDIUM': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'LOW': 'bg-red-100 text-red-700 border-red-200'
};

const STATUS_COLORS: Record<string, string> = {
    'NEW': 'bg-blue-100 text-blue-700',
    'CONTACTED': 'bg-indigo-100 text-indigo-700',
    'QUALIFIED': 'bg-purple-100 text-purple-700',
    'CLOSED': 'bg-green-100 text-green-700',
    'LOST': 'bg-gray-100 text-gray-700'
};

const ManageServicesView = () => {
    const [searchParams] = useSearchParams();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // --- QUERIES ---
    const { data: clients } = useQuery({
        queryKey: ['clients-all'],
        queryFn: async () => (await api.get('/clients')).data,
        enabled: user?.role !== 'CLIENT'
    });

    // Determine Client ID
    const clientId = useMemo(() => {
        if (user?.role === 'CLIENT') return user.linked_client_id;
        return searchParams.get('clientId');
    }, [user, searchParams]);

    // For CLIENT role, fetch just their own client data to populate selectedClient
    const { data: ownClientData } = useQuery({
        queryKey: ['client', clientId],
        queryFn: async () => (await api.get(`/clients/${clientId}`)).data,
        enabled: user?.role === 'CLIENT' && !!clientId
    });

    const handleClientChange = (id: string) => {
        const params = new URLSearchParams(searchParams);
        if (id) params.set('clientId', id);
        else params.delete('clientId');
        navigate(`?${params.toString()}`);
    };

    const isInternal = user?.role !== 'CLIENT';
    const selectedClient = isInternal ? clients?.find((c: any) => c.id === clientId) : ownClientData;

    // --- STATE ---
    const initialView = searchParams.get('view') || (isInternal ? 'campaignData' : 'history');
    const initialServiceTab = searchParams.get('tab') || 'meta';

    const [activeTab, setActiveTab] = useState(initialView);
    const [isAddingLead, setIsAddingLead] = useState(false);
    const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
    const [leadDateFrom, setLeadDateFrom] = useState<string>('');
    const [leadDateTo, setLeadDateTo] = useState<string>('');
    const [leadForm, setLeadForm] = useState<Partial<Lead>>({
        date: new Date().toISOString(),
        quality: 'MEDIUM',
        status: 'NEW',
        follow_ups: []
    });

    const [clientSearchQuery, setClientSearchQuery] = useState('');

    // --- CAMPAIGN FORM STATE ---
    const [activeServiceTab, setActiveServiceTab] = useState(initialServiceTab);
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
    const [metaEntryMode, setMetaEntryMode] = useState<'NEW' | 'UPDATE'>('NEW');
    const [googleEntryMode, setGoogleEntryMode] = useState<'NEW' | 'UPDATE'>('NEW');
    const [seoEntryMode, setSeoEntryMode] = useState<'NEW' | 'UPDATE'>('NEW');
    const [webEntryMode, setWebEntryMode] = useState<'NEW' | 'UPDATE'>('NEW');
    const [campaignForm, setCampaignForm] = useState<any>({
        date: new Date().toISOString(),
        status: 'ACTIVE',
        campaign_label: ''
    });

    const [isAddingMetaCampaign, setIsAddingMetaCampaign] = useState(false);
    const [isSyncingCampaign, setIsSyncingCampaign] = useState(false);
    const [campaignSynced, setCampaignSynced] = useState(false);

    // --- META SYNC STATUS ---
    const { data: metaAccountStatus, refetch: refetchMetaStatus } = useQuery({
        queryKey: ['meta-account-status', clientId],
        queryFn: async () => (await api.get(`/marketing/meta/status?clientId=${clientId}`)).data,
        enabled: !!clientId && activeServiceTab === 'meta'
    });

    // --- CREATIVE TASK MODAL STATE ---
    const [isCreativeTaskModalOpen, setIsCreativeTaskModalOpen] = useState(false);
    const [editingCreativeTask, setEditingCreativeTask] = useState<any>(null);

    // --- HISTORY FILTERS ---
    const [historyStartDate, setHistoryStartDate] = useState<string>('');
    const [historyEndDate, setHistoryEndDate] = useState<string>('');
    // --- QUERIES ---

    // 1. Campaign History queries
    const { data: metaLogs } = useQuery({
        queryKey: ['tracking-meta', clientId, historyStartDate, historyEndDate],
        queryFn: async () => {
            const params = new URLSearchParams({ clientId: clientId as string });
            if (historyStartDate) params.append('startDate', historyStartDate);
            if (historyEndDate) params.append('endDate', historyEndDate);
            return (await api.get(`/client-portal/tracking/meta-ads?${params.toString()}`)).data;
        },
        enabled: !!clientId
    });

    const { data: googleLogs } = useQuery({
        queryKey: ['tracking-google', clientId, historyStartDate, historyEndDate],
        queryFn: async () => {
            const params = new URLSearchParams({ clientId: clientId as string });
            if (historyStartDate) params.append('startDate', historyStartDate);
            if (historyEndDate) params.append('endDate', historyEndDate);
            return (await api.get(`/client-portal/tracking/google-ads?${params.toString()}`)).data;
        },
        enabled: !!clientId
    });

    const { data: seoLogs } = useQuery({
        queryKey: ['tracking-seo', clientId, historyStartDate, historyEndDate],
        queryFn: async () => {
            const params = new URLSearchParams({ clientId: clientId as string });
            if (historyStartDate) params.append('startDate', historyStartDate);
            if (historyEndDate) params.append('endDate', historyEndDate);
            return (await api.get(`/client-portal/tracking/seo?${params.toString()}`)).data;
        },
        enabled: !!clientId
    });

    const { data: webLogs } = useQuery({
        queryKey: ['tracking-web', clientId, historyStartDate, historyEndDate],
        queryFn: async () => {
            const params = new URLSearchParams({ clientId: clientId as string });
            if (historyStartDate) params.append('startDate', historyStartDate);
            if (historyEndDate) params.append('endDate', historyEndDate);
            return (await api.get(`/client-portal/tracking/web-dev?${params.toString()}`)).data;
        },
        enabled: !!clientId
    });

    const { data: contentLogs } = useQuery({
        queryKey: ['tracking-content', clientId, historyStartDate, historyEndDate],
        queryFn: async () => {
            const params = new URLSearchParams({ clientId: clientId as string });
            if (historyStartDate) params.append('startDate', historyStartDate);
            if (historyEndDate) params.append('endDate', historyEndDate);
            return (await api.get(`/client-portal/tracking/content?${params.toString()}`)).data;
        },
        enabled: !!clientId
    });

    // Creative Team Tasks assigned to this client
    const { data: creativeTasks } = useQuery({
        queryKey: ['creative-tasks-for-client', clientId],
        queryFn: async () => (await api.get(`/tasks?client_id=${clientId}&department=CREATIVE`)).data,
        enabled: !!clientId
    });

    // 2. Leads query
    const { data: leads, isLoading: isLeadsLoading } = useQuery({
        queryKey: ['tracking-leads', clientId],
        queryFn: async () => (await api.get(`/client-portal/tracking/leads?clientId=${clientId}`)).data,
        enabled: !!clientId
    });

    // Aggregate History
    const aggregatedHistory = useMemo(() => {
        const items: HistoryItem[] = [];

        metaLogs?.forEach((log: any) => {
            let resJson = log.results_json;
            if (typeof resJson === 'string') {
                try { resJson = JSON.parse(resJson); } catch (e) { }
            }
            const metrics = [];
            if (resJson?.impressions) metrics.push(`Impressions: ${resJson.impressions}`);
            if (resJson?.engagement) metrics.push(`Engagement: ${resJson.engagement}`);
            if (resJson?.leads) metrics.push(`Leads: ${resJson.leads}`);

            items.push({
                id: log.id,
                date: log.date,
                service: 'Meta Ads',
                title: log.campaign_name,
                description: `${log.objective} campaign on ${log.platform}. Spend: Γé╣${log.spend?.toLocaleString()} ${metrics.length > 0 ? '| ' + metrics.join(', ') : ''}`,
                badge: `Γé╣${log.spend?.toLocaleString()}`,
                status: log.status,
                type: 'META',
                originalData: log
            });
        });

        googleLogs?.forEach((log: any) => {
            const metrics = [];
            if (log.impressions) metrics.push(`Impressions: ${log.impressions}`);
            if (log.clicks) metrics.push(`Clicks: ${log.clicks}`);
            if (log.conversions) metrics.push(`Conversions: ${log.conversions}`);

            items.push({
                id: log.id,
                date: log.date,
                service: 'Google Ads',
                title: log.campaign_name,
                description: `${log.campaign_type} campaign. Spend: Γé╣${log.spend?.toLocaleString()} ${metrics.length > 0 ? '| ' + metrics.join(', ') : ''}`,
                badge: `Γé╣${log.spend?.toLocaleString()}`,
                status: log.status,
                type: 'GOOGLE',
                originalData: log
            });
        });

        seoLogs?.forEach((log: any) => {
            items.push({
                id: log.id,
                date: new Date(log.year, log.month - 1).toISOString(),
                service: 'SEO',
                title: `Performance - ${log.month}/${log.year}`,
                description: `Organic Traffic: ${log.organic_traffic?.toLocaleString()}. ${log.summary || ''}`,
                badge: `${log.organic_traffic?.toLocaleString()} Visits`,
                status: log.status,
                type: 'SEO',
                originalData: log
            });
        });

        webLogs?.forEach((log: any) => {
            items.push({
                id: log.id,
                date: log.createdAt,
                service: 'Web Development',
                title: log.project_name,
                description: `Live URL: ${log.live_url || 'N/A'}. Staging URL: ${log.staging_url || 'N/A'}`,
                badge: log.status,
                status: log.status === 'DEPLOYED' ? 'CLOSED' : 'ACTIVE',
                type: 'WEB',
                originalData: log
            });
        });

        contentLogs?.forEach((log: any) => {
            items.push({
                id: log.id,
                date: log.createdAt,
                service: 'Creative Task',
                title: log.title,
                description: `${log.type} Deliverable. Notes: ${log.feedback || 'N/A'}`,
                badge: log.status,
                status: log.status === 'APPROVED' ? 'CLOSED' : 'ACTIVE',
                type: 'CONTENT',
                originalData: log
            });
        });

        return items.sort((a, b) => {
            if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
            if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        }).slice(0, 20); // Limit to 20 campaigns
    }, [metaLogs, googleLogs, seoLogs, webLogs, contentLogs]);

    const campaignSummary = useMemo(() => {
        const activeCount = aggregatedHistory.filter(i => i.status === 'ACTIVE').length;
        let totalSpend = 0;
        let totalLeads = 0;
        aggregatedHistory.forEach(i => {
            if (i.originalData?.spend) totalSpend += i.originalData.spend;
            if (i.type === 'META') {
                try {
                    const resJson = typeof i.originalData.results_json === 'string' ? JSON.parse(i.originalData.results_json) : i.originalData.results_json;
                    if (resJson?.leads) totalLeads += Number(resJson.leads);
                } catch (e) { }
            }
        });
        return { activeCount, totalSpend, totalLeads };
    }, [aggregatedHistory]);

    const leadSummary = useMemo(() => {
        if (!leads) return { total: 0, highQuality: 0, converted: 0, positive: 0, negative: 0 };
        return {
            total: leads.length,
            highQuality: leads.filter((l: any) => l.quality === 'HIGH').length,
            converted: leads.filter((l: any) => l.status === 'CONVERTED').length,
            positive: leads.filter((l: any) => l.is_positive === true).length,
            negative: leads.filter((l: any) => l.is_positive === false).length,
        };
    }, [leads]);

    const sortedLeads = useMemo(() => {
        if (!leads) return [];
        let filtered = [...leads];

        if (leadDateFrom) {
            const fromTime = new Date(leadDateFrom).getTime();
            filtered = filtered.filter((l: any) => new Date(l.date).getTime() >= fromTime);
        }
        if (leadDateTo) {
            const toTime = new Date(leadDateTo).getTime();
            // Include leads up to the end of the selected toDate
            filtered = filtered.filter((l: any) => new Date(l.date).getTime() <= toTime + 86400000);
        }

        return filtered.sort((a: any, b: any) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            return timeB - timeA; // Default to newest first
        });
    }, [leads, leadDateFrom, leadDateTo]);

    // --- MUTATIONS ---

    const leadMutation = useMutation({
        mutationFn: async (data: any) => {
            if (data.id) {
                return await api.patch(`/client-portal/tracking/leads/${data.id}?clientId=${clientId}`, data);
            }
            return await api.post(`/client-portal/tracking/leads?clientId=${clientId}`, { ...data, client_id: clientId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking-leads', clientId] });
            setIsAddingLead(false);
            setEditingLeadId(null);
            setLeadForm({
                date: new Date().toISOString(),
                quality: 'MEDIUM',
                status: 'NEW',
                follow_ups: []
            });
            Swal.fire({ title: 'Success', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        },
        onError: (err: any) => Swal.fire('Error', err.response?.data?.message || 'Failed to save lead', 'error')
    });

    const deleteLeadMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/client-portal/tracking/leads/${id}?clientId=${clientId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking-leads', clientId] });
            Swal.fire({ title: 'Deleted', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
    });

    // --- CAMPAIGN MUTATIONS ---

    const metaMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = { ...data, client_id: clientId };
            delete payload.id;
            delete payload.createdAt;
            delete payload.updatedAt;
            return await api.post(`/client-portal/tracking/meta-ads?clientId=${clientId}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking-meta', clientId] });
            resetCampaignForm();
            Swal.fire({ title: 'Success', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        },
        onError: (err: any) => Swal.fire('Error', err.response?.data?.message || 'Failed to save Meta Ads log', 'error')
    });

    const googleMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = { ...data, client_id: clientId };
            delete payload.id;
            delete payload.createdAt;
            delete payload.updatedAt;
            return await api.post(`/client-portal/tracking/google-ads?clientId=${clientId}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking-google', clientId] });
            resetCampaignForm();
            Swal.fire({ title: 'Success', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
    });

    const seoMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = { ...data, client_id: clientId };
            delete payload.id;
            delete payload.createdAt;
            delete payload.updatedAt;
            return await api.post(`/client-portal/tracking/seo?clientId=${clientId}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking-seo', clientId] });
            resetCampaignForm();
            Swal.fire({ title: 'Success', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
    });

    const webMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = { ...data, client_id: clientId };
            delete payload.id;
            delete payload.createdAt;
            delete payload.updatedAt;
            return await api.post(`/client-portal/tracking/web-dev?clientId=${clientId}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking-web', clientId] });
            resetCampaignForm();
            Swal.fire({ title: 'Success', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
    });

    const contentMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = { ...data, client_id: clientId };
            delete payload.id;
            delete payload.createdAt;
            delete payload.updatedAt;
            return await api.post(`/client-portal/tracking/content?clientId=${clientId}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking-content', clientId] });
            resetCampaignForm();
            Swal.fire({ title: 'Success', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
    });

    const deleteMetaMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/client-portal/tracking/meta-ads/${id}?clientId=${clientId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking-meta', clientId] });
            queryClient.removeQueries({ queryKey: ['activity-logs'] });
            Swal.fire({ title: 'Deleted', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
    });

    const deleteGoogleMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/client-portal/tracking/google-ads/${id}?clientId=${clientId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking-google', clientId] });
            queryClient.removeQueries({ queryKey: ['activity-logs'] });
            Swal.fire({ title: 'Deleted', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
    });

    const deleteSeoMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/client-portal/tracking/seo/${id}?clientId=${clientId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking-seo', clientId] });
            queryClient.removeQueries({ queryKey: ['activity-logs'] });
            Swal.fire({ title: 'Deleted', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
    });

    const deleteContentMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/client-portal/tracking/content/${id}?clientId=${clientId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking-content', clientId] });
            queryClient.removeQueries({ queryKey: ['activity-logs'] });
            Swal.fire({ title: 'Deleted', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
    });

    const deleteWebMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/client-portal/tracking/web-dev/${id}?clientId=${clientId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking-web', clientId] });
            queryClient.removeQueries({ queryKey: ['activity-logs'] });
            Swal.fire({ title: 'Deleted', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        },
        onError: (err: any) => Swal.fire('Error', err.response?.data?.message || 'Failed to delete web dev project', 'error')
    });


    // --- HANDLERS ---

    const handleAddFollowUp = () => {
        const currentFollowUps = leadForm.follow_ups || [];
        const nextNum = currentFollowUps.length + 1;
        setLeadForm({
            ...leadForm,
            follow_ups: [
                ...currentFollowUps,
                { follow_up_number: nextNum, status: 'PENDING', notes: '', date: new Date().toISOString() }
            ]
        });
    };

    const handleUpdateFollowUp = (index: number, field: string, value: any) => {
        const newFollowUps = [...(leadForm.follow_ups || [])];
        newFollowUps[index] = { ...newFollowUps[index], [field]: value };
        setLeadForm({ ...leadForm, follow_ups: newFollowUps });
    };

    const handleRemoveFollowUp = (index: number) => {
        const newFollowUps = (leadForm.follow_ups || []).filter((_, i) => i !== index)
            .map((f, i) => ({ ...f, follow_up_number: i + 1 })); // Re-numbering
        setLeadForm({ ...leadForm, follow_ups: newFollowUps });
    };

    const startEditLead = (lead: Lead) => {
        setEditingLeadId(lead.id || null);
        setLeadForm(lead);
    };

    const saveLead = () => {
        if (!leadForm.name || !leadForm.phone) {
            Swal.fire('Error', 'Name and Phone are required', 'warning');
            return;
        }
        leadMutation.mutate(leadForm);
    };

    const confirmDeleteLead = (id: string) => {
        Swal.fire({
            title: 'Are you sure?',
            text: "This will permanently remove the lead record.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) deleteLeadMutation.mutate(id);
        });
    };

    const quickToggleLeadFlag = (lead: Lead, flag: boolean) => {
        // Automatically save the toggle state
        leadMutation.mutate({ ...lead, is_positive: flag });
    };

    const confirmDeleteCampaign = (item: HistoryItem) => {
        Swal.fire({
            title: 'Are you sure?',
            text: "This will permanently remove the campaign record.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                if (item.type === 'META') deleteMetaMutation.mutate(item.id);
                else if (item.type === 'GOOGLE') deleteGoogleMutation.mutate(item.id);
                else if (item.type === 'SEO') deleteSeoMutation.mutate(item.id);
                else if (item.type === 'CONTENT') deleteContentMutation.mutate(item.id);
                else if (item.type === 'WEB') deleteWebMutation.mutate(item.id);
            }
        });
    };

    const resetCampaignForm = () => {
        setCampaignForm({ date: new Date().toISOString(), status: 'ACTIVE', campaign_label: '' });
        setEditingCampaignId(null);
        setCampaignSynced(false);
        setIsAddingMetaCampaign(false);
        setMetaEntryMode('NEW');
        setGoogleEntryMode('NEW');
        setSeoEntryMode('NEW');
        setWebEntryMode('NEW');
    };

    const handleSyncCampaign = async () => {
        if (!campaignForm.marketing_campaign_id) return;
        setIsSyncingCampaign(true);
        try {
            const isPreview = metaEntryMode === 'NEW';
            const externalAccountId = metaAccountStatus?.externalAccountId;
            
            const reqData: any = { 
                campaignId: campaignForm.marketing_campaign_id 
            };
            
            if (isPreview) {
                reqData.isPreview = true;
                reqData.externalAccountId = externalAccountId;
                reqData.platform = activeServiceTab; // 'meta' or 'google'
            }
            
            const res = await api.post('/marketing/sync/campaign', reqData);
            if (res.data.success && res.data.latestMetric) {
                const latest = res.data.latestMetric;
                console.log('[DEBUG MetaSync] Response Received:', latest);
                
                const updatedForm = {
                    ...campaignForm,
                    spend: latest.spend || 0,
                    results: latest.results || latest.conversions || 0,
                    impressions: latest.impressions || 0,
                    reach: latest.reach || 0,
                    messaging_conversations: latest.messaging_conversations || 0,
                    new_messaging_contacts: latest.new_messaging_contacts || 0,
                    purchases: latest.purchases || 0,
                    results_cost: latest.results_cost || 0
                };

                // If label is empty, fill it with the campaign name we just synced
                if (!updatedForm.campaign_label && latest.name) {
                    updatedForm.campaign_label = latest.name;
                }

                if (latest.startDate) {
                    try {
                        const dateObj = new Date(latest.startDate);
                        if (!isNaN(dateObj.getTime())) {
                            updatedForm.date = dateObj.toISOString();
                        }
                    } catch (e) {
                        console.error('Date parsing error:', e);
                    }
                }

                if (latest.status) {
                    updatedForm.status = latest.status;
                }

                setCampaignForm(updatedForm);
                setCampaignSynced(true);
                Swal.fire({ 
                    title: 'Sync Complete', 
                    text: `Captured ${updatedForm.results} results and ₹${updatedForm.spend} spend from lifetime metrics.`, 
                    icon: 'success', 
                    toast: true, 
                    position: 'top-end', 
                    showConfirmButton: false, 
                    timer: 3000 
                });
            }
        } catch (err: any) {
            Swal.fire('Sync Failed', err.response?.data?.message || 'Could not fetch data from Meta', 'error');
        } finally {
            setIsSyncingCampaign(false);
        }
    };

    const saveMetaCampaign = () => {
        if (metaEntryMode === 'NEW' && !campaignForm.marketing_campaign_id) {
            Swal.fire('Error', 'Please select a Meta campaign', 'warning');
            return;
        }
        
        // Use manual label as campaign_name if provided
        const finalData = {
            ...campaignForm,
            campaign_name: campaignForm.campaign_label || campaignForm.campaign_name
        };
        
        metaMutation.mutate(finalData);
    };

    const startEditCampaign = (item: HistoryItem) => {
        setEditingCampaignId(item.id);
        setActiveTab('campaignData');

        let targetType = 'meta';
        if (item.type === 'META') { targetType = 'meta'; setMetaEntryMode('UPDATE'); }
        if (item.type === 'GOOGLE') { targetType = 'google'; setGoogleEntryMode('UPDATE'); }
        if (item.type === 'SEO') { targetType = 'seo'; setSeoEntryMode('UPDATE'); }
        if (item.type === 'WEB') { targetType = 'web'; setWebEntryMode('UPDATE'); }
        if (item.type === 'CONTENT') { targetType = 'content'; }

        setActiveServiceTab(targetType);
        setCampaignForm({ ...item.originalData });
    };

    // Auto-open a specific entry when `entry_id` is passed in the URL (from activity log deep-link)
    const autoOpenedRef = React.useRef<string | null>(null);
    useEffect(() => {
        const entryId = searchParams.get('entry_id');
        if (!entryId || autoOpenedRef.current === entryId) return;
        // Wait until data is loaded
        if (!metaLogs && !googleLogs && !seoLogs && !webLogs && !contentLogs) return;
        const found = aggregatedHistory.find(item => item.id === entryId);
        if (found) {
            autoOpenedRef.current = entryId;
            startEditCampaign(found);
            // Scroll to campaign form with a short delay to let the UI render
            setTimeout(() => {
                const el = document.getElementById('campaign-data-form');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }, [searchParams, aggregatedHistory, metaLogs, googleLogs, seoLogs, webLogs, contentLogs]);

    const saveCampaignData = () => {
        if (activeServiceTab === 'meta') {
            if (!campaignForm.campaign_name || !campaignForm.objective || !campaignForm.platform) {
                Swal.fire('Error', 'Campaign Name, Objective, and Platform are required', 'warning');
                return;
            }
            metaMutation.mutate(campaignForm);
        } else if (activeServiceTab === 'google') {
            if (!campaignForm.campaign_name || !campaignForm.campaign_type) {
                Swal.fire('Error', 'Campaign Name and Type are required', 'warning');
                return;
            }
            googleMutation.mutate(campaignForm);
        } else if (activeServiceTab === 'seo') {
            if (!campaignForm.month || !campaignForm.year) {
                Swal.fire('Error', 'Month and Year are required', 'warning');
                return;
            }
            seoMutation.mutate(campaignForm);
        } else if (activeServiceTab === 'web') {
            if (!campaignForm.project_name || !campaignForm.status) {
                Swal.fire('Error', 'Project Name and Status are required', 'warning');
                return;
            }
            webMutation.mutate(campaignForm);
        } else if (activeServiceTab === 'content') {
            if (!campaignForm.title || !campaignForm.type) {
                Swal.fire('Error', 'Title and Content Type are required', 'warning');
                return;
            }
            contentMutation.mutate(campaignForm);
        }
    };

    const filteredClients = useMemo(() => {
        if (!clients) return [];
        if (!clientSearchQuery) return clients;
        const q = clientSearchQuery.toLowerCase();
        return clients.filter((c: any) =>
            c.name.toLowerCase().includes(q) ||
            c.client_code.toLowerCase().includes(q)
        );
    }, [clients, clientSearchQuery]);

    if (!clientId) return (
        <div className="p-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-10">
                <div className="w-20 h-20 bg-indigo-100 flex items-center justify-center rounded-2xl mx-auto mb-4 text-indigo-600 shadow-sm">
                    <Users size={40} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-2">Select a Client</h2>
                <p className="text-gray-500 font-medium">Choose a client below to manage their digital marketing services and campaign history.</p>
            </div>

            <div className="relative max-w-md mx-auto mb-12">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                    placeholder="Search clients by name or code..."
                    className="pl-12 h-12 bg-white border-2 border-gray-100 focus:border-indigo-500 rounded-2xl shadow-sm font-medium"
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredClients?.map((cl: any) => (
                    <Card
                        key={cl.id}
                        onClick={() => handleClientChange(cl.id)}
                        className="group hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer overflow-hidden border-2 border-gray-50 rounded-2xl"
                    >
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                {cl.logo_url ? (
                                    <img
                                        src={getAssetUrl(cl.logo_url)}
                                        className="w-14 h-14 rounded-xl object-cover border-2 border-gray-50 group-hover:scale-110 transition-transform"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold group-hover:scale-110 transition-transform">
                                        {cl.name.charAt(0)}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{cl.name}</h3>
                                    <Badge variant="outline" className="mt-1 bg-gray-50 text-gray-500 border-none font-bold text-[10px] uppercase tracking-wider">
                                        {cl.client_code}
                                    </Badge>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between text-xs font-bold text-gray-400 group-hover:text-indigo-400 transition-colors">
                                <span className="flex items-center gap-1">
                                    <Globe size={12} /> Digital Services
                                </span>
                                <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <Plus size={14} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );

    return (
        <div className="p-6 w-[98%] max-w-[1920px] mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                        <LayoutDashboard size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Manage Services</h1>
                        <p className="text-gray-500 text-sm">Campaign history, performance logs and lead tracking.</p>
                    </div>
                </div>
                {isInternal && (
                    <div className="flex items-center gap-3 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100 min-w-[300px]">
                        <Users size={20} className="ml-2 text-indigo-500" />
                        <select
                            className="bg-transparent border-none text-indigo-900 font-bold focus:ring-0 cursor-pointer w-full text-sm"
                            value={clientId || ''}
                            onChange={(e) => handleClientChange(e.target.value)}
                        >
                            <option value="">Select a Client...</option>
                            {clients?.map((cl: any) => (
                                <option key={cl.id} value={cl.id}>{cl.name} ({cl.client_code})</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* --- CLIENT HEADER --- */}
            {selectedClient && (
                <div className="flex items-center gap-6 bg-gradient-to-r from-purple-50 to-white pt-2 pb-6 px-4 rounded-xl mb-6">
                    {selectedClient.logo_url ? (
                        <img src={getAssetUrl(selectedClient.logo_url)} alt={selectedClient.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg" />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-white">
                            {selectedClient.name.substring(0, 1).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{selectedClient.name}</h2>
                        <p className="text-sm font-medium text-purple-600 uppercase tracking-widest mt-1 ml-1">{selectedClient.client_code}</p>
                    </div>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-yellow-50/50 p-1.5 rounded-2xl mb-6 border border-yellow-200/50 flex flex-wrap gap-2">
                    {isInternal && (
                        <TabsTrigger value="campaignData" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-[#2c185a] data-[state=active]:text-white data-[state=active]:shadow-md transition-all text-gray-700 font-bold hover:bg-yellow-100">
                            <PenTool size={16} className="mr-2 text-purple-500" /> Manage Campaign
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="history" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-[#2c185a] data-[state=active]:text-white data-[state=active]:shadow-md transition-all text-gray-700 font-bold hover:bg-yellow-100">
                        <Clock size={16} className="mr-2 text-amber-500" /> Campaign History
                    </TabsTrigger>
                    <TabsTrigger value="leads" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-[#2c185a] data-[state=active]:text-white data-[state=active]:shadow-md transition-all text-gray-700 font-bold hover:bg-yellow-100">
                        <Users size={16} className="mr-2 text-blue-500" /> Lead Management
                    </TabsTrigger>
                </TabsList>

                {/* --- CAMPAIGN HISTORY TAB --- */}
                <TabsContent value="history">
                    <div className="space-y-4">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <Card className="bg-indigo-50/50 border-indigo-100 flex flex-col items-center justify-center p-4 rounded-xl shadow-sm">
                                <span className="text-sm font-bold text-indigo-600 mb-1">Active Campaigns</span>
                                <span className="text-3xl font-extrabold text-indigo-900">{campaignSummary.activeCount}</span>
                            </Card>
                            <Card className="bg-green-50/50 border-green-100 flex flex-col items-center justify-center p-4 rounded-xl shadow-sm">
                                <span className="text-sm font-bold text-green-600 mb-1">Total Spend Logged</span>
                                <span className="text-3xl font-extrabold text-green-900">Γé╣{campaignSummary.totalSpend.toLocaleString()}</span>
                            </Card>
                            <Card className="bg-purple-50/50 border-purple-100 flex flex-col items-center justify-center p-4 rounded-xl shadow-sm">
                                <span className="text-sm font-bold text-purple-600 mb-1">Total Leads Recorded</span>
                                <span className="text-3xl font-extrabold text-purple-900">{campaignSummary.totalLeads}</span>
                            </Card>
                        </div>
                        {/* History Filters */}
                        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-bold text-gray-600">From:</label>
                                <Input type="date" className="h-9 w-40" value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-bold text-gray-600">To:</label>
                                <Input type="date" className="h-9 w-40" value={historyEndDate} onChange={(e) => setHistoryEndDate(e.target.value)} />
                            </div>
                            <div className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                                <Activity size={14} /> Showing up to 20 campaigns
                            </div>
                        </div>

                        {aggregatedHistory.length === 0 ? (
                            <div className="text-center p-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <Activity size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-600">No History Available</h3>
                                <p className="text-gray-400">History records will appear once service logs are created by the team.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {aggregatedHistory.map((item) => {
                                    const Icon = SERVICE_ICONS[item.type];
                                    return (
                                        <Card key={item.id} className="hover:shadow-md transition-shadow border-l-4 border-l-indigo-500 overflow-hidden">
                                            <CardContent className="p-0">
                                                <div className="flex items-center p-5">
                                                    <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 mr-5">
                                                        <Icon size={24} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                                                                {item.service}
                                                            </span>
                                                            <span className="text-xs text-gray-400 flex items-center">
                                                                <Calendar size={12} className="mr-1" />
                                                                {format(new Date(item.date), 'dd MMM yyyy')}
                                                            </span>
                                                            {item.status && (
                                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-300 shadow-sm' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                                                    {item.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="font-bold text-gray-900 truncate">{item.title}</h3>
                                                        <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                                                    </div>
                                                    {item.badge && (
                                                        <div className="ml-4 px-4 py-1 bg-gray-50 border rounded-full text-sm font-bold text-gray-700">
                                                            {item.badge}
                                                        </div>
                                                    )}
                                                    {isInternal && (
                                                        <div className="ml-4 flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-indigo-500 hover:bg-indigo-50 shrink-0"
                                                                onClick={() => startEditCampaign(item)}
                                                            >
                                                                <PenTool size={16} />
                                                            </Button>
                                                            {['DEVELOPER_ADMIN', 'ADMIN'].includes(user?.role || '') && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-500 hover:bg-red-50 shrink-0"
                                                                    onClick={() => confirmDeleteCampaign(item)}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* --- CAMPAIGN DATA TAB (INTERNAL ONLY) --- */}
                {isInternal && (
                    <TabsContent value="campaignData">
                        <Card id="campaign-data-form" className="border-none shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/30 p-6">
                                <div>
                                    <CardTitle className="text-xl">Campaign Data Entry</CardTitle>
                                    <CardDescription>Record and modify performance logs for various services.</CardDescription>
                                </div>
                                {editingCampaignId && (
                                    <Button variant="outline" size="sm" onClick={resetCampaignForm}>
                                        Cancel Edit
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="p-6">
                                <Tabs value={activeServiceTab} onValueChange={setActiveServiceTab} className="w-full">
                                    <TabsList className="flex flex-wrap gap-2 mb-6 bg-transparent p-0 w-full">
                                        {Object.entries(SERVICE_TAB_CONFIG).map(([key, cfg]) => {
                                            const Icon = cfg.icon;
                                            const isActive = activeServiceTab === key;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => setActiveServiceTab(key)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border shadow-sm ${isActive
                                                        ? `${cfg.activeBg} ${cfg.activeText} border-transparent shadow-md scale-105`
                                                        : `${cfg.bg} ${cfg.text} border-gray-200 hover:scale-105 hover:shadow`
                                                        }`}
                                                >
                                                    <Icon size={16} />
                                                    {cfg.label}
                                                </button>
                                            );
                                        })}
                                    </TabsList>

                                    {/* Sub-Tabs for Different Services */}

                                    <TabsContent value="meta" className="space-y-4">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full animate-pulse ${metaAccountStatus?.status === 'ACTIVE' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'}`} />
                                                <h2 className="text-xl font-black text-gray-800 tracking-tight uppercase flex items-center gap-2">
                                                    Meta Ads Manager
                                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                                                        {metaAccountStatus?.status === 'ACTIVE' ? 'CONNECTED' : (metaAccountStatus?.status || 'NOT LINKED')}
                                                    </span>
                                                </h2>
                                            </div>

                                            {metaAccountStatus?.status === 'ACTIVE' && !isAddingMetaCampaign && metaEntryMode === 'NEW' && (
                                                <Button 
                                                    size="sm" 
                                                    className="bg-blue-600 hover:bg-blue-700 font-bold uppercase tracking-wider text-[10px]"
                                                    onClick={() => setIsAddingMetaCampaign(true)}
                                                >
                                                    <Plus size={14} className="mr-1.5" />
                                                    Add the Campaign Data
                                                </Button>
                                            )}
                                        </div>

                                        {(metaAccountStatus?.status === 'EXPIRED' || metaAccountStatus?.status === 'PERMISSION_ERROR') && (
                                            <div className="mb-6 p-6 bg-red-50/50 rounded-2xl border-2 border-dashed border-red-100 flex flex-col md:flex-row items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                                                        <AlertCircle size={24} className="text-red-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-gray-900">
                                                            {metaAccountStatus.status === 'PERMISSION_ERROR' ? 'Meta Permissions Missing' : 'Meta Session Expired'}
                                                        </h3>
                                                        <p className="text-sm text-red-600/80 font-bold leading-relaxed whitespace-pre-wrap">
                                                            {metaAccountStatus.errorMessage || 'Your Facebook session has been invalidated or permissions are missing. The connection needs to be refreshed.'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button 
                                                    onClick={() => navigate('/dashboard/marketing-integrations')}
                                                    className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-5 rounded-xl shadow-lg shadow-red-200 uppercase tracking-widest text-[10px] shrink-0"
                                                >
                                                    <RefreshCw size={14} className="mr-2" /> Re-link Meta Account
                                                </Button>
                                            </div>
                                        )}

                                        <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-sm mb-6">
                                            <button
                                                onClick={() => { setMetaEntryMode('NEW'); setEditingCampaignId(null); setCampaignForm({ date: new Date().toISOString(), status: 'ACTIVE' }); setIsAddingMetaCampaign(false); }}
                                                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${metaEntryMode === 'NEW' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                New Entry
                                            </button>
                                            <button
                                                onClick={() => setMetaEntryMode('UPDATE')}
                                                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${metaEntryMode === 'UPDATE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Update Existing
                                            </button>
                                        </div>

                                        {metaEntryMode === 'UPDATE' && (
                                            <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                <label className="text-xs font-bold text-gray-500 mb-2 block">Select Campaign to Update</label>
                                                <select
                                                    className="w-full px-3 py-2.5 rounded-lg border border-blue-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                                                    value={editingCampaignId || ''}
                                                    onChange={(e) => {
                                                        const item = aggregatedHistory.find(i => i.id === e.target.value);
                                                        if (item) startEditCampaign(item);
                                                        else { setEditingCampaignId(null); setCampaignForm({ date: new Date().toISOString(), status: 'ACTIVE' }); }
                                                    }}
                                                >
                                                    <option value="">-- Select a Meta Campaign --</option>
                                                    {aggregatedHistory.filter(i => i.type === 'META').map(item => (
                                                        <option key={item.id} value={item.id}>{item.title} ({item.date ? new Date(item.date).toISOString().split('T')[0] : ''})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {isAddingMetaCampaign && (
                                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block">1. Label the Campaign (Manual Entry)</label>
                                                            <Input 
                                                                placeholder="e.g. Summer Sale 2024 - Brand Awareness"
                                                                className="rounded-xl border-2 border-blue-100 bg-white font-bold"
                                                                value={campaignForm.campaign_label || ''}
                                                                onChange={(e) => setCampaignForm({ ...campaignForm, campaign_label: e.target.value })}
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block">2. Select Meta Campaign</label>
                                                            {metaAccountStatus?.externalAccountId === 'meta-account-linked' || metaAccountStatus?.externalAccountId === 'pending-selection' ? (
                                                                <div className="p-4 bg-amber-50 border-2 border-dashed border-amber-200 rounded-xl text-center">
                                                                    <p className="text-xs font-bold text-amber-700 mb-2">Ad Account Not Selected</p>
                                                                    <Button 
                                                                        variant="outline" 
                                                                        size="sm" 
                                                                        className="h-8 text-[10px] uppercase font-black border-amber-300 text-amber-800 hover:bg-amber-100"
                                                                        onClick={() => navigate('/dashboard/marketing-integrations')}
                                                                    >
                                                                        Go to Integrations
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <select
                                                                    className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 bg-white shadow-sm focus:border-blue-500 focus:ring-0 transition-all font-bold text-gray-700"
                                                                    value={campaignForm.marketing_campaign_id || ''}
                                                                    onChange={(e) => {
                                                                        const val = String(e.target.value);
                                                                        const selected = metaAccountStatus?.campaigns?.find((c: any) => String(c.id) === val);
                                                                        console.log('[DEBUG MetaSelect] Selected:', selected?.name);
                                                                        setCampaignForm({ 
                                                                            ...campaignForm, 
                                                                            marketing_campaign_id: val,
                                                                            campaign_label: selected?.name || campaignForm.campaign_label || '', 
                                                                            campaign_name: selected?.name || campaignForm.campaign_name || '',
                                                                            objective: selected?.objective || ''
                                                                        });
                                                                        setCampaignSynced(false);
                                                                    }}
                                                                >
                                                                    <option value="">{metaAccountStatus?.campaigns?.length ? 'Choose Campaign from Meta...' : 'No Campaigns Found'}</option>
                                                                    {metaAccountStatus?.campaigns?.map((c: any) => (
                                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </div>


                                                        <Button 
                                                            onClick={handleSyncCampaign}
                                                            disabled={!campaignForm.marketing_campaign_id || isSyncingCampaign}
                                                            className={`w-full py-6 rounded-xl font-black uppercase tracking-widest transition-all ${campaignSynced ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'}`}
                                                        >
                                                            {isSyncingCampaign ? (
                                                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Fetching Live Data...</>
                                                            ) : campaignSynced ? (
                                                                <><Check className="mr-2 h-5 w-5" /> Data Synced Successfully</>
                                                            ) : (
                                                                <><Activity className="mr-2 h-5 w-5" /> Sync Campaign Data</>
                                                            )}
                                                        </Button>
                                                    </div>

                                                    <div className="bg-white rounded-2xl border-2 border-blue-50 p-6 shadow-inner">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className={`w-2 h-2 rounded-full ${campaignSynced ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Performance Preview</span>
                                                        </div>

                                                        {campaignSynced ? (
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="p-3 bg-gray-50 rounded-xl">
                                                                    <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Results</div>
                                                                    <div className="text-xl font-black text-blue-600">{campaignForm.results || 0}</div>
                                                                </div>
                                                                <div className="p-3 bg-gray-50 rounded-xl">
                                                                    <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Spent</div>
                                                                    <div className="text-xl font-black text-gray-800">₹{parseFloat(campaignForm.spend || 0).toLocaleString()}</div>
                                                                </div>
                                                                <div className="p-3 bg-gray-50 rounded-xl">
                                                                    <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Reach</div>
                                                                    <div className="text-lg font-bold text-gray-600">{campaignForm.reach?.toLocaleString() || 0}</div>
                                                                </div>
                                                                <div className="p-3 bg-gray-50 rounded-xl">
                                                                    <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Impressions</div>
                                                                    <div className="text-lg font-bold text-gray-600">{campaignForm.impressions?.toLocaleString() || 0}</div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="h-full flex flex-col items-center justify-center text-center py-8 opacity-40">
                                                                <BarChart3 size={40} className="text-gray-300 mb-2" />
                                                                <p className="text-xs font-bold text-gray-400 px-8">Select a campaign and sync to see performance metrics</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex justify-end pt-4 border-t border-gray-100">
                                                    <Button 
                                                        disabled={!campaignSynced}
                                                        onClick={saveMetaCampaign}
                                                        className="bg-gray-900 hover:bg-black text-white px-8 py-6 rounded-xl font-black uppercase tracking-widest disabled:opacity-30 shadow-xl"
                                                    >
                                                        <Save size={18} className="mr-2" />
                                                        Save Campaign Data
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="google" className="space-y-4">
                                        <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-sm mb-4">
                                            <button
                                                onClick={() => { setGoogleEntryMode('NEW'); setEditingCampaignId(null); setCampaignForm({ date: new Date().toISOString(), status: 'ACTIVE' }); }}
                                                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${googleEntryMode === 'NEW' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                New Entry
                                            </button>
                                            <button
                                                onClick={() => setGoogleEntryMode('UPDATE')}
                                                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${googleEntryMode === 'UPDATE' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Update Existing
                                            </button>
                                        </div>

                                        {googleEntryMode === 'UPDATE' && (
                                            <div className="mb-4 bg-red-50/50 p-4 rounded-xl border border-red-100">
                                                <label className="text-xs font-bold text-gray-500 mb-2 block">Select Campaign to Update</label>
                                                <select
                                                    className="w-full px-3 py-2.5 rounded-lg border border-red-200 bg-white shadow-sm focus:ring-2 focus:ring-red-500 text-sm font-semibold"
                                                    value={editingCampaignId || ''}
                                                    onChange={(e) => {
                                                        const item = aggregatedHistory.find(i => i.id === e.target.value);
                                                        if (item) startEditCampaign(item);
                                                        else { setEditingCampaignId(null); setCampaignForm({ date: new Date().toISOString(), status: 'ACTIVE' }); }
                                                    }}
                                                >
                                                    <option value="">-- Select a Google Ads Campaign --</option>
                                                    {aggregatedHistory.filter(i => i.type === 'GOOGLE').map(item => (
                                                        <option key={item.id} value={item.id}>{item.title} ({item.date ? new Date(item.date).toISOString().split('T')[0] : ''})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Campaign Name *</label>
                                                <Input value={campaignForm.campaign_name || ''} onChange={(e) => setCampaignForm({ ...campaignForm, campaign_name: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Campaign Type *</label>
                                                <Input placeholder="e.g. Search, Display" value={campaignForm.campaign_type || ''} onChange={(e) => setCampaignForm({ ...campaignForm, campaign_type: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {/* GST Spend Widget - Google Ads */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Amount (Γé╣)</label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="Enter amount"
                                                    value={campaignForm._rawAmount || ''}
                                                    onChange={(e) => {
                                                        const raw = e.target.value;
                                                        const gst = campaignForm._includeGst;
                                                        const gross = raw ? (gst ? (parseFloat(raw) * 1.18).toFixed(2) : parseFloat(raw).toFixed(2)) : '';
                                                        setCampaignForm({ ...campaignForm, _rawAmount: raw, spend: gross ? parseFloat(gross) : 0 });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block invisible">GST</label>
                                                <label className="flex items-center gap-2 h-10 px-3 border rounded-md bg-orange-50 border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!campaignForm._includeGst}
                                                        onChange={(e) => {
                                                            const gst = e.target.checked;
                                                            const raw = campaignForm._rawAmount || '';
                                                            const gross = raw ? (gst ? (parseFloat(raw) * 1.18).toFixed(2) : parseFloat(raw).toFixed(2)) : '';
                                                            setCampaignForm({ ...campaignForm, _includeGst: gst, spend: gross ? parseFloat(gross) : 0 });
                                                        }}
                                                        className="w-4 h-4 accent-orange-500"
                                                    />
                                                    <span className="text-sm font-medium text-orange-700">+ GST 18%</span>
                                                </label>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Gross Amount (Γé╣)</label>
                                                <div className={`flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm font-semibold ${campaignForm._includeGst ? 'bg-orange-50 border-orange-300 text-orange-800' : 'bg-gray-50 border-gray-200 text-gray-700'
                                                    }`}>
                                                    {campaignForm.spend ? `Γé╣ ${parseFloat(campaignForm.spend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'ΓÇö'}
                                                    {campaignForm._includeGst && campaignForm._rawAmount && (
                                                        <span className="ml-auto text-[10px] text-orange-500 font-normal">
                                                            +Γé╣{(parseFloat(campaignForm._rawAmount) * 0.18).toFixed(2)} GST
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Conversions</label>
                                                <Input type="number" value={campaignForm.conversions || 0} onChange={(e) => setCampaignForm({ ...campaignForm, conversions: e.target.value })} />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="seo" className="space-y-4">
                                        <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-sm mb-4">
                                            <button
                                                onClick={() => { setSeoEntryMode('NEW'); setEditingCampaignId(null); setCampaignForm({ date: new Date().toISOString(), status: 'ACTIVE' }); }}
                                                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${seoEntryMode === 'NEW' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                New Entry
                                            </button>
                                            <button
                                                onClick={() => setSeoEntryMode('UPDATE')}
                                                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${seoEntryMode === 'UPDATE' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Update Existing
                                            </button>
                                        </div>

                                        {seoEntryMode === 'UPDATE' && (
                                            <div className="mb-4 bg-green-50/50 p-4 rounded-xl border border-green-100">
                                                <label className="text-xs font-bold text-gray-500 mb-2 block">Select SEO Log to Update</label>
                                                <select
                                                    className="w-full px-3 py-2.5 rounded-lg border border-green-200 bg-white shadow-sm focus:ring-2 focus:ring-green-500 text-sm font-semibold"
                                                    value={editingCampaignId || ''}
                                                    onChange={(e) => {
                                                        const item = aggregatedHistory.find(i => i.id === e.target.value);
                                                        if (item) startEditCampaign(item);
                                                        else { setEditingCampaignId(null); setCampaignForm({ date: new Date().toISOString(), status: 'ACTIVE' }); }
                                                    }}
                                                >
                                                    <option value="">-- Select an SEO Monthly Log --</option>
                                                    {aggregatedHistory.filter(i => i.type === 'SEO').map(item => (
                                                        <option key={item.id} value={item.id}>{item.title}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Month (1-12) *</label>
                                                <Input type="number" value={campaignForm.month || ''} onChange={(e) => setCampaignForm({ ...campaignForm, month: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Year *</label>
                                                <Input type="number" value={campaignForm.year || ''} onChange={(e) => setCampaignForm({ ...campaignForm, year: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Status</label>
                                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={campaignForm.status} onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value })}>
                                                    <option value="ACTIVE">Active</option>
                                                    <option value="CLOSED">Closed</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Organic Traffic</label>
                                                <Input type="number" value={campaignForm.organic_traffic || 0} onChange={(e) => setCampaignForm({ ...campaignForm, organic_traffic: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Summary</label>
                                                <Input value={campaignForm.summary || ''} onChange={(e) => setCampaignForm({ ...campaignForm, summary: e.target.value })} />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="web" className="space-y-4">
                                        <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-sm mb-4">
                                            <button
                                                onClick={() => { setWebEntryMode('NEW'); setEditingCampaignId(null); setCampaignForm({ date: new Date().toISOString(), status: 'ACTIVE' }); }}
                                                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${webEntryMode === 'NEW' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                New Entry
                                            </button>
                                            <button
                                                onClick={() => setWebEntryMode('UPDATE')}
                                                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${webEntryMode === 'UPDATE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Update Existing
                                            </button>
                                        </div>

                                        {webEntryMode === 'UPDATE' && (
                                            <div className="mb-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                                <label className="text-xs font-bold text-gray-500 mb-2 block">Select Web Project to Update</label>
                                                <select
                                                    className="w-full px-3 py-2.5 rounded-lg border border-indigo-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                                                    value={editingCampaignId || ''}
                                                    onChange={(e) => {
                                                        const item = aggregatedHistory.find(i => i.id === e.target.value);
                                                        if (item) startEditCampaign(item);
                                                        else { setEditingCampaignId(null); setCampaignForm({ date: new Date().toISOString(), status: 'ACTIVE' }); }
                                                    }}
                                                >
                                                    <option value="">-- Select a Web Project --</option>
                                                    {aggregatedHistory.filter(i => i.type === 'WEB').map(item => (
                                                        <option key={item.id} value={item.id}>{item.title} ({item.status})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="sm:col-span-2">
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Project Name *</label>
                                                <Input value={campaignForm.project_name || ''} onChange={(e) => setCampaignForm({ ...campaignForm, project_name: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Status *</label>
                                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={campaignForm.status || 'PLANNING'} onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value })}>
                                                    <option value="PLANNING">Planning</option>
                                                    <option value="DESIGN">Design</option>
                                                    <option value="DEVELOPMENT">Development</option>
                                                    <option value="AMENDS">Amends</option>
                                                    <option value="TESTING">Testing</option>
                                                    <option value="DEPLOYED">Deployed</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Staging URL</label>
                                                <Input value={campaignForm.staging_url || ''} onChange={(e) => setCampaignForm({ ...campaignForm, staging_url: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Live URL</label>
                                                <Input value={campaignForm.live_url || ''} onChange={(e) => setCampaignForm({ ...campaignForm, live_url: e.target.value })} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 mb-1 block">Timeline JSON / Details</label>
                                            <Input placeholder="e.g. Design Approved, Next step Development" value={campaignForm.timeline_json || ''} onChange={(e) => setCampaignForm({ ...campaignForm, timeline_json: e.target.value })} />
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="content" className="space-y-6">
                                        {/* Hero assign button */}
                                        <div className="flex flex-col items-center justify-center py-6 gap-2">
                                            <button
                                                onClick={() => { setEditingCreativeTask({ client_id: clientId, department: 'CREATIVE', category: 'CAMPAIGN' }); setIsCreativeTaskModalOpen(true); }}
                                                className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-10 py-4 rounded-2xl shadow-xl shadow-purple-300/40 transition-all active:scale-95 text-lg"
                                            >
                                                <PlusCircle size={24} /> Assign Task to Creative Team
                                            </button>
                                            <p className="text-xs text-gray-400 mt-1">Tasks assigned here will appear in the Creative Task Manager.</p>
                                        </div>

                                        {/* Task history */}
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                                <Palette size={16} className="text-purple-500" /> Task History
                                            </h4>
                                            {creativeTasks && creativeTasks.length > 0 ? (
                                                <div className="rounded-xl border border-purple-100 overflow-hidden shadow-sm">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-purple-50/70">
                                                            <tr>
                                                                <th className="text-left font-bold text-purple-700 px-4 py-3 text-xs uppercase">Task</th>
                                                                <th className="text-left font-bold text-purple-700 px-4 py-3 text-xs uppercase">Assigned To</th>
                                                                <th className="text-left font-bold text-purple-700 px-4 py-3 text-xs uppercase">Priority</th>
                                                                <th className="text-left font-bold text-purple-700 px-4 py-3 text-xs uppercase">Status</th>
                                                                <th className="text-left font-bold text-purple-700 px-4 py-3 text-xs uppercase">Due</th>
                                                                <th className="text-right font-bold text-purple-700 px-4 py-3 text-xs uppercase">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-purple-50">
                                                            {(creativeTasks as any[]).map((task: any) => {
                                                                const statusColor: Record<string, string> = {
                                                                    'PLANNED': 'bg-gray-100 text-gray-600',
                                                                    'IN_PROGRESS': 'bg-blue-100 text-blue-700',
                                                                    'REVIEW': 'bg-amber-100 text-amber-700',
                                                                    'COMPLETED': 'bg-green-100 text-green-700',
                                                                    'REWORK': 'bg-red-100 text-red-700',
                                                                };
                                                                const priorityColor: Record<string, string> = {
                                                                    'LOW': 'text-gray-500',
                                                                    'MEDIUM': 'text-blue-600',
                                                                    'HIGH': 'text-orange-600',
                                                                    'URGENT': 'text-red-600 font-bold',
                                                                };
                                                                return (
                                                                    <tr key={task.id} className="hover:bg-purple-50/40 transition-colors">
                                                                        <td className="px-4 py-3">
                                                                            <div className="font-semibold text-gray-900 truncate max-w-[200px]">{task.title}</div>
                                                                            <div className="text-xs text-gray-400">{task.type}</div>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-gray-600">{task.assignee?.full_name || 'ΓÇö'}</td>
                                                                        <td className={`px-4 py-3 font-semibold text-xs ${priorityColor[task.priority] || ''}`}>{task.priority}</td>
                                                                        <td className="px-4 py-3">
                                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor[task.status] || 'bg-gray-100 text-gray-600'}`}>
                                                                                {task.status?.replace('_', ' ')}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                                                            {task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy') : 'ΓÇö'}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <div className="inline-flex items-center gap-1">
                                                                                <button
                                                                                    onClick={() => { setEditingCreativeTask(task); setIsCreativeTaskModalOpen(true); }}
                                                                                    className="h-8 w-8 flex items-center justify-center rounded-lg text-purple-500 hover:bg-purple-100 transition-colors"
                                                                                    title="Edit Task"
                                                                                >
                                                                                    <PenTool size={14} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        const result = await Swal.fire({ title: 'Delete Task?', text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, delete', confirmButtonColor: '#dc2626' });
                                                                                        if (result.isConfirmed) {
                                                                                            await api.delete(`/tasks/${task.id}`);
                                                                                            queryClient.invalidateQueries({ queryKey: ['creative-tasks-for-client', clientId] });
                                                                                            Swal.fire({ title: 'Deleted', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                                                                                        }
                                                                                    }}
                                                                                    className="h-8 w-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                                                                                    title="Delete Task"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 bg-purple-50/30 rounded-xl border-2 border-dashed border-purple-100">
                                                    <Palette size={40} className="mx-auto text-purple-200 mb-3" />
                                                    <p className="text-sm font-semibold text-gray-500">No creative tasks assigned for this client yet.</p>
                                                    <p className="text-xs text-gray-400 mt-1">Use the button above to assign a task to the creative team.</p>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                    {activeServiceTab !== 'content' && activeServiceTab !== 'meta' && (
                                        <div className="mt-8 flex justify-end">
                                            <Button
                                                onClick={saveCampaignData}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                                                disabled={metaMutation.isPending || googleMutation.isPending || seoMutation.isPending || webMutation.isPending}
                                            >
                                                {editingCampaignId ? 'Update Data' : 'Save Data'}
                                            </Button>
                                        </div>
                                    )}
                                </Tabs>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Creative Task Assign Modal ΓÇö rendered once at page level */}
                <NewTaskModal
                    isOpen={isCreativeTaskModalOpen}
                    onClose={() => {
                        setIsCreativeTaskModalOpen(false);
                        setEditingCreativeTask(null);
                        queryClient.invalidateQueries({ queryKey: ['creative-tasks-for-client', clientId] });
                    }}
                    initialData={editingCreativeTask}
                />


                {/* --- LEAD MANAGEMENT TAB --- */}
                <TabsContent value="leads">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        <Card className="bg-blue-50/50 border-blue-100 flex flex-col items-center justify-center p-3 rounded-xl shadow-sm">
                            <span className="text-xs font-bold text-blue-600 mb-1">Total Leads</span>
                            <span className="text-2xl font-extrabold text-blue-900">{leadSummary.total}</span>
                        </Card>
                        <Card className="bg-amber-50/50 border-amber-100 flex flex-col items-center justify-center p-3 rounded-xl shadow-sm">
                            <span className="text-xs font-bold text-amber-600 mb-1">High Quality</span>
                            <span className="text-2xl font-extrabold text-amber-900">{leadSummary.highQuality}</span>
                        </Card>
                        <Card className="bg-green-50/50 border-green-100 flex flex-col items-center justify-center p-3 rounded-xl shadow-sm">
                            <span className="text-xs font-bold text-green-600 mb-1">Converted Leads</span>
                            <span className="text-2xl font-extrabold text-green-900">{leadSummary.converted}</span>
                        </Card>
                        <Card className="bg-green-500 border-green-600 flex flex-col items-center justify-center p-3 rounded-xl shadow-sm">
                            <span className="text-xs font-bold text-white mb-1">Positive Leads</span>
                            <span className="text-2xl font-extrabold text-white">{leadSummary.positive}</span>
                        </Card>
                        <Card className="bg-red-500 border-red-600 flex flex-col items-center justify-center p-3 rounded-xl shadow-sm">
                            <span className="text-xs font-bold text-white mb-1">Negative Leads</span>
                            <span className="text-2xl font-extrabold text-white">{leadSummary.negative}</span>
                        </Card>
                    </div>

                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between border-b bg-gray-50/30 p-6 gap-4">
                            <div>
                                <CardTitle className="text-xl">Leads Tracker</CardTitle>
                                <CardDescription>Track daily leads and manage follow-up sequences.</CardDescription>
                            </div>
                            <div className="flex items-center flex-wrap gap-3">
                                <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border shadow-sm">
                                    <span className="text-xs font-bold text-gray-500 ml-1">From:</span>
                                    <Input
                                        type="date"
                                        value={leadDateFrom}
                                        onChange={(e) => setLeadDateFrom(e.target.value)}
                                        className="h-7 w-[130px] border-none shadow-none bg-transparent focus-visible:ring-0 px-1"
                                    />
                                    <span className="text-xs font-bold text-gray-500 border-l pl-2">To:</span>
                                    <Input
                                        type="date"
                                        value={leadDateTo}
                                        onChange={(e) => setLeadDateTo(e.target.value)}
                                        className="h-7 w-[130px] border-none shadow-none bg-transparent focus-visible:ring-0 px-1"
                                    />
                                    {(leadDateFrom || leadDateTo) && (
                                        <button onClick={() => { setLeadDateFrom(''); setLeadDateTo(''); }} className="text-gray-400 hover:text-red-500 mr-1 transiton-all">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <Button onClick={() => setIsAddingLead(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-10 px-6 rounded-lg font-semibold shadow-sm">
                                    <Plus size={18} /> Add New Lead
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-gray-50/50">
                                        <TableRow>
                                            <TableHead className="w-[120px] font-bold text-gray-700">Date</TableHead>
                                            <TableHead className="font-bold text-gray-700">Lead Info</TableHead>
                                            <TableHead className="font-bold text-gray-700">Campaign</TableHead>
                                            <TableHead className="font-bold text-gray-700">Location</TableHead>
                                            <TableHead className="w-[100px] font-bold text-gray-700">Quality</TableHead>
                                            <TableHead className="w-[120px] font-bold text-gray-700">Status</TableHead>
                                            <TableHead className="font-bold text-gray-700 min-w-[350px]">Follow Ups</TableHead>
                                            <TableHead className="w-[120px] font-bold text-gray-700 text-center">Feedback</TableHead>
                                            <TableHead className="w-[100px] text-right font-bold">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Inline Add Row */}
                                        {isAddingLead && (
                                            <TableRow className="bg-indigo-50/30 border-b-2 border-indigo-200">
                                                <TableCell className="p-2">
                                                    <Input type="date" value={leadForm.date?.split('T')[0]} onChange={(e) => setLeadForm({ ...leadForm, date: new Date(e.target.value).toISOString() })} className="h-9" />
                                                </TableCell>
                                                <TableCell className="p-2 space-y-1">
                                                    <Input placeholder="Name" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} className="h-9" />
                                                    <Input placeholder="Phone" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} className="h-9" />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input placeholder="Campaign" value={leadForm.campaign_name} onChange={(e) => setLeadForm({ ...leadForm, campaign_name: e.target.value })} className="h-9" />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input placeholder="Location" value={leadForm.address} onChange={(e) => setLeadForm({ ...leadForm, address: e.target.value })} className="h-9" />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <select
                                                        className={`flex h-9 w-full rounded-md border text-sm font-bold shadow-sm focus:ring-2 focus:ring-opacity-50 transition-colors ${QUALITY_COLORS[leadForm.quality || 'MEDIUM'] || 'bg-white border-gray-300'} px-3 py-1`}
                                                        value={leadForm.quality}
                                                        onChange={(e) => setLeadForm({ ...leadForm, quality: e.target.value })}
                                                    >
                                                        <option value="HIGH" className="bg-white text-gray-900 font-medium">High</option>
                                                        <option value="MEDIUM" className="bg-white text-gray-900 font-medium">Medium</option>
                                                        <option value="LOW" className="bg-white text-gray-900 font-medium">Low</option>
                                                    </select>
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <select
                                                        className={`flex h-9 w-full rounded-md border text-sm font-bold shadow-sm focus:ring-2 focus:ring-opacity-50 transition-colors ${STATUS_COLORS[leadForm.status || 'NEW'] || 'bg-white border-gray-300'} px-3 py-1`}
                                                        value={leadForm.status}
                                                        onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}
                                                    >
                                                        <option value="NEW" className="bg-white text-gray-900 font-medium">New</option>
                                                        <option value="CONTACTED" className="bg-white text-gray-900 font-medium">Contacted</option>
                                                        <option value="QUALIFIED" className="bg-white text-gray-900 font-medium">Qualified</option>
                                                        <option value="CONVERTED" className="bg-white text-gray-900 font-medium">Converted</option>
                                                        <option value="LOST" className="bg-white text-gray-900 font-medium">Lost</option>
                                                    </select>
                                                </TableCell>
                                                <TableCell className="p-2 space-y-2">
                                                    {leadForm.follow_ups?.map((f, i) => (
                                                        <div key={i} className="flex gap-1 items-center bg-white p-2 rounded-lg border shadow-sm group">
                                                            <span className="text-[10px] font-bold bg-gray-100 px-1 rounded">{f.follow_up_number}</span>
                                                            {/* Dynamic colored dropdown for Followup Channel inside ADD Form */}
                                                            <select
                                                                value={f.channel || 'Phone Call'}
                                                                onChange={(e) => handleUpdateFollowUp(i, 'channel', e.target.value)}
                                                                className={`h-7 text-xs flex-1 rounded font-bold border-none shadow-sm transition-colors ${f.channel === 'Whatsapp' ? 'bg-green-100 text-green-700' : f.channel === 'Email' ? 'bg-purple-100 text-purple-700' : f.channel === 'In-Person' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}
                                                            >
                                                                <option value="Phone Call" className="bg-white text-gray-900">Phone Call</option>
                                                                <option value="Whatsapp" className="bg-white text-gray-900">Whatsapp</option>
                                                                <option value="Email" className="bg-white text-gray-900">Email</option>
                                                                <option value="In-Person" className="bg-white text-gray-900">In-Person</option>
                                                            </select>
                                                            <Input placeholder="Status" value={f.status} onChange={(e) => handleUpdateFollowUp(i, 'status', e.target.value)} className="h-7 text-xs flex-1" />
                                                            <Input placeholder="Notes" value={f.notes} onChange={(e) => handleUpdateFollowUp(i, 'notes', e.target.value)} className="h-7 text-xs flex-2" />
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveFollowUp(i)}><X size={12} /></Button>
                                                        </div>
                                                    ))}
                                                    <Button variant="outline" size="sm" onClick={handleAddFollowUp} className="w-full h-8 border-dashed text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                                        <Plus size={14} className="mr-1" /> Add Follow Up
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="p-2 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => setLeadForm({ ...leadForm, is_positive: true })} className={`p-1.5 rounded-full border ${leadForm.is_positive === true ? 'bg-green-500 text-white border-green-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-500'}`}>
                                                            <CheckCircle2 size={16} />
                                                        </button>
                                                        <button onClick={() => setLeadForm({ ...leadForm, is_positive: false })} className={`p-1.5 rounded-full border ${leadForm.is_positive === false ? 'bg-red-500 text-white border-red-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-red-50 hover:text-red-500'}`}>
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-2 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button size="icon" className="h-10 w-10 bg-green-600 hover:bg-green-700 text-white" onClick={saveLead}><Save size={18} /></Button>
                                                        <Button size="icon" variant="ghost" className="h-10 w-10 text-gray-400" onClick={() => setIsAddingLead(false)}><X size={18} /></Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {/* Existing Rows */}
                                        {isLeadsLoading ? (
                                            <TableRow><TableCell colSpan={8} className="p-10 text-center text-muted-foreground">Loading leads...</TableCell></TableRow>
                                        ) : leads?.length === 0 && !isAddingLead ? (
                                            <TableRow><TableCell colSpan={8} className="p-20 text-center text-muted-foreground italic">No leads found for this client.</TableCell></TableRow>
                                        ) : (
                                            sortedLeads?.map((lead: Lead) => (
                                                editingLeadId === lead.id ? (
                                                    <TableRow key={lead.id} className="bg-amber-50/30 border-b-2 border-amber-200">
                                                        {/* Same logic as Add Row above */}
                                                        <TableCell className="p-2">
                                                            <Input type="date" value={leadForm.date?.split('T')[0]} onChange={(e) => setLeadForm({ ...leadForm, date: new Date(e.target.value).toISOString() })} className="h-9" />
                                                        </TableCell>
                                                        <TableCell className="p-2 space-y-1">
                                                            <Input placeholder="Name" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} className="h-9 font-bold" />
                                                            <Input placeholder="Phone" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} className="h-9 text-indigo-600" />
                                                        </TableCell>
                                                        <TableCell className="p-2">
                                                            <Input placeholder="Campaign" value={leadForm.campaign_name} onChange={(e) => setLeadForm({ ...leadForm, campaign_name: e.target.value })} className="h-9" />
                                                        </TableCell>
                                                        <TableCell className="p-2">
                                                            <Input placeholder="Location" value={leadForm.address} onChange={(e) => setLeadForm({ ...leadForm, address: e.target.value })} className="h-9" />
                                                        </TableCell>
                                                        <TableCell className="p-2">
                                                            <select
                                                                className={`flex h-9 w-full rounded-md border text-sm font-bold shadow-sm focus:ring-2 focus:ring-opacity-50 transition-colors ${QUALITY_COLORS[leadForm.quality || 'MEDIUM'] || 'bg-white border-gray-300'} px-3 py-1`}
                                                                value={leadForm.quality}
                                                                onChange={(e) => setLeadForm({ ...leadForm, quality: e.target.value })}
                                                            >
                                                                <option value="HIGH" className="bg-white text-gray-900 font-medium">High</option>
                                                                <option value="MEDIUM" className="bg-white text-gray-900 font-medium">Medium</option>
                                                                <option value="LOW" className="bg-white text-gray-900 font-medium">Low</option>
                                                            </select>
                                                        </TableCell>
                                                        <TableCell className="p-2">
                                                            <select
                                                                className={`flex h-9 w-full rounded-md border text-sm font-bold shadow-sm focus:ring-2 focus:ring-opacity-50 transition-colors ${STATUS_COLORS[leadForm.status || 'NEW'] || 'bg-white border-gray-300'} px-3 py-1`}
                                                                value={leadForm.status}
                                                                onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}
                                                            >
                                                                <option value="NEW" className="bg-white text-gray-900 font-medium">New</option>
                                                                <option value="CONTACTED" className="bg-white text-gray-900 font-medium">Contacted</option>
                                                                <option value="QUALIFIED" className="bg-white text-gray-900 font-medium">Qualified</option>
                                                                <option value="CONVERTED" className="bg-white text-gray-900 font-medium">Converted</option>
                                                                <option value="LOST" className="bg-white text-gray-900 font-medium">Lost</option>
                                                            </select>
                                                        </TableCell>
                                                        <TableCell className="p-2 space-y-2">
                                                            {leadForm.follow_ups?.map((f, i) => (
                                                                <div key={i} className="flex gap-1 items-center bg-white p-2 rounded-lg border shadow-sm group">
                                                                    <span className="text-[10px] font-bold bg-gray-100 px-1 rounded">{f.follow_up_number}</span>
                                                                    {/* Dynamic colored dropdown for Followup Channel inside EDIT Form */}
                                                                    <select
                                                                        value={f.channel || 'Phone Call'}
                                                                        onChange={(e) => handleUpdateFollowUp(i, 'channel', e.target.value)}
                                                                        className={`h-7 text-xs flex-1 rounded font-bold border-none shadow-sm transition-colors ${f.channel === 'Whatsapp' ? 'bg-green-100 text-green-700' : f.channel === 'Email' ? 'bg-purple-100 text-purple-700' : f.channel === 'In-Person' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}
                                                                    >
                                                                        <option value="Phone Call" className="bg-white text-gray-900">Phone Call</option>
                                                                        <option value="Whatsapp" className="bg-white text-gray-900">Whatsapp</option>
                                                                        <option value="Email" className="bg-white text-gray-900">Email</option>
                                                                        <option value="In-Person" className="bg-white text-gray-900">In-Person</option>
                                                                    </select>
                                                                    <Input placeholder="Status" value={f.status} onChange={(e) => handleUpdateFollowUp(i, 'status', e.target.value)} className="h-7 text-xs flex-1" />
                                                                    <Input placeholder="Notes" value={f.notes} onChange={(e) => handleUpdateFollowUp(i, 'notes', e.target.value)} className="h-7 text-xs flex-2" />
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => handleRemoveFollowUp(i)}><X size={12} /></Button>
                                                                </div>
                                                            ))}
                                                            <Button variant="outline" size="sm" onClick={handleAddFollowUp} className="w-full h-8 border-dashed text-indigo-600">
                                                                <Plus size={14} className="mr-1" /> Add Follow Up
                                                            </Button>
                                                        </TableCell>
                                                        <TableCell className="p-2 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button onClick={() => setLeadForm({ ...leadForm, is_positive: true })} className={`p-1.5 rounded-full border ${leadForm.is_positive === true ? 'bg-green-500 text-white border-green-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-500'}`}>
                                                                    <CheckCircle2 size={16} />
                                                                </button>
                                                                <button onClick={() => setLeadForm({ ...leadForm, is_positive: false })} className={`p-1.5 rounded-full border ${leadForm.is_positive === false ? 'bg-red-500 text-white border-red-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-red-50 hover:text-red-500'}`}>
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="p-2 text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button size="icon" className="h-10 w-10 bg-indigo-600 text-white" onClick={saveLead}><Save size={18} /></Button>
                                                                <Button size="icon" variant="ghost" className="h-10 w-10 text-gray-400" onClick={() => setEditingLeadId(null)}><X size={18} /></Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    <TableRow key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <TableCell className="font-medium text-gray-600">
                                                            {format(new Date(lead.date), 'dd MMM yyyy')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-gray-900 flex items-center gap-1.5 hover:text-indigo-600 transition-colors cursor-default">
                                                                    <User size={14} className="text-gray-400" /> {lead.name}
                                                                </span>
                                                                <span className="text-xs text-indigo-600 font-medium flex items-center gap-1.5">
                                                                    <Phone size={12} /> {lead.phone}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-gray-600 font-medium italic">
                                                            {lead.campaign_name || '-'}
                                                        </TableCell>
                                                        <TableCell className="text-gray-600 max-w-[150px] truncate">
                                                            <div className="flex items-center gap-1.5">
                                                                <MapPin size={14} className="text-gray-400 shrink-0" />
                                                                <span className="truncate">{lead.address || 'N/A'}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`${QUALITY_COLORS[lead.quality] || ''} text-[10px] font-bold`}>
                                                                {lead.quality}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[lead.status] || ''}`}>
                                                                {lead.status}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1.5">
                                                                {lead.follow_ups?.length === 0 ? (
                                                                    <span className="text-xs text-gray-400 italic">No follow ups yet</span>
                                                                ) : (
                                                                    lead.follow_ups.map((f: FollowUp) => (
                                                                        <div key={f.id} className="flex flex-col bg-gray-50 p-2 rounded-lg border border-gray-100 relative group">
                                                                            <div className="flex items-center justify-between mb-0.5">
                                                                                <span className="text-[10px] font-extrabold text-indigo-500 uppercase">
                                                                                    {f.follow_up_number === 1 ? '1st' : f.follow_up_number === 2 ? '2nd' : f.follow_up_number === 3 ? '3rd' : `${f.follow_up_number}th`} Follow Up ╬ô├ç├│ <span className="text-gray-500">{f.channel || 'Phone Call'}</span>
                                                                                </span>
                                                                                <span className="text-[9px] text-gray-400">{format(new Date(f.date), 'dd/MM/yy')}</span>
                                                                            </div>
                                                                            {/* Hide PENDING text conditionally */}
                                                                            {f.status?.toUpperCase() !== 'PENDING' && (
                                                                                <div className="text-xs font-bold text-gray-800">{f.status}</div>
                                                                            )}
                                                                            {f.notes && <div className="text-[10px] text-gray-500 italic mt-0.5 border-t pt-0.5 border-gray-200">{f.notes}</div>}
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => quickToggleLeadFlag(lead, true)}
                                                                    className={`p-1.5 rounded-full border transition-all hover:scale-105 ${lead.is_positive === true ? 'bg-green-500 text-white border-green-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-500 hover:border-green-200'}`}
                                                                    title="Mark as Positive"
                                                                >
                                                                    <CheckCircle2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => quickToggleLeadFlag(lead, false)}
                                                                    className={`p-1.5 rounded-full border transition-all hover:scale-105 ${lead.is_positive === false ? 'bg-red-500 text-white border-red-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'}`}
                                                                    title="Mark as Negative"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right p-2">
                                                            <div className="flex justify-end gap-1">
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50" onClick={() => startEditLead(lead)}><PenTool size={16} /></Button>
                                                                {user?.role === 'DEVELOPER_ADMIN' && (
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => confirmDeleteLead(lead.id!)}><Trash2 size={16} /></Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
};

export default ManageServicesView;
