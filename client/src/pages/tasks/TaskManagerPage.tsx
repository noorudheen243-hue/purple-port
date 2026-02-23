import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Zap } from 'lucide-react';

const TaskManagerPage = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-12">
            <div className="text-center space-y-3 mb-4">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Task Management</h1>
                <p className="text-lg text-muted-foreground">Select a workspace to manage your workflows.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
                <button
                    onClick={() => navigate('/dashboard/client-portal')}
                    className="p-10 rounded-3xl border-2 transition-all flex flex-col items-center gap-6 group border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 shadow-sm hover:shadow-xl hover:-translate-y-1"
                >
                    <div className="p-6 rounded-full bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <TrendingUp size={48} />
                    </div>
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-900">Digital Marketing Tasks</h3>
                        <p className="text-base text-gray-500 mt-2">Manage Campaigns, Ads, SEO, & Lead Pipelines</p>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/dashboard/tasks/creative')}
                    className="p-10 rounded-3xl border-2 transition-all flex flex-col items-center gap-6 group border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 shadow-sm hover:shadow-xl hover:-translate-y-1"
                >
                    <div className="p-6 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Zap size={48} />
                    </div>
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-900">Creative Tasks</h3>
                        <p className="text-base text-gray-500 mt-2">Manage Design, Video, & Internal Workflows</p>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default TaskManagerPage;
