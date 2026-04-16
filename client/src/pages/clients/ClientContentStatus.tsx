import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils';
import { Target, CheckCircle, Clock, User } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

const COLORS = [
    'bg-blue-50 text-blue-800 border-blue-200',
    'bg-purple-50 text-purple-800 border-purple-200',
    'bg-pink-50 text-pink-800 border-pink-200',
    'bg-orange-50 text-orange-800 border-orange-200',
    'bg-teal-50 text-teal-800 border-teal-200',
    'bg-indigo-50 text-indigo-800 border-indigo-200',
];

const ClientContentStatus = () => {
    const { data: clients, isLoading: clientsLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => (await api.get('/clients')).data
    });

    const { data: globalContentTypes = [], isLoading: typesLoading } = useQuery({
        queryKey: ['content-types'],
        queryFn: async () => (await api.get('/content-types')).data
    });

    const { data: allTasks, isLoading: tasksLoading } = useQuery({
        queryKey: ['tasks-all-content'],
        queryFn: async () => (await api.get('/tasks')).data
    });

    // Extract unique Content Strategy types across all clients
    const uniqueContentTypes = useMemo(() => {
        if (!clients || globalContentTypes.length === 0) return [];
        const typeIds = new Set<string>();
        clients.forEach((client: any) => {
            if (client.content_strategies && Array.isArray(client.content_strategies)) {
                client.content_strategies.forEach((strategy: any) => {
                    if (strategy.content_type_id) typeIds.add(strategy.content_type_id);
                });
            }
        });
        
        // Map IDs to Names and sort
        const types = Array.from(typeIds)
            .map(id => globalContentTypes.find((ct: any) => ct.id === id))
            .filter(Boolean);
            
        return types.sort((a, b) => a.name.localeCompare(b.name));
    }, [clients, globalContentTypes]);

    // Pre-process table rows 
    const tableData = useMemo(() => {
        if (!clients || !allTasks || !globalContentTypes) return [];

        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);

        return clients.map((client: any) => {
            let totalAssigned = 0;
            const strategyMap: Record<string, number> = {};

            // Map planned quantities
            if (client.content_strategies && Array.isArray(client.content_strategies)) {
                client.content_strategies.forEach((strategy: any) => {
                    if (strategy.content_type_id && strategy.monthly_target) {
                        strategyMap[strategy.content_type_id] = strategy.monthly_target;
                        totalAssigned += strategy.monthly_target;
                    }
                });
            }

            // Calculate completed (ONLY IN CURRENT MONTH)
            let completed = 0;
            const clientTasks = allTasks.filter((t: any) => t.client_id === client.id);
            
            clientTasks.forEach((task: any) => {
                const taskDate = new Date(task.createdAt);
                const isCurrentMonth = taskDate >= currentMonthStart && taskDate <= currentMonthEnd;

                // Match dynamically, a task counts if it was produced/planned for this month and status is COMPLETED
                if (task.status === 'COMPLETED' && isCurrentMonth && task.content_type_id && strategyMap[task.content_type_id]) {
                    completed++;
                }
            });

            const pending = Math.max(0, totalAssigned - completed);

            return {
                id: client.id,
                name: client.name,
                code: client.client_code,
                strategyMap,
                totalAssigned,
                completed,
                pending
            };
        }).filter((row: any) => row.totalAssigned > 0); // Only show clients with active strategies
    }, [clients, allTasks, globalContentTypes]);

    if (clientsLoading || tasksLoading || typesLoading) {
        return (
            <div className="p-8 text-center animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-64 mb-6 mx-auto"></div>
                <div className="h-96 bg-gray-100 rounded-xl border border-gray-200"></div>
                <p className="mt-4 text-muted-foreground">Gathering content strategy data...</p>
            </div>
        );
    }

    if (uniqueContentTypes.length === 0) {
        return (
            <div className="p-8 text-center bg-gray-50 rounded-xl border-2 border-dashed mt-6">
                <Target className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No Content Strategies Found</h3>
                <p className="text-gray-500 mt-1">None of the clients currently have a defined content strategy plan.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Client Content Status (Current Month)</h1>
                    <p className="text-muted-foreground">Overview of planned vs. completed content strategies for active clients.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-gray-50/80">
                            {/* TOP HEADER ROW */}
                            <tr>
                                <th rowSpan={2} className="px-5 py-4 font-bold text-gray-900 border-b border-r align-bottom bg-white sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb]">
                                    Client Name
                                </th>
                                <th colSpan={uniqueContentTypes.length} className="px-5 py-3 font-bold text-center text-indigo-900 border-b border-r bg-indigo-50/50">
                                    Monthly Targets (Planned)
                                </th>
                                <th rowSpan={2} className="px-5 py-4 font-bold text-center text-blue-900 border-b border-r align-bottom bg-blue-50/30">
                                    Total Target
                                </th>
                                <th rowSpan={2} className="px-5 py-4 font-bold text-center text-emerald-900 border-b border-r align-bottom bg-emerald-50/30">
                                    Completed
                                </th>
                                <th rowSpan={2} className="px-5 py-4 font-bold text-center text-orange-900 border-b align-bottom bg-orange-50/30">
                                    Pending
                                </th>
                            </tr>
                            {/* SUB HEADER ROW FOR DYNAMIC STRATEGIES */}
                            <tr>
                                {uniqueContentTypes.map((type: any, idx: number) => (
                                    <th key={type.id} className={`px-4 py-2 text-xs font-semibold text-center border-b border-r ${COLORS[idx % COLORS.length]}`}>
                                        {type.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tableData.length > 0 ? tableData.map((client: any) => {
                                const isAllCompleted = client.totalAssigned > 0 && client.pending === 0;

                                return (
                                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                        {/* Client Name Col */}
                                        <td className="px-5 py-3 font-medium text-gray-900 border-r bg-white sticky left-0 z-10 shadow-[1px_0_0_0_#f3f4f6] group-hover:shadow-[1px_0_0_0_#e5e7eb] group-hover:bg-gray-50 align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border border-gray-100 bg-gray-50">
                                                    {clients?.find((c: any) => c.id === client.id)?.profile_picture ? (
                                                        <img 
                                                            src={getAssetUrl(clients.find((c: any) => c.id === client.id).profile_picture)} 
                                                            alt={client.name} 
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => { (e.target as any).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(client.name); }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 font-bold text-[10px]">
                                                            {client.name.substring(0, 1)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="truncate max-w-[180px] font-bold text-gray-800">{client.name}</span>
                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tight font-semibold uppercase">{client.code}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Dynamic Strategy Quantities */}
                                        {uniqueContentTypes.map((type: any) => {
                                            const qty = client.strategyMap[type.id];
                                            return (
                                                <td key={type.id} className="px-4 py-3 text-center border-r">
                                                    {qty ? (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-xs">
                                                            {qty}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        {/* Totals */}
                                        <td className="px-5 py-3 text-center font-bold text-blue-700 border-r bg-blue-50/10">
                                            {client.totalAssigned}
                                        </td>
                                        <td className="px-5 py-3 text-center border-r bg-emerald-50/10">
                                            {client.completed > 0 ? (
                                                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                                                    {isAllCompleted && <CheckCircle size={14} className="text-emerald-500" />}
                                                    {client.completed}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-medium">0</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-center bg-orange-50/10">
                                            {client.pending > 0 ? (
                                                <span className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-full text-xs">
                                                    <Clock size={12} /> {client.pending}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-medium">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={uniqueContentTypes.length + 4} className="px-6 py-12 text-center text-muted-foreground">
                                        No active strategies found for current clients.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ClientContentStatus;
