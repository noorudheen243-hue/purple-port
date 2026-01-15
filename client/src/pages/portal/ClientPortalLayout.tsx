import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ClientPortalLayout = () => {
    const { user } = useAuthStore();

    // Extra safety: Only CLIENT, ADMIN, MANAGER should access?
    // For now, we assume route guards handle the main role check.

    return (
        <div className="client-portal-container space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Client Portal</h1>
                    <p className="text-muted-foreground">Manage your services, approvals, and reports.</p>
                </div>
            </div>
            <Outlet />
        </div>
    );
};

export default ClientPortalLayout;
