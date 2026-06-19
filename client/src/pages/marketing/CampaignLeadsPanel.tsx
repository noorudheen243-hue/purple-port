import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import {
    X, Loader2, Users, Phone, Mail, MapPin, MessageCircle,
    Calendar, Tag, ChevronRight, Search, ArrowUpRight,
    Facebook, Globe, User, Clock, Star, TrendingUp,
    CheckCircle2, Zap, Hash, Plus, Trash2, Pencil,
    Save, ChevronDown, AlertCircle, RefreshCw, Flame
} from 'lucide-react';
import { format } from 'date-fns';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
});

const showToast = (icon: 'success' | 'error', title: string) =>
    Toast.fire({ icon, title });

interface CampaignLeadsPanelProps {
    campaign: {
        id: string;
        name: string;
        platform: string;
        status: string;
        metrics?: { leads?: number; results?: number; spend?: number };
    };
    clientId: string;
    onClose: () => void;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const QUALITY_OPTIONS = [
    { value: 'HIGH',   label: '🔥 Hot',  bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',     dot: 'bg-red-500'     },
    { value: 'MEDIUM', label: '⚡ Warm', bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   dot: 'bg-amber-400'   },
    { value: 'LOW',    label: '❄️ Cold', bg: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-200',     dot: 'bg-sky-400'     },
];

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    NEW:       { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
    CONTACTED: { bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500'  },
    QUALIFIED: { bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500'   },
    CONVERTED: { bg: 'bg-teal-100',    text: 'text-teal-700',    dot: 'bg-teal-500'    },
    LOST:      { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-400'     },
};

const CHANNELS = ['Phone Call', 'WhatsApp', 'Email', 'Video Call', 'In Person', 'SMS', 'Other'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getQualityConfig(q: string) {
    return QUALITY_OPTIONS.find(o => o.value === q) || QUALITY_OPTIONS[1];
}

function extractAllFields(lead: any): Array<{ label: string; value: string; key: string }> {
    if (!lead.fieldData) return [];
    try {
        const fields = typeof lead.fieldData === 'string' ? JSON.parse(lead.fieldData) : lead.fieldData;
        if (Array.isArray(fields)) {
            return fields
                .filter((f: any) => f.values?.[0])
                .map((f: any) => ({
                    key: f.name,
                    label: f.name?.replace(/_/g, ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase()),
                    value: Array.isArray(f.values) ? f.values.join(', ') : String(f.values)
                }));
        }
        return Object.entries(fields)
            .filter(([, v]) => v)
            .map(([k, v]) => ({
                key: k,
                label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                value: String(v)
            }));
    } catch {
        return [];
    }
}

function getWhatsApp(lead: any): string | null {
    const fields = extractAllFields(lead);
    const wa = fields.find(f =>
        f.key?.toLowerCase().includes('whatsapp') ||
        f.key?.toLowerCase().includes('phone_number')
    );
    return wa?.value || lead.phone || null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({ icon, label, value, href }: {
    icon: React.ReactNode; label: string; value?: string | null; href?: string;
}) {
    return (
        <div className="bg-white rounded-xl p-3 border border-gray-100 hover:border-purple-200 transition-colors">
            <div className="flex items-center gap-1.5 mb-1.5">
                {icon}
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{label}</span>
            </div>
            {value ? (
                href ? (
                    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                       className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 group">
                        <span className="truncate">{value}</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                    </a>
                ) : (
                    <span className="text-xs font-bold text-gray-800 block truncate">{value}</span>
                )
            ) : (
                <span className="text-xs text-gray-300 italic">Not provided</span>
            )}
        </div>
    );
}

function QualityPicker({ leadId, current, onUpdated }: { leadId: string; current: string; onUpdated: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const cfg = getQualityConfig(current);
    const qc = useQueryClient();

    useEffect(() => {
        const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const mut = useMutation({
        mutationFn: (quality: string) => api.patch(`/marketing/leads/${leadId}`, { quality }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-leads'] }); onUpdated(); setOpen(false); showToast('success', 'Lead quality updated'); },
        onError: () => showToast('error', 'Failed to update quality')
    });

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity ${cfg.bg} ${cfg.text} ${cfg.border}`}
            >
                {cfg.label}
                <ChevronDown className="w-2.5 h-2.5" />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-32">
                    {QUALITY_OPTIONS.map(o => (
                        <button
                            key={o.value}
                            onClick={e => { e.stopPropagation(); mut.mutate(o.value); }}
                            className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors ${o.value === current ? 'bg-purple-50' : ''}`}
                        >
                            <span className={`w-2 h-2 rounded-full ${o.dot}`} />
                            {o.label}
                            {o.value === current && <CheckCircle2 className="w-3 h-3 text-purple-500 ml-auto" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusPicker({ leadId, current, onUpdated }: { leadId: string; current: string; onUpdated: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const cfg = STATUS_COLORS[current] || STATUS_COLORS.NEW;
    const qc = useQueryClient();

    useEffect(() => {
        const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const mut = useMutation({
        mutationFn: (status: string) => api.patch(`/marketing/leads/${leadId}`, { status }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-leads'] }); onUpdated(); setOpen(false); showToast('success', 'Lead status updated'); },
        onError: () => showToast('error', 'Failed to update status')
    });

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity ${cfg.bg} ${cfg.text}`}
            >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {current}
                <ChevronDown className="w-2.5 h-2.5" />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-36">
                    {LEAD_STATUSES.map(s => {
                        const sc = STATUS_COLORS[s] || STATUS_COLORS.NEW;
                        return (
                            <button
                                key={s}
                                onClick={e => { e.stopPropagation(); mut.mutate(s); }}
                                className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors ${s === current ? 'bg-purple-50' : ''}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                                {s}
                                {s === current && <CheckCircle2 className="w-3 h-3 text-purple-500 ml-auto" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Follow-up Form ───────────────────────────────────────────────────────────

interface FollowUpFormState {
    channel: string;
    status: string;
    notes: string;
    date: string;
}

function FollowUpForm({ leadId, existing, onDone, onCancel }: {
    leadId: string;
    existing?: any;
    onDone: () => void;
    onCancel: () => void;
}) {
    const qc = useQueryClient();
    const [form, setForm] = useState<FollowUpFormState>({
        channel: existing?.channel || 'Phone Call',
        status: existing?.status || 'CONTACTED',
        notes: existing?.notes || '',
        date: existing?.date ? format(new Date(existing.date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    });

    const addMut = useMutation({
        mutationFn: () => api.post('/marketing/leads/follow-up', { leadId, ...form }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-leads'] }); onDone(); showToast('success', 'Follow-up added'); },
        onError: () => showToast('error', 'Failed to add follow-up')
    });

    const updateMut = useMutation({
        mutationFn: () => api.patch(`/marketing/leads/follow-up/${existing.id}`, form),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-leads'] }); onDone(); showToast('success', 'Follow-up updated'); },
        onError: () => showToast('error', 'Failed to update follow-up')
    });

    const isLoading = addMut.isPending || updateMut.isPending;

    return (
        <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-lg space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {existing ? 'Edit Follow-up' : 'Add Follow-up'}
                </span>
                <button onClick={onCancel} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                    <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
            </div>

            {/* Row 1: Channel + Status */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Channel</label>
                    <select
                        value={form.channel}
                        onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 bg-white"
                    >
                        {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Outcome</label>
                    <select
                        value={form.status}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 bg-white"
                    >
                        {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Date */}
            <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Date & Time</label>
                <input
                    type="datetime-local"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400"
                />
            </div>

            {/* Notes */}
            <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Notes</label>
                <textarea
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="What happened during this follow-up..."
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 resize-none"
                />
            </div>

            <div className="flex gap-2 pt-1">
                <button
                    onClick={() => existing ? updateMut.mutate() : addMut.mutate()}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {existing ? 'Save Changes' : 'Add Follow-up'}
                </button>
                <button onClick={onCancel} className="px-3 py-2 border border-gray-200 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-gray-50 transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
}

// ─── Follow-up Entry ──────────────────────────────────────────────────────────

function FollowUpEntry({ fu, leadId, onRefresh }: { fu: any; leadId: string; onRefresh: () => void }) {
    const [editing, setEditing] = useState(false);
    const qc = useQueryClient();
    const sc = STATUS_COLORS[fu.status] || STATUS_COLORS.NEW;

    const deleteMut = useMutation({
        mutationFn: () => api.delete(`/marketing/leads/follow-up/${fu.id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-leads'] }); onRefresh(); showToast('success', 'Follow-up removed'); },
        onError: () => showToast('error', 'Failed to delete follow-up')
    });

    if (editing) {
        return (
            <FollowUpForm
                leadId={leadId}
                existing={fu}
                onDone={() => setEditing(false)}
                onCancel={() => setEditing(false)}
            />
        );
    }

    return (
        <div className="flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-100 group/fu hover:border-purple-200 transition-colors">
            {/* Timeline dot */}
            <div className="flex flex-col items-center gap-1 pt-0.5">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.dot}`} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black text-gray-800">{fu.channel || 'Call'}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${sc.bg} ${sc.text}`}>{fu.status}</span>
                    <span className="text-[9px] text-gray-400 ml-auto">
                        {format(new Date(fu.date || fu.createdAt), 'dd MMM yyyy, hh:mm a')}
                    </span>
                </div>
                {fu.notes && (
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{fu.notes}</p>
                )}
                <span className="text-[9px] text-gray-300 mt-0.5 block">Follow-up #{fu.follow_up_number}</span>
            </div>

            {/* Actions (shown on hover) */}
            <div className="flex items-center gap-1 opacity-0 group-hover/fu:opacity-100 transition-opacity shrink-0">
                <button
                    onClick={e => { e.stopPropagation(); setEditing(true); }}
                    className="w-6 h-6 rounded-lg bg-purple-50 hover:bg-purple-100 flex items-center justify-center transition-colors"
                    title="Edit"
                >
                    <Pencil className="w-3 h-3 text-purple-500" />
                </button>
                <button
                    onClick={e => { e.stopPropagation(); deleteMut.mutate(); }}
                    disabled={deleteMut.isPending}
                    className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                    title="Delete"
                >
                    {deleteMut.isPending ? <Loader2 className="w-3 h-3 animate-spin text-red-400" /> : <Trash2 className="w-3 h-3 text-red-400" />}
                </button>
            </div>
        </div>
    );
}

// ─── Lead Detail Panel ────────────────────────────────────────────────────────

function LeadDetail({ lead, campaign }: { lead: any; campaign: any }) {
    const [addingFollowUp, setAddingFollowUp] = useState(false);
    const qc = useQueryClient();
    const refresh = () => qc.invalidateQueries({ queryKey: ['campaign-leads'] });

    const allFields = extractAllFields(lead);
    const whatsapp = getWhatsApp(lead);

    // Deduplicate: remove fields already shown as top-level (name, phone, email, location)
    const topKeys = new Set(['full_name', 'name', 'email', 'phone_number', 'whatsapp_number', 'location', 'city', 'state']);
    const extraFields = allFields.filter(f => !topKeys.has(f.key?.toLowerCase()));

    const followUps = [...(lead.follow_ups || [])].sort(
        (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
    );

    return (
        <div className="mx-4 mb-4 rounded-2xl border border-gray-100 overflow-hidden bg-gray-50/60 animate-in slide-in-from-top-2 duration-200">

            {/* ── Quality & Status Controls ── */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Quality</span>
                    <QualityPicker leadId={lead.id} current={lead.quality || 'MEDIUM'} onUpdated={refresh} />
                </div>
                <div className="w-px h-4 bg-gray-200" />
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</span>
                    <StatusPicker leadId={lead.id} current={lead.status || 'NEW'} onUpdated={refresh} />
                </div>
                <div className="ml-auto flex gap-2">
                    {lead.phone && (
                        <a href={`tel:${lead.phone}`}
                           className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500 text-white rounded-lg text-[10px] font-black hover:bg-green-600 transition-colors">
                            <Phone className="w-3 h-3" /> Call
                        </a>
                    )}
                    {whatsapp && (
                        <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-black hover:bg-emerald-600 transition-colors">
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                    )}
                    {lead.email && (
                        <a href={`mailto:${lead.email}`}
                           className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white rounded-lg text-[10px] font-black hover:bg-blue-600 transition-colors">
                            <Mail className="w-3 h-3" /> Email
                        </a>
                    )}
                </div>
            </div>

            {/* ── Contact Details ── */}
            <div className="p-4">
                <div className="flex items-center gap-1.5 mb-3">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact Information</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <InfoCard icon={<User className="w-3 h-3 text-purple-500" />} label="Full Name" value={lead.name} />
                    <InfoCard icon={<Phone className="w-3 h-3 text-green-500" />} label="Phone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
                    <InfoCard icon={<MessageCircle className="w-3 h-3 text-emerald-500" />} label="WhatsApp" value={whatsapp} href={whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : undefined} />
                    <InfoCard icon={<Mail className="w-3 h-3 text-blue-500" />} label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
                    <InfoCard icon={<MapPin className="w-3 h-3 text-orange-500" />} label="Location" value={lead.location} />
                    <InfoCard icon={<Calendar className="w-3 h-3 text-indigo-500" />} label="Captured On"
                        value={format(new Date(lead.metaCreatedAt || lead.date || lead.createdAt), 'dd MMM yyyy, hh:mm a')} />
                    <InfoCard icon={<Zap className="w-3 h-3 text-amber-500" />} label="Source" value={lead.source} />
                    <InfoCard icon={<TrendingUp className="w-3 h-3 text-purple-500" />} label="Campaign" value={lead.campaign_name || campaign.name} />
                    {lead.externalLeadId && (
                        <InfoCard icon={<Hash className="w-3 h-3 text-gray-400" />} label="Meta Lead ID" value={lead.externalLeadId} />
                    )}
                </div>

                {/* Extra Meta Form Fields */}
                {extraFields.length > 0 && (
                    <div className="mt-4">
                        <div className="flex items-center gap-1.5 mb-3">
                            <Facebook className="w-3 h-3 text-blue-500" />
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Additional Form Fields</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {extraFields.map((f, i) => (
                                <InfoCard key={i} icon={<Tag className="w-3 h-3 text-blue-400" />} label={f.label} value={f.value} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Follow-up Timeline ── */}
            <div className="border-t border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Follow-up History {followUps.length > 0 && `(${followUps.length})`}
                        </span>
                    </div>
                    {!addingFollowUp && (
                        <button
                            onClick={e => { e.stopPropagation(); setAddingFollowUp(true); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Add Follow-up
                        </button>
                    )}
                </div>

                {/* Add form */}
                {addingFollowUp && (
                    <div className="mb-3">
                        <FollowUpForm leadId={lead.id} onDone={() => setAddingFollowUp(false)} onCancel={() => setAddingFollowUp(false)} />
                    </div>
                )}

                {/* Timeline */}
                {followUps.length === 0 && !addingFollowUp ? (
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-purple-300" />
                        </div>
                        <p className="text-xs font-bold text-gray-400">No follow-ups yet</p>
                        <p className="text-[10px] text-gray-300">Click "Add Follow-up" to log your first interaction</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {followUps.map((fu: any) => (
                            <FollowUpEntry key={fu.id} fu={fu} leadId={lead.id} onRefresh={refresh} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export const CampaignLeadsPanel: React.FC<CampaignLeadsPanelProps> = ({ campaign, clientId, onClose }) => {
    const [search, setSearch] = useState('');
    const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
    const [qualityFilter, setQualityFilter] = useState<string>('ALL');
    const qc = useQueryClient();

    const { data: leads = [], isLoading, refetch } = useQuery({
        queryKey: ['campaign-leads', campaign.id, clientId],
        queryFn: async () => {
            const res = await api.get(`/marketing/leads?clientId=${clientId}&campaignId=${campaign.id}`);
            return res.data || [];
        },
        enabled: !!campaign.id && !!clientId,
        refetchInterval: false,
    });

    const filtered = (leads as any[]).filter((lead: any) => {
        const matchesSearch = !search || [lead.name, lead.phone, lead.email, lead.location]
            .some(v => v?.toLowerCase().includes(search.toLowerCase()));
        const matchesQuality = qualityFilter === 'ALL' || lead.quality === qualityFilter;
        return matchesSearch && matchesQuality;
    });

    const totalLeads  = leads.length;
    const hotLeads    = (leads as any[]).filter((l: any) => l.quality === 'HIGH').length;
    const contacted   = (leads as any[]).filter((l: any) => l.status !== 'NEW').length;
    const converted   = (leads as any[]).filter((l: any) => l.status === 'CONVERTED').length;
    const isActive    = ['ACTIVE', 'Active', 'ENABLED'].includes(campaign.status);

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

            {/* Panel */}
            <div className="fixed right-0 top-0 bottom-0 z-[201] w-[760px] max-w-[96vw] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                {/* ── Header ── */}
                <div className="shrink-0 bg-gradient-to-r from-purple-700 to-indigo-600 px-6 py-5 text-white">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                                {campaign.platform === 'meta' ? <Facebook className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${isActive ? 'bg-green-400/30 text-green-100' : 'bg-white/20 text-white/70'}`}>
                                        {isActive ? '● ACTIVE' : campaign.status}
                                    </span>
                                    <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{campaign.platform}</span>
                                </div>
                                <h2 className="text-sm font-black text-white mt-1 leading-tight line-clamp-2 uppercase">{campaign.name}</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => refetch()}
                                className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                                title="Refresh leads"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-4 gap-2 mt-4">
                        {[
                            { label: 'Total',     value: totalLeads, icon: Users,       color: 'bg-white/15' },
                            { label: 'Hot Leads', value: hotLeads,   icon: Flame,       color: 'bg-red-400/20' },
                            { label: 'Contacted', value: contacted,  icon: CheckCircle2,color: 'bg-blue-400/20' },
                            { label: 'Converted', value: converted,  icon: Star,        color: 'bg-amber-400/20' },
                        ].map(stat => (
                            <div key={stat.label} className={`${stat.color} rounded-2xl p-3 flex items-center gap-2`}>
                                <stat.icon className="w-4 h-4 text-white/80 shrink-0" />
                                <div>
                                    <div className="text-lg font-black text-white leading-none">{stat.value}</div>
                                    <div className="text-[9px] font-bold text-white/60 uppercase tracking-wider mt-0.5">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Filter Bar ── */}
                <div className="shrink-0 px-5 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name, phone, email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                        />
                    </div>
                    <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-xl">
                        {[
                            { v: 'ALL',    label: 'All'      },
                            { v: 'HIGH',   label: '🔥 Hot'  },
                            { v: 'MEDIUM', label: '⚡ Warm' },
                            { v: 'LOW',    label: '❄️ Cold' },
                        ].map(({ v, label }) => (
                            <button
                                key={v}
                                onClick={() => setQualityFilter(v)}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                    qualityFilter === v ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-700'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <span className="text-[10px] font-black text-gray-400 whitespace-nowrap">
                        {filtered.length}/{totalLeads}
                    </span>
                </div>

                {/* ── Lead List ── */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                            <span className="text-xs text-gray-400 font-semibold">Loading leads...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 p-6 text-center">
                            <AlertCircle className="w-12 h-12 text-gray-200" />
                            <p className="text-sm font-bold text-gray-400">
                                {leads.length === 0 ? 'No leads captured yet' : 'No leads match your filter'}
                            </p>
                            <p className="text-xs text-gray-300 max-w-[260px]">
                                {leads.length === 0
                                    ? 'Leads synced from Meta Lead Forms will appear here.'
                                    : 'Try adjusting your search or quality filter.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 pb-4">
                            {filtered.map((lead: any, idx: number) => {
                                const isExpanded = expandedLeadId === lead.id;
                                const qCfg = getQualityConfig(lead.quality || 'MEDIUM');
                                const sCfg = STATUS_COLORS[lead.status] || STATUS_COLORS.NEW;
                                const followUpCount = lead.follow_ups?.length || 0;

                                return (
                                    <div key={lead.id} className="group">
                                        {/* Lead Row */}
                                        <div
                                            className={`flex items-center gap-3 px-5 py-4 transition-colors cursor-pointer ${isExpanded ? 'bg-purple-50/60' : 'hover:bg-gray-50/80'}`}
                                            onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                                        >
                                            {/* Index */}
                                            <div className="w-7 h-7 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                                <span className="text-[10px] font-black text-gray-500">{String(idx + 1).padStart(2, '0')}</span>
                                            </div>

                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                                                <span className="text-sm font-black text-white">{(lead.name || '?')[0].toUpperCase()}</span>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-black text-sm text-gray-900 truncate">{lead.name || 'Unknown'}</span>

                                                    {/* Quality badge */}
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${qCfg.bg} ${qCfg.text} ${qCfg.border}`}>
                                                        {qCfg.label}
                                                    </span>

                                                    {/* Status badge */}
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 ${sCfg.bg} ${sCfg.text}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot}`} />
                                                        {lead.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                    {lead.phone && (
                                                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                                            <Phone className="w-3 h-3 text-green-500" /> {lead.phone}
                                                        </span>
                                                    )}
                                                    {lead.email && (
                                                        <span className="flex items-center gap-1 text-[11px] text-gray-500 max-w-[180px] truncate">
                                                            <Mail className="w-3 h-3 text-blue-500" /> {lead.email}
                                                        </span>
                                                    )}
                                                    {lead.location && (
                                                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                            <MapPin className="w-3 h-3 text-orange-400" /> {lead.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right side */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="text-right hidden sm:block">
                                                    <div className="text-[10px] font-black text-gray-400">
                                                        {format(new Date(lead.metaCreatedAt || lead.date || lead.createdAt), 'dd MMM')}
                                                    </div>
                                                    <div className="text-[9px] text-gray-300">
                                                        {format(new Date(lead.metaCreatedAt || lead.date || lead.createdAt), 'yyyy')}
                                                    </div>
                                                </div>
                                                {followUpCount > 0 && (
                                                    <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                                                        <span className="text-[8px] font-black text-white">{followUpCount}</span>
                                                    </div>
                                                )}
                                                <ChevronRight className={`w-4 h-4 text-gray-300 transition-all ${isExpanded ? 'rotate-90 text-purple-500' : 'group-hover:text-purple-400'}`} />
                                            </div>
                                        </div>

                                        {/* Expanded Detail */}
                                        {isExpanded && <LeadDetail lead={lead} campaign={campaign} />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {totalLeads} Total · {campaign.platform === 'meta' ? 'Meta Ads' : 'Google Ads'}
                    </span>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all"
                    >
                        Close <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </>
    );
};
