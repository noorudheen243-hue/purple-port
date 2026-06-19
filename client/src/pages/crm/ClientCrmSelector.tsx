import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Search, Building, ArrowRight, UserCheck, Briefcase, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Client {
    id: string;
    client_code: string | null;
    name: string;
    logo_url: string | null;
    industry: string | null;
    status: string;
}

const ClientCrmSelector: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // If user is CLIENT, direct them straight to their workspace
    if (user?.role === 'CLIENT') {
        if (user.linked_client_id) {
            return <Navigate to={`/dashboard/crm/${user.linked_client_id}`} replace />;
        } else {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-50 rounded-xl p-8 border border-slate-200">
                    <Building className="h-16 w-16 text-slate-400 mb-4 animate-bounce" />
                    <h2 className="text-xl font-bold text-slate-700">Workspace Pending</h2>
                    <p className="text-slate-500 text-center mt-2 max-w-md">
                        Your user account is not linked to a client company. Please contact support or your account administrator to connect your CRM account.
                    </p>
                </div>
            );
        }
    }

    // Fetch clients
    const { data: clients = [], isLoading } = useQuery<Client[]>({
        queryKey: ['crm-clients-list'],
        queryFn: async () => {
            const { data } = await api.get('/clients');
            return data;
        }
    });

    const filteredClients = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.client_code && client.client_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.industry && client.industry.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 w-full space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Client CRM Workspace Selector
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm md:text-base font-medium">
                        Select a client database to view generated leads, track pipeline stages, schedule follow-ups, and review campaigns.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 text-sm font-semibold self-start md:self-auto">
                    <UserCheck className="h-4 w-4" />
                    <span>Logged in as {user?.role}</span>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3 max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                        type="text"
                        placeholder="Search by client name, code, or industry..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-slate-800 placeholder-slate-400 font-medium"
                    />
                </div>
            </div>

            {/* Grid display */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-[210px] bg-white border border-slate-200 rounded-2xl animate-pulse p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-slate-200" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                                </div>
                            </div>
                            <div className="h-10 bg-slate-200 rounded-xl w-full mt-6" />
                        </div>
                    ))}
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-xl mx-auto">
                    <Building className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">No Clients Found</h3>
                    <p className="text-slate-500 mt-2 font-medium px-4">
                        {searchTerm ? 'No clients match your search criteria. Try modifying your search keywords.' : 'No clients are currently registered in the system.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client) => (
                        <Card 
                            key={client.id}
                            className="group relative border border-slate-200/80 bg-white hover:border-indigo-500 hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between"
                            onClick={() => navigate(`/dashboard/crm/${client.id}`)}
                        >
                            <CardHeader className="p-6 pb-4 flex flex-row items-start gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl group-hover:scale-105 transition-transform duration-300 shrink-0">
                                    {client.logo_url ? (
                                        <img src={client.logo_url} alt={client.name} className="h-full w-full object-contain p-2 rounded-2xl" />
                                    ) : (
                                        client.name.substring(0, 2).toUpperCase()
                                    )}
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-slate-100 text-slate-600 border-none font-bold text-[10px]" variant="outline">
                                            {client.client_code || 'N/A'}
                                        </Badge>
                                        <Badge className={`${client.status === 'LEAD' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'} border-none font-bold text-[10px]`} variant="outline">
                                            {client.status}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-lg font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors truncate pr-2">
                                        {client.name}
                                    </CardTitle>
                                    {client.industry && (
                                        <CardDescription className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                                            <Briefcase className="h-3 w-3" />
                                            {client.industry}
                                        </CardDescription>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="px-6 pb-6 pt-2 mt-auto">
                                <Button 
                                    className="w-full bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-200 text-slate-700 font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-none py-5 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/dashboard/crm/${client.id}`);
                                    }}
                                >
                                    <span>Enter CRM Workspace</span>
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 duration-300" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClientCrmSelector;
