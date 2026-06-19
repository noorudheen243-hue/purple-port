import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Calendar, User, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface TaskDetailItem {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    completed_date: string | null;
    assigned_by: {
        full_name: string;
    } | null;
}

const PerformanceTaskDetails = () => {
    const [searchParams] = useSearchParams();
    const assigneeId = searchParams.get('assigneeId') || '';
    const group = searchParams.get('group') || '';
    const type = searchParams.get('type') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const staffName = searchParams.get('staffName') || 'Staff Member';

    // Fetch tasks
    const { data: tasks, isLoading, error } = useQuery<TaskDetailItem[]>({
        queryKey: ['performance-task-details', assigneeId, group, type, startDate, endDate],
        queryFn: async () => {
            const params: any = {
                assignee_id: assigneeId,
                status: 'COMPLETED', // The dashboard tracks completed task counts
                start_date: startDate,
                end_date: endDate,
                task_group: group,
                task_type: type
            };
            const response = await api.get('/tasks', { params });
            return response.data;
        },
        enabled: !!assigneeId
    });

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            COMPLETED: 'bg-green-100 text-green-800 border-green-200',
            IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
            REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            REWORK: 'bg-orange-100 text-orange-800 border-orange-200',
            PLANNED: 'bg-gray-100 text-gray-800 border-gray-200'
        }[status] || 'bg-gray-100 text-gray-800 border-gray-200';

        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
                    <div>
                        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{group}</div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{type} Details</h1>
                        <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                            <User size={16} /> <span className="font-medium text-gray-700">{staffName}</span>
                            <span className="text-gray-300">•</span>
                            <Calendar size={16} /> <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
                        </p>
                    </div>
                    <Button onClick={() => window.close()} variant="outline" className="w-full md:w-auto">
                        Close Window
                    </Button>
                </div>

                {/* Content */}
                <Card className="shadow-sm border-gray-200">
                    <CardHeader className="bg-gray-50/50 border-b">
                        <CardTitle className="text-base font-semibold text-gray-800">Task List</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                <RefreshCw className="animate-spin text-primary" size={24} />
                                <span>Loading task details...</span>
                            </div>
                        ) : error ? (
                            <div className="p-12 text-center text-red-500 flex flex-col items-center justify-center gap-2">
                                <AlertCircle size={24} />
                                <span>Failed to load tasks. Please try again.</span>
                            </div>
                        ) : !tasks || tasks.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                <CheckCircle2 size={24} className="text-gray-400" />
                                <span>No tasks found for this selection.</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50/75 text-gray-600 font-medium border-b text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3.5">Date Created</th>
                                            <th className="px-6 py-3.5">Completed Date</th>
                                            <th className="px-6 py-3.5">Task Title</th>
                                            <th className="px-6 py-3.5">Assigned By</th>
                                            <th className="px-6 py-3.5">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {tasks.map((task) => (
                                            <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                                    {formatDate(task.createdAt)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 whitespace-nowrap font-medium">
                                                    {formatDate(task.completed_date || task.createdAt)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-950 font-semibold max-w-md truncate">
                                                    {task.title}
                                                </td>
                                                <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                                                    {task.assigned_by?.full_name || 'System'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(task.status)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PerformanceTaskDetails;
