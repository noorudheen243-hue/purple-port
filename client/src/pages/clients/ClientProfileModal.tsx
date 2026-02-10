import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Building2, User, Mail, Phone, MapPin, Globe, CreditCard, Target, Users, Briefcase, DollarSign, Hash } from 'lucide-react';

import { getAssetUrl } from '../../lib/utils';

interface ClientProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: any;
}

const ClientProfileModal = ({ isOpen, onClose, client }: ClientProfileModalProps) => {
    const [activeTab, setActiveTab] = useState("core");

    if (!client) return null;

    // Helper safely parse JSON
    const parseJson = (val: any) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch { return null; }
        }
        return val;
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
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
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
                    <Dialog.Content className="bg-background text-foreground rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col focus:outline-none relative animate-in zoom-in-95 duration-200 border border-border">

                        {/* Close Button - Floating */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-full transition-colors z-[60]"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex-1 overflow-y-auto p-8">
                            {/* Profile Header - Clean Layout */}
                            <div className="flex flex-col md:flex-row gap-6 items-start mb-8">
                                <div className="w-32 h-32 bg-card rounded-xl shadow-md p-2 flex items-center justify-center border border-border flex-shrink-0 relative overflow-hidden">
                                    {client.logo_url ? (
                                        <img
                                            src={getAssetUrl(client.logo_url)}
                                            alt={client.name}
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-blue-50 dark:bg-blue-950/30 rounded-lg flex items-center justify-center text-primary">
                                            <Building2 size={40} />
                                        </div>
                                    )}
                                    {/* Fallback if image fails to load via onError */}
                                    <div className="hidden absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground">
                                        <Building2 size={32} />
                                    </div>
                                </div>
                                <div className="flex-1 pt-2">
                                    <h2 className="text-3xl font-bold text-foreground">{client.name}</h2>
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-muted-foreground font-medium">{client.industry || 'Industry N/A'}</span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${client.status === 'ACTIVE' ? 'bg-primary/20 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
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
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact Details</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 text-foreground">
                                                    <Hash size={16} className="text-muted-foreground" />
                                                    <span className="font-mono font-medium text-sm text-foreground bg-muted/30 px-2 py-0.5 rounded border border-border">{client.client_code || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-foreground">
                                                    <User size={16} className="text-muted-foreground" />
                                                    <span className="font-medium text-sm">{client.contact_person || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-foreground">
                                                    <Mail size={16} className="text-muted-foreground" />
                                                    <a href={`mailto:${client.company_email}`} className="text-sm hover:text-primary hover:underline">{client.company_email || 'N/A'}</a>
                                                </div>
                                                <div className="flex items-center gap-3 text-foreground">
                                                    <Phone size={16} className="text-muted-foreground" />
                                                    <span className="text-sm">{client.contact_number || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-foreground">
                                                    <Globe size={16} className="text-muted-foreground" />
                                                    <a href={social.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-primary hover:underline">{social.website || 'N/A'}</a>
                                                </div>
                                                <div className="flex items-start gap-3 text-foreground">
                                                    <MapPin size={16} className="text-muted-foreground mt-0.5" />
                                                    <span className="text-sm">{client.address || 'No address provided'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Account Manager</h3>
                                            {client.account_manager ? (
                                                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                                                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center text-primary font-bold text-sm">
                                                        {client.account_manager.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{client.account_manager.full_name}</p>
                                                        <p className="text-xs text-muted-foreground">{client.account_manager.email}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground italic">No account manager assigned.</p>
                                            )}
                                        </div>
                                        <div className="space-y-4 pt-4 border-t">
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned Execution Team</h3>
                                            {client.assigned_staff && client.assigned_staff.length > 0 ? (
                                                <div className="space-y-2">
                                                    {client.assigned_staff.map((staff: any) => (
                                                        <div key={staff.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border border-border">
                                                            {staff.avatar_url ? (
                                                                <img src={getAssetUrl(staff.avatar_url)} alt={staff.full_name} className="w-8 h-8 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                                                                    {staff.full_name?.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-sm font-medium text-foreground">{staff.full_name}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground italic">No execution team assigned.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* SERVICES */}
                                {activeTab === 'services' && (
                                    <div className="animate-in fade-in">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Engaged Services</h3>
                                        {services.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {services.map((s: string) => {
                                                    // Map ID to Label
                                                    const labels: Record<string, string> = {
                                                        'META_ADS': 'Meta Ads',
                                                        'GOOGLE_ADS': 'Google Ads',
                                                        'SEO': 'SEO',
                                                        'WEB_DEV': 'Web Development',
                                                        'CONTENT': 'Content Creation',
                                                        'BRANDING': 'Branding'
                                                    };
                                                    return (
                                                        <span key={s} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-100 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                            {labels[s] || s}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground italic text-sm">No services listed.</p>
                                        )}
                                    </div>
                                )}

                                {/* TEAM */}
                                {activeTab === 'team' && (
                                    <div className="animate-in fade-in">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Assigned Team</h3>
                                        {/* ... (Existing Team Content) ... */}
                                        <div className="space-y-3">
                                            {/* Always show AM here too */}
                                            <div className="flex items-center gap-3 p-2 border rounded-md bg-primary/5 border-primary/10/50">
                                                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-primary font-bold text-xs">
                                                    {client.account_manager?.full_name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{client.account_manager?.full_name || 'Unassigned'}</p>
                                                    <p className="text-xs text-muted-foreground">Account Manager</p>
                                                </div>
                                            </div>

                                            {/* Assigned Staff List */}
                                            {client.assigned_staff && client.assigned_staff.length > 0 && (
                                                <>
                                                    {client.assigned_staff.map((staff: any) => (
                                                        <div key={staff.id} className="flex items-center gap-3 p-2 border rounded-md bg-background hover:bg-muted/30 transition-colors">
                                                            {staff.avatar_url ? (
                                                                <img src={getAssetUrl(staff.avatar_url)} alt={staff.full_name} className="w-8 h-8 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                                                                    {staff.full_name?.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-sm font-medium text-foreground">{staff.full_name}</p>
                                                                <p className="text-xs text-muted-foreground">Execution Team</p>
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
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Linked Ad Accounts</h3>
                                        {client.ad_accounts && client.ad_accounts.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {client.ad_accounts.map((acc: any) => (
                                                    <div key={acc.id} className="bg-muted/30 p-4 rounded-lg border border-border flex flex-col gap-2">
                                                        <div className="flex justify-between items-start">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-background border px-2 py-0.5 rounded text-foreground">
                                                                {acc.platform}
                                                            </span>
                                                            <span className={`w-2 h-2 rounded-full ${acc.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-400'}`}></span>
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-foreground">{acc.name}</p>
                                                            <p className="text-xs font-mono text-muted-foreground mt-0.5">{acc.external_id}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center p-8 bg-muted/30 rounded-lg border border-dashed text-muted-foreground">
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
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Social Presence</h3>
                                            <div className="space-y-3">
                                                {social.facebook && <div className="flex gap-2 text-sm items-center"><span className="w-20 font-medium text-foreground">Facebook:</span> <a href={social.facebook} target="_blank" className="text-primary hover:underline truncate hover:underline">{social.facebook}</a></div>}
                                                {social.instagram && <div className="flex gap-2 text-sm items-center"><span className="w-20 font-medium text-foreground">Instagram:</span> <a href={social.instagram} target="_blank" className="text-primary hover:underline truncate hover:underline">{social.instagram}</a></div>}
                                                {social.linkedin && <div className="flex gap-2 text-sm items-center"><span className="w-20 font-medium text-foreground">LinkedIn:</span> <a href={social.linkedin} target="_blank" className="text-primary hover:underline truncate hover:underline">{social.linkedin}</a></div>}
                                                {social.twitter && <div className="flex gap-2 text-sm items-center"><span className="w-20 font-medium text-foreground">Twitter:</span> <a href={social.twitter} target="_blank" className="text-primary hover:underline truncate hover:underline">{social.twitter}</a></div>}
                                                {!social.facebook && !social.instagram && !social.linkedin && !social.twitter && <p className="text-muted-foreground italic text-sm">No social links configured.</p>}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Customer Avatar</h3>
                                            <div className="space-y-4">
                                                <div className="bg-muted/30 p-3 rounded-lg">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Description</span>
                                                    <p className="text-sm text-foreground">{avatar.description || 'N/A'}</p>
                                                </div>
                                                <div className="bg-muted/30 p-3 rounded-lg">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Pain Points</span>
                                                    <p className="text-sm text-foreground">{avatar.pain_points || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STRATEGY */}
                                {activeTab === 'strategy' && (
                                    <div className="animate-in fade-in">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Content Strategy (Monthly)</h3>
                                        {client.content_strategies && client.content_strategies.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                                                {client.content_strategies.map((strat: any) => (
                                                    <div key={strat.id} className="bg-primary/5 border-primary/10 p-3 rounded-lg border border-primary/10 flex justify-between items-center">
                                                        <span className="font-medium text-primary text-sm">{strat.type}</span>
                                                        <span className="bg-background px-2 py-0.5 rounded text-xs font-bold text-primary shadow-sm border">{strat.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground italic text-sm mb-8">No content strategy defined.</p>
                                        )}

                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Competitors</h3>
                                        {competitors.length > 0 ? (
                                            <div className="space-y-3">
                                                {competitors.map((comp: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                                                        <span className="font-medium text-foreground text-sm">{comp.name}</span>
                                                        {comp.website && <a href={comp.website} target="_blank" className="text-xs text-primary hover:underline hover:underline">{comp.website}</a>}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground italic text-sm">No competitor info.</p>
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
