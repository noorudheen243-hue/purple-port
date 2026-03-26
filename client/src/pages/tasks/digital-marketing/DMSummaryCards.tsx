import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, LayoutTemplate, ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const DMSummaryCards = ({ stats, isLoading }: { stats?: any; isLoading?: boolean }) => {
    const metrics = [
        {
            title: 'Active Clients',
            value: stats?.activeClients || 0,
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50 border-blue-200'
        },
        {
            title: 'Active Meta Campaigns',
            value: stats?.activeMetaCampaigns || 0,
            icon: LayoutTemplate,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50 border-indigo-200'
        },
        {
            title: 'Assigned Creative Tasks',
            value: stats?.assignedCreativeTasks || 0,
            icon: ClipboardList,
            color: 'text-amber-600',
            bg: 'bg-amber-50 border-amber-200'
        },
        {
            title: 'Completed Creative Tasks',
            value: stats?.completedCreativeTasks || 0,
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 border-emerald-200'
        },
        {
            title: 'Pending Creative Tasks',
            value: stats?.pendingCreativeTasks || 0,
            icon: AlertCircle,
            color: 'text-rose-600',
            bg: 'bg-rose-50 border-rose-200'
        }
    ];

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="animate-pulse shadow-sm border-gray-100">
                        <CardContent className="p-4 h-24 bg-gray-50 rounded-lg"></CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {metrics.map((metric, index) => (
                <Card key={index} className={`shadow-sm border transition-all duration-300 hover:shadow-md ${metric.bg}`}>
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{metric.title}</p>
                            <h3 className={`text-3xl font-black ${metric.color} tracking-tight`}>{metric.value}</h3>
                        </div>
                        <div className={`p-4 rounded-2xl bg-white shadow-sm border border-gray-100 ${metric.color}`}>
                            <metric.icon size={28} strokeWidth={2.5} />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default DMSummaryCards;
