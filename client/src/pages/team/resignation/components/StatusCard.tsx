import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface StatusCardProps {
    data: {
        status: string;
        applied_date: string;
        requested_relieving_date: string;
        approved_relieving_date?: string;
        remaining_days?: number;
        rejection_reason?: string;
        approval_date?: string;
    }
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'APPLIED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'UNDER_NOTICE': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
        case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const StatusCard: React.FC<StatusCardProps> = ({ data }) => {
    if (!data) return null;

    return (
        <Card className="max-w-2xl mx-auto border-t-4 border-t-primary shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    Resignation Status
                </CardTitle>
                <Badge variant="outline" className={`${getStatusColor(data.status)} px-3 py-1`}>
                    {data.status.replace('_', ' ')}
                </Badge>
            </CardHeader>
            <CardContent className="grid gap-6">
                {/* Timeline Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase font-bold">Applied On</span>
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Calendar size={16} className="text-muted-foreground" />
                            {format(new Date(data.applied_date), 'dd MMM yyyy')}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase font-bold">Relieving Date</span>
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Calendar size={16} className="text-muted-foreground" />
                            {format(new Date(data.approved_relieving_date || data.requested_relieving_date), 'dd MMM yyyy')}
                            {data.status === 'APPLIED' && <span className="text-xs text-muted-foreground">(Req)</span>}
                        </div>
                    </div>

                    {data.status === 'UNDER_NOTICE' && data.remaining_days !== undefined && (
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase font-bold">Remaining Days</span>
                            <div className="flex items-center gap-2 text-xl font-bold text-primary">
                                <Clock size={20} />
                                {data.remaining_days} Days
                            </div>
                        </div>
                    )}
                </div>

                {/* Detailed Status Messages */}
                <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    {data.status === 'APPLIED' && (
                        <div className="flex gap-3">
                            <AlertCircle className="text-yellow-600 shrink-0" size={20} />
                            <div>
                                <h4 className="font-semibold text-sm">Application Received</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Your resignation request is pending manager review. The notice period countdown will begin once designated.
                                </p>
                            </div>
                        </div>
                    )}

                    {data.status === 'UNDER_NOTICE' && (
                        <div className="flex gap-3">
                            <Clock className="text-blue-600 shrink-0" size={20} />
                            <div>
                                <h4 className="font-semibold text-sm">Under Notice Period</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    You are currently serving your notice period. Please ensure all handover tasks are completed by <strong>{format(new Date(data.approved_relieving_date!), 'dd MMM yyyy')}</strong>.
                                </p>
                            </div>
                        </div>
                    )}

                    {data.status === 'COMPLETED' && (
                        <div className="flex gap-3">
                            <CheckCircle2 className="text-green-600 shrink-0" size={20} />
                            <div>
                                <h4 className="font-semibold text-sm">Relieved Successfully</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Your resignation process is complete. We wish you the best in your future endeavors!
                                </p>
                            </div>
                        </div>
                    )}

                    {data.status === 'REJECTED' && (
                        <div className="flex gap-3">
                            <XCircle className="text-red-600 shrink-0" size={20} />
                            <div>
                                <h4 className="font-semibold text-sm">Request Rejected</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Reason: <span className="italic">{data.rejection_reason || "No reason provided."}</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
