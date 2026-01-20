import React from 'react';
import { useAuthStore } from '../../store/authStore';
import ExecutiveDashboard from './ExecutiveDashboard';
import DesignerDashboard from './DesignerDashboard';
import ManagerDashboard from './ManagerDashboard';

import { ROLES } from '../../utils/roles';
import { Navigate } from 'react-router-dom';

const Overview = () => {
    const { user } = useAuthStore();

    if (!user) return null;

    // Redirect Clients to Portal
    if (user.role === ROLES.CLIENT) {
        return <Navigate to="/dashboard/client-portal" replace />;
    }

    switch (user.role) {
        case ROLES.DEVELOPER_ADMIN:
        case ROLES.ADMIN:
        case ROLES.MANAGER:
            return <ManagerDashboard />;

        case ROLES.DM_EXECUTIVE:
        case ROLES.MARKETING_EXEC:
        case ROLES.WEB_SEO_EXECUTIVE:
        case ROLES.OPERATIONS_EXECUTIVE:
            // Legacy fallback support if needed, but prefer strict
            return <ExecutiveDashboard />;

        case ROLES.CREATIVE_DESIGNER:
            return <DesignerDashboard />;

        default:
            // Fuzzy match fallbacks for legacy data safety
            if (user.role.includes('DESIGNER')) return <DesignerDashboard />;
            if (user.role.includes('EXECUTIVE')) return <ExecutiveDashboard />;
            if (user.role.includes('ADMIN') || user.role.includes('MANAGER')) return <ManagerDashboard />;

            return <div className="p-8 text-center text-gray-500">
                <h3 className="text-xl font-bold mb-2">Welcome, {user.full_name}</h3>
                <p>Dashboard view not configured for role: {user.role}</p>
            </div>;
    }
};

export default Overview;
