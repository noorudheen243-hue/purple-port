import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card } from '../../components/ui/card';
import Swal from 'sweetalert2';

const MinutesOfMeeting = () => {
    const [searchParams] = useSearchParams();
    const meetingId = searchParams.get('meetingId');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [summary, setSummary] = useState('');
    const [keyPoints, setKeyPoints] = useState('');
    const [decisions, setDecisions] = useState('');
    const [actionItems, setActionItems] = useState('');
    const [reviews, setReviews] = useState<{ user_id: string, rating: number, strengths: string, improvements: string, comments: string }[]>([]);
    const [isEditing, setIsEditing] = useState(false);

    const { data: allMeetings } = useQuery({
        queryKey: ['allMeetings'],
        queryFn: async () => {
            const res = await api.get('/meetings/');
            return res.data;
        }
    });

    const [selectedMeetingId, setSelectedMeetingId] = useState<string>(meetingId || '');

    const { data: meeting, isLoading } = useQuery({
        queryKey: ['meeting', selectedMeetingId],
        queryFn: async () => {
            if (!selectedMeetingId) return null;
            const res = await api.get(`/meetings/${selectedMeetingId}`);
            return res.data;
        },
        enabled: !!selectedMeetingId
    });

    const { data: momData } = useQuery({
        queryKey: ['mom', selectedMeetingId],
        queryFn: async () => {
            if (!selectedMeetingId) return null;
            const res = await api.get(`/meetings/${selectedMeetingId}/mom`);
            return res.data;
        },
        enabled: !!selectedMeetingId
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.post(`/meetings/${selectedMeetingId}/mom`, data);
            return res.data;
        },
        onSuccess: () => {
            Swal.fire('Success', 'Saved the Changes', 'success');
            queryClient.invalidateQueries({ queryKey: ['mom', selectedMeetingId] });
            queryClient.invalidateQueries({ queryKey: ['allMeetings'] });
            navigate('/dashboard/meetings/scheduled');
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || 'Failed to submit MoM', 'error');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.patch(`/meetings/${selectedMeetingId}/mom`, data);
            return res.data;
        },
        onSuccess: () => {
            Swal.fire('Success', 'Saved the Changes', 'success');
            queryClient.invalidateQueries({ queryKey: ['mom', selectedMeetingId] });
            setIsEditing(false);
        },
        onError: (err: any) => {
            Swal.fire('Error', err.response?.data?.message || 'Failed to update MoM', 'error');
        }
    });

    const initReviews = () => {
        if (!meeting) return;
        const initial = meeting.participants.map((p: any) => ({
            user_id: p.user_id,
            rating: 3,
            strengths: '',
            improvements: '',
            comments: ''
        }));
        setReviews(initial);
    };

    React.useEffect(() => {
        if (meeting && reviews.length === 0 && !momData) {
            initReviews();
        }
    }, [meeting, momData]);

    const handleReviewChange = (userId: string, field: string, value: any) => {
        setReviews(prev => prev.map(r => r.user_id === userId ? { ...r, [field]: value } : r));
    };

    // State for Presentation specific feedback
    const [presentationFeedbacks, setPresentationFeedbacks] = useState<any[]>([]);

    React.useEffect(() => {
        if (meeting && meeting.presentations && presentationFeedbacks.length === 0 && !momData) {
            setPresentationFeedbacks(meeting.presentations.map((p: any) => ({
                id: p.id,
                presenter_id: p.presenter_id,
                topic: p.topic,
                description: '',
                feedback: ''
            })));
        }
    }, [meeting, momData]);

    const handlePresentationChange = (idx: number, field: string, value: string) => {
        setPresentationFeedbacks(prev => {
            const upd = [...prev];
            upd[idx] = { ...upd[idx], [field]: value };
            return upd;
        });
    };

    const handleEditClick = () => {
        if (!momData) return;
        setSummary(momData.summary || '');
        setKeyPoints(momData.key_points || '');
        setDecisions(momData.decisions || '');
        setActionItems(momData.action_items || '');
        
        // Map reviews
        if (momData.performance_reviews) {
            setReviews(momData.performance_reviews.map((r: any) => ({
                user_id: r.user_id,
                rating: r.rating,
                strengths: r.strengths,
                improvements: r.improvements,
                comments: r.comments
            })));
        }

        // Map presentations from meeting (since momData doesn't directly store them, they are in the meeting)
        if (meeting && meeting.presentations) {
            setPresentationFeedbacks(meeting.presentations.map((p: any) => ({
                id: p.id,
                presenter_id: p.presenter_id,
                topic: p.topic,
                description: p.description || '',
                feedback: p.feedback || ''
            })));
        }

        setIsEditing(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            summary,
            key_points: keyPoints,
            decisions,
            action_items: actionItems,
            performance_reviews: reviews,
            presentations: presentationFeedbacks
        };

        if (isEditing) {
            updateMutation.mutate(payload);
        } else {
            mutation.mutate(payload);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-indigo-600">
                    Minutes of Meeting (MoM) Center
                </h1>
                <div className="flex gap-3">
                    {!momData ? (
                        <button 
                            onClick={handleSubmit}
                            disabled={mutation.isPending}
                            className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-purple-700 transition-all flex items-center gap-2"
                        >
                            {mutation.isPending ? 'Submitting...' : 'Submit MoM'}
                        </button>
                    ) : (
                        !isEditing ? (
                            <button 
                                onClick={handleEditClick}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Edit MoM
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={updateMutation.isPending}
                                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-green-700 transition-all flex items-center gap-2"
                                >
                                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>

            <Card className="p-6 border-blue-200 bg-blue-50/30">
                <label className="block text-sm font-semibold mb-2 text-blue-900">Select Scheduled Meeting</label>
                <select 
                    value={selectedMeetingId} 
                    onChange={e => {
                        setSelectedMeetingId(e.target.value);
                        setIsEditing(false);
                    }}
                    className="w-full border-blue-200 border p-3 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 font-medium"
                >
                    <option value="">-- Choose a meeting to write or view MoM --</option>
                    {allMeetings?.filter((m: any) => m).map((m: any) => (
                        <option key={m.id} value={m.id}>
                            {new Date(m.date).toLocaleDateString()} - {m.title} [{m.type}]
                        </option>
                    ))}
                </select>
            </Card>

            {isLoading && selectedMeetingId && <div className="p-8 text-center">Loading meeting specifics...</div>}

            {meeting && (
                <div className="space-y-6">
                    <Card className="p-6 bg-purple-50 border-none shadow-sm">
                        <h2 className="text-xl font-bold text-purple-900">{meeting.title}</h2>
                        <div className="text-sm text-purple-700 mt-2 flex gap-4">
                            <span>{new Date(meeting.date).toLocaleDateString()}</span>
                            <span>{meeting.time}</span>
                            <span>{meeting.type}</span>
                        </div>
                    </Card>

                    {(momData && !isEditing) ? (
                        <Card className="p-6 border-l-4 border-l-blue-500 shadow-sm space-y-6">
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                                <h2 className="text-lg font-bold">MoM Status: <span className="text-blue-600 uppercase">{momData.status}</span></h2>
                                <span className="text-sm text-gray-500">Submitted by {momData.creator?.full_name}</span>
                            </div>

                            {momData.remarks && (
                                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md">
                                    <strong>Admin Remarks:</strong> {momData.remarks}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-semibold mb-2">Summary</h3>
                                    <p className="p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{momData.summary || 'N/A'}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Key Points</h3>
                                    <p className="p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{momData.key_points || 'N/A'}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Decisions</h3>
                                    <p className="p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{momData.decisions || 'N/A'}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Action Items</h3>
                                    <p className="p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{momData.action_items || 'N/A'}</p>
                                </div>
                            </div>

                            {meeting.presentations?.some((p: any) => p.description || p.feedback) && (
                                <div className="mt-6">
                                    <h3 className="font-semibold mb-4 text-xl border-b pb-2">Presentations Feedback</h3>
                                    <div className="space-y-4">
                                        {meeting.presentations.map((p: any) => (
                                            <div key={p.id} className="p-4 border rounded-md bg-white shadow-sm">
                                                <h4 className="font-bold text-indigo-900 mb-2">Topic: {p.topic} (by {p.presenter?.full_name})</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="font-semibold text-gray-700">Notes:</span>
                                                        <p className="mt-1 p-2 bg-gray-50 rounded">{p.description || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-green-700">Official Feedback:</span>
                                                        <p className="mt-1 p-2 bg-green-50/50 rounded">{p.feedback || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {momData.performance_reviews?.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-semibold mb-4 text-xl border-b pb-2">Performance Reviews</h3>
                                    <div className="grid gap-4">
                                        {momData.performance_reviews.map((r: any) => (
                                            <div key={r.id} className="p-4 border rounded-md bg-white shadow-sm flex items-start gap-4">
                                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold shrink-0">
                                                    {r.rating}/5
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-gray-800">{r.user?.full_name}</h4>
                                                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                                        <p><span className="text-green-600 font-semibold">Strengths:</span> {r.strengths}</p>
                                                        <p><span className="text-red-600 font-semibold">Improvements:</span> {r.improvements}</p>
                                                    </div>
                                                    <p className="text-sm mt-2"><span className="text-gray-600 font-semibold">Comments:</span> {r.comments}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            <Card className="p-6 bg-white shadow-sm border border-gray-200">
                                <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-primary">Meeting Overview & Outcomes</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold mb-1 text-gray-700">Executive Summary</label>
                                        <p className="text-xs text-gray-500 mb-2">A high level overview of what was discussed.</p>
                                        <textarea value={summary} onChange={e => setSummary(e.target.value)} required rows={3} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-purple-500 bg-gray-50 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1 text-gray-700">Key Discussion Points</label>
                                        <textarea value={keyPoints} onChange={e => setKeyPoints(e.target.value)} required rows={4} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-purple-500 bg-gray-50 outline-none" placeholder="- Focus on marketing strategy&#10;- Client retention plans" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1 text-gray-700">Decisions Made</label>
                                        <textarea value={decisions} onChange={e => setDecisions(e.target.value)} rows={4} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-purple-500 bg-gray-50 outline-none" placeholder="- Approve new budgets&#10;- Shift focus to SEO" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold mb-1 text-gray-700">Action Items (Tasks)</label>
                                        <textarea value={actionItems} onChange={e => setActionItems(e.target.value)} rows={3} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-purple-500 bg-gray-50 outline-none" placeholder="Adam -> Finish the SEO report by Tuesday" />
                                    </div>
                                </div>
                            </Card>

                            {meeting.presentations && meeting.presentations.length > 0 && (
                                <Card className="p-6 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
                                    <h3 className="text-xl font-semibold mb-4 border-b border-indigo-200 pb-2 text-indigo-800">Presentations Feedback</h3>
                                    <div className="space-y-4">
                                        {meeting.presentations.map((p: any, idx: number) => {
                                            const fb = presentationFeedbacks[idx];
                                            if (!fb) return null;
                                            return (
                                                <div key={p.id} className="p-4 bg-white border border-indigo-100 rounded-lg shadow-sm">
                                                    <h4 className="font-bold text-indigo-900 border-b pb-2 mb-3">Topic: {p.topic} (by {p.presenter?.full_name})</h4>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-sm font-semibold mb-1 text-gray-700">Presentation Description / Notes</label>
                                                            <textarea 
                                                                value={fb.description} 
                                                                onChange={e => handlePresentationChange(idx, 'description', e.target.value)}
                                                                className="w-full border border-gray-200 p-2 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none" 
                                                                rows={2} 
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-semibold mb-1 text-green-700">Official Feedback</label>
                                                            <textarea 
                                                                value={fb.feedback} 
                                                                onChange={e => handlePresentationChange(idx, 'feedback', e.target.value)}
                                                                className="w-full border border-green-200 p-2 rounded-md focus:ring-1 focus:ring-green-500 outline-none bg-green-50/30" 
                                                                rows={2} 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </Card>
                            )}

                            <Card className="p-6 bg-gradient-to-br from-white to-gray-50 border border-gray-100">
                                <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-primary">Team Performance Review</h3>
                                <p className="text-sm text-gray-500 mb-6">Evaluate the performance of the participating team members based on their inputs and delivery.</p>
                                
                                <div className="space-y-6">
                                    {meeting.participants.map((p: any) => {
                                        const reviewState = reviews.find(r => r.user_id === p.user_id);
                                        if (!reviewState) return null;
                                        return (
                                            <div key={p.user_id} className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm hover:border-purple-200 transition-colors">
                                                <div className="flex items-center justify-between mb-4 border-b pb-2">
                                                    <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-sm">
                                                            {p.user.full_name?.charAt(0)}
                                                        </div>
                                                        {p.user.full_name}
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-sm font-medium text-gray-600">Rating (1-5)</label>
                                                        <select
                                                            value={reviewState.rating}
                                                            onChange={e => handleReviewChange(p.user_id, 'rating', parseInt(e.target.value))}
                                                            className="border p-2 rounded-lg bg-gray-50 focus:ring-2 focus:ring-purple-500 font-bold"
                                                        >
                                                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ⭐</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium mb-1 text-green-700">Strengths & Achievements</label>
                                                        <textarea 
                                                            value={reviewState.strengths} 
                                                            onChange={e => handleReviewChange(p.user_id, 'strengths', e.target.value)}
                                                            className="w-full border border-green-200 p-2 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-green-50/30" 
                                                            rows={2} 
                                                            placeholder="What went well..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium mb-1 text-red-700">Areas for Improvement</label>
                                                        <textarea 
                                                            value={reviewState.improvements} 
                                                            onChange={e => handleReviewChange(p.user_id, 'improvements', e.target.value)}
                                                            className="w-full border border-red-200 p-2 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-red-50/30" 
                                                            rows={2} 
                                                            placeholder="Needs work on..."
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm font-medium mb-1 text-gray-700">Overall Comments</label>
                                                        <input 
                                                            type="text" 
                                                            value={reviewState.comments} 
                                                            onChange={e => handleReviewChange(p.user_id, 'comments', e.target.value)}
                                                            className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>

                            <div className="flex justify-end pt-6">
                                <button type="submit" disabled={mutation.isPending || updateMutation.isPending} className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md text-white font-bold px-8 py-3 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all w-full md:w-auto">
                                    {isEditing ? (updateMutation.isPending ? 'Saving Changes...' : 'Save Changes') : (mutation.isPending ? 'Submitting MoM...' : 'Submit MoM for Review')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default MinutesOfMeeting;
