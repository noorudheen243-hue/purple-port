import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Calendar, Clock, User, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const MyMeetings = () => {
    const { data: meetings, isLoading } = useQuery({
        queryKey: ['my-meetings'],
        queryFn: async () => {
            const res = await api.get('/meetings/my-meetings');
            return res.data;
        }
    });

    if (isLoading) return <div className="p-8">Loading your meetings...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold border-b pb-4">My Meetings</h1>
            
            {meetings?.length === 0 ? (
                <div className="text-center p-12 bg-gray-50 rounded-lg text-gray-500">
                    <Calendar className="mx-auto mb-4 opacity-50" size={48} />
                    <p>You have no upcoming or past meetings.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {meetings?.map((meeting: any) => (
                        <Card key={meeting.id} className="p-5 flex flex-col justify-between group hover:shadow-md transition">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-lg line-clamp-1">{meeting.title}</h3>
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{meeting.type}</span>
                                </div>
                                <div className="space-y-2 text-sm text-gray-600 mt-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-gray-400"/>
                                        <span>{new Date(meeting.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} className="text-gray-400"/>
                                        <span>{meeting.time} ({meeting.duration}m)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User size={16} className="text-gray-400"/>
                                        <span>Organizer: {meeting.organizer.full_name}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t flex justify-between items-center mt-auto">
                                <span className={`text-xs font-medium px-2 py-1 rounded-md bg-gray-100 ${meeting.status === 'COMPLETED' ? 'text-green-600' : 'text-blue-600'}`}>
                                    {meeting.status}
                                </span>
                                <Link to={`/dashboard/meetings/mom?meetingId=${meeting.id}`} title="MoM" className="text-gray-400 hover:text-purple-600 transition p-2 bg-gray-50 hover:bg-purple-50 rounded-full">
                                    <FileText size={18} />
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyMeetings;
