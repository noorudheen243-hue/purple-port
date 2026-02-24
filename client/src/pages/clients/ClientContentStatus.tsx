import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Target, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const ClientContentStatus = () => {
    const { data: clients, isLoading: clientsLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => (await api.get('/clients')).data
    });

    const [selectedClientId, setSelectedClientId] = useState('');

    // Fetch Tasks for the selected client to calculate "Completed" counts
    const { data: clientTasks, isLoading: tasksLoading } = useQuery({
        queryKey: ['tasks', selectedClientId],
        queryFn: async () => (await api.get(`/tasks?client_id=${selectedClientId}`)).data, // Backend needs to support filtering by client_id on /tasks?
        enabled: !!selectedClientId
    });

    // NOTE: Check if Backend /tasks supports filtering by client_id. 
    // In `tasks/controller.ts`, `getTasks` filters by `assignee_id`, `campaign_id`. 
    // It DOES NOT yet support `client_id`. I need to update `tasks/controller` and `service` to support `client_id` filter.
    // I will assume I will do that next or now. 
    // Actually, I should check `getTasks` in controller.ts.

    const selectedClient = clients?.find((c: any) => c.id === selectedClientId);

    if (clientsLoading) return <div className="p-8 text-center">Loading Data...</div>;

    const calculateCompleted = (contentType: string) => {
        if (!clientTasks) return 0;
        return clientTasks.filter((t: any) =>
            t.status === 'COMPLETED' &&
            t.content_type === contentType
        ).length;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Content Status Report</h1>
                    <p className="text-muted-foreground">Track monthly content commitments vs. actual delivery.</p>
                </div>
            </div>

            {/* Client Selector - Main Control */}
            <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4 max-w-xl">
                <label className="text-sm font-semibold text-gray-700">Select Client to View Report</label>
                <div className="relative">
                    <select
                        className="w-full px-4 py-3 border rounded-lg appearance-none bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={selectedClientId}
                        onChange={e => setSelectedClientId(e.target.value)}
                    >
                        <option value="">-- Choose a Client --</option>
                        {clients?.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedClientId ? (
                <div className="bg-white rounded-lg shadow border overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                            Status for: <span className="text-primary">{selectedClient?.name}</span>
                        </h2>
                        {tasksLoading && <span className="text-xs text-muted-foreground animate-pulse">Syncing tasks...</span>}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4">Content Type</th>
                                    <th className="px-6 py-4 text-center">Committed (Monthly)</th>
                                    <th className="px-6 py-4 text-center">Delivered (Completed Tasks)</th>
                                    <th className="px-6 py-4 text-center">Balance</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {selectedClient?.content_strategies?.length > 0 ? (
                                    selectedClient.content_strategies.map((strategy: any) => {
                                        const completed = calculateCompleted(strategy.type);
                                        const balance = strategy.quantity - completed;
                                        const isMet = balance <= 0;

                                        return (
                                            <tr key={strategy.id || strategy.type} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                                    <Target size={16} className="text-gray-400" />
                                                    {strategy.type}
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-700 text-lg">{strategy.quantity}</td>
                                                <td className="px-6 py-4 text-center text-green-600 font-bold text-lg">
                                                    {completed}
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono font-medium">
                                                    {balance > 0 ? balance : 0}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {isMet ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                                                            <CheckCircle size={12} /> Target Met
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            <Clock size={12} /> Pending
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                            No Content Strategy defined for this client.
                                            <br />Go to <span className="font-mono text-xs bg-gray-100 px-1">Client List &gt; Edit</span> to add commitments.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 border-2 border-dashed rounded-xl text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No Client Selected</h3>
                    <p className="text-muted-foreground max-w-sm mt-1">
                        Please select a client from the dropdown above to view their content delivery status.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ClientContentStatus;
