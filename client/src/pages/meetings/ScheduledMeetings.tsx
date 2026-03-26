import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { ROLES } from '../../utils/roles';
import { Eye, Pencil, Trash2, Calendar, Clock, Users } from 'lucide-react';
import Swal from 'sweetalert2';

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN] as string[];

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
    UPCOMING:   { label: 'UPCOMING',   classes: 'bg-red-600 text-white shadow-[0_4px_0_0_#991b1b] active:shadow-none active:translate-y-[2px] font-black px-4 py-1.5' },
    COMPLETED:  { label: 'COMPLETED',  classes: 'bg-green-600 text-white shadow-[0_4px_0_0_#166534] active:shadow-none active:translate-y-[2px] font-black px-4 py-1.5' },
    CANCELLED:  { label: 'CANCELLED',  classes: 'bg-gray-600 text-white shadow-[0_4px_0_0_#374151] active:shadow-none active:translate-y-[2px] font-black px-4 py-1.5' },
    SCHEDULED:  { label: 'UPCOMING',   classes: 'bg-red-600 text-white shadow-[0_4px_0_0_#991b1b] active:shadow-none active:translate-y-[2px] font-black px-4 py-1.5' },
};


const getMeetingStatus = (meeting: any): string => {
    // If MoM has been submitted/reviewed → COMPLETED
    if (meeting.mom && ['SUBMITTED', 'REVIEWED', 'APPROVED'].includes(meeting.mom.status)) {
        return 'COMPLETED';
    }
    // If the meeting's own status is CANCELLED
    if (meeting.status === 'CANCELLED') return 'CANCELLED';
    // Otherwise UPCOMING
    return 'UPCOMING';
};

// ---- Edit Modal ----
const EditMeetingModal = ({ meeting, onClose, onSaved, users }: { meeting: any; onClose: () => void; onSaved: () => void; users: any[] }) => {
    const [title, setTitle]       = useState(meeting.title);
    const [type, setType]         = useState(meeting.type);
    const [date, setDate]         = useState(meeting.date?.slice(0, 10));
    const [time, setTime]         = useState(meeting.time);
    const [duration, setDuration] = useState(String(meeting.duration));
    const [agenda, setAgenda]     = useState(meeting.agenda || '');
    const [participants, setParticipants] = useState<string[]>(meeting.participants?.map((p: any) => p.user_id) || []);
    const [organizerId, setOrganizerId] = useState(meeting.organizer_id || '');
    const [presentations, setPresentations] = useState<{presenter_id: string, topic: string}[]>(
        meeting.presentations?.map((p: any) => ({ presenter_id: p.presenter_id, topic: p.topic })) || []
    );
    const [saving, setSaving]     = useState(false);

    const addPresentation = () => setPresentations([...presentations, { presenter_id: '', topic: '' }]);
    const removePresentation = (idx: number) => setPresentations(presentations.filter((_, i) => i !== idx));
    const updatePresentation = (idx: number, field: string, value: string) => {
        const up = [...presentations];
        up[idx] = { ...up[idx], [field]: value };
        setPresentations(up);
    };

    const toggleParticipant = (id: string) => {
        setParticipants(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch(`/meetings/${meeting.id}`, {
                title, type, date: new Date(date).toISOString(), time, 
                duration: parseInt(duration), agenda, participants, presentations,
                organizer_id: organizerId || undefined
            });
            Swal.fire('Updated', 'Meeting updated successfully', 'success');
            onSaved();
            onClose();
        } catch (err: any) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to update meeting', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Pencil size={20} className="text-purple-600" /> Edit Meeting
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-light">×</button>
                </div>
                
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Title</label>
                                <input value={title} onChange={e => setTitle(e.target.value)} required 
                                       className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select value={type} onChange={e => setType(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm">
                                        <option value="WEEKLY">Weekly</option>
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="CUSTOM">Custom</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Duration (min)</label>
                                    <input type="number" min="15" step="15" value={duration} onChange={e => setDuration(e.target.value)} required 
                                           className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required 
                                           className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Time</label>
                                    <input type="time" value={time} onChange={e => setTime(e.target.value)} required 
                                           className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Agenda</label>
                                <textarea value={agenda} onChange={e => setAgenda(e.target.value)} rows={4} 
                                          className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" 
                                          placeholder="Meeting agenda..." />
                            </div>
                        </div>

                        {/* Host & Participants side */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Meeting Controlled By (Host)</label>
                                <select value={organizerId} onChange={e => setOrganizerId(e.target.value)} 
                                        className="w-full border p-2.5 rounded-lg text-sm bg-purple-50 focus:ring-2 focus:ring-purple-500 outline-none">
                                    <option value="">-- Myself (Default) --</option>
                                    {users?.map((u: any) => (
                                        <option key={u.id} value={u.id}>{u.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Participants</label>
                                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border p-3 rounded-lg bg-gray-50/50">
                                    {users?.map((u: any) => (
                                        <label key={u.id} className="flex items-center space-x-2 p-1.5 border rounded bg-white hover:bg-gray-100 cursor-pointer">
                                            <input type="checkbox" checked={participants.includes(u.id)} onChange={() => toggleParticipant(u.id)} 
                                                   className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                                            <span className="text-xs truncate">{u.full_name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Presentations Section (Full Width) */}
                    <div className="p-4 border border-dashed border-gray-200 rounded-xl bg-indigo-50/30">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-bold text-indigo-900">Presentations / Topics</label>
                            <button type="button" onClick={addPresentation} 
                                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium">
                                + Add Topic
                            </button>
                        </div>
                        <div className="space-y-3">
                            {presentations.map((p, idx) => (
                                <div key={idx} className="flex gap-3 items-center p-3 border rounded-lg bg-white shadow-sm animate-in fade-in slide-in-from-top-1">
                                    <select 
                                        value={p.presenter_id}
                                        onChange={e => updatePresentation(idx, 'presenter_id', e.target.value)}
                                        className="border p-2 rounded-md text-sm w-1/3 min-w-[150px] outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    >
                                        <option value="">-- Select Presenter --</option>
                                        {users?.map((u: any) => (
                                            <option key={u.id} value={u.id}>{u.full_name}</option>
                                        ))}
                                    </select>
                                    <input 
                                        type="text" 
                                        placeholder="Enter Topic"
                                        value={p.topic}
                                        onChange={e => updatePresentation(idx, 'topic', e.target.value)}
                                        className="border p-2 rounded-md text-sm flex-1 outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                    <button type="button" onClick={() => removePresentation(idx)} 
                                            className="text-gray-400 hover:text-red-600 p-1 transition" title="Remove">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {presentations.length === 0 && (
                                <p className="text-center text-xs text-gray-400 py-4 italic">No presentations added for this meeting.</p>
                            )}
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50 font-medium">Cancel</button>
                    <button type="submit" onClick={handleSave} disabled={saving} 
                            className="px-8 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60 font-bold shadow-lg shadow-purple-200 transition-all">
                        {saving ? 'Updating…' : 'Update Meeting Details'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// ---- View Modal ----
const ViewMeetingModal = ({ meeting, onClose }: { meeting: any; onClose: () => void }) => {
    const status = getMeetingStatus(meeting);
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UPCOMING;
    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-xl font-bold text-gray-800">{meeting.title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-light">×</button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${cfg.classes}`}>{cfg.label}</span>
                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">{meeting.type}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                            <Calendar size={15} />
                            <span>{new Date(meeting.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                            <Clock size={15} />
                            <span>{meeting.time} &nbsp;·&nbsp; {meeting.duration} min</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">Organizer</p>
                        <p className="text-sm text-gray-600">{meeting.organizer?.full_name}</p>
                    </div>
                    {meeting.agenda && (
                        <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Agenda</p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{meeting.agenda}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Users size={14} /> Participants ({meeting.participants?.length || 0})</p>
                        <div className="flex flex-wrap gap-2">
                            {meeting.participants?.map((p: any) => (
                                <span key={p.user_id} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs">{p.user?.full_name}</span>
                            ))}
                        </div>
                    </div>
                    {meeting.presentations?.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">Presentations</p>
                            <div className="space-y-2">
                                {meeting.presentations.map((p: any) => (
                                    <div key={p.id} className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm">
                                        <span className="font-medium text-indigo-800">{p.topic}</span>
                                        <span className="text-gray-500 ml-2">by {p.presenter?.full_name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ---- Main Page ----
const ScheduledMeetings = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const isAdmin = user && ADMIN_ROLES.includes(user.role);

    const [viewMeeting, setViewMeeting] = useState<any>(null);
    const [editMeeting, setEditMeeting] = useState<any>(null);

    const { data: usersData = [] } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users');
            return res.data;
        }
    });

    const { data: meetings = [], isLoading } = useQuery({
        queryKey: ['allMeetings'],
        queryFn: async () => {
            const res = await api.get('/meetings/');
            return res.data;
        }
    });


    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/meetings/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allMeetings'] });
            Swal.fire('Deleted', 'Meeting has been deleted.', 'success');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || 'Failed to delete', 'error');
        }
    });

    const handleDelete = async (id: string, title: string) => {
        const result = await Swal.fire({
            title: 'Delete Meeting?',
            text: `"${title}" and all its data (participants, MoM, presentations) will be permanently deleted.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Yes, delete it',
        });
        if (result.isConfirmed) deleteMutation.mutate(id);
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Scheduled Meetings</h2>
                    <p className="text-sm text-gray-500 mt-0.5">All scheduled meetings across the organisation</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => navigate('/dashboard/meetings/new')}
                        className="bg-purple-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium flex items-center gap-2"
                    >
                        <Calendar size={15} /> New Meeting
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                </div>
            ) : meetings.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No meetings scheduled yet</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                                    <th className="px-5 py-3.5 font-semibold text-gray-600">#</th>
                                    <th className="px-5 py-3.5 font-semibold text-gray-600">Meeting Title</th>
                                    <th className="px-5 py-3.5 font-semibold text-gray-600">Type</th>
                                    <th className="px-5 py-3.5 font-semibold text-gray-600">Date & Time</th>
                                    <th className="px-5 py-3.5 font-semibold text-gray-600">Organizer</th>
                                    <th className="px-5 py-3.5 font-semibold text-gray-600">Participants</th>
                                    <th className="px-5 py-3.5 font-semibold text-gray-600">Status</th>
                                    <th className="px-5 py-3.5 font-semibold text-gray-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {meetings.map((m: any, idx: number) => {
                                    const status = getMeetingStatus(m);
                                    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UPCOMING;
                                    return (
                                        <tr key={m.id} className="hover:bg-gray-50/70 transition-colors">
                                            <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{idx + 1}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="font-semibold text-gray-800">{m.title}</span>
                                                {m.agenda && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{m.agenda}</p>}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full text-xs font-medium">{m.type}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={13} className="text-gray-400" />
                                                    {new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                                                    <Clock size={12} />
                                                    {m.time} · {m.duration} min
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                                                        {m.organizer?.full_name?.charAt(0)}
                                                    </div>
                                                    <span className="text-sm">{m.organizer?.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1 text-gray-500">
                                                    <Users size={13} />
                                                    <span className="text-sm">{m.participants?.length || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cfg.classes}`}>
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setViewMeeting(m)}
                                                        title="View"
                                                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {isAdmin && (
                                                        <>
                                                            <button
                                                                onClick={() => setEditMeeting(m)}
                                                                title="Edit"
                                                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(m.id, m.title)}
                                                                title="Delete"
                                                                disabled={deleteMutation.isPending}
                                                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {viewMeeting  && <ViewMeetingModal meeting={viewMeeting}  onClose={() => setViewMeeting(null)} />}
            {editMeeting  && <EditMeetingModal meeting={editMeeting}  onClose={() => setEditMeeting(null)} users={usersData} onSaved={() => queryClient.invalidateQueries({ queryKey: ['allMeetings'] })} />}
        </div>
    );
};


export default ScheduledMeetings;
