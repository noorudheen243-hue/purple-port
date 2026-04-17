import React, { useState } from 'react';
import { MetaLeads } from './MetaLeads';
import SalesPipelinePage from './SalesPipelinePage';
import ClientAccountsPage from '../clients/ClientAccountsPage';
import { 
    Users, Briefcase, Calculator, 
    CreditCard, TrendingUp, Search,
    Filter, Layout, List
} from 'lucide-react';

interface TeamspaceManagerProps {
    clientId?: string;
}

const TeamspaceManager: React.FC<TeamspaceManagerProps> = ({ clientId }) => {
    const [subTab, setSubTab] = useState<'leads' | 'contacts' | 'accounts' | 'deals' | 'forecasts'>('leads');

    const tabs = [
        { id: 'leads', name: 'Leads', icon: List },
        { id: 'contacts', name: 'Contacts', icon: Users },
        { id: 'accounts', name: 'Accounts', icon: CreditCard },
        { id: 'deals', name: 'Deals', icon: Briefcase },
        { id: 'forecasts', name: 'Forecasts', icon: Calculator }
    ];

    return (
        <div className="flex flex-col h-full bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            {/* Sub-navigation Header */}
            <div className="px-8 pt-8 pb-4 border-b border-gray-50 bg-gray-50/30">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <Layout className="w-5 h-5 text-purple-600" />
                            Client Teamspace
                        </h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Unified CRM Workspace</p>
                    </div>
                </div>

                <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 w-fit shadow-sm">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSubTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                                subTab === tab.id 
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' 
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-8">
                {subTab === 'leads' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <MetaLeads clientId={clientId || ''} />
                    </div>
                )}
                
                {subTab === 'deals' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <SalesPipelinePage clientId={clientId} />
                    </div>
                )}

                {subTab === 'accounts' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* We need to pass clientId through searchParams or props if we refactor ClientAccountsPage */}
                        {/* For now, we use the existing page which looks at entity_id param or handles its own state */}
                        <ClientAccountsPage />
                    </div>
                )}

                {subTab === 'contacts' && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
                        <Users className="w-12 h-12 opacity-20" />
                        <div className="text-center">
                            <p className="font-black text-gray-900">Client Contacts</p>
                            <p className="text-sm">Manage team members and primary contacts for this client.</p>
                        </div>
                        <button className="bg-gray-900 text-white px-6 py-2 rounded-xl text-xs font-bold mt-4">Add Contact</button>
                    </div>
                )}

                {subTab === 'forecasts' && (
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="p-8 bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-10">
                                <TrendingUp className="w-48 h-48" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-purple-400 font-black text-xs uppercase tracking-[0.2em] mb-4">Revenue Forecast Alpha</p>
                                <h3 className="text-5xl font-black tracking-tighter mb-8">AI-Powered Projections</h3>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="p-6 bg-white/10 rounded-3xl backdrop-blur-md">
                                        <p className="text-gray-400 text-xs font-bold uppercase mb-2">Target Close Value</p>
                                        <div className="text-3xl font-black">$42,500</div>
                                    </div>
                                    <div className="p-6 bg-white/10 rounded-3xl backdrop-blur-md">
                                        <p className="text-gray-400 text-xs font-bold uppercase mb-2">Risk Factor</p>
                                        <div className="text-3xl font-black text-green-400">LOW</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamspaceManager;
