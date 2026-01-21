import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Calculator, FileText, Calendar, CheckSquare, BarChart3, Settings } from 'lucide-react';

// Components
import SalaryCalculator from './SalaryCalculator';
import Payslips from './Payslips';
import SalaryStatementPage from './SalaryStatementPage';
import PayrollCalendar from './PayrollCalendar';
import PayrollProcess from './PayrollProcess';
import PayrollReports from './PayrollReports';
import PayrollSettings from './PayrollSettings';

const PayrollManager = () => {
    const { user } = useAuthStore();
    const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'DEVELOPER_ADMIN' || user?.role === 'MANAGER';

    // Default tab: 'calculator' for admin, 'history' for staff
    const defaultTab = isAdminOrManager ? 'calculator' : 'history';

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Payroll Management</h2>
                <p className="text-muted-foreground">Manage salary calculation, processing, and reports.</p>
            </div>

            <Tabs defaultValue={defaultTab} className="space-y-6">
                <div className="bg-muted/40 p-2 rounded-lg border overflow-x-auto">
                    <TabsList className="bg-transparent gap-2 h-auto p-0 min-w-max justify-start">
                        {isAdminOrManager && (
                            <TabsTrigger
                                value="calculator"
                                className="data-[state=active]:bg-purple-900 data-[state=active]:text-yellow-400 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent data-[state=active]:border-yellow-400 data-[state=inactive]:border-gray-200"
                            >
                                <Calculator className="w-4 h-4 mr-2" />
                                Salary Calculator
                            </TabsTrigger>
                        )}
                        <TabsTrigger
                            value="history"
                            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-purple-900 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent data-[state=active]:border-purple-900 data-[state=inactive]:border-gray-200"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Payslip History
                        </TabsTrigger>
                        <TabsTrigger
                            value="statement"
                            className="data-[state=active]:bg-purple-900 data-[state=active]:text-yellow-400 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent data-[state=active]:border-yellow-400 data-[state=inactive]:border-gray-200"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Salary Statement
                        </TabsTrigger>
                        <TabsTrigger
                            value="calendar"
                            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-purple-900 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent data-[state=active]:border-purple-900 data-[state=inactive]:border-gray-200"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Payroll Calendar
                        </TabsTrigger>
                        {isAdminOrManager && (
                            <>
                                <TabsTrigger
                                    value="process"
                                    className="data-[state=active]:bg-purple-900 data-[state=active]:text-yellow-400 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent data-[state=active]:border-yellow-400 data-[state=inactive]:border-gray-200"
                                >
                                    <CheckSquare className="w-4 h-4 mr-2" />
                                    Payroll Process
                                </TabsTrigger>
                                <TabsTrigger
                                    value="reports"
                                    className="data-[state=active]:bg-yellow-400 data-[state=active]:text-purple-900 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent data-[state=active]:border-purple-900 data-[state=inactive]:border-gray-200"
                                >
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    Reports
                                </TabsTrigger>
                                <TabsTrigger
                                    value="settings"
                                    className="data-[state=active]:bg-purple-900 data-[state=active]:text-yellow-400 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent data-[state=active]:border-yellow-400 data-[state=inactive]:border-gray-200"
                                >
                                    <Settings className="w-4 h-4 mr-2" />
                                    Settings
                                </TabsTrigger>
                            </>
                        )}
                    </TabsList>
                </div>

                <div className="bg-card rounded-lg border shadow-sm p-6 min-h-[500px]">
                    <TabsContent value="calculator" className="mt-0">
                        <SalaryCalculator />
                    </TabsContent>
                    <TabsContent value="history" className="mt-0">
                        <Payslips />
                    </TabsContent>
                    <TabsContent value="statement" className="mt-0">
                        <SalaryStatementPage />
                    </TabsContent>
                    <TabsContent value="calendar" className="mt-0">
                        <PayrollCalendar />
                    </TabsContent>
                    <TabsContent value="process" className="mt-0">
                        <PayrollProcess />
                    </TabsContent>
                    <TabsContent value="reports" className="mt-0">
                        <PayrollReports />
                    </TabsContent>
                    <TabsContent value="settings" className="mt-0">
                        <PayrollSettings />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default PayrollManager;
