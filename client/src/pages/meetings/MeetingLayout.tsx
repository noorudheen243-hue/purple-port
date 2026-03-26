import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { ROLES } from '../../utils/roles';
import { useAuthStore } from '../../store/authStore';
import { LayoutDashboard, Calendar, Users, FileText, Inbox, BarChart3 } from 'lucide-react';

const MeetingLayout = () => {
    const { user } = useAuthStore();
    const location = useLocation();

    // Differentiate each tab with different colors as requested
    const isAdmin = user && ([ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN] as string[]).includes(user.role);

    // Filter available tabs based on role
    const tabs = [
        { name: "Dashboard", path: "/dashboard/meetings", icon: LayoutDashboard, color: "text-blue-600 bg-blue-50 border-blue-600", inactive: "hover:bg-blue-50/50 hover:text-blue-600" },
        { name: "Scheduled Meeting", path: "/dashboard/meetings/scheduled", icon: Calendar, color: "text-purple-600 bg-purple-50 border-purple-600", inactive: "hover:bg-purple-50/50 hover:text-purple-600" },
        { name: "MoM Center", path: "/dashboard/meetings/mom", icon: FileText, color: "text-orange-600 bg-orange-50 border-orange-600", inactive: "hover:bg-orange-50/50 hover:text-orange-600" },
    ];

    if (isAdmin) {
        tabs.push(
            { name: "Admin Inbox", path: "/dashboard/meetings/admin-inbox", icon: Inbox, color: "text-red-600 bg-red-50 border-red-600", inactive: "hover:bg-red-50/50 hover:text-red-600" },
            { name: "Reports & Stats", path: "/dashboard/meetings/reports", icon: BarChart3, color: "text-indigo-600 bg-indigo-50 border-indigo-600", inactive: "hover:bg-indigo-50/50 hover:text-indigo-600" }
        );
    }


    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Tab Navigation */}
            <div className="bg-white border-b border-gray-200 px-6 pt-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage, schedule, and review team meetings</p>
                    </div>
                </div>
                
                <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-[-1px]">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = location.pathname === tab.path;
                        return (
                            <NavLink
                                key={tab.name}
                                to={tab.path}
                                end={tab.path === "/dashboard/meetings"}
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap
                                    ${isActive ? tab.color : 'text-gray-500 border-transparent ' + tab.inactive}
                                `}
                            >
                                <Icon size={18} />
                                {tab.name}
                            </NavLink>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                <Outlet />
            </div>
        </div>
    );
};

export default MeetingLayout;
