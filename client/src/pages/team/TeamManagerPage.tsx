import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, Calendar, Banknote, ClipboardList } from 'lucide-react';

// Components
import TeamList from './TeamList';
import SystemRoleManagement from './SystemRoleManagement';
import AttendanceSummaryPage from '../attendance/AttendanceSummaryPage';
import BiometricManagerPage from '../attendance/BiometricManagerPage';
import LeaveManagementPage from '../attendance/LeaveManagementPage';
import PayrollManager from '../payroll/PayrollManager';
import ApprovalsPage from './ApprovalsPage';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TeamManagerPage = () => {
    const [activeTab, setActiveTab] = useState('team');

    // Fetch Pending Counts for Badge
    const { data: pendingStats } = useQuery({
        queryKey: ['pending-approvals-count'],
        queryFn: async () => {
            const [leaves, regs] = await Promise.all([
                api.get('/leave/requests?status=PENDING'),
                api.get('/attendance/regularisation/requests?status=PENDING')
            ]);
            return (leaves.data.length || 0) + (regs.data.length || 0);
        },
        refetchInterval: 30000 // Poll every 30s
    });

    // Tabs Configuration
    const tabs = [
        { id: 'team', label: 'Team List', icon: Users, theme: 'yellow' },
        { id: 'roles', label: 'System Roles', icon: Users, theme: 'purple' },
        { id: 'attendance', label: 'Attendance', icon: ClipboardList, theme: 'yellow' },
        { id: 'biometric', label: 'Biometric Manager', icon: Shield, theme: 'purple' },
        { id: 'leave', label: 'Leave', icon: Calendar, theme: 'yellow' },
        { id: 'payroll', label: 'Payroll', icon: Banknote, theme: 'purple' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                {/* Left side empty or title if needed */}
                <div></div>
                {/* Right Side: Approvals Button */}
                <Button
                    className={`relative h-12 px-6 text-lg font-bold shadow-lg transition-all ${activeTab === 'approvals' ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-300' : 'bg-white text-gray-800 border hover:bg-gray-50'}`}
                    onClick={() => setActiveTab('approvals')}
                >
                    <ClipboardList className="w-5 h-5 mr-3" />
                    Approvals
                    {pendingStats > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow-md border-2 border-white animate-pulse">
                            {pendingStats}
                        </span>
                    )}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 mb-6 w-full justify-start border-b pb-2">
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className={`
                                data-[state=active]:bg-${tab.theme === 'purple' ? 'purple-900' : 'yellow-400'} 
                                data-[state=active]:text-${tab.theme === 'purple' ? 'yellow-400' : 'purple-900'} 
                                data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 
                                px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent 
                                data-[state=active]:border-${tab.theme === 'purple' ? 'yellow-400' : 'purple-900'} 
                                data-[state=inactive]:border-gray-200
                            `}
                        >
                            <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
                        </TabsTrigger>
                    ))}
                    {/* Hidden Trigger for Approvals to allow switching via state */}
                    <TabsTrigger value="approvals" className="hidden">Approvals</TabsTrigger>
                </TabsList>

                <div className="bg-white rounded-lg shadow-sm border p-6 min-h-[600px]">
                    <TabsContent value="team" className="mt-0">
                        <TeamList />
                    </TabsContent>
                    <TabsContent value="roles" className="mt-0">
                        <SystemRoleManagement />
                    </TabsContent>
                    <TabsContent value="attendance" className="mt-0">
                        <AttendanceSummaryPage />
                    </TabsContent>
                    <TabsContent value="biometric" className="mt-0">
                        <BiometricManagerPage />
                    </TabsContent>
                    <TabsContent value="leave" className="mt-0">
                        <LeaveManagementPage />
                    </TabsContent>
                    <TabsContent value="payroll" className="mt-0">
                        <PayrollManager />
                    </TabsContent>
                    <TabsContent value="approvals" className="mt-0">
                        <ApprovalsPage />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default TeamManagerPage;
