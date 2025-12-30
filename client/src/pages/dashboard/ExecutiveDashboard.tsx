import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { TrendingUp, Clock, Calendar, CheckSquare } from 'lucide-react';

const ExecutiveDashboard = () => {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const { data } = await api.get('/analytics/dashboard');
            return data;
        }
    });

    if (isLoading) return <div>Loading dashboard...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* KPI Cards */}
                <div className="p-6 bg-card rounded-lg border border-border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Active Campaigns</h3>
                        <p className="text-2xl font-bold mt-1">{stats?.activeCampaigns || 0}</p>
                    </div>
                </div>
                <div className="p-6 bg-card rounded-lg border border-border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 text-yellow-700 rounded-full">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Pending Reviews</h3>
                        <p className="text-2xl font-bold mt-1">{stats?.pendingReviews || 0}</p>
                    </div>
                </div>
                <div className="p-6 bg-card rounded-lg border border-border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-700 rounded-full">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground">This Month's Budget</h3>
                        <p className="text-2xl font-bold mt-1">${stats?.monthlyBudget?.toLocaleString() || 0}</p>
                    </div>
                </div>
                <div className="p-6 bg-card rounded-lg border border-border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-100 text-purple-700 rounded-full">
                        <CheckSquare size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Tasks Completed</h3>
                        <p className="text-2xl font-bold mt-1">{stats?.completedTasksThisMonth || 0}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 bg-card rounded-lg border border-border shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button className="w-full p-3 text-left border border-dashed border-border rounded-md hover:bg-accent transition-colors text-sm font-medium">
                            + Create New Campaign
                        </button>
                        <button className="w-full p-3 text-left border border-dashed border-border rounded-md hover:bg-accent transition-colors text-sm font-medium">
                            + Assign Task
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExecutiveDashboard;
