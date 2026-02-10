
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertTriangle, CheckCircle, Loader2, Server, Terminal, XCircle } from 'lucide-react';
import api from '../../lib/api';

interface UpdateSystemModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UpdateSystemModal: React.FC<UpdateSystemModalProps> = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState<'IDLE' | 'DEPLOYING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [logs, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const handleDeploy = async () => {
        setStatus('DEPLOYING');
        setLogs(['Initializing deployment sequence...', 'Validating role permissions...']);
        setError(null);

        try {
            // we use a slight delay to allow UI to update
            await new Promise(resolve => setTimeout(resolve, 500));

            setLogs(prev => [...prev, 'Sending deployment trigger to backend...']);

            const { data } = await api.post('/deployment/deploy');

            if (data.logs && Array.isArray(data.logs)) {
                setLogs(prev => [...prev, ...data.logs]);
            }

            setLogs(prev => [...prev, 'Deployment Command Completed Successfully.']);
            setStatus('SUCCESS');
        } catch (err: any) {
            console.error(err);
            const errorMsg = err.response?.data?.message || err.message || 'Unknown error occurred';
            setError(errorMsg);

            if (err.response?.data?.logs && Array.isArray(err.response.data.logs)) {
                setLogs(prev => [...prev, ...err.response.data.logs]);
            }

            setLogs(prev => [...prev, `CRITICAL FAIL: ${errorMsg}`]);
            setStatus('ERROR');
        }
    };

    const handleClose = () => {
        if (status === 'DEPLOYING') return; // Prevent closing while running
        setStatus('IDLE');
        setLogs([]);
        setError(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent
                title={
                    <div className="flex items-center gap-2">
                        <Server size={18} className="text-purple-600" />
                        Update Online System
                    </div>
                }
                className="max-w-2xl" hideDraggableBar={false}>

                <div className="p-6 pt-0 space-y-4">
                    {/* Header Context */}
                    <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
                        <h3 className="font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                            <AlertTriangle size={16} /> Admin Zone: Production Deployment
                        </h3>
                        <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                            This action will push your local code to the repo and trigger an update on the live VPS (66.116.224.221).
                            The system may be briefly unavailable during restart.
                        </p>
                    </div>

                    {/* Log Terminal */}
                    <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 font-mono text-xs h-64 overflow-y-auto flex flex-col shadow-inner" ref={logContainerRef}>
                        {logs.length === 0 && status === 'IDLE' && (
                            <div className="text-slate-500 italic my-auto text-center">Ready to deploy. Waiting for confirmation...</div>
                        )}
                        {logs.map((log, i) => (
                            <div key={i} className="text-slate-300 border-b border-slate-900/50 pb-0.5 mb-0.5 last:border-0 last:mb-0 break-all">
                                <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                {log}
                            </div>
                        ))}
                        {status === 'DEPLOYING' && (
                            <div className="text-purple-400 animate-pulse mt-2">Processing...</div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                        <div className="text-sm">
                            {status === 'SUCCESS' && <span className="text-green-600 font-medium flex items-center gap-2"><CheckCircle size={16} /> Update Complete</span>}
                            {status === 'ERROR' && <span className="text-red-600 font-medium flex items-center gap-2"><XCircle size={16} /> Update Failed</span>}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                disabled={status === 'DEPLOYING'}
                                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                            >
                                {status === 'SUCCESS' ? 'Close' : 'Cancel'}
                            </button>

                            {status !== 'SUCCESS' && (
                                <button
                                    onClick={handleDeploy}
                                    disabled={status === 'DEPLOYING'}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {status === 'DEPLOYING' ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />}
                                    {status === 'DEPLOYING' ? 'Deploying...' : status === 'ERROR' ? 'Retry Update' : 'Start Update'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UpdateSystemModal;
