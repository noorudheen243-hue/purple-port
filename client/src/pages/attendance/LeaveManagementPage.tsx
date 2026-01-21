import React, { useState } from 'react';
import { ClipboardList, Calendar, PlusCircle, FileText, CheckSquare, List } from 'lucide-react';
import LeaveSummaryPage from './LeaveSummaryPage';
import CalendarPage from './CalendarPage';
import RequestPage from './RequestPage';
import LeaveHistoryPage from './LeaveHistoryPage';
import HolidayLeavePlannerPage from './HolidayLeavePlannerPage';

const LeaveManagementPage = () => {
    const [activeTab, setActiveTab] = useState<'SUMMARY' | 'CALENDAR' | 'REQUEST' | 'HISTORY' | 'PLANNER'>('SUMMARY');

    const renderContent = () => {
        switch (activeTab) {
            case 'SUMMARY':
                return <LeaveSummaryPage />;
            case 'CALENDAR':
                return <CalendarPage />;
            case 'REQUEST':
                return <RequestPage />;
            case 'HISTORY':
                return <LeaveHistoryPage />;
            case 'PLANNER':
                return <HolidayLeavePlannerPage />;
            default:
                return <LeaveSummaryPage />;
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Leave Management</h1>
                    <p className="text-muted-foreground">Manage leaves, holidays, and requests.</p>
                </div>

                <div className="bg-muted/40 p-2 rounded-lg border overflow-x-auto">
                    <div className="flex items-center gap-2 min-w-max">
                        {/* 1. Leave Summary (Yellow) */}
                        <button
                            onClick={() => setActiveTab('SUMMARY')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all border flex items-center gap-2 ${activeTab === 'SUMMARY'
                                    ? 'bg-yellow-400 text-black border-yellow-500 shadow-md'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200'
                                }`}
                        >
                            <List className="w-4 h-4" />
                            Leave Summary
                        </button>

                        {/* 2. Leave Calendar (Purple) */}
                        <button
                            onClick={() => setActiveTab('CALENDAR')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all border flex items-center gap-2 ${activeTab === 'CALENDAR'
                                    ? 'bg-purple-700 text-white border-purple-800 shadow-md'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                                }`}
                        >
                            <Calendar className="w-4 h-4" />
                            Leave Calendar
                        </button>

                        {/* 3. Leave Request (Yellow) */}
                        <button
                            onClick={() => setActiveTab('REQUEST')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all border flex items-center gap-2 ${activeTab === 'REQUEST'
                                    ? 'bg-yellow-400 text-black border-yellow-500 shadow-md'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200'
                                }`}
                        >
                            <PlusCircle className="w-4 h-4" />
                            Leave Request
                        </button>

                        {/* 4. Leave History (Purple) */}
                        <button
                            onClick={() => setActiveTab('HISTORY')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all border flex items-center gap-2 ${activeTab === 'HISTORY'
                                    ? 'bg-purple-700 text-white border-purple-800 shadow-md'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                                }`}
                        >
                            <ClipboardList className="w-4 h-4" />
                            Leave History
                        </button>

                        {/* 5. Leave & Holiday Planner (Yellow) */}
                        <button
                            onClick={() => setActiveTab('PLANNER')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all border flex items-center gap-2 ${activeTab === 'PLANNER'
                                    ? 'bg-yellow-400 text-black border-yellow-500 shadow-md'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200'
                                }`}
                        >
                            <CheckSquare className="w-4 h-4" />
                            Leave & Holiday Planner
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                {renderContent()}
            </div>
        </div>
    );
};

export default LeaveManagementPage;
