import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Calendar, Users, FileText, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const MeetingDashboard = () => {
    const { data: reports, isLoading } = useQuery({
        queryKey: ['meetingReports'],
        queryFn: async () => {
            const res = await api.get('/meetings/reports');
            return res.data;
        }
    });

    if (isLoading) return <div className="p-8">Loading meetings dashboard...</div>;

    const total = reports?.totalMeetings || 0;
    const completed = reports?.completedMeetings || 0;

    return (
        <div className="p-4 md:p-6 w-full space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-indigo-600">
                        Meeting Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1">Manage and track all company meetings</p>
                </div>
                <Link to="/dashboard/meetings/new" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl hover:shadow-lg hover:shadow-purple-200 transition-all font-bold flex items-center gap-2">
                    <span className="text-lg">+</span> Schedule Meeting
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="p-6 bg-white shadow-sm border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Meetings</p>
                            <h3 className="text-3xl font-black text-gray-900 mt-1">{total}</h3>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                            <Calendar size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-white shadow-sm border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed</p>
                            <h3 className="text-3xl font-black text-gray-900 mt-1">{completed}</h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl text-green-600">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                    <div className="w-2 h-8 bg-purple-600 rounded-full"></div>
                    <h2 className="text-xl font-bold text-gray-800">Quick Actions</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-t border-gray-50">
                    <Link to="/dashboard/meetings/scheduled" className="p-8 hover:bg-gray-50 transition-all group flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mb-4 text-purple-600 group-hover:scale-110 group-hover:rotate-3 transition shadow-sm">
                            <Users size={28} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">My Meetings</h3>
                        <p className="text-sm text-gray-500 mt-2 max-w-[200px]">View your assigned and upcoming meetings</p>
                    </Link>
                    <Link to="/dashboard/meetings/mom" className="p-8 hover:bg-gray-50 transition-all group flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4 text-indigo-600 group-hover:scale-110 group-hover:-rotate-3 transition shadow-sm">
                            <FileText size={28} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Minutes of Meeting</h3>
                        <p className="text-sm text-gray-500 mt-2 max-w-[200px]">Create or review MoM for your meetings</p>
                    </Link>
                    <Link to="/dashboard/meetings/new" className="p-8 hover:bg-gray-50 transition-all group flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4 text-emerald-600 group-hover:scale-110 group-hover:rotate-3 transition shadow-sm">
                            <Calendar size={28} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Schedule Now</h3>
                        <p className="text-sm text-gray-500 mt-2 max-w-[200px]">Setup a new weekly or monthly sync</p>
                    </Link>
                </div>
            </div>

        </div>
    );
};

export default MeetingDashboard;
