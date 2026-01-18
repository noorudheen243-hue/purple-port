import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils';
// import { Link } from 'react-router-dom'; // Using Link for name only? No, requirement says "clicking the client... popup".
import { Link, useNavigate } from 'react-router-dom'; // Keep Link for other navigations if needed, but row click is modal.
import { Users, Pencil, Trash2, Plus, ArrowRight, CheckCircle } from 'lucide-react';
import ClientFormModal from './ClientFormModal';
import ClientProfileModal from './ClientProfileModal';
import { useLocation } from 'react-router-dom';

// Custom Confirmation Modal Component (Inline for simplicity or split file if needed)
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, type = 'danger' }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

const ClientList = () => {
    const queryClient = useQueryClient();
    const location = useLocation();
    const navigate = useNavigate();

    // Modals state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);


    // Data state
    const [clientToEdit, setClientToEdit] = useState<any>(null);
    const [clientToView, setClientToView] = useState<any>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: 'DELETE' | 'EDIT', id?: string, client?: any } | null>(null);

    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'new') {
            setClientToEdit(null);
            setIsFormOpen(true);
        }
    }, [location.search]);

    const { data: clients, isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            const { data } = await api.get('/clients');
            return data;
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/clients/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsConfirmOpen(false);
        },
        onError: (err: any) => {
            alert("Failed to delete: " + (err.response?.data?.message || err.message));
            setIsConfirmOpen(false);
        }
    });

    // --- Action Handlers ---

    const initiateDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setConfirmAction({ type: 'DELETE', id });
        setIsConfirmOpen(true);
    };

    const initiateEdit = (e: React.MouseEvent, client: any) => {
        e.stopPropagation();
        setConfirmAction({ type: 'EDIT', client });
        setIsConfirmOpen(true);
    };

    const handleConfirm = () => {
        if (!confirmAction) return;

        if (confirmAction.type === 'DELETE' && confirmAction.id) {
            deleteMutation.mutate(confirmAction.id);
        } else if (confirmAction.type === 'EDIT' && confirmAction.client) {
            setClientToEdit(confirmAction.client);
            setIsFormOpen(true);
            setIsConfirmOpen(false);
        }
    };

    const handleCreate = () => {
        setClientToEdit(null);
        setIsFormOpen(true);
    };

    const handleViewProfile = (client: any) => {
        setClientToView(client);
        setIsProfileOpen(true);
    };

    if (isLoading) return <div>Loading clients...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Clients</h2>
                <button
                    onClick={handleCreate}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
                >
                    <Plus size={16} />
                    New Client
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700 w-24">ID</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Client Name</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Industry</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Active Services</th>
                            <th className="px-6 py-4 font-semibold text-gray-700 text-center">Ledger</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Campaigns</th>
                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {clients?.map((client: any) => {
                            const services = client.service_engagement ? (typeof client.service_engagement === 'string' ? JSON.parse(client.service_engagement) : client.service_engagement) : [];
                            return (
                                <tr
                                    key={client.id}
                                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                                    onClick={() => handleViewProfile(client)}
                                >
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500 font-semibold">
                                        {client.client_code || '-'}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        <div className="flex items-center gap-3">
                                            {client.logo_url ? (
                                                <img
                                                    src={getAssetUrl(client.logo_url)}
                                                    alt={client.name}
                                                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="p-2 bg-primary/10 rounded-full text-primary">
                                                    <Users size={16} />
                                                </div>
                                            )}
                                            {client.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{client.industry || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${client.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {client.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {services.length > 0 ? services.slice(0, 3).map((s: string) => (
                                                <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] border border-blue-100 font-medium whitespace-nowrap">
                                                    {s.replace('_', ' ')}
                                                </span>
                                            )) : <span className="text-gray-300 text-xs">-</span>}
                                            {services.length > 3 && (
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] border border-gray-200 font-medium">
                                                    +{services.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {client.ledger_options?.create ? (
                                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded-full border border-green-200 font-medium">
                                                <CheckCircle size={10} className="fill-green-600 text-white" /> Active
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 text-[10px]">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{client._count?.campaigns || 0}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 isolate z-10">
                                            <button
                                                onClick={(e) => initiateEdit(e, client)}
                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => initiateDelete(e, client.id)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {clients?.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No clients found.
                    </div>
                )}
            </div>

            {/* Edit/Create Form Modal */}
            <ClientFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                clientToEdit={clientToEdit}
            />

            {/* View Profile Modal */}
            <ClientProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                client={clientToView}
            />

            {/* Custom Confirmation Modal */}
            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirm}
                title={confirmAction?.type === 'DELETE' ? 'Delete Client' : 'Edit Client'}
                message={confirmAction?.type === 'DELETE'
                    ? "Are you sure you want to delete this client? This action cannot be undone."
                    : "Do you want to edit details for this client?"}
                type={confirmAction?.type === 'DELETE' ? 'danger' : 'info'}
            />
        </div>
    );
};

export default ClientList;
