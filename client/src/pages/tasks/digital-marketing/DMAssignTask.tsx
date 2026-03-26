import React, { useState } from 'react';
import TaskFormModal from '../TaskFormModal';
import { PlusCircle, Layers, CheckCircle } from 'lucide-react';

const DMAssignTask = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-300 min-h-[400px]">
            <Layers className="w-16 h-16 text-indigo-200 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Assign New Task</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-8 text-sm">
                Create a new task specifically for the Digital Marketing team. Tasks created here will automatically default to the Digital Marketing department and allow specific campaign type tagging.
            </p>

            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-3 transition-colors shadow-sm hover:shadow-md"
            >
                <PlusCircle size={20} />
                Create Digital Marketing Task
            </button>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl text-left w-full">
                <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-500 mt-0.5" size={18} />
                    <div>
                        <h4 className="font-semibold text-gray-900 text-sm">Campaign Tagging</h4>
                        <p className="text-gray-500 text-xs mt-1">Tag tasks specifically to Meta Ads, SEO, Google Ads, etc.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-500 mt-0.5" size={18} />
                    <div>
                        <h4 className="font-semibold text-gray-900 text-sm">Auto-Assign</h4>
                        <p className="text-gray-500 text-xs mt-1">Easily auto-assign to relevant team members in the department.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-500 mt-0.5" size={18} />
                    <div>
                        <h4 className="font-semibold text-gray-900 text-sm">Dashboard Sync</h4>
                        <p className="text-gray-500 text-xs mt-1">Created tasks automatically sync with the analytics dashboard instantly.</p>
                    </div>
                </div>
            </div>

            <TaskFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={{ department: 'DIGITAL_MARKETING' }} // Inject default
            />
        </div>
    );
};

export default DMAssignTask;
