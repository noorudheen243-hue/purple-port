import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import LedgerManagement from './LedgerManagement';
import SalaryReports from './SalaryReports';
import AccountStatement from './AccountStatement';
import FinancialDashboard from './FinancialDashboard';
import UnifiedLedgerStatement from './UnifiedLedgerStatement';

const AccountsDashboard = () => {
    const [activeTab, setActiveTab] = useState<'ledgers' | 'reports' | 'statements' | 'hub' | 'unified-statements'>('hub');

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
                {isUnified && (
                    <button
                        onClick={() => setActiveTab('hub')}
                        className={getTabClass('hub', 'unified')}
                    >
                        ✨ Financial Hub
                    </button>
                )}
                
                <button
                    onClick={() => setActiveTab('ledgers')}
                    className={getTabClass('ledgers')}
                >
                    Legacy Ledgers
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={getTabClass('reports')}
                >
                    Salary Reports
                </button>
                <button
                    onClick={() => setActiveTab('statements')}
                    className={getTabClass('statements')}
                >
                    Legacy Statements
                </button>

                {isUnified && (
                    <button
                        onClick={() => setActiveTab('unified-statements')}
                        className={getTabClass('unified-statements', 'unified')}
                    >
                        Statement Engine
                    </button>
                )}
            </div>

            {activeTab === 'hub' && <FinancialDashboard />}
            {activeTab === 'ledgers' && <LedgerManagement />}
            {activeTab === 'reports' && <SalaryReports />}
            {activeTab === 'statements' && <AccountStatement />}
            {activeTab === 'unified-statements' && <UnifiedLedgerStatement />}
        </div>
    );
};

export default AccountsDashboard;
