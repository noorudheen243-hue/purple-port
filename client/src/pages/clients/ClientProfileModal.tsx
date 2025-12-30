import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Building2, User, Mail, Phone, MapPin, Globe, CreditCard, Target, Users, Briefcase, DollarSign } from 'lucide-react';

interface ClientProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: any;
}

const ClientProfileModal = ({ isOpen, onClose, client }: ClientProfileModalProps) => {
    const [activeTab, setActiveTab] = useState("core");

    if (!client) return null;

    // Helper safely parse JSON
    // Helper safely parse JSON
    const parseJson = (val: any) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch { return null; }
        }
        return val;
    };

    // Helper for Image URLs
    const getFullUrl = (path?: string) => {
        if (!path) return '';
        if (path.startsWith('http') || path.startsWith('blob:')) return path;
        const baseUrl = (import.meta as any).env.VITE_API_URL
            ? (import.meta as any).env.VITE_API_URL.replace('/api', '')
            : 'http://localhost:4000';
        return `${baseUrl}${path}`;
    };

    const services = parseJson(client.service_engagement) || [];
    const social = parseJson(client.social_links) || {};
    const avatar = parseJson(client.customer_avatar) || {};
    const competitors = parseJson(client.competitor_info) || [];
    // assigned_staff might be an array of IDs or objects depending on backend, 
    // but the form uses assigned_staff_ids. We'll try to show what we have.

    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                {/* Overlay: Flex container for centering */}
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in transition-opacity">

                    {/* Content: Relative to flex container */}
                    <Dialog.Content className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col focus:outline-none relative animate-in zoom-in-95 duration-200">

                        {/* Close Button - Floating */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors z-[60]"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex-1 overflow-y-auto p-8">
                            {/* Profile Header - Clean Layout */}
                            <div className="flex flex-col md:flex-row gap-6 items-start mb-8">
                                <div className="w-32 h-32 bg-white rounded-xl shadow-md p-2 flex items-center justify-center border border-gray-100 flex-shrink-0 relative overflow-hidden">
                                    {client.logo_url ? (
                                        <img
                                            src={getFullUrl(client.logo_url)}
                                            alt={client.name}
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-blue-50 rounded-lg flex items-center justify-center text-primary">
                                            <Building2 size={40} />
                                        </div>
                                    )}
                                    {/* Fallback if image fails to load via onError */}
                                    <div className="hidden absolute inset-0 bg-gray-50 flex items-center justify-center text-gray-400">
                                        <Building2 size={32} />
                                    </div>
                                </div>
                                <div className="flex-1 pt-2">
                                    <h2 className="text-3xl font-bold text-gray-900">{client.name}</h2>
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-gray-500 font-medium">{client.industry || 'Industry N/A'}</span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${client.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {client.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b mb-6 overflow-x-auto flex-shrink-0">
                                <TabButton id="core" label="Core Info" icon={Building2} />
                                <TabButton id="services" label="Services" icon={Target} />
                                <TabButton id="team" label="Team" icon={Users} />
                                <TabButton id="ad_accounts" label="Ad Accounts" icon={DollarSign} />
                                <TabButton id="extended" label="Extended" icon={Briefcase} />
                                <TabButton id="strategy" label="Strategy" icon={Globe} />
                            </div>

                            {/* Content Area */}
                            <div className="min-h-[300px]">
                                {/* CORE INFO */}
                                {activeTab === 'core' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Details</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 text-gray-700">
                                                    <User size={16} className="text-gray-400" />
                                                    <span className="font-medium text-sm">{client.contact_person || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-gray-700">
                                                    <Mail size={16} className="text-gray-400" />
                                                    <a href={`mailto:${client.company_email}`} className="text-sm hover:text-primary hover:underline">{client.company_email || 'N/A'}</a>
                                                </div>
                                                <div className="flex items-center gap-3 text-gray-700">
                                                    <Phone size={16} className="text-gray-400" />
                                                    <span className="text-sm">{client.contact_number || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-gray-700">
                                                    <Globe size={16} className="text-gray-400" />
                                                    <a href={social.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-primary hover:underline">{social.website || 'N/A'}</a>
                                                </div>
                                                <div className="flex items-start gap-3 text-gray-700">
                                                    <MapPin size={16} className="text-gray-400 mt-0.5" />
                                                    <span className="text-sm">{client.address || 'No address provided'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Manager</h3>
                                            {client.account_manager ? (
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm">
                                                        {client.account_manager.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{client.account_manager.full_name}</p>
                                                        <p className="text-xs text-gray-500">{client.account_manager.email}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic">No account manager assigned.</p>
                                            )}
                                        </div>
                                        <div className="space-y-4 pt-4 border-t">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Execution Team</h3>
                                            {client.assigned_staff && client.assigned_staff.length > 0 ? (
                                                <div className="space-y-2">
                                                    {client.assigned_staff.map((staff: any) => (
                                                        <div key={staff.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                            {staff.avatar_url ? (
                                                                <img src={staff.avatar_url} alt={staff.full_name} className="w-8 h-8 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                                                                    {staff.full_name?.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{staff.full_name}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic">No execution team assigned.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* SERVICES */}
                                {activeTab === 'services' && (
                                    <div className="animate-in fade-in">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Engaged Services</h3>
                                        {services.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {services.map((s: string) => (
                                                    <span key={s} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic text-sm">No services listed.</p>
                                        )}
                                    </div>
                                )}

                                {/* TEAM */}
                                {activeTab === 'team' && (
                                    <div className="animate-in fade-in">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Assigned Team</h3>
                                        {/* ... (Existing Team Content) ... */}
                                        <div className="space-y-3">
                                            {/* Always show AM here too */}
                                            <div className="flex items-center gap-3 p-2 border rounded-md bg-purple-50/50">
                                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-xs">
                                                    {client.account_manager?.full_name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{client.account_manager?.full_name || 'Unassigned'}</p>
                                                    <p className="text-xs text-gray-500">Account Manager</p>
                                                </div>
                                            </div>

                                            {/* Assigned Staff List */}
                                            {client.assigned_staff && client.assigned_staff.length > 0 && (
                                                <>
                                                    {client.assigned_staff.map((staff: any) => (
                                                        <div key={staff.id} className="flex items-center gap-3 p-2 border rounded-md bg-white hover:bg-gray-50 transition-colors">
                                                            {staff.avatar_url ? (
                                                                <img src={staff.avatar_url} alt={staff.full_name} className="w-8 h-8 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                                                                    {staff.full_name?.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{staff.full_name}</p>
                                                                <p className="text-xs text-gray-500">Execution Team</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* AD ACCOUNTS */}
                                {activeTab === 'ad_accounts' && (
                                    <div className="animate-in fade-in">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Linked Ad Accounts</h3>
                                        {client.ad_accounts && client.ad_accounts.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {client.ad_accounts.map((acc: any) => (
                                                    <div key={acc.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col gap-2">
                                                        <div className="flex justify-between items-start">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-white border px-2 py-0.5 rounded text-gray-600">
                                                                {acc.platform}
                                                            </span>
                                                            <span className={`w-2 h-2 rounded-full ${acc.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-400'}`}></span>
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{acc.name}</p>
                                                            <p className="text-xs font-mono text-gray-500 mt-0.5">{acc.external_id}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed text-gray-400">
                                                <DollarSign size={24} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No ad accounts linked.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* EXTENDED */}
                                {activeTab === 'extended' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Social Presence</h3>
                                            <div className="space-y-3">
                                                {social.facebook && <div className="flex gap-2 text-sm items-center"><span className="w-20 font-medium text-gray-600">Facebook:</span> <a href={social.facebook} target="_blank" className="text-blue-600 truncate hover:underline">{social.facebook}</a></div>}
                                                {social.instagram && <div className="flex gap-2 text-sm items-center"><span className="w-20 font-medium text-gray-600">Instagram:</span> <a href={social.instagram} target="_blank" className="text-blue-600 truncate hover:underline">{social.instagram}</a></div>}
                                                {social.linkedin && <div className="flex gap-2 text-sm items-center"><span className="w-20 font-medium text-gray-600">LinkedIn:</span> <a href={social.linkedin} target="_blank" className="text-blue-600 truncate hover:underline">{social.linkedin}</a></div>}
                                                {social.twitter && <div className="flex gap-2 text-sm items-center"><span className="w-20 font-medium text-gray-600">Twitter:</span> <a href={social.twitter} target="_blank" className="text-blue-600 truncate hover:underline">{social.twitter}</a></div>}
                                                {!social.facebook && !social.instagram && !social.linkedin && !social.twitter && <p className="text-gray-500 italic text-sm">No social links configured.</p>}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Customer Avatar</h3>
                                            <div className="space-y-4">
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Description</span>
                                                    <p className="text-sm text-gray-800">{avatar.description || 'N/A'}</p>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Pain Points</span>
                                                    <p className="text-sm text-gray-800">{avatar.pain_points || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STRATEGY */}
                                {activeTab === 'strategy' && (
                                    <div className="animate-in fade-in">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Competitors</h3>
                                        {competitors.length > 0 ? (
                                            <div className="space-y-3">
                                                {competitors.map((comp: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                        <span className="font-medium text-gray-900 text-sm">{comp.name}</span>
                                                        {comp.website && <a href={comp.website} target="_blank" className="text-xs text-blue-600 hover:underline">{comp.website}</a>}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic text-sm">No competitor info.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Dialog.Content>
                </Dialog.Overlay>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default ClientProfileModal;
