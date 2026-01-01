import React, { useState } from 'react';
import LedgerManagement from './LedgerManagement';
import SalaryReports from './SalaryReports';
import AccountStatement from './AccountStatement';

const AccountsDashboard = () => {
    const [activeTab, setActiveTab] = useState<'ledgers' | 'reports' | 'statements'>('ledgers');

    return (
        <div className="space-y-6">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('ledgers')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ledgers'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Ledger Management
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'reports'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Salary & Wages Reports
                </button>
                <button
                    onClick={() => setActiveTab('statements')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'statements'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
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
