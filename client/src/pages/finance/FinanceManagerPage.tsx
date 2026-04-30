import React from 'react';
import FinancialDashboard from '../accounts/FinancialDashboard';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const FinanceManagerPage = () => {
    // Fetch Unified System Status to decide whether to show the Hub or the legacy view
    const { data: unifiedStatus, isLoading } = useQuery({
        queryKey: ['unified-status'],
        queryFn: async () => (await api.get('/accounting/unified/status')).data
    });

    if (isLoading) return <div className="p-20 text-center animate-pulse font-black text-slate-400">INITIALIZING FINANCIAL ECOSYSTEM...</div>;

    // If Unified System is enabled (which it is for this user), show the Financial Hub ONLY.
    if (unifiedStatus?.enabled) {
        return <FinancialDashboard />;
    }

    // Fallback for legacy (though we are moving towards 100% unified)
    return (
        <div className="p-20 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Unified System Required</h1>
            <p className="text-slate-500 mt-2">Please enable the Unified Ledger Protocol in settings.</p>
        </div>
    );
};

export default FinanceManagerPage;
