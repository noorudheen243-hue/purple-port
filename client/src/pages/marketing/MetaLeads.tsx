import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import {
    Loader2, AlertCircle, Download, Users, Mail, Phone, RefreshCw,
    Plus, Edit, Trash2, History, ThumbsUp, ThumbsDown, MapPin,
    Filter, MoreVertical, X, Check, Search, Zap, ChevronDown, ChevronRight
} from 'lucide-react';

interface MetaLeadsProps {
    clientId: string;
    fromDate?: string;
    toDate?: string;
}

export const MetaLeads: React.FC<MetaLeadsProps> = ({ clientId, fromDate, toDate }) => {
    const [leads, setLeads] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    // Form States
    const [followUpData, setFollowUpData] = useState({
        status: 'CONTACTED',
        notes: '',
        channel: 'Phone Call'
    });

    const fetchLeads = async () => {
        if (!clientId) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ clientId });
            if (fromDate) params.append('from', fromDate);
            if (toDate) params.append('to', toDate);

            const res = await api.get(`/marketing/leads?${params.toString()}`);
            setLeads(res.data || []);
        } catch (err: any) {
            console.error('Failed to fetch leads', err);
            setError('Failed to load leads from database.');
        } finally {
            setLoading(false);
        }
    };

    const fetchGroups = async () => {
        if (!clientId) return;
        try {
            const res = await api.get(`/marketing/groups?clientId=${clientId}`);
            setGroups(res.data || []);
        } catch (err) {
            console.error('Failed to fetch groups', err);
        }
    };

    useEffect(() => {
        fetchLeads();
        fetchGroups();
    }, [clientId, fromDate, toDate]);

    // Redundant manual add/sync removed as per user requirement.
    // Leads are now strictly funnelled from the Command Center.

    const handleDeleteLead = async (id: string) => {
        try {
            await api.delete(`/marketing/leads/${id}`);
            setShowDeleteConfirm(null);
            fetchLeads();
        } catch (err) {
            setError('Failed to delete lead.');
        }
    };

    const toggleFeedback = async (lead: any, type: 'POSITIVE' | 'NEGATIVE') => {
        const newFeedback = lead.feedback === type ? null : type;
        try {
            await api.patch(`/marketing/leads/${lead.id}`, { feedback: newFeedback });
            fetchLeads();
        } catch (err) {
            setError('Failed to update feedback.');
        }
    };

    const handleAddFollowUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLead) return;
        try {
            await api.post('/marketing/leads/follow-up', {
                leadId: selectedLead.id,
                ...followUpData
            });
            setShowFollowUpModal(false);
            setFollowUpData({ status: 'CONTACTED', notes: '', channel: 'Phone Call' });
            fetchLeads();
        } catch (err) {
            setError('Failed to add follow-up.');
        }
    };

    useEffect(() => {
        fetchLeads();
        fetchGroups();
    }, [clientId]);

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupName)) next.delete(groupName);
            else next.add(groupName);
            return next;
        });
    };

    const exportToCSV = () => {
        if (leads.length === 0) return;
        const headers = ['Date', 'Source', 'Group', 'Name', 'Email', 'Phone', 'Location', 'Campaign', 'Quality', 'Status', 'Feedback'];
        const csvRows = [headers.join(',')];
        leads.forEach(lead => {
            const groupName = lead.group?.name || lead.marketingCampaign?.group?.name || 'Unassigned';
            const row = [
                `"${format(new Date(lead.date), 'yyyy-MM-dd')}"`,
                `"${lead.source}"`,
                `"${groupName}"`,
                `"${lead.name || ''}"`,
                `"${lead.email || ''}"`,
                `"${lead.phone || ''}"`,
                `"${lead.location || ''}"`,
                `"${lead.campaign_name || lead.marketingCampaign?.name || ''}"`,
                `"${lead.quality}"`,
                `"${lead.status}"`,
                `"${lead.feedback || 'None'}"`
            ];
            csvRows.push(row.join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `leads_${clientId}_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!clientId) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="font-medium">Please select a client to view leads.</p>
            </div>
        );
    }

    // Filter leads by date range if props are provided
    const filteredLeads = leads.filter(lead => {
        const leadDate = new Date(lead.date || lead.createdAt);
        if (fromDate && leadDate < new Date(fromDate)) return false;
        if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            if (leadDate > to) return false;
        }
        return true;
    });

    // Stats (based on filtered leads)
    const totalLeads = filteredLeads.length;
    const autoLeads = filteredLeads.filter(l => l.source === 'AUTO').length;
    const manualLeads = filteredLeads.filter(l => l.source === 'MANUAL').length;
    const positiveLeads = filteredLeads.filter(l => l.feedback === 'POSITIVE').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Generated Leads</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Track and manage all your enquiries in one place</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={exportToCSV}
                        disabled={leads.length === 0}
                        className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-xl flex items-start animate-fade-in">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-transform hover:scale-[1.02]">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{totalLeads}</h3>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-transform hover:scale-[1.02]">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Manual/Auto</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{manualLeads} / {autoLeads}</h3>
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                            <RefreshCw className="w-5 h-5" />
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-transform hover:scale-[1.02]">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">High Quality</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{leads.filter(l => l.quality === 'HIGH').length}</h3>
                        <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                            <Check className="w-5 h-5" />
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-transform hover:scale-[1.02]">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">AI HOT Leads</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{leads.filter(l => l.aiScore?.label === 'HOT').length}</h3>
                        <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                            <Zap className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-400">Date/Source</th>
                                <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-400">Lead Information</th>
                                <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-400">AI Score</th>
                                <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-400">Campaign/Loc.</th>
                                <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-400">Quality/Status</th>
                                <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-400">Feedback</th>
                                <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-400 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                            {loading && leads.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
                                        <p className="mt-2 text-gray-500 font-medium">Loading leads database...</p>
                                    </td>
                                </tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center text-gray-500 italic">
                                        No leads recorded for this client.
                                    </td>
                                </tr>
                            ) : (
                                Object.entries(
                                    filteredLeads.reduce((acc: Record<string, any[]>, lead) => {
                                        const groupName = lead.group?.name || lead.marketingCampaign?.group?.name || 'Unassigned Leads';
                                        if (!acc[groupName]) acc[groupName] = [];
                                        acc[groupName].push(lead);
                                        return acc;
                                    }, {})
                                ).map(([groupName, groupLeads]) => {
                                    const isExpanded = expandedGroups.has(groupName);
                                    return (
                                        <React.Fragment key={groupName}>
                                            {/* Group Header Row */}
                                            <tr 
                                                className="bg-yellow-400 hover:bg-yellow-500 cursor-pointer border-y border-yellow-500/20 transition-colors"
                                                onClick={() => toggleGroup(groupName)}
                                            >
                                                <td colSpan={7} className="px-6 py-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-[#2c185a] text-white p-1 rounded-md shadow-sm">
                                                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                            </div>
                                                            <span className="text-sm font-black text-[#2c185a] uppercase tracking-widest">
                                                                {groupName}
                                                            </span>
                                                            <span className="text-[10px] bg-[#2c185a]/10 text-[#2c185a] px-2.5 py-1 rounded-full font-black border border-[#2c185a]/20">
                                                                {groupLeads.length} {groupLeads.length === 1 ? 'Lead' : 'Leads'}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] font-black text-[#2c185a]/60 uppercase tracking-tighter">
                                                            {isExpanded ? 'Click to collapse' : 'Click to expand details'}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && groupLeads.map((lead) => (
                                            <tr key={lead.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-all">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900 dark:text-white">
                                                        {format(new Date(lead.date || lead.createdAt), 'MMM dd, yyyy')}
                                                    </div>
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${lead.source === 'AUTO'
                                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                            : 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                                        }`}>
                                                        {lead.source}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 dark:text-white leading-tight">{lead.name || 'Anonymous'}</div>
                                                    <div className="flex flex-col gap-0.5 mt-1">
                                                        {lead.phone && (
                                                            <a href={`tel:${lead.phone}`} className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                                                <Phone className="w-3 h-3 mr-1" /> {lead.phone}
                                                            </a>
                                                        )}
                                                        {lead.email && (
                                                            <a href={`mailto:${lead.email}`} className="flex items-center text-xs text-gray-500 hover:text-blue-600">
                                                                <Mail className="w-3 h-3 mr-1" /> {lead.email}
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-lg font-black ${
                                                                lead.aiScore?.label === 'HOT' ? 'text-red-600' :
                                                                lead.aiScore?.label === 'WARM' ? 'text-orange-500' : 'text-blue-500'
                                                            }`}>
                                                                {lead.aiScore?.score || '??'}
                                                            </span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                lead.aiScore?.label === 'HOT' ? 'bg-red-100 text-red-700' :
                                                                lead.aiScore?.label === 'WARM' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                                {lead.aiScore?.label || 'PENDING'}
                                                            </span>
                                                        </div>
                                                        {lead.aiScore?.factors_json && (
                                                            <p className="text-[10px] text-gray-400 italic max-w-[120px] truncate">
                                                                {JSON.parse(lead.aiScore.factors_json).slice(0, 2).join(', ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-900 dark:text-gray-200 font-medium truncate max-w-[150px]" title={lead.campaign_name || lead.marketingCampaign?.name}>
                                                        {lead.campaign_name || lead.marketingCampaign?.name || 'Bulk Enquiry'}
                                                    </div>
                                                    <div className="flex items-center text-xs text-gray-500 mt-1">
                                                        <MapPin className="w-3 h-3 mr-1" /> {lead.location || 'Undefined'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${lead.quality === 'HIGH' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                                                                lead.quality === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                                                                    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                                            }`}>
                                                            {lead.quality} QUALITY
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-gray-500 px-2 border-l-2 border-purple-500">
                                                            {lead.status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => toggleFeedback(lead, 'POSITIVE')}
                                                            className={`p-1.5 rounded-lg transition-all ${lead.feedback === 'POSITIVE'
                                                                    ? 'bg-green-100 text-green-600 shadow-sm'
                                                                    : 'bg-gray-50 text-gray-400 hover:bg-green-50 hover:text-green-500'
                                                                }`}
                                                        >
                                                            <ThumbsUp className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => toggleFeedback(lead, 'NEGATIVE')}
                                                            className={`p-1.5 rounded-lg transition-all ${lead.feedback === 'NEGATIVE'
                                                                    ? 'bg-red-100 text-red-600 shadow-sm'
                                                                    : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500'
                                                                }`}
                                                        >
                                                            <ThumbsDown className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => { setSelectedLead(lead); setShowFollowUpModal(true); }}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg relative group/hint"
                                                        >
                                                            <History className="w-4 h-4" />
                                                            {lead.follow_ups?.length > 0 && (
                                                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] px-1 rounded-full border border-white">
                                                                    {lead.follow_ups.length}
                                                                </span>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(lead.id)}
                                                            className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Follow-up Modal */}
            {showFollowUpModal && selectedLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Follow-up History: {selectedLead.name}</h3>
                                <p className="text-xs text-gray-500">{selectedLead.phone}</p>
                            </div>
                            <button onClick={() => setShowFollowUpModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* History List */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                                    <History className="w-3 h-3 mr-1.5" /> Previous Interactions
                                </h4>
                                {selectedLead.follow_ups?.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedLead.follow_ups.map((f: any, idx: number) => (
                                            <div key={f.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl relative border-l-4 border-purple-500">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded shadow-sm font-bold text-gray-500">#{selectedLead.follow_ups.length - idx}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold">{format(new Date(f.date), 'MMM dd, HH:mm')}</span>
                                                </div>
                                                <div className="text-xs font-black text-purple-600 mb-1">{f.status} via {f.channel}</div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{f.notes || 'No notes added'}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                                        <p className="text-sm text-gray-500 italic">No follow-ups recorded yet</p>
                                    </div>
                                )}
                            </div>

                            {/* Add New Form */}
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Log New Activity</h4>
                                <form onSubmit={handleAddFollowUp} className="space-y-4 bg-purple-50/50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Update Status</label>
                                            <select
                                                value={followUpData.status} onChange={e => setFollowUpData({ ...followUpData, status: e.target.value })}
                                                className="w-full text-sm px-3 py-2 bg-white dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-purple-500 font-bold"
                                            >
                                                <option value="CONTACTED">CONTACTED</option>
                                                <option value="CALL_BACK">REQ. CALL BACK</option>
                                                <option value="INTERESTED">INTERESTED</option>
                                                <option value="NOT_INTERESTED">NOT INTERESTED</option>
                                                <option value="FAKE_LEAD">SPAM / FAKE</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Channel</label>
                                            <select
                                                value={followUpData.channel} onChange={e => setFollowUpData({ ...followUpData, channel: e.target.value })}
                                                className="w-full text-sm px-3 py-2 bg-white dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-purple-500 font-bold"
                                            >
                                                <option value="Phone Call">📞 Phone Call</option>
                                                <option value="WhatsApp">💬 WhatsApp</option>
                                                <option value="Email">📧 Email</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Notes</label>
                                        <textarea
                                            value={followUpData.notes} onChange={e => setFollowUpData({ ...followUpData, notes: e.target.value })}
                                            className="w-full text-sm px-3 py-2 bg-white dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-purple-500 font-medium h-20"
                                            placeholder="What was discussed?"
                                        ></textarea>
                                    </div>
                                    <button type="submit" className="w-full py-2.5 bg-purple-600 text-white font-black text-sm rounded-xl hover:bg-purple-700 transition-all shadow-md">
                                        Log Follow-up
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Lead?</h3>
                        <p className="text-gray-500 text-sm mb-6">This action cannot be undone. All follow-up history will be lost.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-xl">Cancel</button>
                            <button onClick={() => handleDeleteLead(showDeleteConfirm)} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 dark:shadow-none">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

