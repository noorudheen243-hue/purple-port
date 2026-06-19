import React, { useState, useEffect } from 'react';
import { useCrmAuthStore } from '../../store/crmAuthStore';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    LayoutDashboard, List, KanbanSquare, Calendar, BarChart3, LogOut, 
    RefreshCw, Search, Plus, Filter, MessageSquare, Phone, Mail, MapPin, 
    User, ChevronRight, CheckCircle2, AlertCircle, Clock, TrendingUp, Megaphone
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Swal from 'sweetalert2';

// ----------------------------------------------------
// CRM USER INTERFACES
// ----------------------------------------------------
interface Lead {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    location: string | null;
    campaign_name: string | null;
    source: string;
    quality: string | null;
    stage: string | null;
    status: string;
    date: string;
    conversion_val: number | null;
    assigned_to: string | null;
    tags: string | null;
    leadNotes?: any[];
}

const CrmUserDashboard = () => {
    const { crmUser, logout, checkAuth } = useCrmAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'kanban' | 'followups' | 'reports' | 'campaigns'>('overview');
    
    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [stageFilter, setStageFilter] = useState('');
    const [qualityFilter, setQualityFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        checkAuth();

        const originalTitle = document.title;
        const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        let originalFaviconHref = '';
        if (favicon) {
            originalFaviconHref = favicon.href;
        }

        document.title = "crm.qixport";

        if (favicon) {
            const img = new Image();
            img.src = '/favicon.png';
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width || 32;
                canvas.height = img.height || 32;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imgData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const a = data[i + 3];
                        if (a > 0) {
                            if (r > 120 && g > 100 && b < 130) {
                                const brightness = (r + g + b) / 3;
                                data[i] = (124 / 255) * brightness * 1.5;
                                data[i + 1] = (58 / 255) * brightness * 0.8;
                                data[i + 2] = (237 / 255) * brightness * 1.5;
                            }
                        }
                    }
                    ctx.putImageData(imgData, 0, 0);
                    favicon.href = canvas.toDataURL('image/png');
                }
            };
        }

        return () => {
            document.title = originalTitle;
            if (favicon && originalFaviconHref) {
                favicon.href = originalFaviconHref;
            }
        };
    }, []);

    // Logout handler
    const handleLogout = async () => {
        const result = await Swal.fire({
            title: 'Sign Out?',
            text: 'Are you sure you want to sign out of the Client CRM Portal?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sign Out',
            confirmButtonColor: '#4F46E5',
            cancelButtonColor: '#6B7280'
        });

        if (result.isConfirmed) {
            await logout();
            navigate('/crm-login');
        }
    };

    // Queries
    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
        queryKey: ['crm-external-stats', startDate, endDate],
        queryFn: async () => {
            const { data } = await api.get('/crm/external/dashboard-stats', {
                params: { startDate, endDate }
            });
            return data;
        },
        enabled: !!crmUser
    });

    const { data: leads = [], isLoading: leadsLoading, refetch: refetchLeads } = useQuery<Lead[]>({
        queryKey: ['crm-external-leads', searchTerm, stageFilter, qualityFilter, startDate, endDate],
        queryFn: async () => {
            const { data } = await api.get('/crm/external/leads', {
                params: { 
                    search: searchTerm, 
                    stage: stageFilter, 
                    quality: qualityFilter,
                    startDate,
                    endDate
                }
            });
            return data;
        },
        enabled: !!crmUser
    });

    const { data: followUps = { overdue: [], today: [], upcoming: [], completed: [] }, isLoading: followUpsLoading, refetch: refetchFollowups } = useQuery({
        queryKey: ['crm-external-followups'],
        queryFn: async () => {
            const { data } = await api.get('/crm/external/follow-ups');
            return data;
        },
        enabled: !!crmUser
    });

    const { data: reports = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery({
        queryKey: ['crm-external-reports'],
        queryFn: async () => {
            const { data } = await api.get('/crm/external/campaign-performance');
            return data;
        },
        enabled: !!crmUser
    });

    const { data: metaStatus, isLoading: metaStatusLoading, refetch: refetchMetaStatus } = useQuery({
        queryKey: ['crm-meta-status'],
        queryFn: async () => {
            const { data } = await api.get('/crm/external/meta-status');
            return data;
        },
        enabled: !!crmUser
    });

    const syncMetaLeadsMutation = useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/crm/external/sync-meta');
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['crm-external-leads'] });
            queryClient.invalidateQueries({ queryKey: ['crm-external-stats'] });
            queryClient.invalidateQueries({ queryKey: ['crm-external-reports'] });
            Swal.fire({
                icon: 'success',
                title: 'Sync Complete',
                text: data.message || 'Leads sync completed successfully.',
                confirmButtonColor: '#4F46E5',
            });
        },
        onError: (err: any) => {
            Swal.fire({
                icon: 'error',
                title: 'Sync Failed',
                text: err.response?.data?.message || 'Failed to sync leads from Meta',
                confirmButtonColor: '#ef4444',
            });
        }
    });

    const handleRefresh = () => {
        refetchStats();
        refetchLeads();
        refetchFollowups();
        refetchReports();
        refetchMetaStatus();
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Workspace Refreshed',
            showConfirmButton: false,
            timer: 1500
        });
    };

    // Mutations
    const createLeadMutation = useMutation({
        mutationFn: async (newLead: any) => {
            const { data } = await api.post('/crm/external/leads', newLead);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-external-leads'] });
            queryClient.invalidateQueries({ queryKey: ['crm-external-stats'] });
            Swal.fire('Created!', 'New lead has been created successfully.', 'success');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || 'Failed to create lead', 'error');
        }
    });

    const updateLeadStageMutation = useMutation({
        mutationFn: async ({ leadId, stage }: { leadId: string; stage: string }) => {
            const { data } = await api.put(`/crm/external/leads/${leadId}`, { stage });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-external-leads'] });
            queryClient.invalidateQueries({ queryKey: ['crm-external-stats'] });
        }
    });

    const addNoteMutation = useMutation({
        mutationFn: async ({ leadId, notes }: { leadId: string; notes: string }) => {
            const { data } = await api.post(`/crm/external/leads/${leadId}/notes`, { notes });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-external-leads'] });
            Swal.fire('Added Note', 'Your note was attached to the lead', 'success');
        }
    });

    const updateFollowupMutation = useMutation({
        mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
            const { data } = await api.put(`/crm/external/follow-ups/${id}`, { status, notes });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-external-followups'] });
            Swal.fire('Completed!', 'Follow-up status has been updated.', 'success');
        }
    });

    // Lead Creation Modal
    const triggerCreateLead = () => {
        Swal.fire({
            title: 'Add New Sales Lead',
            html: `
                <input id="swal-name" class="swal2-input" placeholder="Full Name">
                <input id="swal-phone" class="swal2-input" placeholder="Phone Number">
                <input id="swal-email" class="swal2-input" placeholder="Email Address">
                <input id="swal-location" class="swal2-input" placeholder="Location">
                <input id="swal-campaign" class="swal2-input" placeholder="Campaign Context">
                <select id="swal-quality" class="swal2-select" style="width: 76%; margin: 1em auto 3px;">
                    <option value="MEDIUM">Medium Quality</option>
                    <option value="HIGH">High Quality</option>
                    <option value="LOW">Low Quality</option>
                </select>
                <textarea id="swal-notes" class="swal2-textarea" placeholder="First Note/Feedback..."></textarea>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Create Lead',
            confirmButtonColor: '#4F46E5',
            preConfirm: () => {
                const name = (document.getElementById('swal-name') as HTMLInputElement).value;
                const phone = (document.getElementById('swal-phone') as HTMLInputElement).value;
                const email = (document.getElementById('swal-email') as HTMLInputElement).value;
                const location = (document.getElementById('swal-location') as HTMLInputElement).value;
                const campaign_name = (document.getElementById('swal-campaign') as HTMLInputElement).value;
                const quality = (document.getElementById('swal-quality') as HTMLSelectElement).value;
                const notes = (document.getElementById('swal-notes') as HTMLTextAreaElement).value;

                if (!name || !phone) {
                    Swal.showValidationMessage('Name and Phone Number are required');
                    return false;
                }

                return { name, phone, email, location, campaign_name, quality, notes };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                createLeadMutation.mutate(result.value);
            }
        });
    };

    // Lead View Details Modal
    const viewLeadDetails = (lead: Lead) => {
        Swal.fire({
            title: lead.name || 'Lead Details',
            html: `
                <div class="text-left space-y-3 text-slate-700 p-2">
                    <p><strong>Phone:</strong> ${lead.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> ${lead.email || 'N/A'}</p>
                    <p><strong>Location:</strong> ${lead.location || 'N/A'}</p>
                    <p><strong>Source:</strong> ${lead.source}</p>
                    <p><strong>Campaign:</strong> ${lead.campaign_name || 'N/A'}</p>
                    <p><strong>Quality:</strong> ${lead.quality || 'MEDIUM'}</p>
                    <p><strong>Stage:</strong> ${lead.stage || 'New Lead'}</p>
                    <p><strong>Date Added:</strong> ${new Date(lead.date).toLocaleDateString()}</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Add Note',
            confirmButtonColor: '#4F46E5',
            cancelButtonText: 'Close'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Add Lead Note',
                    input: 'textarea',
                    inputPlaceholder: 'Type your notes here...',
                    showCancelButton: true,
                    confirmButtonText: 'Submit Note',
                    confirmButtonColor: '#4F46E5',
                    preConfirm: (value) => {
                        if (!value) {
                            Swal.showValidationMessage('Note content cannot be empty');
                        }
                        return value;
                    }
                }).then((noteRes) => {
                    if (noteRes.isConfirmed && noteRes.value) {
                        addNoteMutation.mutate({ leadId: lead.id, notes: noteRes.value });
                    }
                });
            }
        });
    };

    if (!crmUser) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-100">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
            {/* TOP HEADER BAR */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-indigo-50 border border-indigo-100 flex items-center justify-center rounded-xl font-black text-indigo-600 text-lg">
                        {crmUser.clientLogo ? (
                            <img src={crmUser.clientLogo} alt={crmUser.clientName} className="h-full w-full object-contain p-1 rounded-xl" />
                        ) : (
                            crmUser.clientName.substring(0, 2).toUpperCase()
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-bold text-slate-900 leading-tight">
                                {crmUser.clientName}
                            </h1>
                            <Badge className="bg-indigo-150 text-indigo-700 font-bold border-none" variant="outline">
                                CRM
                            </Badge>
                        </div>
                        <p className="text-slate-400 text-xs font-semibold">
                            {crmUser.groupName} Access Scope
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="font-bold text-sm text-slate-800">{crmUser.full_name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{crmUser.designation || 'Sales Agent'}</span>
                    </div>

                    <button 
                        onClick={handleRefresh}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
                        title="Refresh Workspace"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>

                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors text-sm font-bold shadow-sm"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            {/* TAB CONTAINER */}
            <div className="flex-1 w-full max-w-none px-6 md:px-8 py-6 space-y-6 flex flex-col md:flex-row gap-6">
                
                {/* SIDEBAR NAVIGATION */}
                <aside className="w-full md:w-64 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 shrink-0 self-start shadow-sm">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Overview</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('leads')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'leads' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <List className="h-4 w-4" />
                        <span>Leads List</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('kanban')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'kanban' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <KanbanSquare className="h-4 w-4" />
                        <span>Kanban Board</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('followups')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'followups' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Calendar className="h-4 w-4" />
                        <span>Follow-Ups</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('reports')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span>ROAS Report</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('campaigns')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'campaigns' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Megaphone className="h-4 w-4" />
                        <span>Active Campaigns</span>
                    </button>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 min-w-0">
                    
                    {/* TAB: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Card Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="shadow-sm border-slate-200">
                                    <CardHeader className="p-4 pb-2">
                                        <CardDescription className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Total Leads</CardDescription>
                                        <CardTitle className="text-3xl font-extrabold text-slate-800">{stats?.total || 0}</CardTitle>
                                    </CardHeader>
                                </Card>
                                <Card className="shadow-sm border-slate-200">
                                    <CardHeader className="p-4 pb-2">
                                        <CardDescription className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">New Leads</CardDescription>
                                        <CardTitle className="text-3xl font-extrabold text-indigo-600">{stats?.new || 0}</CardTitle>
                                    </CardHeader>
                                </Card>
                                <Card className="shadow-sm border-slate-200">
                                    <CardHeader className="p-4 pb-2">
                                        <CardDescription className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Converted</CardDescription>
                                        <CardTitle className="text-3xl font-extrabold text-green-600">{stats?.converted || 0}</CardTitle>
                                    </CardHeader>
                                </Card>
                                <Card className="shadow-sm border-slate-200">
                                    <CardHeader className="p-4 pb-2">
                                        <CardDescription className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Hot Quality</CardDescription>
                                        <CardTitle className="text-3xl font-extrabold text-amber-600">{stats?.quality?.hot || 0}</CardTitle>
                                    </CardHeader>
                                </Card>
                            </div>

                            {/* Additional Info / Actions */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="font-extrabold text-slate-900 text-lg">Sales Pipeline Status</h3>
                                    <p className="text-slate-500 text-sm mt-1">Review active prospects and keep notes updated for real-time tracking.</p>
                                </div>
                                <button 
                                    onClick={triggerCreateLead}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Create Manual Lead</span>
                                </button>
                            </div>

                            {/* Active Leads List Preview */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="border-b border-slate-100 flex flex-row justify-between items-center">
                                    <div>
                                        <CardTitle className="text-base font-bold text-slate-900">Recent Prospects</CardTitle>
                                        <CardDescription>Recently synchronized sales team leads.</CardDescription>
                                    </div>
                                    <button onClick={() => setActiveTab('leads')} className="text-indigo-600 font-bold text-xs hover:underline flex items-center gap-1">
                                        <span>View All</span>
                                        <ChevronRight className="h-3 w-3" />
                                    </button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {leadsLoading ? (
                                        <div className="p-8 text-center text-slate-400"><RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-400" /></div>
                                    ) : leads.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 italic">No prospects found.</div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {leads.slice(0, 5).map(lead => (
                                                <div 
                                                    key={lead.id} 
                                                    className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer"
                                                    onClick={() => viewLeadDetails(lead)}
                                                >
                                                    <div className="min-w-0 pr-4">
                                                        <p className="font-bold text-sm text-slate-900 truncate">{lead.name || 'Anonymous'}</p>
                                                        <div className="flex gap-2 items-center text-[11px] text-slate-400 mt-1 flex-wrap">
                                                            <span>{lead.phone || 'No Phone'}</span>
                                                            <span>•</span>
                                                            <span>{lead.campaign_name || 'Direct Input'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Badge className={`border-none font-bold text-[9px] uppercase ${lead.quality === 'HIGH' ? 'bg-amber-100 text-amber-700' : lead.quality === 'LOW' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                                            {lead.quality || 'MEDIUM'}
                                                        </Badge>
                                                        <Badge className={`border-none font-bold text-[9px] uppercase ${lead.stage === 'Converted' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {lead.stage || 'New Lead'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* TAB: LEADS LIST */}
                    {activeTab === 'leads' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            {/* Filters Bar */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="relative w-full md:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                    <input 
                                        type="text"
                                        placeholder="Search name, phone, campaign..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-10 pl-10 pr-4 w-full bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>

                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                    <select 
                                        value={stageFilter} 
                                        onChange={(e) => setStageFilter(e.target.value)}
                                        className="h-10 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-700 px-3 py-1 shadow-sm"
                                    >
                                        <option value="">All Stages</option>
                                        <option value="New Lead">New Lead</option>
                                        <option value="Contacted">Contacted</option>
                                        <option value="Qualified">Qualified</option>
                                        <option value="Follow-up Required">Follow-up Required</option>
                                        <option value="Proposal Sent">Proposal Sent</option>
                                        <option value="Converted">Converted</option>
                                        <option value="Lost">Lost</option>
                                    </select>

                                    <select 
                                        value={qualityFilter} 
                                        onChange={(e) => setQualityFilter(e.target.value)}
                                        className="h-10 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-700 px-3 py-1 shadow-sm"
                                    >
                                        <option value="">All Quality</option>
                                        <option value="HIGH">High</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="LOW">Low</option>
                                    </select>

                                    <button 
                                        onClick={() => {
                                            if (metaStatus?.status !== 'ACTIVE') {
                                                Swal.fire({
                                                    title: 'Meta Account Not Connected',
                                                    text: 'Your Meta Ads account connection is not active or token has expired. Please contact support or connect it from Integrations first.',
                                                    icon: 'warning',
                                                    showCancelButton: true,
                                                    confirmButtonColor: '#4F46E5',
                                                    cancelButtonColor: '#6B7280',
                                                    confirmButtonText: 'Try Sync Anyway',
                                                    cancelButtonText: 'Cancel'
                                                }).then((result) => {
                                                    if (result.isConfirmed) {
                                                        syncMetaLeadsMutation.mutate();
                                                    }
                                                });
                                            } else {
                                                Swal.fire({
                                                    title: 'Sync leads from Meta Ads?',
                                                    text: 'This will fetch the latest leads directly from your Meta Ad account.',
                                                    icon: 'question',
                                                    showCancelButton: true,
                                                    confirmButtonColor: '#4F46E5',
                                                    cancelButtonColor: '#6B7280',
                                                    confirmButtonText: 'Yes, Sync Now'
                                                }).then((result) => {
                                                    if (result.isConfirmed) {
                                                        syncMetaLeadsMutation.mutate();
                                                    }
                                                });
                                            }
                                        }}
                                        disabled={syncMetaLeadsMutation.isPending}
                                        className={`flex items-center gap-1.5 px-4 h-10 border rounded-xl font-bold transition-colors shadow-sm ml-auto md:ml-0 ${
                                            metaStatus?.status === 'ACTIVE'
                                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                        }`}
                                    >
                                        <RefreshCw className={`h-4 w-4 ${syncMetaLeadsMutation.isPending ? 'animate-spin' : ''}`} />
                                        <span>
                                            {syncMetaLeadsMutation.isPending 
                                                ? 'Syncing...' 
                                                : `Live Sync ${metaStatus?.status === 'ACTIVE' ? '(Connected)' : '(Disconnected)'}`
                                            }
                                        </span>
                                    </button>

                                    <button 
                                        onClick={triggerCreateLead}
                                        className="flex items-center gap-1.5 px-4 h-10 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm ml-auto md:ml-0"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>Add Lead</span>
                                    </button>
                                </div>
                            </div>

                            {/* Leads Table Card */}
                            <Card className="shadow-sm border-slate-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Lead Info</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Campaign</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quality</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stage</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {leadsLoading ? (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center"><RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-400" /></td>
                                                </tr>
                                            ) : leads.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">No prospects match your criteria.</td>
                                                </tr>
                                            ) : (
                                                leads.map(lead => (
                                                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4 text-sm font-semibold text-slate-600">
                                                            {new Date(lead.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="p-4">
                                                            <p className="font-bold text-sm text-slate-900">{lead.name || 'Anonymous'}</p>
                                                            <div className="flex flex-col text-[11px] text-slate-400 mt-0.5">
                                                                <span>{lead.phone || '—'}</span>
                                                                <span>{lead.email || '—'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <p className="font-bold text-sm text-slate-800">{lead.campaign_name || 'Direct Input'}</p>
                                                            <span className="text-[10px] text-slate-400 uppercase font-semibold">{lead.source}</span>
                                                        </td>
                                                        <td className="p-4">
                                                            <Badge className={`border-none font-bold text-[9px] uppercase ${lead.quality === 'HIGH' ? 'bg-amber-100 text-amber-700' : lead.quality === 'LOW' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                {lead.quality || 'MEDIUM'}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-4">
                                                            <Badge className={`border-none font-bold text-[9px] uppercase ${lead.stage === 'Converted' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {lead.stage || 'New Lead'}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <button 
                                                                onClick={() => viewLeadDetails(lead)}
                                                                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 text-indigo-600 font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
                                                            >
                                                                Details
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* TAB: KANBAN PIPELINE */}
                    {activeTab === 'kanban' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            {/* Pipeline columns wrapper */}
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                                {[
                                    { title: 'New Leads', val: 'New Lead', bg: 'border-t-blue-500' },
                                    { title: 'Contacted', val: 'Contacted', bg: 'border-t-indigo-500' },
                                    { title: 'Qualified', val: 'Qualified', bg: 'border-t-purple-500' },
                                    { title: 'Follow-up', val: 'Follow-up Required', bg: 'border-t-amber-500' },
                                    { title: 'Converted', val: 'Converted', bg: 'border-t-green-500' },
                                    { title: 'Lost', val: 'Lost', bg: 'border-t-red-400' }
                                ].map(col => {
                                    const colLeads = leads.filter(l => (l.stage || 'New Lead') === col.val);
                                    return (
                                        <div key={col.val} className={`w-72 bg-slate-100/70 border border-slate-200 rounded-2xl p-3 flex flex-col gap-3 shrink-0 border-t-4 ${col.bg}`}>
                                            <div className="flex items-center justify-between px-1">
                                                <h4 className="font-extrabold text-sm text-slate-800">{col.title}</h4>
                                                <Badge className="bg-white border-slate-200 text-slate-600 font-bold text-xs" variant="outline">
                                                    {colLeads.length}
                                                </Badge>
                                            </div>
                                            <div className="flex-1 overflow-y-auto space-y-2 max-h-[60vh] min-h-[150px]">
                                                {colLeads.map(lead => (
                                                    <div 
                                                        key={lead.id} 
                                                        onClick={() => viewLeadDetails(lead)}
                                                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all space-y-3"
                                                    >
                                                        <div>
                                                            <h5 className="font-bold text-xs text-slate-900">{lead.name || 'Anonymous'}</h5>
                                                            <p className="text-[10px] text-slate-400 mt-1 font-semibold truncate">{lead.campaign_name || 'Direct'}</p>
                                                        </div>
                                                        <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                                                            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                                                <MapPin className="h-2.5 w-2.5" />
                                                                {lead.location || 'N/A'}
                                                            </span>
                                                            <div className="flex gap-1">
                                                                <select 
                                                                    value={lead.stage || 'New Lead'} 
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => updateLeadStageMutation.mutate({ leadId: lead.id, stage: e.target.value })}
                                                                    className="text-[9px] font-bold border border-slate-100 rounded-md bg-slate-50 px-1 py-0.5"
                                                                >
                                                                    <option value="New Lead">New</option>
                                                                    <option value="Contacted">Contacted</option>
                                                                    <option value="Qualified">Qualified</option>
                                                                    <option value="Follow-up Required">Follow-up</option>
                                                                    <option value="Proposal Sent">Proposal</option>
                                                                    <option value="Converted">Converted</option>
                                                                    <option value="Lost">Lost</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {colLeads.length === 0 && (
                                                    <div className="text-center text-[10px] text-slate-400 italic py-6">Empty Stage</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB: FOLLOW-UPS */}
                    {activeTab === 'followups' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {['overdue', 'today', 'upcoming'].map(key => {
                                const list = (followUps as any)[key] || [];
                                const title = key === 'overdue' ? 'Overdue Tasks' : key === 'today' ? "Today's Schedule" : 'Upcoming Schedule';
                                const color = key === 'overdue' ? 'bg-red-50 text-red-700 border-red-100' : key === 'today' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100';
                                const icon = key === 'overdue' ? <AlertCircle className="h-5 w-5" /> : key === 'today' ? <Clock className="h-5 w-5" /> : <Calendar className="h-5 w-5" />;

                                return (
                                    <Card key={key} className="shadow-sm border-slate-200">
                                        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl border ${color}`}>{icon}</div>
                                                <div>
                                                    <CardTitle className="text-sm font-bold text-slate-900">{title}</CardTitle>
                                                    <CardDescription>Follow-ups requiring action.</CardDescription>
                                                </div>
                                            </div>
                                            <Badge className="bg-slate-50 text-slate-600 font-bold border-slate-200" variant="outline">
                                                {list.length} Items
                                            </Badge>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {followUpsLoading ? (
                                                <div className="p-8 text-center text-slate-450"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-400" /></div>
                                            ) : list.length === 0 ? (
                                                <div className="p-8 text-center text-slate-400 italic text-xs">No pending follow-ups in this list.</div>
                                            ) : (
                                                <div className="divide-y divide-slate-100">
                                                    {list.map((follow: any) => (
                                                        <div key={follow.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/40 transition-all">
                                                            <div>
                                                                <h5 className="font-bold text-sm text-slate-900">{follow.lead?.name || 'Anonymous'}</h5>
                                                                <p className="text-xs text-slate-500 mt-0.5">{follow.notes || 'No description notes provided.'}</p>
                                                                <div className="flex gap-2 items-center text-[10px] text-slate-400 mt-2 font-semibold">
                                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{follow.channel || 'Phone Call'}</span>
                                                                    <span>•</span>
                                                                    <span>{new Date(follow.date).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => updateFollowupMutation.mutate({ id: follow.id, status: 'COMPLETED' })}
                                                                className="flex items-center gap-1 px-4 py-2 bg-green-50 border border-green-200 text-green-700 hover:bg-green-600 hover:text-white rounded-xl text-xs font-bold transition-colors self-end sm:self-auto"
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                <span>Mark Done</span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {/* TAB: ROAS REPORT */}
                    {activeTab === 'reports' && (
                        <Card className="shadow-sm border-slate-200 overflow-hidden animate-in fade-in duration-300">
                            <CardHeader className="bg-slate-50 border-b border-slate-200">
                                <CardTitle className="text-sm font-extrabold text-slate-900">Campaign Performance & ROI Report</CardTitle>
                                <CardDescription>Connected Meta Campaign spent matched with CRM Sales Lead pipeline conversion outcomes.</CardDescription>
                            </CardHeader>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100/50 border-b border-slate-200">
                                            <th className="p-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Campaign Name</th>
                                            <th className="p-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">Ad Spend</th>
                                            <th className="p-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">Leads Count</th>
                                            <th className="p-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">CPL</th>
                                            <th className="p-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">Converted</th>
                                            <th className="p-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">Conversion Val</th>
                                            <th className="p-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">ROAS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-150">
                                        {reportsLoading ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center"><RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-400" /></td>
                                            </tr>
                                        ) : reports.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-slate-400 italic">No campaign analytics data found.</td>
                                            </tr>
                                        ) : (
                                            reports.map((c: any) => (
                                                <tr key={c.campaignId} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 font-bold text-slate-900 text-sm">{c.name}</td>
                                                    <td className="p-4 text-right font-semibold text-slate-600">₹{(c.spend || 0).toLocaleString('en-IN')}</td>
                                                    <td className="p-4 text-right font-semibold text-slate-600">{c.leads || 0}</td>
                                                    <td className="p-4 text-right font-semibold text-slate-600">₹{(c.cpl || 0).toFixed(0)}</td>
                                                    <td className="p-4 text-right font-semibold text-slate-600">{c.convertedLeads || 0}</td>
                                                    <td className="p-4 text-right font-extrabold text-green-600">₹{(c.conversionValue || 0).toLocaleString('en-IN')}</td>
                                                    <td className="p-4 text-right">
                                                        <Badge className={`border-none font-bold text-xs ${c.roas >= 4 ? 'bg-green-600 text-white' : c.roas >= 1.5 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 shadow-inner'}`}>
                                                            {c.roas ? `${c.roas.toFixed(1)}x` : '—'}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* TAB: ACTIVE CAMPAIGNS */}
                    {activeTab === 'campaigns' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <Card className="shadow-sm border-slate-200 overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <CardTitle className="text-base font-extrabold text-slate-900">Currently Active Campaigns</CardTitle>
                                        <CardDescription>Real-time view of running marketing campaigns and live generated lead counts.</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                refetchReports();
                                                refetchMetaStatus();
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                                        >
                                            <RefreshCw className="h-3 w-3" />
                                            <span>Refresh</span>
                                        </button>
                                    </div>
                                </CardHeader>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100/50 border-b border-slate-200">
                                                <th className="p-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Campaign Name</th>
                                                <th className="p-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Start Date</th>
                                                <th className="p-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">Generated Leads (Live)</th>
                                                <th className="p-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-150">
                                            {reportsLoading ? (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center"><RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-400" /></td>
                                                </tr>
                                            ) : reports.filter((c: any) => c.status?.toUpperCase() === 'ACTIVE').length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">No currently active campaigns found.</td>
                                                </tr>
                                            ) : (
                                                reports
                                                    .filter((c: any) => c.status?.toUpperCase() === 'ACTIVE')
                                                    .map((c: any) => (
                                                        <tr key={c.campaignId} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="p-4 font-bold text-slate-900 text-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <Megaphone className="h-4 w-4 text-indigo-500 shrink-0" />
                                                                    <span>{c.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-sm font-semibold text-slate-600">
                                                                {c.startDate ? new Date(c.startDate).toLocaleDateString() : 'N/A'}
                                                            </td>
                                                            <td className="p-4 text-right font-extrabold text-indigo-600 text-sm">
                                                                {c.leads || 0}
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <Badge className="bg-green-100 text-green-700 border-none font-bold text-[10px]">
                                                                    ACTIVE
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default CrmUserDashboard;
