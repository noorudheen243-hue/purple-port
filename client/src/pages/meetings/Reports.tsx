import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card } from '../../components/ui/card';
import { BarChart, PieChart, TrendingUp } from 'lucide-react';

const Reports = () => {
    const { data: reports, isLoading } = useQuery({
        queryKey: ['meeting-reports'],
        queryFn: async () => {
            const res = await api.get('/meetings/reports');
            return res.data;
        }
    });

    if (isLoading) return <div className="p-8">Loading reports...</div>;

    const total = reports?.totalMeetings || 0;
    const completed = reports?.completedMeetings || 0;
    const pending = total - completed;
    
    // Safety check for completion rate
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';

    return (
        <div className="p-4 md:p-6 w-full space-y-6">
            <h1 className="text-3xl font-bold border-b pb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-indigo-600">
                Meeting Analytics & Reports
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-white to-purple-50 shadow-sm border border-purple-100 relative overflow-hidden group">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-sm font-medium text-purple-600 mb-1">Total Meetings</p>
                            <h3 className="text-3xl font-bold text-gray-900">{total}</h3>
                        </div>
                        <BarChart className="text-purple-300 group-hover:text-purple-500 transition-colors" size={32} />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-white to-green-50 shadow-sm border border-green-100 relative overflow-hidden group">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-sm font-medium text-green-600 mb-1">Completed</p>
                            <h3 className="text-3xl font-bold text-gray-900">{completed}</h3>
                        </div>
                        <TrendingUp className="text-green-300 group-hover:text-green-500 transition-colors" size={32} />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-white to-orange-50 shadow-sm border border-orange-100 relative overflow-hidden group">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-sm font-medium text-orange-600 mb-1">Pending Status</p>
                            <h3 className="text-3xl font-bold text-gray-900">{pending}</h3>
                        </div>
                        <PieChart className="text-orange-300 group-hover:text-orange-500 transition-colors" size={32} />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-white to-blue-50 shadow-sm border border-blue-100 relative overflow-hidden group">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-sm font-medium text-blue-600 mb-1">Completion Rate</p>
                            <h3 className="text-3xl font-bold text-gray-900">{completionRate}%</h3>
                        </div>
                        <TrendingUp className="text-blue-300 group-hover:text-blue-500 transition-colors" size={32} />
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <Card className="p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Meeting Types Distribution</h3>
                    {reports?.typeDistribution?.length === 0 ? (
                        <p className="text-gray-500">No meeting history to show relative data.</p>
                    ) : (
                        <div className="space-y-4">
                            {reports?.typeDistribution?.map((t: any, idx: number) => (
                                <div key={idx} className="flex flex-col gap-2">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="text-gray-700">{t.name}</span>
                                        <span className="text-purple-600">{t.value} Meetings</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                                        <div 
                                            className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full" 
                                            style={{ width: `${(t.value / total) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default Reports;
