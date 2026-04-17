import React, { useState } from 'react';
import { Target, BarChart3 } from 'lucide-react';
import ContentStrategyEditor from './ContentStrategyEditor';
import ClientContentStatus from '../clients/ClientContentStatus';

const ContentManagementPage = () => {
    const [activeTab, setActiveTab] = useState<'STRATEGY' | 'STATUS'>('STRATEGY');

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Content Management</h1>
                    <p className="text-muted-foreground">Manage client content strategy and track execution status.</p>
                </div>

                <div className="bg-muted/40 p-2 rounded-lg border overflow-x-auto">
                    <div className="flex items-center gap-2 min-w-max">
                        <button
                            onClick={() => setActiveTab('STRATEGY')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all border flex items-center gap-2 ${activeTab === 'STRATEGY'
                                ? 'bg-pink-600 text-white border-pink-700 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-200'
                                }`}
                        >
                            <Target className="w-4 h-4" />
                            Client Content Strategy (Monthly Commitments)
                        </button>

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
                    </div>
                </div>
            </div>

            <div className="mt-6">
                {activeTab === 'STRATEGY' && <ContentStrategyEditor />}
                {activeTab === 'STATUS' && <ClientContentStatus />}
            </div>
        </div>
    );
};

export default ContentManagementPage;
