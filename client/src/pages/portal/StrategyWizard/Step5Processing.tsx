import React, { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Brain, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface Step5Props {
    clientId: string;
    formData: any;
    onComplete: () => void;
}

const Step5Processing: React.FC<Step5Props> = ({ clientId, formData, onComplete }) => {
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const generateMutation = useMutation({
        mutationFn: async () => {
            return (await api.post(`/marketing/strategy/${clientId}/generate`)).data;
        },
        onSuccess: () => {
            setStatus('SUCCESS');
            queryClient.invalidateQueries({ queryKey: ['strategy', clientId] });
            setTimeout(() => onComplete(), 1500);
        },
        onError: (err: any) => {
            setStatus('ERROR');
            setError(err.response?.data?.message || err.message);
        }
    });

    const handleStart = () => {
        setStatus('PROCESSING');
        generateMutation.mutate();
    };

    return (
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in zoom-in duration-500">
            {status === 'IDLE' && (
                <>
                    <div className="w-24 h-24 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 shadow-xl shadow-indigo-100">
                        <Brain size={48} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-gray-900">Ready to Build Your AI Strategy?</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            The AI Strategy Engine will now process your inputs and generate a data-driven marketing plan.
                        </p>
                    </div>
                    <Button 
                        onClick={handleStart} 
                        className="bg-[#2c185a] hover:bg-[#1a0f35] text-white rounded-xl px-12 h-14 font-bold shadow-xl shadow-indigo-200 text-lg group"
                    >
                        Trigger AI Engine <Brain className="ml-2 group-hover:rotate-12 transition-transform" />
                    </Button>
                </>
            )}

            {status === 'PROCESSING' && (
                <>
                    <div className="relative">
                        <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center border-4 border-indigo-100">
                            <Brain size={48} className="text-indigo-600 animate-pulse" />
                        </div>
                        <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-2xl font-black text-[#2c185a]">Analyzing Markets & Trends</h3>
                        <div className="flex flex-col items-start space-y-2 w-64 mx-auto text-sm font-medium text-gray-500">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-green-500" />
                                <span>Processing Business Data</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-green-500" />
                                <span>Segmenting Audience (ICA)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin text-indigo-500" />
                                <span>Generating Funnel Model</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-50">
                                <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
                                <span>Building Execution Roadmap</span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {status === 'SUCCESS' && (
                <>
                    <div className="w-24 h-24 bg-green-100 rounded-3xl flex items-center justify-center text-green-600 shadow-xl shadow-green-100">
                        <CheckCircle2 size={48} className="animate-bounce" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-gray-900">Strategy Generated!</h3>
                        <p className="text-gray-500">Redirecting to your new strategy dashboard...</p>
                    </div>
                </>
            )}

            {status === 'ERROR' && (
                <>
                    <div className="w-24 h-24 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 shadow-xl shadow-red-100">
                        <AlertCircle size={48} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-gray-900">Generation Failed</h3>
                        <p className="text-red-500 font-medium">{error}</p>
                    </div>
                    <Button onClick={() => setStatus('IDLE')} variant="outline" className="rounded-xl px-8">Try Again</Button>
                </>
            )}
        </div>
    );
};

export default Step5Processing;
