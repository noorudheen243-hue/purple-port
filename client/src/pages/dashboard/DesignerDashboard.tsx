import React from 'react';

const DesignerDashboard = () => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Status Columns */}
                {['To Do', 'In Progress', 'Review', 'Done'].map((status) => (
                    <div key={status} className="bg-muted/30 p-4 rounded-lg min-h-[500px]">
                        <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">{status}</h3>

                        <div className="space-y-3">
                            {/* Placeholder Kanban Cards */}
                            <div className="p-4 bg-card border border-border rounded shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-medium">Graphic</span>
                                    <span className="text-[10px] text-muted-foreground">Oct 24</span>
                                </div>
                                <p className="text-sm font-medium">Hero Banner Design</p>
                                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>id: #1234</span>
                                    <div className="w-5 h-5 rounded-full bg-slate-500/20"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DesignerDashboard;
