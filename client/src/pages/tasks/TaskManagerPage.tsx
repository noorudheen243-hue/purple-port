import React, { useState } from 'react';
import { TrendingUp, Zap } from 'lucide-react';

// Components
import PortalDashboard from '../portal/PortalDashboard';
import CreativeTaskManager from './CreativeTaskManager';

const TaskManagerPage = () => {
    const [activeTab, setActiveTab] = useState<'dm' | 'creative'>('dm');

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
                <p className="text-muted-foreground">Manage digital marketing campaigns and creative workflows.</p>
            </div>

            {/* Big Toggle Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => setActiveTab('dm')}
                    className={`p-6 rounded-xl border-2 transition-all flex items-center gap-4 group ${activeTab === 'dm'
                            ? 'border-purple-600 bg-purple-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/50'
                        }`}
                >
                    <div className={`p-4 rounded-full ${activeTab === 'dm' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-purple-100 group-hover:text-purple-600'}`}>
                        <TrendingUp size={32} />
                    </div>
                    <div className="text-left">
                        <h3 className={`text-xl font-bold ${activeTab === 'dm' ? 'text-purple-900' : 'text-gray-700'}`}>Digital Marketing Tasks</h3>
                        <p className={`text-sm ${activeTab === 'dm' ? 'text-purple-700' : 'text-gray-500'}`}>Manage Ads, SEO, & Content Services</p>
                    </div>
                </button>

                <button
                    onClick={() => setActiveTab('creative')}
                    className={`p-6 rounded-xl border-2 transition-all flex items-center gap-4 group ${activeTab === 'creative'
                            ? 'border-blue-600 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50'
                        }`}
                >
                    <div className={`p-4 rounded-full ${activeTab === 'creative' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                        <Zap size={32} />
                    </div>
                    <div className="text-left">
                        <h3 className={`text-xl font-bold ${activeTab === 'creative' ? 'text-blue-900' : 'text-gray-700'}`}>Creative Tasks</h3>
                        <p className={`text-sm ${activeTab === 'creative' ? 'text-blue-700' : 'text-gray-500'}`}>Manage Design, Video, & Internal Tasks</p>
                    </div>
                </button>
            </div>

            {/* Content Area */}
            <div className="mt-8">
                {activeTab === 'dm' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <PortalDashboard />
                    </div>
                )}
                {activeTab === 'creative' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CreativeTaskManager />
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskManagerPage;
