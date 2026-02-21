import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import { StatusCard } from './components/StatusCard';
import { ResignationFormModal } from './components/ResignationFormModal';
import { Loader2, LogOut, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../../../components/ui/button';

export const MyResignationView = () => {
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

    const { data: myRequest, isLoading, error } = useQuery({
        queryKey: ['my-resignation'],
        queryFn: async () => {
            const res = await api.get('/team/resignation/my');
            return res.data;
        }
    });

    const myRequests = Array.isArray(myRequest) ? myRequest : [];
    const activeRequest = myRequests.find((r: any) => ['APPLIED', 'UNDER_NOTICE'].includes(r.status));
    // If no active, check for rejected to show re-apply option, picking the latest one
    const latestRequest = myRequests.length > 0 ? myRequests[0] : null;

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    }

    if (error) {
        return <div className="text-red-500 text-center p-4">Failed to load resignation status.</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {latestRequest && (
                <div className="space-y-6">
                    <StatusCard data={latestRequest} />

                    {(latestRequest.status === 'REJECTED' || latestRequest.status === 'COMPLETED') && (
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl bg-card/50 text-center max-w-2xl mx-auto">
                            <p className="text-muted-foreground mb-4 font-medium">
                                {latestRequest.status === 'REJECTED'
                                    ? "Your previous request was rejected. You may submit a new application if needed."
                                    : "Your resignation process is complete. If you need to submit a new request, click below."}
                            </p>
                            <Button
                                variant="destructive"
                                onClick={() => setIsApplyModalOpen(true)}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                            >
                                <LogOut size={18} /> Re-Apply for Resignation
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {!latestRequest && (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-card/50 text-center max-w-2xl mx-auto mt-10">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                        <FileText size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No Active Resignation Request</h3>
                    <p className="text-muted-foreground mb-8 max-w-sm">
                        You have not submitted any resignation request. If you wish to initiate the separation process, please click the button below.
                    </p>
                    <Button
                        variant="destructive"
                        onClick={() => setIsApplyModalOpen(true)}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                    >
                        <LogOut size={18} /> Apply for Resignation
                    </Button>
                </div>
            )}

            {/* History Table */}
            {myRequests.length > 0 && (
                <div className="border rounded-lg overflow-hidden shadow-sm bg-card">
                    <div className="p-4 border-b bg-muted/50 font-semibold">Resignation History</div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="p-3 font-medium">Applied On</th>
                                <th className="p-3 font-medium">Relieving Date</th>
                                <th className="p-3 font-medium">Notice Period</th>
                                <th className="p-3 font-medium">Days Left</th>
                                <th className="p-3 font-medium text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myRequests.map((req: any) => (
                                <tr key={req.id} className="border-b last:border-0 hover:bg-muted/20">
                                    <td className="p-3">
                                        {format(new Date(req.applied_date), 'dd MMM yyyy')}
                                    </td>
                                    <td className="p-3">
                                        {format(new Date(req.approved_relieving_date || req.requested_relieving_date), 'dd MMM yyyy')}
                                        {req.status === 'APPLIED' && <span className="text-xs text-muted-foreground ml-1">(Req)</span>}
                                    </td>
                                    <td className="p-3">
                                        {(() => {
                                            const relDate = new Date(req.approved_relieving_date || req.requested_relieving_date);
                                            const appDate = new Date(req.applied_date);
                                            const diff = relDate.getTime() - appDate.getTime();
                                            return `${Math.ceil(diff / (1000 * 60 * 60 * 24))} Days`;
                                        })()}
                                    </td>
                                    <td className="p-3">
                                        {(() => {
                                            const relDate = new Date(req.approved_relieving_date || req.requested_relieving_date);
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const diff = relDate.getTime() - today.getTime();
                                            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                            return days > 0 ? (
                                                <span className="font-bold text-primary">{days} Days</span>
                                            ) : (
                                                <span className="text-muted-foreground italic">Passed</span>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium 
                                            ${req.status === 'APPROVED' || req.status === 'UNDER_NOTICE' ? 'bg-blue-100 text-blue-700' :
                                                req.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                    req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-800'}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="max-w-2xl mx-auto text-xs text-center text-muted-foreground mt-8">
                <p>Note: Submitting this request is a formal action. Please refer to the company's HR policy regarding notice periods and asset handover.</p>
            </div>

            <ResignationFormModal
                isOpen={isApplyModalOpen}
                onClose={() => setIsApplyModalOpen(false)}
            />
        </div>
    );
};
