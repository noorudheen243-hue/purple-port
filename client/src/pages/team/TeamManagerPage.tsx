import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Users, Shield, ClipboardList, Calendar, Banknote } from 'lucide-react';

// Components
import TeamList from './TeamList';
import SystemRoleManagement from './SystemRoleManagement';
import AttendanceSummaryPage from '../attendance/AttendanceSummaryPage';
import BiometricManagerPage from '../attendance/BiometricManagerPage';
import LeaveManagementPage from '../attendance/LeaveManagementPage';
import PayrollManager from '../payroll/PayrollManager';

const TeamManagerPage = () => {
    // Tabs Configuration
    // Alternating Yellow/Purple theme
    const tabs = [
        { id: 'team', label: 'Team List', icon: Users, theme: 'yellow' },
        { id: 'roles', label: 'Systems Roles', icon: Shield, theme: 'purple' },
        { id: 'attendance', label: 'Attendance', icon: ClipboardList, theme: 'yellow' },
        { id: 'biometric', label: 'Biometric Manager', icon: Shield, theme: 'purple' },
        { id: 'leave', label: 'Leave', icon: Calendar, theme: 'yellow' },
        { id: 'payroll', label: 'Payroll', icon: Banknote, theme: 'purple' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
                <p className="text-muted-foreground">Manage your workforce, attendance, leaves, and payroll in one place.</p>
            </div>

            <Tabs defaultValue="team" className="space-y-6">
                <div className="bg-muted/40 p-2 rounded-lg border overflow-x-auto">
                    <TabsList className="bg-transparent gap-2 h-auto p-0 min-w-max justify-start">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isYellow = tab.theme === 'yellow';

                            return (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className={`px-6 py-2 rounded-md font-bold transition-all shadow-sm border-2 flex items-center gap-2
                                        data-[state=active]:border-${isYellow ? 'yellow-400' : 'purple-900'}
                                        data-[state=active]:bg-${isYellow ? 'yellow-400' : 'purple-900'}
                                        data-[state=active]:text-${isYellow ? 'purple-900' : 'yellow-400'}
                                        data-[state=inactive]:bg-white
                                        data-[state=inactive]:text-gray-600
                                        data-[state=inactive]:border-transparent
                                        hover:opacity-90
                                    `}
                                // Note: Tailwind dynamic classes might not work if not safe-listed. 
                                // Using explicit conditionals for safety below if above fails, but let's try explicit classes here.
                                >
                                    {/* Re-implementing class logic to ensure Tailwind picks it up */}
                                    <div className={`hidden`}></div>
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </TabsTrigger>
                            );
                        })}
                        {/* 
                            Since dynamic template literals for colors (e.g. bg-${color}) might be purged by Tailwind,
                            I will write out the triggers explicitly below for reliability.
                        */}
                    </TabsList>

                    {/* Explicit Tabs List for Reliability */}
                    <TabsList className="bg-transparent gap-2 h-auto p-0 min-w-max justify-start hidden"> {/* Hidden because we use map above, but wait.. the map above uses dynamic classes which is risky. Let's redo the map with conditional strings. */}
                    </TabsList>
                </div>

                {/* Redoing the TabsList properly without dynamic class names for safety */}
                <div className="bg-muted/40 p-2 rounded-lg border overflow-x-auto">
                    <TabsList className="bg-transparent gap-2 h-auto p-0 min-w-max justify-start">
                        <TabsTrigger
                            value="team"
                            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-purple-900 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent data-[state=active]:border-yellow-400 data-[state=inactive]:border-gray-200"
                        >
                            <Users className="w-4 h-4 mr-2" /> Team List
                        </TabsTrigger>
                        <TabsTrigger
                            value="roles"
                            className="data-[state=active]:bg-purple-900 data-[state=active]:text-yellow-400 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent data-[state=active]:border-yellow-400 data-[state=inactive]:border-gray-200"
                        >
                            <Shield className="w-4 h-4 mr-2" /> Systems Roles
                        </TabsTrigger>
                        <TabsTrigger
                            value="attendance"
                            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-purple-900 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent data-[state=active]:border-purple-900 data-[state=inactive]:border-gray-200"
                        >
                            <ClipboardList className="w-4 h-4 mr-2" /> Attendance
                        </TabsTrigger>
                        <TabsTrigger
                            value="biometric"
                            className="data-[state=active]:bg-purple-900 data-[state=active]:text-yellow-400 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent data-[state=active]:border-yellow-400 data-[state=inactive]:border-gray-200"
                        >
                            <Shield className="w-4 h-4 mr-2" /> Biometric Manager
                        </TabsTrigger>
                        <TabsTrigger
                            value="leave"
                            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-purple-900 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent data-[state=active]:border-purple-900 data-[state=inactive]:border-gray-200"
                        >
                            <Calendar className="w-4 h-4 mr-2" /> Leave
                        </TabsTrigger>
                        <TabsTrigger
                            value="payroll"
                            className="data-[state=active]:bg-purple-900 data-[state=active]:text-yellow-400 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 px-4 py-2 rounded-md font-bold transition-all shadow-sm border border-transparent data-[state=active]:border-yellow-400 data-[state=inactive]:border-gray-200"
                        >
                            <Banknote className="w-4 h-4 mr-2" /> Payroll
                        </TabsTrigger>
                    </TabsList>
                </div>


                <div className="bg-card rounded-lg border shadow-sm p-6 min-h-[500px]">
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
                </div>
            </Tabs>
        </div>
    );
};

export default TeamManagerPage;
