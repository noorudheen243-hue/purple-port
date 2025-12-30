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
            return <ManagerDashboard />;
        case 'MARKETING_EXEC':
            return <ExecutiveDashboard />;
        case 'DESIGNER':
        case 'WEB_SEO':
            return <DesignerDashboard />;
        default:
            return <div>Unknown Role</div>;
    }
};

export default Overview;
