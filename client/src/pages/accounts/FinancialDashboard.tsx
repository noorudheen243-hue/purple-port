import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { 
    Users, 
    UserCheck, 
    Receipt, 
    FileText, 
    Search,
    TrendingUp,
    TrendingDown,
    Wallet,
    LayoutDashboard,
    History,
    Settings,
    FilePlus,
    Plus,
    CheckSquare,
    BarChart3
} from 'lucide-react';
import UnifiedLedgerManagement from './UnifiedLedgerManagement';
import ExpenseManagement from './ExpenseManagement';
import IncomeManagement from './IncomeManagement';
import UnifiedReportOverview from './UnifiedReportOverview';
import AccountOverview from './AccountOverview';
import UnifiedTransactionHistory from './UnifiedTransactionHistory';
import UnifiedAccountStatement from './UnifiedAccountStatement';
import UniversalTransactionRecorder from './UniversalTransactionRecorder';
import UnifiedLedgerCreator from './UnifiedLedgerCreator';
import InvoiceModule from '../finance';

const FinancialDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [showNewLedgerModal, setShowNewLedgerModal] = useState(false);

    const tabs = [
        { id: 'overview', name: 'Dashboard', icon: LayoutDashboard },
        { id: 'all-ledgers', name: 'Ledgers', icon: Wallet },
        { id: 'income', name: 'Income', icon: TrendingUp },
        { id: 'expenses', name: 'Expenses', icon: Receipt },
        { id: 'transactions', name: 'History', icon: History },
        { id: 'statements', name: 'Account Statement', icon: FileText },
        { id: 'invoices', name: 'Invoices', icon: FilePlus },
    ];

    return (
        <div className="w-full space-y-6">
            {/* Header with Stats & Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Financial <span className="text-purple-600 underline decoration-4 underline-offset-8">Hub</span></h1>
                    <p className="text-slate-500 mt-2 font-medium">Unified ledger management with real-time liquidity tracking.</p>
                </div>
                
                <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                    <button 
                        onClick={() => setShowRecordModal(true)}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-3xl font-black hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 uppercase tracking-widest text-sm"
                    >
                        <Plus className="w-5 h-5" /> Record Transaction
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 bg-white/50 backdrop-blur-sm p-2 rounded-[2rem] w-fit border border-slate-200 shadow-sm">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
                            activeTab === tab.id 
                                ? 'bg-purple-600 text-white shadow-lg' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Tab Content Area */}
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-2xl min-h-[700px] p-8 w-full overflow-x-auto">
                {activeTab === 'overview' && <UnifiedReportOverview />}
                {activeTab === 'all-ledgers' && <UnifiedLedgerManagement onOpenCreator={() => setShowNewLedgerModal(true)} />}
                {activeTab === 'income' && <IncomeManagement />}
                {activeTab === 'expenses' && <ExpenseManagement />}
                {activeTab === 'transactions' && <UnifiedTransactionHistory />}
                {activeTab === 'statements' && <UnifiedAccountStatement />}
                {activeTab === 'invoices' && <InvoiceModule />}
            </div>

            {/* Modals for Actions */}
            {showRecordModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-5xl max-h-[90vh] overflow-y-auto p-2 relative shadow-2xl">
                        <button onClick={() => setShowRecordModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 font-bold text-2xl z-10">✕</button>
                        <div className="p-8"><UniversalTransactionRecorder /></div>
                    </div>
                </div>
            )}

            {showNewLedgerModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-4xl relative shadow-2xl">
                        <button onClick={() => setShowNewLedgerModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 font-bold text-2xl z-10">✕</button>
                        <UnifiedLedgerCreator onSuccess={() => setShowNewLedgerModal(false)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialDashboard;
