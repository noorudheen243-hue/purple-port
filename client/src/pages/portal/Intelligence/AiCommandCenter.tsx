import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { 
    Brain, 
    Zap, 
    CheckCircle, 
    XCircle, 
    ChevronRight, 
    AlertTriangle, 
    TrendingUp, 
    Play,
    Loader2,
    Check
} from 'lucide-react';
import Swal from 'sweetalert2';
import { formatDistanceToNow } from 'date-fns';

interface AiAction {
    id: string;
    command: string;
    params_json: string;
    status: 'PROPOSED' | 'EXECUTED' | 'IGNORED';
    executedAt?: string;
}

interface AiThought {
    id: string;
    clientId?: string;
    client?: { name: string };
    type: string;
    reasoning: string;
    createdAt: string;
    actions: AiAction[];
}

const AiCommandCenter: React.FC = () => {
    const queryClient = useQueryClient();
    const [filterClient, setFilterClient] = useState<string>("");

    const { data: stream, isLoading } = useQuery<AiThought[]>({
        queryKey: ['ai-intel-stream', filterClient],
        queryFn: async () => (await api.get(`/intel-core/stream${filterClient ? `?clientId=${filterClient}` : ''}`)).data,
        refetchInterval: 30000 // Refresh every 30s
    });

    const approveMutation = useMutation({
        mutationFn: async (actionId: string) => (await api.post('/intel-core/action/approve', { actionId })).data,
        onSuccess: () => {
             Swal.fire({ title: 'Executed', text: 'AI Action has been successfully applied.', icon: 'success', timer: 2000, showConfirmButton: false });
             queryClient.invalidateQueries({ queryKey: ['ai-intel-stream'] });
        }
    });

    const ignoreMutation = useMutation({
        mutationFn: async (actionId: string) => (await api.post('/intel-core/action/ignore', { actionId })).data,
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['ai-intel-stream'] });
        }
    });

    const triggerAuditMutation = useMutation({
         mutationFn: async () => (await api.post('/intel-core/thought/trigger', { type: 'DAILY_ANALYSIS' })).data,
         onSuccess: () => {
             Swal.fire('Analysis Triggered', 'The AI Core is scanning active accounts...', 'success');
             queryClient.invalidateQueries({ queryKey: ['ai-intel-stream'] });
         }
    });

    const getTypeColor = (type: string) => {
        switch(type) {
            case 'DAILY_ANALYSIS': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'BUDGET_ALERT': return 'bg-red-100 text-red-700 border-red-200';
            case 'STRATEGY_DRIFT': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 size={40} className="animate-spin text-indigo-600" />
                <p className="text-gray-500 font-bold">Connecting to Qix AI Core...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
                        <Brain className="text-white" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">AI Command Center</h1>
                        <p className="text-gray-500 font-medium">Native Autonomous Intelligence Engine (Developer Admin)</p>
                    </div>
                </div>
                <div className="mt-6 md:mt-0 items-center flex gap-3">
                    <Button 
                        onClick={() => triggerAuditMutation.mutate()}
                        disabled={triggerAuditMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl px-6 gap-2"
                    >
                        {triggerAuditMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
                        Trigger Proactive Audit
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {stream?.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <AlertTriangle className="mx-auto text-gray-300 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-gray-600">No Intelligence Streams found.</h3>
                        <p className="text-gray-400">Trigger an audit or wait for system-generated thoughts.</p>
                    </div>
                ) : (
                    stream?.map((thought) => (
                        <Card key={thought.id} className="border-none shadow-xl shadow-gray-100 rounded-3xl overflow-hidden bg-white hover:ring-2 hover:ring-indigo-100 transition-all duration-300">
                            <div className="p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 p-8 border-b border-gray-50">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <Badge className={`px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-wider ${getTypeColor(thought.type)}`}>
                                            {thought.type.replace('_', ' ')}
                                        </Badge>
                                        <span className="text-xs text-gray-400 font-bold">
                                            {formatDistanceToNow(new Date(thought.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <CardTitle className="text-2xl font-black text-gray-900 mt-2">
                                        {thought.client?.name || 'System-wide Intelligence'}
                                    </CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">AI</div>)}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="mb-8">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-3">Reasoning & Logic</Label>
                                    <p className="text-gray-700 leading-relaxed font-medium bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                        {thought.reasoning}
                                    </p>
                                </div>

                                <div>
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-4">Proposed Actions ({thought.actions.length})</Label>
                                    <div className="space-y-4">
                                        {thought.actions.map((action) => (
                                            <div key={action.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                                                action.status === 'EXECUTED' ? 'bg-green-50 border-green-100' : 
                                                action.status === 'IGNORED' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 shadow-sm'
                                            }`}>
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                        action.status === 'EXECUTED' ? 'bg-green-500 text-white' : 'bg-indigo-50 text-indigo-600'
                                                    }`}>
                                                        {action.command === 'CREATE_TASK' ? <CheckCircle size={24} /> : <Zap size={24} />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-gray-900">{action.command.replace('_', ' ')}</h4>
                                                        <p className="text-xs text-gray-500 font-medium">{JSON.parse(action.params_json).title || action.id}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {action.status === 'PROPOSED' && (
                                                        <>
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                onClick={() => ignoreMutation.mutate(action.id)}
                                                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 font-bold"
                                                            >
                                                                <XCircle size={18} className="mr-2" /> Dismiss
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => approveMutation.mutate(action.id)}
                                                                className="bg-green-600 hover:bg-green-700 text-white font-black px-6 gap-2"
                                                            >
                                                                <Check size={18} /> Execute Action
                                                            </Button>
                                                        </>
                                                    )}
                                                    {action.status === 'EXECUTED' && (
                                                        <Badge className="bg-green-500 text-white px-4 py-2 font-black gap-2">
                                                            <CheckCircle size={14} /> EXECUTED
                                                        </Badge>
                                                    )}
                                                    {action.status === 'IGNORED' && (
                                                        <Badge variant="secondary" className="px-4 py-2 font-black">DISMISSED</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

const Label = ({ children, className }: any) => <span className={className}>{children}</span>;

export default AiCommandCenter;
