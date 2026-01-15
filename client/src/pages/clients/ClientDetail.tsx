import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { ArrowLeft, Calendar, FileText } from 'lucide-react';
import CreateCampaignModal from '../../components/campaigns/CreateCampaignModal';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

const ClientDetail = () => {
    const { id } = useParams();
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);

    const { data: client, isLoading } = useQuery({
        queryKey: ['client', id],
        queryFn: async () => {
            const { data } = await api.get(`/clients/${id}`);
            return data;
        }
    });

    const [activeTab, setActiveTab] = useState('overview');

    if (isLoading) return <div>Loading...</div>;
    if (!client) return <div>Client not found</div>;

    const services = client.service_engagement
        ? (Array.isArray(client.service_engagement)
            ? client.service_engagement
            : (typeof client.service_engagement === 'string' ? JSON.parse(client.service_engagement) : []))
        : [];

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link to="/dashboard/clients" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-3xl font-bold">{client.name}</h1>
                <span className="text-lg text-muted-foreground font-mono">{client.client_code}</span>
                <span className="px-3 py-1 bg-muted rounded-full text-sm">{client.industry}</span>
                <Link
                    to={`/dashboard/accounts?tab=statements&entity_id=${client.id}&entity_type=CLIENT`}
                    className="ml-auto flex items-center gap-2 text-sm text-primary border border-primary px-3 py-1.5 rounded-md hover:bg-primary/5"
                >
                    <FileText size={16} /> View Ledger
                </Link>
            </div>

            {/* TABS NAVIGATION */}
            <div className="border-b flex gap-6 text-sm font-medium text-muted-foreground mb-6">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-2 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-primary text-foreground' : 'border-transparent hover:text-foreground'}`}
                >
                    Overview & Campaigns
                </button>
                <button
                    onClick={() => setActiveTab('services')}
                    className={`pb-2 border-b-2 transition-colors ${activeTab === 'services' ? 'border-primary text-foreground' : 'border-transparent hover:text-foreground'}`}
                >
                    Services & Portal Access
                </button>
                <button
                    onClick={() => setActiveTab('approvals')}
                    className={`pb-2 border-b-2 transition-colors ${activeTab === 'approvals' ? 'border-primary text-foreground' : 'border-transparent hover:text-foreground'}`}
                >
                    Approvals
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`pb-2 border-b-2 transition-colors ${activeTab === 'reports' ? 'border-primary text-foreground' : 'border-transparent hover:text-foreground'}`}
                >
                    Reports
                </button>
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Campaigns</h2>
                        <button
                            onClick={() => setIsCampaignModalOpen(true)}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm"
                        >
                            + New Campaign
                        </button>
                    </div>

                    <div className="space-y-4">
                        {client.campaigns?.map((campaign: any) => (
                            <div key={campaign.id} className="bg-card border border-border p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold">{campaign.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                                    </p>
                                </div>
                                <Link to={`/dashboard/calendar?client_id=${client.id}`} className="text-primary hover:underline flex items-center gap-2">
                                    <Calendar size={16} />
                                    View Calendar
                                </Link>
                            </div>
                        ))}
                        {client.campaigns?.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                                No campaigns yet. Create one to get started.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: SERVICES */}
            {activeTab === 'services' && (
                <div className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {['META_ADS', 'GOOGLE_ADS', 'SEO', 'WEB_DEV', 'CONTENT', 'BRANDING'].map(serviceId => {
                            const isActive = services.includes(serviceId);
                            return (
                                <Card key={serviceId} className={!isActive ? 'opacity-60 grayscale' : ''}>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center justify-between">
                                            {serviceId.replace('_', ' ')}
                                            {isActive ? <CheckCircle className="text-green-500" size={20} /> : <XCircle className="text-gray-300" size={20} />}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            {isActive ? 'Active on Client Portal' : 'Not engaged'}
                                        </p>
                                        {isActive && serviceId === 'META_ADS' && (
                                            <p className="text-xs font-medium text-blue-600 mt-2">
                                                Active Campaigns: {client.campaigns?.length || 0}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: APPROVALS */}
            {activeTab === 'approvals' && (
                <div className="animate-in fade-in duration-300">
                    <div className="bg-card border border-border p-8 rounded-lg text-center">
                        <h3 className="text-lg font-semibold mb-2">Pending Approvals</h3>
                        <p className="text-muted-foreground mb-4">Manage content or assets waiting for client approval.</p>
                        <p className="text-sm text-gray-400 italic">No pending items.</p>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: REPORTS */}
            {activeTab === 'reports' && (
                <div className="animate-in fade-in duration-300">
                    <div className="bg-card border border-border p-8 rounded-lg text-center">
                        <h3 className="text-lg font-semibold mb-2">Client Reports</h3>
                        <p className="text-muted-foreground mb-4">View and download monthly performance reports.</p>
                        <div className="flex justify-center">
                            <Button variant="outline" className="gap-2">
                                <FileText size={16} /> Generate New Report
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <CreateCampaignModal
                clientId={id!}
                isOpen={isCampaignModalOpen}
                onClose={() => setIsCampaignModalOpen(false)}
            />
        </div>
    );
};

export default ClientDetail;
