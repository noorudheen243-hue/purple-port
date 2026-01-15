import React from 'react';
import { useAuthStore } from '../../store/authStore';
import ExecutiveDashboard from './ExecutiveDashboard';
import DesignerDashboard from './DesignerDashboard';
import ManagerDashboard from './ManagerDashboard';

const Overview = () => {
    const { user } = useAuthStore();

    switch (user?.role) {
        case 'ADMIN':
        case 'MANAGER':
        case 'DEVELOPER_ADMIN':
            return <ManagerDashboard />;
        case 'MARKETING_EXEC':
        case 'DM_EXECUTIVE':
        case 'WEB_SEO':
        case 'WEB_SEO_EXECUTIVE':
            return <ExecutiveDashboard />;
        case 'DESIGNER':
        case 'CREATIVE_DESIGNER':
            return <DesignerDashboard />;
        default:
            // Fallback for known but unmapped roles, or genuinely unknown
            // If it contains "DESIGNER", show Designer.
            if (user?.role.includes('DESIGNER')) return <DesignerDashboard />;
            if (user?.role.includes('EXECUTIVE')) return <ExecutiveDashboard />;
            if (user?.role.includes('ADMIN') || user?.role.includes('MANAGER')) return <ManagerDashboard />;

            return <div className="p-8 text-center text-gray-500">
                <h3 className="text-xl font-bold mb-2">Welcome, {user?.full_name}</h3>
                <p>Dashboard view not configured for role: {user?.role}</p>
            </div>;
    }
};

export default Overview;
