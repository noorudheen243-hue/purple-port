import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { BarChart3, CheckCircle, Clock, Zap, Users } from 'lucide-react';

const TeamDashboard = () => {
    const [kpis, setKpis] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchKPIs = async () => {
            try {
                const res = await api.get('/team/kpi');
                setKpis(res.data);
            } catch (error) {
                console.error("Failed to fetch KPIs", error);
            } finally {
                setLoading(false);
            }
        };
        fetchKPIs();
    }, []);

    if (loading) return <div className="p-8">Loading Dashboard...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Team Performance</h2>
                    <p className="text-muted-foreground">Real-time task-driven metrics.</p>
                </div>
                <div className="flex gap-2">
                    <select className="border rounded-md px-3 py-2 text-sm">
                        <option>This Month</option>
                        <option>Last Month</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Completion Rate</span>
                        <CheckCircle className="text-green-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold">{kpis?.completionRate || 0}%</div>
                    <p className="text-xs text-muted-foreground">{kpis?.completed} / {kpis?.totalTasks} tasks</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">On-Time Delivery</span>
                        <Clock className="text-blue-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold">{kpis?.onTimeRate || 0}%</div>
                    <p className="text-xs text-muted-foreground">Within SLA</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Productivity Score</span>
                        <Zap className="text-yellow-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold">{kpis?.productivityScore || 0}</div>
                    <p className="text-xs text-muted-foreground">Algorithm based</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Utilization</span>
                        <BarChart3 className="text-purple-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold">{kpis?.utilization || 0}%</div>
                    <p className="text-xs text-muted-foreground">Based on 160h capacity</p>
                </div>
            </div>

            {/* Detailed Sections */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Zap size={18} /> Task Distribution
                    </h3>
                    <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                        Chart: Pending / Completed / Overdue
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Users size={18} /> Top Performers
                    </h3>
                    <div className="space-y-4">
                        {/* Placeholder for Top Performers List */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">A</div>
                                <div>
                                    <div className="font-medium text-sm">Alice Johnson</div>
                                    <div className="text-xs text-muted-foreground">95% Completion</div>
                                </div>
                            </div>
                            <span className="text-green-600 font-bold text-sm">#1</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamDashboard;
