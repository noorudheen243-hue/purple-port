import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import TaskFormModal from './TaskFormModal';

const COLUMNS = [
    { id: 'PLANNED', label: 'Planned' },
    { id: 'ASSIGNED', label: 'Assigned' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'REVIEW', label: 'Review' },
    { id: 'REVISION_REQUESTED', label: 'Revision' },
    { id: 'COMPLETED', label: 'Completed' }
];

const TaskBoard = () => {
    const queryClient = useQueryClient();
    // const [filter, setFilter] = useState('ALL'); // Placeholder for filters

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const { data } = await api.get('/tasks');
            return data;
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            return await api.put(`/tasks/${id}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    // Group tasks by status
    const tasksByStatus = tasks?.reduce((acc: any, task: any) => {
        const status = task.status;
        if (!acc[status]) acc[status] = [];
        acc[status].push(task);
        return acc;
    }, {});

    const [searchParams, setSearchParams] = useSearchParams();
    const isNewTaskModalOpen = searchParams.get('action') === 'new';

    const handleCloseModal = () => {
        setSearchParams({});
    };

    if (isLoading) return <div>Loading tasks...</div>;

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDrop = (e: React.DragEvent, status: string) => {
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            updateStatusMutation.mutate({ id: taskId, status });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Task Board</h1>
                <div className="flex gap-2">
                    {/* Filter controls would go here */}
                    <Link to="?action=new" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2">
                        <Plus size={16} /> New Task
                    </Link>
                </div>
            </div>

            {/* DEBUG BLOCK - REMOVE AFTER FIXING */}
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-xs font-mono mb-4 text-black">
                <strong>DEBUG INFO:</strong><br />
                Status: {isLoading ? 'Loading...' : 'Loaded'}<br />
                Tasks Fetched: {tasks?.length || 0}<br />
                Raw Filter: None (Client-side grouping only)<br />
                First Task (if any): {tasks && tasks.length > 0 ? JSON.stringify(tasks[0].status) : 'N/A'}
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
                {COLUMNS.map(column => (
                    <div
                        key={column.id}
                        className="min-w-[300px] w-[300px] flex flex-col bg-muted/30 rounded-lg border border-border"
                        onDrop={(e) => handleDrop(e, column.id)}
                        onDragOver={handleDragOver}
                    >
                        <div className="p-4 font-semibold text-sm flex justify-between items-center border-b bg-card rounded-t-lg">
                            {column.label}
                            <span className="bg-muted text-xs px-2 py-1 rounded-full">
                                {tasksByStatus?.[column.id]?.length || 0}
                            </span>
                        </div>

                        <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                            {tasksByStatus?.[column.id]?.map((task: any) => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                    className="bg-card p-4 rounded border shadow-sm cursor-move hover:border-primary/50 transition-colors group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium 
                                            ${task.type === 'GRAPHIC' ? 'bg-purple-100 text-purple-700' :
                                                task.type === 'VIDEO' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {task.type}
                                        </span>
                                        <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>
                                    <Link to={`/dashboard/tasks/${task.id}`} className="font-medium hover:underline block mb-2">
                                        {task.title}
                                    </Link>

                                    <div className="flex justify-between items-center mt-3">
                                        <div className="flex -space-x-2">
                                            {task.assignee ? (
                                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold ring-2 ring-background" title={task.assignee.full_name}>
                                                    {task.assignee.full_name.charAt(0)}
                                                </div>
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-muted border border-dashed flex items-center justify-center text-[10px]">?</div>
                                            )}
                                        </div>
                                        <span className={`text-xs ${task.priority === 'URGENT' ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <TaskFormModal
                isOpen={isNewTaskModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
};

export default TaskBoard;
