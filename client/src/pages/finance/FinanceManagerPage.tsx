import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

// Components
import AccountOverview from '../accounts/AccountOverview';
import LedgerManagement from '../accounts/LedgerManagement';
import TransactionHistory from '../accounts/TransactionHistory';
import AccountStatement from '../accounts/AccountStatement';
import InvoiceModule from './index';

const FinanceManagerPage = () => {
    const navigate = useNavigate();

    // Tab Configuration
    // theme: alternating yellow/purple
    const tabs = [
        { id: 'overview', label: 'Account Overview', theme: 'yellow' },
        { id: 'ledger', label: 'Ledger Master', theme: 'purple' },
        { id: 'history', label: 'Transaction History', theme: 'yellow' },
        { id: 'statements', label: 'Account Statements', theme: 'purple' },
        { id: 'invoice', label: 'Client Invoice', theme: 'yellow' },
    ];

    const getTabClass = (isActive: boolean, theme: string) => {
        const base = "px-6 py-2 rounded-md font-bold transition-all shadow-sm border-2";
        if (isActive) {
            // Active State
            return theme === 'yellow'
                ? `${base} bg-yellow-400 text-purple-900 border-yellow-400`
                : `${base} bg-purple-900 text-yellow-400 border-purple-900`;
        } else {
            // Inactive State
            return theme === 'yellow'
                ? `${base} bg-yellow-400/10 text-yellow-700 border-transparent hover:bg-yellow-400/20`
                : `${base} bg-purple-900/10 text-purple-900 border-transparent hover:bg-purple-900/20 dark:text-purple-300`;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Financial Management</h1>
                    <p className="text-muted-foreground">Manage accounts, ledgers, transactions, and invoices.</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard/accounts/new')}
                    className="flex items-center gap-2 bg-purple-900 text-yellow-400 px-6 py-3 rounded-md font-bold hover:bg-purple-800 transition-colors shadow-md"
                >
                    <PlusCircle size={20} />
                    Record Transaction
                </button>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="flex flex-wrap h-auto bg-transparent gap-2 p-0 justify-start">
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent p-0"
                            asChild
                        >
                            {/* We use a custom button inside trigger to control full styling including inactive state better than shadcn default */}
                            <div className="cursor-pointer group">
                                {/* This div acts as the styled button. 
                                    Radix UI TabsTrigger handles logic, but we want custom visuals. 
                                    Actually, Shadcn TabsTrigger applies classes based on data-state. 
                                    Let's style the trigger directly for simplicity if possible, or use the render prop pattern if needed.
                                    The easiest way with Shadcn is to override classnames.
                                */}
                                <span className={`flex items-center justify-center ${tab.theme === 'yellow'
                                    ? 'data-[state=active]:bg-yellow-400 data-[state=active]:text-purple-900 data-[state=inactive]:bg-yellow-100 data-[state=inactive]:text-yellow-900'
                                    : 'data-[state=active]:bg-purple-900 data-[state=active]:text-yellow-400 data-[state=inactive]:bg-purple-100 data-[state=inactive]:text-purple-900'
                                    } px-6 py-2 rounded-md font-bold transition-all shadow-sm border-2 border-transparent hover:opacity-90`}
                                >
                                    {tab.label}
                                </span>
                            </div>
                        </TabsTrigger>
                    ))}
                </TabsList>

                <div className="bg-card rounded-lg border shadow-sm p-6 min-h-[500px]">
                    <TabsContent value="overview" className="mt-0">
                        <AccountOverview />
                    </TabsContent>

                    <TabsContent value="ledger" className="mt-0">
                        <LedgerManagement />
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                        <TransactionHistory />
                    </TabsContent>

                    <TabsContent value="statements" className="mt-0">
                        <AccountStatement />
                    </TabsContent>

                    <TabsContent value="invoice" className="mt-0">
                        <InvoiceModule />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default FinanceManagerPage;
