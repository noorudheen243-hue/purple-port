import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
    KanbanSquare, Plus, MoreVertical, Calendar, 
    TrendingUp, AlertCircle, CheckCircle2, 
    ArrowRight, DollarSign, User, Zap
} from 'lucide-react';
import { format } from 'date-fns';

import { useQuery } from '@tanstack/react-query';

const STAGES = [
    { id: 'DISCOVERY', name: 'Discovery', color: 'bg-blue-500' },
    { id: 'QUALIFICATION', name: 'Qualification', color: 'bg-purple-500' },
    { id: 'PROPOSAL', name: 'Proposal', color: 'bg-indigo-500' },
    { id: 'NEGOTIATION', name: 'Negotiation', color: 'bg-orange-500' },
    { id: 'CLOSING', name: 'Closing', color: 'bg-green-500' }
];

interface SalesPipelinePageProps {
    clientId?: string;
}

const SalesPipelinePage: React.FC<SalesPipelinePageProps> = ({ clientId: propClientId }) => {
    const [deals, setDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClientId, setSelectedClientId] = useState<string>(propClientId || '');

    // Fetch available clients for selector (fallback) - ONLY ACTIVE
    const { data: clients } = useQuery({
        queryKey: ['clients-active'],
        queryFn: async () => (await api.get('/clients?status=ACTIVE')).data,
        enabled: !propClientId
    });

    const fetchDeals = async () => {
        try {
            setLoading(true);
            const cid = propClientId || selectedClientId;
            const res = await api.get(`/ai-sales/deals${cid ? `?clientId=${cid}` : ''}`);
            setDeals(res.data);
        } catch (err) {
            console.error('Failed to fetch deals', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeals();
    }, [propClientId, selectedClientId]);

    const getDealsByStage = (stageId: string) => {
        return deals.filter(deal => deal.stage === stageId);
    };

    return (
        <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Sales Pipeline</h1>
                    <p className="text-gray-500 font-medium">Manage your deals and track AI-powered win probabilities.</p>
                </div>
                <div className="flex items-center gap-4">
                    {!propClientId && (
                        <select
                            value={selectedClientId}
                            onChange={(e) => setSelectedClientId(e.target.value)}
                            className="px-4 py-2.5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:border-purple-500 outline-none transition-all shadow-sm"
                        >
                            <option value="">All Clients</option>
                            {clients?.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}
                    <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-purple-200 flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        New Deal
                    </button>
                </div>
            </div>

            {/* Pipeline Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Pipeline Value</p>
                    <h3 className="text-3xl font-black text-gray-900 mt-1">
                        ${deals.reduce((acc, d) => acc + d.value, 0).toLocaleString()}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                            <Zap className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Expected Revenue</p>
                    <h3 className="text-3xl font-black text-gray-900 mt-1 text-green-600">
                        ${deals.reduce((acc, d) => acc + (d.value * (d.aiPrediction?.probability || 0)), 0).toLocaleString()}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Stalled Deals</p>
                    <h3 className="text-3xl font-black text-gray-900 mt-1">
                        {deals.filter(d => d.aiPrediction?.risk_level === 'HIGH').length}
                    </h3>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
                {STAGES.map(stage => (
                    <div key={stage.id} className="flex-shrink-0 w-80 snap-start">
                        <div className="mb-4 flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                                <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">
                                    {stage.name}
                                </h3>
                                <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                    {getDealsByStage(stage.id).length}
                                </span>
                            </div>
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                        </div>

                        <div className="space-y-4 min-h-[500px] bg-gray-100/50 p-3 rounded-3xl border border-dashed border-gray-200">
                            {getDealsByStage(stage.id).map(deal => (
                                <div key={deal.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                            {deal.client?.name || 'Unknown Client'}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <Zap className={`w-3 h-3 ${deal.aiPrediction?.probability > 0.7 ? 'text-orange-500 fill-orange-500' : 'text-gray-300'}`} />
                                            <span className="text-[10px] font-black text-gray-900">
                                                {Math.round((deal.aiPrediction?.probability || 0) * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors uppercase leading-tight">
                                        {deal.title}
                                    </h4>
                                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
                                        <div className="flex items-center gap-1 text-gray-900 font-black text-sm">
                                            <DollarSign className="w-3 h-3 text-green-500" />
                                            {deal.value.toLocaleString()}
                                        </div>
                                        {deal.expected_close_date && (
                                            <div className="flex items-center gap-1 text-gray-400 text-[10px] font-bold">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(deal.expected_close_date), 'MMM dd')}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {deal.aiPrediction?.risk_level === 'HIGH' && (
                                        <div className="mt-3 flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter animate-pulse">
                                            <AlertCircle className="w-3 h-3" />
                                            Action Required: Stalled Deal
                                        </div>
                                    )}
                                </div>
                            ))}
                            {getDealsByStage(stage.id).length === 0 && (
                                <div className="h-20 flex items-center justify-center text-gray-400 text-xs italic">
                                    No deals in this stage
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SalesPipelinePage;
