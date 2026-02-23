import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { FileText, Download, Plus, ChevronDown, X, Calendar, Layers } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Swal from 'sweetalert2';

interface ReportsViewProps {
    clientIdProp?: string;
}

const ReportsView: React.FC<ReportsViewProps> = ({ clientIdProp }) => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'DEVELOPER_ADMIN';

    // State for selector if needed
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    // Determines active client ID
    const urlClientId = searchParams.get('clientId');
    const clientId = clientIdProp || (isAdmin ? (selectedClientId || urlClientId) : user?.linked_client_id);

    // Generation State
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [genPeriod, setGenPeriod] = useState('MONTHLY');
    const [genDate, setGenDate] = useState(new Date().toISOString().split('T')[0]);
    const [genServices, setGenServices] = useState<string[]>([]);

    // Fetch clients for selector if admin
    const { data: clients } = useQuery({
        queryKey: ['clients-list-simple'],
        queryFn: async () => (await api.get('/clients')).data,
        enabled: isAdmin && !clientIdProp
    });

    // Fetch Client Details to get Active Services
    const { data: clientDetails } = useQuery({
        queryKey: ['client-details-reports', clientId],
        queryFn: async () => {
            if (!clientId) return null;
            const { data } = await api.get(`/clients/${clientId}`);
            return data;
        },
        enabled: !!clientId
    });

    const activeServices = clientDetails ? (
        Array.isArray(clientDetails.service_engagement) ? clientDetails.service_engagement :
            (typeof clientDetails.service_engagement === 'string' ? JSON.parse(clientDetails.service_engagement) : [])
    ) : [];

    const { data: reports = [], isLoading } = useQuery({
        queryKey: ['client-reports', clientId],
        queryFn: async () => {
            if (isAdmin && !clientId) return [];
            const { data } = await api.get(`/client-portal/reports?clientId=${clientId || ''}`);
            return data;
        },
        enabled: !!clientId
    });

    const generateMutation = useMutation({
        mutationFn: async () => {
            if (!clientId) return;

            // Calculate Dates based on Period
            let from = new Date(genDate);
            let to = new Date(genDate);

            if (genPeriod === 'MONTHLY') {
                from.setDate(1); // Start of month
                to = new Date(from);
                to.setMonth(to.getMonth() + 1);
                to.setDate(0); // End of month
            } else if (genPeriod === 'WEEKLY') {
                const day = from.getDay();
                const diff = from.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                from.setDate(diff); // Monday
                to = new Date(from);
                to.setDate(to.getDate() + 6); // Sunday
            } else if (genPeriod === 'YEARLY') {
                from.setMonth(0, 1);
                to.setMonth(11, 31);
            }
            // Daily is just the selected date

            await api.post('/client-portal/reports/generate', {
                clientId: clientId,
                from_date: from,
                to_date: to,
                type: 'GENERATED',
                period: genPeriod,
                services: genServices
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-reports'] });
            Swal.fire('Generating', 'Report generation started. It will appear here shortly.', 'info');
            setIsGenerateOpen(false);
            setGenServices([]); // Reset
        },
        onError: () => {
            Swal.fire('Error', 'Failed to start generation', 'error');
        }
    });

    // Content Handling
    if (isAdmin && !clientId && !clientIdProp) {
        return (
            <div className="p-8 space-y-6">
                <h2 className="text-2xl font-bold">Performance Reports</h2>
                <Card className="max-w-md mx-auto p-6 border-dashed text-center space-y-4">
                    <h3 className="text-lg font-medium">Select a Client</h3>
                    <p className="text-sm text-muted-foreground">Choose a client to view and generate reports for.</p>
                    <div className="relative">
                        <select
                            className="w-full h-10 pl-3 pr-10 rounded-md border border-input bg-background"
                            onChange={(e) => setSelectedClientId(e.target.value)}
                            value={selectedClientId || ''}
                        >
                            <option value="">-- Select Client --</option>
                            {clients?.sort((a: any, b: any) => a.name.localeCompare(b.name)).map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    {c.client_code ? `${c.client_code} - ` : ''}{c.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in relative">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold">Performance Reports</h2>
                    {isAdmin && clientId && (
                        <p className="text-xs text-muted-foreground">Viewing reports for Client ID: {clientId.substring(0, 8)}...</p>
                    )}
                </div>

                {isAdmin && (
                    <div className="flex items-center gap-2">
                        {!clientIdProp && (
                            <Button variant="outline" size="sm" onClick={() => setSelectedClientId(null)}>Change Client</Button>
                        )}
                        <Button onClick={() => setIsGenerateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Generate New Report
                        </Button>
                    </div>
                )}
            </div>

            {/* Generation Modal Overlay */}
            {isGenerateOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg">Generate New Report</h3>
                            <button onClick={() => setIsGenerateOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Period Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 block">1. Select Period</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setGenPeriod(p)}
                                            className={`py-2 px-3 text-sm font-medium rounded-md border text-center transition-colors ${genPeriod === p
                                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 block flex items-center gap-2">
                                    <Calendar size={14} />
                                    2. Select Reference Date
                                </label>
                                <input
                                    type="date"
                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                    value={genDate}
                                    onChange={(e) => setGenDate(e.target.value)}
                                />
                                <p className="text-xs text-gray-500 italic">
                                    {genPeriod === 'MONTHLY' ? 'Select any date in the target month' :
                                        genPeriod === 'WEEKLY' ? 'Select any date in the target week' :
                                            genPeriod === 'YEARLY' ? 'Select any date in the target year' : 'Select the specific date'}
                                </p>
                            </div>

                            {/* Service Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 block flex items-center gap-2">
                                    <Layers size={14} />
                                    3. Include Services
                                </label>
                                {activeServices.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                                        {activeServices.map((svc: string) => (
                                            <label key={svc} className="flex items-center gap-2 text-sm border p-2 rounded cursor-pointer hover:bg-gray-50">
                                                <input
                                                    type="checkbox"
                                                    checked={genServices.includes(svc)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setGenServices([...genServices, svc]);
                                                        else setGenServices(genServices.filter(s => s !== svc));
                                                    }}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="capitalize">{svc.replace('_', ' ').toLowerCase()}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
                                        Client has no active services configured.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() => generateMutation.mutate()}
                                disabled={generateMutation.isPending || activeServices.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {generateMutation.isPending ? 'Generating...' : 'Start Generation'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? <div>Loading reports...</div> : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {reports.length === 0 ? (
                        <div className="col-span-3 text-center py-12 border rounded-lg bg-gray-50 border-dashed">
                            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                            <p className="text-muted-foreground">No reports generated yet.</p>
                            {isAdmin && <p className="text-xs text-gray-400 mt-1">Click "Generate New Report" to create one.</p>}
                        </div>
                    ) : reports.map((report: any) => (
                        <Card key={report.id} className="hover:shadow-md transition-shadow group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gray-50/50 border-b">
                                <CardTitle className="text-sm font-medium leading-normal truncate pr-2" title={report.title}>
                                    {report.title}
                                </CardTitle>
                                <FileText className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="text-xs text-muted-foreground mb-4 space-y-1">
                                    <div className="flex justify-between">
                                        <span>Type:</span>
                                        <span className="font-medium text-gray-700">{report.period || 'GENERAL'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Created:</span>
                                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${report.status === 'READY' ? 'bg-green-100 text-green-700' :
                                        report.status === 'GENERATING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {report.status}
                                    </span>
                                    {report.status === 'READY' && report.file_url && (
                                        <a href={report.file_url} target="_blank" rel="noreferrer">
                                            <Button variant="ghost" size="sm" className="h-7 text-primary hover:text-primary/80 px-2">
                                                <Download className="h-3 w-3 mr-1" /> Download
                                            </Button>
                                        </a>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReportsView;
