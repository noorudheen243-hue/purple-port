import React, { useState } from 'react';
import { Users, PlusCircle, BarChart3, Shield, User } from 'lucide-react';
import ClientList from './ClientList';
import ClientContentStatus from './ClientContentStatus';
import ClientCredentialsPage from './ClientCredentialsPage';
import { useAuthStore } from '../../store/authStore';
import { ROLES } from '../../utils/roles';

const ClientManagerPage = () => {
    const [activeTab, setActiveTab] = useState<'LIST' | 'NEW' | 'STATUS' | 'ACCESS'>('LIST');
    const { user } = useAuthStore();

    const canManageAccess = user?.role === ROLES.ADMIN || user?.role === ROLES.DEVELOPER_ADMIN || user?.role === ROLES.MANAGER;

    const renderContent = () => {
        switch (activeTab) {
            case 'LIST':
                return <ClientList />;
            case 'NEW':
                // Renders ClientList but triggers the modal immediately via prop
                return <ClientList defaultOpenCreate={true} />;
            case 'STATUS':
                return <ClientContentStatus />;
            case 'ACCESS':
                if (!canManageAccess) return <div className="p-4 text-red-500">Access Restricted</div>;
                return <ClientCredentialsPage />;
            default:
                return <ClientList />;
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Client Manager</h1>
                    <p className="text-muted-foreground">Manage client profiles, content status, and access credentials.</p>
                </div>

                <div className="bg-muted/40 p-2 rounded-lg border overflow-x-auto">
                    <div className="flex items-center gap-2 min-w-max">
                        {/* 1. Clients (View Clients) (Yellow) */}
                        <button
                            onClick={() => setActiveTab('LIST')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all border flex items-center gap-2 ${activeTab === 'LIST'
                                ? 'bg-yellow-400 text-black border-yellow-500 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200'
                                }`}
                        >
                            <User className="w-4 h-4" />
                            Clients
                        </button>

                        {/* 2. Add New Clients (Purple) */}
                        <button
                            onClick={() => setActiveTab('NEW')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all border flex items-center gap-2 ${activeTab === 'NEW'
                                ? 'bg-purple-700 text-white border-purple-800 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                                }`}
                        >
                            <PlusCircle className="w-4 h-4" />
                            Add New Clients
                        </button>

                        {/* 3. Client Content Status (Yellow) */}
                        <button
                            onClick={() => setActiveTab('STATUS')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all border flex items-center gap-2 ${activeTab === 'STATUS'
                                ? 'bg-yellow-400 text-black border-yellow-500 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200'
                                }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            Client Content Status
                        </button>

                        {/* 4. Client Access (Purple) - Only for Admins & Managers */}
                        {canManageAccess && (
                            <button
                                onClick={() => setActiveTab('ACCESS')}
                                className={`px-4 py-2 text-sm font-bold rounded-md transition-all border flex items-center gap-2 ${activeTab === 'ACCESS'
                                    ? 'bg-purple-700 text-white border-purple-800 shadow-md'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                                    }`}
                            >
                                <Shield className="w-4 h-4" />
                                Client Access
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-6">
                {renderContent()}
            </div>
        </div>
    );
};

export default ClientManagerPage;
