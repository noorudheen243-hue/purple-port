import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    X, Loader2, Trash2, Users, Target, Phone, Mail, MapPin, 
    Facebook, ExternalLink, Check, AlertCircle, PlusCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface GroupDetailWindowProps {
    group: { id: string; name: string };
    clientId: string;
    onClose: () => void;
}

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export const GroupDetailWindow: React.FC<GroupDetailWindowProps> = ({ group, clientId, onClose }) => {
    const queryClient = useQueryClient();
    const [view, setView] = useState<'campaigns' | 'leads'>('campaigns');
    const [isAddingLead, setIsAddingLead] = useState(false);
    
    // Quick Lead Form State
    const [leadForm, setLeadForm] = useState({
        name: '', phone: '', email: '', location: '', quality: 'MEDIUM', status: 'NEW'
    });

    // Fetch campaigns in this group
    const { data: campaignRes, isLoading: campaignsLoading } = useQuery({
        queryKey: ['campaigns-group', group.id],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0];
            const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
            const res = await api.get(`/marketing/metrics?clientId=${clientId}&groupId=${group.id}&from=${startOfYear}&to=${today}&status=all`);
            return res.data.campaigns || [];
        }
    });

    // Fetch leads in this group
    const { data: leads, isLoading: leadsLoading } = useQuery({
        queryKey: ['leads-group', group.id],
        queryFn: async () => (await api.get(`/marketing/leads?clientId=${clientId}&groupId=${group.id}`)).data || []
    });

    const unassignMutation = useMutation({
        mutationFn: (campaignId: string) => api.post('/marketing/groups/unassign', { campaignId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns-group'] });
            queryClient.invalidateQueries({ queryKey: ['synced-campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['marketing-groups'] });
        }
    });

    const addLeadMutation = useMutation({
        mutationFn: (data: any) => api.post('/marketing/leads', { ...data, clientId, group_id: group.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads-group'] });
            queryClient.invalidateQueries({ queryKey: ['marketing-groups'] });
            setIsAddingLead(false);
            setLeadForm({ name: '', phone: '', email: '', location: '', quality: 'MEDIUM', status: 'NEW' });
        }
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl text-purple-600">
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{group.name}</h2>
                            <div className="flex gap-4 mt-1">
                                <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 uppercase">
                                    <Facebook className="w-3.5 h-3.5" /> Campaigns: <span className="text-purple-600">{campaignRes?.length || 0}</span>
                                </span>
                                <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 uppercase">
                                    <Users className="w-3.5 h-3.5" /> Total Leads: <span className="text-green-600">{leads?.length || 0}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white">
                        <X className="w-7 h-7" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-gray-900 px-8 flex border-b border-gray-100 dark:border-gray-800">
                    <button 
                        onClick={() => setView('campaigns')}
                        className={`py-4 px-6 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${view === 'campaigns' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        Active Campaigns
                    </button>
                    <button 
                        onClick={() => setView('leads')}
                        className={`py-4 px-6 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${view === 'leads' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        Success Leads
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8">
                    {view === 'campaigns' ? (
                        <div className="space-y-4">
                            {campaignsLoading ? (
                                <div className="py-20 flex flex-col items-center justify-center text-purple-500">
                                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                                    <p className="font-bold animate-pulse">Retrieving grouped campaigns...</p>
                                </div>
                            ) : campaignRes?.length === 0 ? (
                                <div className="py-20 text-center bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                                    <p className="text-gray-500 font-medium">No campaigns assigned to this group yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {campaignRes.map((camp: any) => (
                                        <div key={camp.id} className="p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm group relative hover:border-purple-200 transition-all">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    {camp.platform === 'meta' ? <Facebook className="w-5 h-5 text-blue-600" /> : <GoogleIcon />}
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{camp.name}</h4>
                                                        <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-50 dark:bg-black/20 px-1.5 py-0.5 rounded">{camp.status}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => unassignMutation.mutate(camp.id)}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                                    title="Remove from Group"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Detailed Lead Form */}
                            {!isAddingLead ? (
                                <button 
                                    onClick={() => setIsAddingLead(true)}
                                    className="w-full py-4 border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-2xl text-purple-600 font-bold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <PlusCircle className="w-5 h-5" />
                                    Record New Group Lead
                                </button>
                            ) : (
                                <div className="p-6 bg-purple-50/50 dark:bg-purple-900/10 rounded-3xl border border-purple-100 dark:border-purple-800 animate-in slide-in-from-top-4">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-black text-purple-700 dark:text-purple-400 uppercase tracking-widest text-sm">Lead Entry Form</h3>
                                        <button onClick={() => setIsAddingLead(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                                    </div>
                                    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); addLeadMutation.mutate(leadForm); }}>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input 
                                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border-0 ring-1 ring-purple-100 dark:ring-purple-900/30 focus:ring-2 focus:ring-purple-500 font-bold text-sm"
                                                placeholder="Lead Name" value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} required
                                            />
                                            <input 
                                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border-0 ring-1 ring-purple-100 dark:ring-purple-900/30 focus:ring-2 focus:ring-purple-500 font-bold text-sm"
                                                placeholder="Phone Number" value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input 
                                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border-0 ring-1 ring-purple-100 dark:ring-purple-900/30 focus:ring-2 focus:ring-purple-500 font-bold text-sm"
                                                placeholder="Email Address" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                                            />
                                            <input 
                                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border-0 ring-1 ring-purple-100 dark:ring-purple-900/30 focus:ring-2 focus:ring-purple-500 font-bold text-sm"
                                                placeholder="Location" value={leadForm.location} onChange={e => setLeadForm({...leadForm, location: e.target.value})}
                                            />
                                        </div>
                                        <button 
                                            type="submit" disabled={addLeadMutation.isPending}
                                            className="w-full py-4 bg-purple-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-purple-700 shadow-xl shadow-purple-200 dark:shadow-none transition-all disabled:opacity-50"
                                        >
                                            {addLeadMutation.isPending ? 'Saving...' : 'Confirm Entry'}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Lead List */}
                            <div className="space-y-3">
                                {leadsLoading ? (
                                    <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-500" /></div>
                                ) : leads?.length === 0 ? (
                                    <p className="text-center text-gray-400 italic text-sm py-10">No leads recorded for this group.</p>
                                ) : (
                                    leads.map((lead: any) => (
                                        <div key={lead.id} className="p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl flex justify-between items-center group hover:bg-white dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center font-black">
                                                    {lead.name?.[0].toUpperCase() || 'L'}
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-gray-900 dark:text-white capitalize">{lead.name}</h5>
                                                    <div className="flex gap-3 text-[10px] font-bold text-gray-400 uppercase">
                                                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>
                                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {lead.location || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${lead.quality === 'HIGH' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {lead.quality}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400">{format(new Date(lead.createdAt), 'MMM dd')}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 dark:bg-black/20 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client: <span className="text-purple-600">QIXPORT Portal</span> &bull; Security Level: High</p>
                </div>
            </div>
        </div>
    );
};
