import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card } from '../../components/ui/card';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const ScheduleMeeting = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [type, setType] = useState('WEEKLY');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState('60'); // Minutes
    const [agenda, setAgenda] = useState('');
    const [participants, setParticipants] = useState<string[]>([]);
    const [organizerId, setOrganizerId] = useState('');
    const [presentations, setPresentations] = useState<{presenter_id: string, topic: string}[]>([]);

    const addPresentation = () => setPresentations([...presentations, { presenter_id: '', topic: '' }]);
    const removePresentation = (idx: number) => setPresentations(presentations.filter((_, i) => i !== idx));
    const updatePresentation = (idx: number, field: string, value: string) => {
        const updated = [...presentations];
        updated[idx] = { ...updated[idx], [field]: value };
        setPresentations(updated);
    };
    
    // Fetch users for participants selection
    const { data: usersData } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users');
            return res.data;
        }
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.post('/meetings/schedule', data);
            return res.data;
        },
        onSuccess: () => {
            Swal.fire('Success', 'Meeting scheduled successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['allMeetings'] });
            navigate('/dashboard/meetings/scheduled');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || 'Failed to schedule', 'error');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date || !time) return;

        mutation.mutate({
            title,
            type,
            date,
            time,
            duration: parseInt(duration),
            agenda,
            participants,
            presentations,
            ...(organizerId ? { organizer_id: organizerId } : {})
        });
    };

    const toggleParticipant = (id: string) => {
        setParticipants(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold border-b pb-4">Schedule Meeting</h1>
            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">Title</label>
                            <input 
                                type="text" 
                                required 
                                value={title} 
                                onChange={e => setTitle(e.target.value)}
                                className="w-full border p-2 rounded-md"
                                placeholder="e.g. Weekly Marketing Sync"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Type</label>
                            <select value={type} onChange={e => setType(e.target.value)} className="w-full border p-2 rounded-md">
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="CUSTOM">Custom</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Date</label>
                            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full border p-2 rounded-md" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">Time</label>
                                <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="w-full border p-2 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Duration (Min)</label>
                                <input type="number" min="15" step="15" required value={duration} onChange={e => setDuration(e.target.value)} className="w-full border p-2 rounded-md" />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Agenda</label>
                            <textarea 
                                value={agenda} 
                                onChange={e => setAgenda(e.target.value)}
                                className="w-full border p-2 rounded-md"
                                rows={4}
                                placeholder="Meeting agenda and discussion points..."
                            />
                        </div>

                        <div className="md:col-span-2">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium">Presentations</label>
                                <button type="button" onClick={addPresentation} className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 transition">+ Add Presentation</button>
                            </div>
                            {presentations.map((p, idx) => (
                                <div key={idx} className="flex gap-4 items-center mb-2 p-3 border rounded-md bg-gray-50/50">
                                    <select 
                                        value={p.presenter_id}
                                        onChange={e => updatePresentation(idx, 'presenter_id', e.target.value)}
                                        className="border p-2 rounded-md w-1/3 min-w-[150px]"
                                        required
                                    >
                                        <option value="">-- Select Presenter --</option>
                                        {usersData?.map((u: any) => (
                                            <option key={u.id} value={u.id}>{u.full_name}</option>
                                        ))}
                                    </select>
                                    <input 
                                        type="text" 
                                        placeholder="Enter Presentation Topic"
                                        value={p.topic}
                                        onChange={e => updatePresentation(idx, 'topic', e.target.value)}
                                        className="border p-2 rounded-md flex-1"
                                        required
                                    />
                                    <button type="button" onClick={() => removePresentation(idx)} className="text-red-500 hover:text-red-700 font-bold px-2" title="Remove">X</button>
                                </div>
                            ))}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2">Meeting Controlled By (Host)</label>
                            <select value={organizerId} onChange={e => setOrganizerId(e.target.value)} className="w-full border p-2 rounded-md mb-4 bg-purple-50">
                                <option value="">-- Myself (Default) --</option>
                                {usersData?.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.full_name}</option>
                                ))}
                            </select>

                            <label className="block text-sm font-medium mb-2">Participants</label>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border p-2 rounded-md bg-gray-50">
                                {usersData?.map((u: any) => (
                                    <label key={u.id} className="flex items-center space-x-2 p-1 border rounded bg-white hover:bg-gray-100 cursor-pointer">
                                        <input type="checkbox" checked={participants.includes(u.id)} onChange={() => toggleParticipant(u.id)} />
                                        <span className="text-sm truncate">{u.full_name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={mutation.isPending} className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition shadow-sm">
                            {mutation.isPending ? 'Scheduling...' : 'Schedule & Notify'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default ScheduleMeeting;
