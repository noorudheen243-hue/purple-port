import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import LedgerManagement from './LedgerManagement';
import SalaryReports from './SalaryReports';
import AccountStatement from './AccountStatement';
import UnifiedLedgerManagement from './UnifiedLedgerManagement';
import UnifiedLedgerStatement from './UnifiedLedgerStatement';

const AccountsDashboard = () => {
    const [activeTab, setActiveTab] = useState<'ledgers' | 'reports' | 'statements' | 'unified-ledgers' | 'unified-statements'>('ledgers');

    // Fetch Unified System Status
    const { data: unifiedStatus } = useQuery({
        queryKey: ['unified-status'],
        queryFn: async () => (await api.get('/accounting/unified/status')).data
    });

    const isUnified = unifiedStatus?.enabled;

    const getTabClass = (tabName: string, variant: 'primary' | 'unified' = 'primary') => {
        const isActive = activeTab === tabName;
        if (variant === 'unified') {
             return `px-6 py-2 rounded-md font-bold transition-all shadow-sm border-2 ${isActive
                ? 'bg-purple-900 text-yellow-400 border-yellow-400'
                : 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200'
            }`;
        }
        return `px-6 py-2 rounded-md font-bold transition-all shadow-sm border-2 ${isActive
                ? 'bg-purple-900 text-yellow-400 border-yellow-400'
                : 'bg-yellow-400 text-purple-900 border-transparent hover:opacity-90'
            }`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2 bg-transparent p-0 w-fit">
                <button
                    onClick={() => setActiveTab('ledgers')}
                    className={getTabClass('ledgers')}
                >
                    Ledger Management
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={getTabClass('reports')}
                >
                    Salary & Wages Reports
                </button>
                <button
                    onClick={() => setActiveTab('statements')}
                    className={getTabClass('statements')}
                >
                    Statements
                </button>

                {/* Unified System Tabs */}
                <button
                    onClick={() => setActiveTab('unified-ledgers')}
                    className={getTabClass('unified-ledgers', 'unified')}
                >
                    Unified Ledgers (New)
                </button>
                <button
                    onClick={() => setActiveTab('unified-statements')}
                    className={getTabClass('unified-statements', 'unified')}
                >
                    Unified Statements
                </button>
            </div>

            {activeTab === 'ledgers' && <LedgerManagement />}
            {activeTab === 'reports' && <SalaryReports />}
            {activeTab === 'statements' && <AccountStatement />}
            {activeTab === 'unified-ledgers' && <UnifiedLedgerManagement />}
            {activeTab === 'unified-statements' && <UnifiedLedgerStatement />}
        </div>
    );
};

export default AccountsDashboard;
