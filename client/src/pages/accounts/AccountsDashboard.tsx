import React, { useState } from 'react';
import LedgerManagement from './LedgerManagement';
import SalaryReports from './SalaryReports';
import AccountStatement from './AccountStatement';

const AccountsDashboard = () => {
    const [activeTab, setActiveTab] = useState<'ledgers' | 'reports' | 'statements'>('ledgers');

    const getTabClass = (tabName: string) => {
        const isActive = activeTab === tabName;
        return `px-6 py-2 rounded-md font-bold transition-all shadow-sm border-2 ${isActive
                ? 'bg-purple-900 text-yellow-400 border-yellow-400'
                : 'bg-yellow-400 text-purple-900 border-transparent hover:opacity-90'
            }`;
    };

    return (
        <div className="space-y-6">
            <div className="flex space-x-2 bg-transparent p-0 w-fit">
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
            </div>

            {activeTab === 'ledgers' && <LedgerManagement />}
            {activeTab === 'reports' && <SalaryReports />}
            {activeTab === 'statements' && <AccountStatement />}
        </div>
    );
};

export default AccountsDashboard;
