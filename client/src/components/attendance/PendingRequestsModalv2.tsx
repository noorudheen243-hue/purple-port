import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Clock, FileText, User, Bell } from 'lucide-react';
import api from '@/lib/api';

const PendingRequestsModalv2 = ({ trigger, highlightId, autoOpen, onOpenChange }: {
    trigger: React.ReactNode,
    highlightId?: string | null,
    autoOpen?: boolean,
    onOpenChange?: (open: boolean) => void
}) => {
    const [requests, setRequests] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    // Internal handler to sync with prop if needed, or just call the prop
    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (onOpenChange) onOpenChange(open);
    };
    const [loading, setLoading] = useState(false);

    // Auto-open if highlightId provided or autoOpen is true
    useEffect(() => {
        if (highlightId || autoOpen) {
            setIsOpen(true);
        }
    }, [highlightId, autoOpen]);

    // Scroll to highlighted item when requests are loaded
    useEffect(() => {
        if (isOpen && highlightId && requests.length > 0) {
            setTimeout(() => {
                const element = document.getElementById(`request-${highlightId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-orange-500'); // Highlight effect
                }
            }, 500); // Small delay to ensure render
        }
    }, [isOpen, highlightId, requests]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const [leavesRes, regularisationRes] = await Promise.all([
                api.get('/leave/requests'),
                api.get('/attendance/regularisation/requests?status=PENDING')
            ]);

            const leaves = leavesRes.data.map((l: any) => ({ ...l, category: 'LEAVE' }));
            const regularisations = regularisationRes.data.map((r: any) => ({ ...r, category: 'REGULARISATION' }));

            setRequests([...leaves, ...regularisations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
            console.error("Failed to fetch requests", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchRequests();
        }
    }, [isOpen]);

    const handleAction = async (id: string, category: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            const endpoint = category === 'LEAVE'
                ? `/leave/${id}/status`
                : `/attendance/regularisation/${id}/status`;

            await api.patch(endpoint, { status });
            // Remove from list or refresh
            fetchRequests();
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to process request.");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-orange-500" />
                        Pending Approvals
                        <Badge variant="secondary" className="ml-2">{requests.length}</Badge>
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6 pt-2">
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading requests...</div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Check className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>All caught up! No pending requests.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 pt-4">
                            {requests.map((req) => (
                                <div key={req.id} id={`request-${req.id}`} className="border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {req.user?.full_name?.charAt(0) || <User className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm">{req.user?.full_name}</h4>
                                                <span className="text-xs text-muted-foreground">{req.user?.department} • {req.user?.role}</span>
                                            </div>
                                        </div>
                                        <Badge variant={req.category === 'LEAVE' ? 'default' : 'outline'} className={req.category === 'LEAVE' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' : 'text-blue-600 border-blue-200'}>
                                            {req.category === 'LEAVE' ? 'Leave Application' : 'Attendance Regularisation'}
                                        </Badge>
                                    </div>

                                    <div className="ml-12 space-y-2 mb-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground text-xs block mb-1">Type</span>
                                                <span className="font-medium">{req.type}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground text-xs block mb-1">Dates</span>
                                                {req.category === 'LEAVE' ? (
                                                    <span className="font-medium">
                                                        {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="font-medium">{new Date(req.date).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-muted/50 p-2 rounded text-sm text-muted-foreground">
                                            <FileText className="h-3 w-3 inline mr-1" />
                                            {req.reason}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2 border-t mt-2">
                                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleAction(req.id, req.category, 'REJECTED')}>
                                            <X className="h-4 w-4 mr-1" /> Reject
                                        </Button>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction(req.id, req.category, 'APPROVED')}>
                                            <Check className="h-4 w-4 mr-1" /> Approve
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default PendingRequestsModalv2;
