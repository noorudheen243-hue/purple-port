import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { ArrowLeft, Calendar, FileText } from 'lucide-react';
import CreateCampaignModal from '../../components/campaigns/CreateCampaignModal';

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

    if (isLoading) return <div>Loading...</div>;
    if (!client) return <div>Client not found</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link to="/dashboard/clients" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-3xl font-bold">{client.name}</h1>
                <span className="px-3 py-1 bg-muted rounded-full text-sm">{client.industry}</span>
                <Link
                    to={`/dashboard/accounts?tab=statements&entity_id=${client.id}&entity_type=CLIENT`}
                    className="ml-auto flex items-center gap-2 text-sm text-primary border border-primary px-3 py-1.5 rounded-md hover:bg-primary/5"
                >
                    <FileText size={16} /> View Ledger
                </Link>
            </div>

            <div>
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

            <CreateCampaignModal
                clientId={id!}
                isOpen={isCampaignModalOpen}
                onClose={() => setIsCampaignModalOpen(false)}
            />
        </div>
    );
};

export default ClientDetail;
