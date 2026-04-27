import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { 
    FileText, 
    Download, 
    Share2, 
    Eye, 
    Trash2, 
    Calendar, 
    User,
    ArrowRight,
    Loader2,
    Send,
    Edit3
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import { generateStrategyOutcomePDF } from '../../../modules/strategy/utils/docGenerator';

interface SavedStrategiesTabProps {
    clientId?: string;
    onView: (version: any) => void;
    onEdit: (version: any) => void;
}

const SavedStrategiesTab: React.FC<SavedStrategiesTabProps> = ({ clientId, onView, onEdit }) => {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['strategy-versions', clientId],
        queryFn: async () => {
            const response = await api.get(`/marketing/strategy/versions/list${clientId ? `?clientId=${clientId}` : ''}`);
            return response.data;
        }
    });

    const versions = (data as any)?.versions || [];

    const deleteMutation = useMutation({
        mutationFn: async (version: any) => {
            if (version.isDraft) {
                return await api.delete(`/clients/${version.clientId}`);
            }
            return await api.delete(`/marketing/strategy/versions/${version.id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strategy-versions'] });
            queryClient.invalidateQueries({ queryKey: ['clients-all'] });
            Swal.fire('Deleted!', 'Strategy has been removed.', 'success');
        },
        onError: () => {
            Swal.fire('Error', 'Failed to delete strategy', 'error');
        }
    });

    const handleDelete = (version: any) => {
        Swal.fire({
            title: 'Are you sure?',
            text: version.isDraft ? "This will permanently remove the prospect and their draft data." : "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(version);
            }
        });
    };

    const handleDownloadPDF = (version: any) => {
        try {
            const output = JSON.parse(version.output_snapshot);
            const input = JSON.parse(version.input_snapshot);
            const clientName = input.business_name || version.client?.name || "Valued Client";
            
            // Reconstruct the strategy object structure expected by PDF generator
            const strategyData = {
                input,
                output: {
                    ...output,
                    channel_mix: output.channel_mix ? JSON.parse(output.channel_mix) : [],
                    funnel_model: output.funnel_model ? JSON.parse(output.funnel_model) : {},
                    kpi_targets: output.kpi_targets ? JSON.parse(output.kpi_targets) : [],
                    execution_plan: output.execution_plan ? JSON.parse(output.execution_plan) : []
                }
            };

            generateStrategyOutcomePDF(strategyData, clientName);
            Swal.fire({
                title: 'PDF Generated',
                text: 'Downloading report...',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        } catch (error) {
            console.error("PDF Generation Error:", error);
            Swal.fire('Error', 'Failed to generate PDF. Snapshot data may be corrupted.', 'error');
        }
    };
    const handleViewReport = (version: any) => {
        window.open(`/strategy/report/${version.id}`, '_blank');
    };
    const handleShare = (version: any) => {
        // For now, we copy a placeholder link or just show a message
        const shareUrl = `${window.location.origin}/strategy/view/${version.id}`;
        navigator.clipboard.writeText(shareUrl);
        Swal.fire({
            title: 'Link Copied',
            text: 'Sharing link copied to clipboard.',
            icon: 'success',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-gray-500 font-bold">Loading saved strategies...</p>
        </div>
    );



    if (versions.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mb-4">
                <FileText size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900">No Saved Strategies</h3>
            <p className="text-gray-500 font-medium">Archived strategies for this client will appear here.</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Created Strategy Archive</h2>
                    <p className="text-sm text-gray-500 font-medium">History of all generated marketing strategies.</p>
                </div>
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest">
                    {versions.length} Strategies
                </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {versions.map((version: any) => (
                    <div 
                        key={version.id} 
                        className={`group bg-white border ${version.isDraft ? 'border-amber-100 bg-amber-50/10' : 'border-gray-100'} hover:border-indigo-200 p-5 rounded-[2rem] transition-all hover:shadow-xl hover:shadow-indigo-50/50 flex flex-col md:flex-row items-center justify-between gap-6`}
                    >
                        <div className="flex items-center gap-6 w-full md:w-auto">
                            <div className={`w-14 h-14 ${version.isDraft ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all`}>
                                <FileText size={24} />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-black text-gray-900 line-clamp-1">{version.version_name}</h4>
                                    {version.isDraft && (
                                        <Badge className="bg-amber-500 text-white border-none text-[8px] px-2 py-0.5 font-black uppercase">Draft</Badge>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold">
                                        <Calendar size={14} className="text-indigo-400" />
                                        {format(new Date(version.createdAt), 'MMM dd, yyyy • HH:mm')}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold">
                                        <User size={14} className="text-amber-400" />
                                        {version.client?.name || 'Prospect'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold">
                                        <Badge className={`border-none text-[8px] px-2 py-0.5 font-black uppercase ${
                                            version.isDraft 
                                                ? 'bg-amber-100 text-amber-600' 
                                                : 'bg-green-100 text-green-600'
                                        }`}>
                                            {version.isDraft ? 'Construction stage' : 'Completed'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                            {!version.isDraft && (
                                <>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleViewReport(version)}
                                        className="rounded-xl border-gray-100 text-gray-600 hover:bg-gray-50 font-bold h-10 px-4 gap-2"
                                    >
                                        <Eye size={16} /> View Strategy
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleShare(version)}
                                        className="rounded-xl border-gray-100 text-gray-600 hover:bg-gray-50 font-bold h-10 px-4 gap-2"
                                        title="Share Link"
                                    >
                                        <Share2 size={16} /> Share Strategy
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleDownloadPDF(version)}
                                        className="rounded-xl border-amber-100 text-amber-600 hover:bg-amber-50 font-bold h-10 px-4 gap-2"
                                        title="Download PDF"
                                    >
                                        <Download size={16} /> Download as PDF
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleDownloadPDF(version)}
                                        className="rounded-xl border-green-100 text-green-600 hover:bg-green-50 font-bold h-10 px-4 gap-2"
                                        title="Share as PDF"
                                    >
                                        <Send size={16} /> Share as PDF
                                    </Button>
                                </>
                            )}
                            
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => onEdit(version)}
                                className="rounded-xl border-indigo-50 text-indigo-600 hover:bg-indigo-50 font-bold h-10 px-4 gap-2"
                            >
                                <Edit3 size={16} /> {version.isDraft ? 'Resume Strategy' : 'Edit Strategy'}
                            </Button>

                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDelete(version)}
                                className="rounded-xl border-red-50 text-red-400 hover:text-red-600 hover:bg-red-50 font-bold h-10 px-4 gap-2"
                            >
                                <Trash2 size={16} /> Delete Strategy
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SavedStrategiesTab;
