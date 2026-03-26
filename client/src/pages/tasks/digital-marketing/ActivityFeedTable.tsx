import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Loader2, Calendar, Trash2, X, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface ActivityLog {
    id: string;
    date: string;
    type: string;
    details: string;
    client: string;
    clientId: string;
    tab: string;
    userName?: string;
    view?: string;
}

interface ActivityFeedTableProps {
    userId?: string;
    department?: string;
    excludeDepartment?: string;
    clientId?: string;
    month?: string;
    year?: string;
    teamView?: string;
}

// Map activity tab → detail type used in backend route
const TAB_TO_TYPE: Record<string, string> = {
    meta: 'meta',
    google: 'google',
    seo: 'seo',
    web: 'web',
    content: 'content',
};

// Render a detail field row
const DetailRow = ({ label, value }: { label: string; value?: any }) => {
    if (value === undefined || value === null || value === '') return null;
    const display = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    return (
        <div className="flex flex-col sm:flex-row gap-1 py-2 border-b border-border last:border-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[160px]">{label}</span>
            <span className="text-sm text-foreground break-words whitespace-pre-wrap flex-1">{display}</span>
        </div>
    );
};

// Safe JSON parse helper
const safeJson = (raw: any, key?: string) => {
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return key ? parsed?.[key] : parsed;
    } catch {
        return raw;
    }
};

// Renders all fields depending on activity type
const ActivityDetailContent = ({ type, data }: { type: string; data: any }) => {
    if (!data) return null;

    if (type === 'meta') return (
        <div className="space-y-1">
            <DetailRow label="Campaign Name" value={data.campaign_name} />
            <DetailRow label="Objective" value={data.objective} />
            <DetailRow label="Platform" value={data.platform} />
            <DetailRow label="Status" value={data.status} />
            <DetailRow label="Spend (₹)" value={data.spend} />
            <DetailRow label="Engagement" value={safeJson(data.results_json, 'engagement')} />
            <DetailRow label="Reach" value={safeJson(data.results_json, 'reach')} />
            <DetailRow label="Impressions" value={safeJson(data.results_json, 'impressions')} />
            <DetailRow label="Leads" value={safeJson(data.results_json, 'leads')} />
            <DetailRow label="Date" value={data.date ? format(new Date(data.date), 'dd MMM yyyy') : ''} />
            <DetailRow label="Notes" value={data.notes} />
            <DetailRow label="Updated By" value={data.user?.full_name} />
            <DetailRow label="Last Updated" value={data.updatedAt ? format(new Date(data.updatedAt), 'dd MMM yyyy, hh:mm a') : ''} />
        </div>
    );

    if (type === 'google') return (
        <div className="space-y-1">
            <DetailRow label="Campaign Name" value={data.campaign_name} />
            <DetailRow label="Campaign Type" value={data.campaign_type} />
            <DetailRow label="Status" value={data.status} />
            <DetailRow label="Spend (₹)" value={data.spend} />
            <DetailRow label="Clicks" value={data.clicks} />
            <DetailRow label="Impressions" value={data.impressions} />
            <DetailRow label="Conversions" value={data.conversions} />
            <DetailRow label="CPA (₹)" value={data.cpa} />
            <DetailRow label="Date" value={data.date ? format(new Date(data.date), 'dd MMM yyyy') : ''} />
            <DetailRow label="Notes" value={data.notes} />
            <DetailRow label="Updated By" value={data.user?.full_name} />
            <DetailRow label="Last Updated" value={data.updatedAt ? format(new Date(data.updatedAt), 'dd MMM yyyy, hh:mm a') : ''} />
        </div>
    );

    if (type === 'seo') return (
        <div className="space-y-1">
            <DetailRow label="Month/Year" value={`${data.month}/${data.year}`} />
            <DetailRow label="Status" value={data.status} />
            <DetailRow label="Organic Traffic" value={data.organic_traffic} />
            <DetailRow label="Summary" value={data.summary} />
            <DetailRow label="Activities" value={safeJson(data.activities_json)} />
            <DetailRow label="Keyword Rankings" value={safeJson(data.keyword_rankings_json)} />
            <DetailRow label="Updated By" value={data.user?.full_name} />
            <DetailRow label="Last Updated" value={data.updatedAt ? format(new Date(data.updatedAt), 'dd MMM yyyy, hh:mm a') : ''} />
        </div>
    );

    if (type === 'web') return (
        <div className="space-y-1">
            <DetailRow label="Project Name" value={data.project_name} />
            <DetailRow label="Status" value={data.status} />
            <DetailRow label="Staging URL" value={data.staging_url} />
            <DetailRow label="Live URL" value={data.live_url} />
            <DetailRow label="Milestones" value={safeJson(data.milestones_json)} />
            <DetailRow label="Timeline" value={safeJson(data.timeline_json)} />
            <DetailRow label="Updated By" value={data.user?.full_name} />
            <DetailRow label="Last Updated" value={data.updatedAt ? format(new Date(data.updatedAt), 'dd MMM yyyy, hh:mm a') : ''} />
        </div>
    );

    if (type === 'content') return (
        <div className="space-y-1">
            <DetailRow label="Title" value={data.title} />
            <DetailRow label="Type" value={data.type} />
            <DetailRow label="Status" value={data.status} />
            <DetailRow label="File / Link" value={data.file_url} />
            <DetailRow label="Feedback / Notes" value={data.feedback} />
            <DetailRow label="Updated By" value={data.creator?.full_name} />
            <DetailRow label="Last Updated" value={data.updatedAt ? format(new Date(data.updatedAt), 'dd MMM yyyy, hh:mm a') : ''} />
        </div>
    );

    return null;
};

const ActivityFeedTable: React.FC<ActivityFeedTableProps> = ({ userId, department, excludeDepartment, clientId, month, year, teamView }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'DEVELOPER_ADMIN';

    const [selectedStaff, setSelectedStaff] = React.useState<string>('all');
    const [selectedType, setSelectedType] = React.useState<string>('all');

    // Detail modal state
    const [detailModal, setDetailModal] = React.useState<{ open: boolean; activity: ActivityLog | null }>({ open: false, activity: null });
    // Delete all confirmation state
    const [confirmDeleteAll, setConfirmDeleteAll] = React.useState(false);
    const [selectedLogs, setSelectedLogs] = React.useState<string[]>([]);

    // Fetch staff for DM Team View filters
    const { data: staffs } = useQuery({
        queryKey: ['dm-staffs'],
        queryFn: async () => {
            const response = await api.get('/team/staff');
            return response.data.filter((s: any) => {
                const dept = s.department || s.user?.department;
                const role = s.user?.role;
                return (
                    ['MARKETING', 'WEB', 'WEB_SEO'].includes(dept) ||
                    ['ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'].includes(role)
                );
            });
        },
        enabled: teamView === 'DM'
    });

    const { data: activities, isLoading } = useQuery({
        queryKey: ['activity-logs', userId, department, excludeDepartment, clientId, month, year, teamView, selectedStaff, selectedType],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (userId) params.append('userId', userId);
            if (department) params.append('department', department);
            if (excludeDepartment) params.append('excludeDepartment', excludeDepartment);
            if (clientId) params.append('client_id', clientId);
            if (teamView) params.append('teamView', teamView);
            if (selectedStaff !== 'all') params.append('performerId', selectedStaff);
            if (selectedType !== 'all') params.append('activityType', selectedType);

            if (month !== undefined && year !== undefined) {
                const m = parseInt(month);
                const y = parseInt(year);
                const start = new Date(y, m, 1).toISOString();
                const end = new Date(y, m + 1, 0, 23, 59, 59, 999).toISOString();
                params.append('startDate', start);
                params.append('endDate', end);
            }

            const response = await api.get(`/client-portal/activity-logs?${params.toString()}`);
            return response.data as ActivityLog[];
        },
        staleTime: 0,
        gcTime: 0
    });

    // Fetch detail for selected activity
    const { data: detailData, isLoading: detailLoading } = useQuery({
        queryKey: ['activity-detail', detailModal.activity?.tab, detailModal.activity?.id],
        queryFn: async () => {
            const a = detailModal.activity!;
            const type = TAB_TO_TYPE[a.tab];
            if (!type) return null;
            const res = await api.get(`/client-portal/activity-logs/detail/${type}/${a.id}`);
            return res.data;
        },
        enabled: detailModal.open && !!detailModal.activity && detailModal.activity.type !== 'Task',
        staleTime: 0
    });

    // Delete selected mutation
    const deleteSelectedMutation = useMutation({
        mutationFn: async () => {
            const logsToDelete = selectedLogs.map(val => {
                const [tab, id] = val.split('::');
                return { tab, id };
            });
            return api.delete('/client-portal/activity-logs/selected', { data: { logs: logsToDelete } });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
            setSelectedLogs([]);
            setConfirmDeleteAll(false);
        }
    });

    // Delete single activity log entry
    const [confirmDeleteSingle, setConfirmDeleteSingle] = React.useState(false);
    const TYPE_TO_ENDPOINT: Record<string, string> = {
        meta: 'meta-ads',
        google: 'google-ads',
        seo: 'seo',
        web: 'web-dev',
        content: 'content',
    };
    const deleteSingleMutation = useMutation({
        mutationFn: async () => {
            const a = detailModal.activity!;
            const endpoint = TYPE_TO_ENDPOINT[a.tab];
            if (!endpoint) throw new Error('Unknown type');
            return api.delete(`/client-portal/tracking/${endpoint}/${a.id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
            setConfirmDeleteSingle(false);
            setDetailModal({ open: false, activity: null });
        }
    });

    const handleRowClick = (e: React.MouseEvent, activity: ActivityLog) => {
        // Prevent opening modal if clicking the checkbox
        if ((e.target as HTMLElement).closest('.checkbox-col')) return;

        if (activity.type === 'Task') {
            navigate(`/dashboard/tasks/${activity.id}`);
            return;
        }
        if (!activity.clientId) return;
        // Open detail modal for campaign types
        setDetailModal({ open: true, activity });
    };

    const toggleSelection = (activity: ActivityLog) => {
        if (activity.tab === 'history') return; // Cannot bulk delete non-campaign tasks
        const val = `${activity.tab}::${activity.id}`;
        setSelectedLogs(prev => {
            if (prev.includes(val)) return prev.filter(v => v !== val);
            return [...prev, val];
        });
    };

    const toggleAll = () => {
        if (selectedLogs.length > 0) {
            setSelectedLogs([]);
        } else {
            const next: string[] = [];
            activities?.forEach(a => {
                if (a.tab !== 'history') {
                    next.push(`${a.tab}::${a.id}`);
                }
            });
            setSelectedLogs(next);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="animate-spin mb-4" size={40} />
                <p>Loading activities...</p>
            </div>
        );
    }

    const activityTypes = ['Meta Ads', 'SEO', 'Google Ads', 'Web Dev', 'Creative Task', 'Task'];

    return (
        <div className="space-y-4">
            {/* Header row: Filters + Delete All (admin only) */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                {teamView === 'DM' && (
                    <div className="flex flex-wrap items-center gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex-1">
                        <div className="flex flex-col gap-1.5 min-w-[200px]">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Filter by Staff</label>
                            <select
                                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                                value={selectedStaff}
                                onChange={(e) => setSelectedStaff(e.target.value)}
                            >
                                <option value="all">All Staff Members</option>
                                {staffs?.map((staff: any) => {
                                    const name = staff.user?.full_name || staff.full_name || 'Unknown';
                                    const dept = staff.department || staff.user?.department || '';
                                    const uid = staff.user?.id || staff.user_id;
                                    return (
                                        <option key={uid} value={uid}>
                                            {name} {dept ? `(${dept})` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5 min-w-[200px]">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Activity Type</label>
                            <select
                                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                            >
                                <option value="all">All Activities</option>
                                {activityTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Delete Selected Logs - Admin Only */}
                {isAdmin && (
                    <button
                        onClick={() => setConfirmDeleteAll(true)}
                        disabled={selectedLogs.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm whitespace-nowrap transition-colors ${
                            selectedLogs.length > 0 
                                ? 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100' 
                                : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed opacity-70'
                        }`}
                    >
                        <Trash2 size={15} />
                        Delete selected logs {selectedLogs.length > 0 ? `(${selectedLogs.length})` : ''}
                    </button>
                )}
            </div>

            {!activities || activities.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
                    <h3 className="text-lg font-medium text-gray-900">No activities found</h3>
                    <p className="text-gray-500">Try adjusting your filters or selected period.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-gray-50/50">
                            <TableRow>
                                {isAdmin && (
                                    <TableHead className="w-[50px] pl-4 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                            checked={activities.filter(a => a.tab !== 'history').length > 0 && selectedLogs.length === activities.filter(a => a.tab !== 'history').length}
                                            onChange={toggleAll}
                                        />
                                    </TableHead>
                                )}
                                <TableHead className="w-[80px] font-bold text-gray-700">Sl No.</TableHead>
                                <TableHead className="w-[150px] font-bold text-gray-700">Date</TableHead>
                                <TableHead className="font-bold text-gray-700">Task Details</TableHead>
                                <TableHead className="font-bold text-gray-700">Client</TableHead>
                                <TableHead className="font-bold text-gray-700">Staff Name</TableHead>
                                <TableHead className="w-[100px] text-right font-bold text-gray-700">View</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activities.map((activity, index) => {
                                const val = `${activity.tab}::${activity.id}`;
                                const isSelected = selectedLogs.includes(val);
                                const canSelect = activity.tab !== 'history';

                                return (
                                <TableRow
                                    key={`${activity.type}-${activity.id}-${index}`}
                                    className={`cursor-pointer transition-colors group ${isSelected ? 'bg-indigo-50 hover:bg-indigo-100/50' : 'hover:bg-indigo-50/30'}`}
                                    onClick={(e) => handleRowClick(e, activity)}
                                >
                                    {isAdmin && (
                                        <TableCell className="pl-4 text-center checkbox-col">
                                            {canSelect && (
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer relative z-10"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        toggleSelection(activity);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                                    <TableCell className="text-gray-600">
                                        {format(new Date(activity.date), 'dd MMM yyyy')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-medium whitespace-nowrap">
                                                    {activity.type}
                                                </Badge>
                                                <span className="font-semibold text-gray-900 break-words">{activity.details}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-indigo-600">{activity.client}</TableCell>
                                    <TableCell className="text-gray-600 italic">{activity.userName || 'System'}</TableCell>
                                    <TableCell className="text-right">
                                        <button className="p-2 text-gray-400 group-hover:text-indigo-600 transition-colors">
                                            <ExternalLink size={18} />
                                        </button>
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* ─── Activity Detail Modal ─── */}
            <Dialog open={detailModal.open} onOpenChange={(open) => setDetailModal(prev => ({ ...prev, open }))}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <Badge className="bg-indigo-100 text-indigo-700 border-0 text-sm">
                                {detailModal.activity?.type}
                            </Badge>
                            <span>{detailModal.activity?.details}</span>
                        </DialogTitle>
                    </DialogHeader>

                    {detailLoading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="animate-spin mr-2" size={24} />
                            Loading details...
                        </div>
                    ) : detailData ? (
                        <div className="mt-2">
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                                <span className="text-sm font-semibold text-muted-foreground">Client:</span>
                                <span className="text-sm font-bold text-indigo-600">{detailData.client?.name || detailModal.activity?.client}</span>
                            </div>
                            <ActivityDetailContent
                                type={TAB_TO_TYPE[detailModal.activity?.tab || ''] || ''}
                                data={detailData}
                            />
                            <div className="mt-5 pt-3 border-t border-border flex justify-between items-center gap-3 flex-wrap">
                                <button
                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                    onClick={() => {
                                        if (detailModal.activity?.clientId) {
                                            setDetailModal({ open: false, activity: null });
                                            navigate(
                                                `/dashboard/tasks/digital-marketing?clientId=${detailModal.activity.clientId}&view=campaignData&tab=${detailModal.activity.tab}&entry_id=${detailModal.activity.id}`
                                            );
                                        }
                                    }}
                                >
                                    <ExternalLink size={14} />
                                    Open in Campaign Manager
                                </button>

                                <div className="flex items-center gap-2 ml-auto">
                                    {/* Delete this entry */}
                                    {detailModal.activity?.tab !== 'history' && (
                                        <button
                                            className="text-sm text-red-600 hover:text-red-800 font-semibold flex items-center gap-1.5 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                            onClick={() => setConfirmDeleteSingle(true)}
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>
                                    )}
                                    <button
                                        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                        onClick={() => setDetailModal({ open: false, activity: null })}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground py-6 text-center text-sm">Details not available.</p>
                    )}
                </DialogContent>
            </Dialog>

            {/* ─── Delete Single Entry Confirmation ─── */}
            <Dialog open={confirmDeleteSingle} onOpenChange={setConfirmDeleteSingle}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle size={20} />
                            Delete This Entry?
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-3 space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to permanently delete <strong>{detailModal.activity?.details}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => deleteSingleMutation.mutate()}
                                disabled={deleteSingleMutation.isPending}
                                className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {deleteSingleMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Yes, Delete
                            </button>
                            <button
                                onClick={() => setConfirmDeleteSingle(false)}
                                className="flex-1 py-2 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── Delete All Confirmation Dialog ─── */}
            <Dialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle size={20} />
                            Delete Selected Logs
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-3 space-y-3">
                        <p className="text-sm text-muted-foreground">
                            This will permanently delete <strong>{selectedLogs.length} selected campaign logs</strong>. This action cannot be undone.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => deleteSelectedMutation.mutate()}
                                disabled={deleteSelectedMutation.isPending}
                                className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {deleteSelectedMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Yes, Delete Selected
                            </button>
                            <button
                                onClick={() => setConfirmDeleteAll(false)}
                                className="flex-1 py-2 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ActivityFeedTable;
