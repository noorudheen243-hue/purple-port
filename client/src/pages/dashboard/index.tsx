import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';

// Lazy Load Dashboard Components
const Overview = lazy(() => import('./Overview'));
const TaskList = lazy(() => import('../tasks/TaskList'));
const CalendarView = lazy(() => import('../calendar/CalendarView'));
const ClientList = lazy(() => import('../clients/ClientList'));
const ClientDetail = lazy(() => import('../clients/ClientDetail'));
const TaskDetail = lazy(() => import('../tasks/TaskDetail'));
const AccountsDashboard = lazy(() => import('../accounts/AccountsDashboard'));
const TransactionEntry = lazy(() => import('../accounts/TransactionEntry'));
const AccountOverview = lazy(() => import('../accounts/AccountOverview'));
const AccountStatement = lazy(() => import('../accounts/AccountStatement'));
const TransactionHistory = lazy(() => import('../accounts/TransactionHistory'));

const ROIDashboard = lazy(() => import('../ad_intelligence/ROIDashboard'));
const TeamList = lazy(() => import('../team/TeamList'));
const TeamProfile = lazy(() => import('../team/TeamProfile'));
const SystemRoleManagement = lazy(() => import('../team/SystemRoleManagement'));
const OnboardingPage = lazy(() => import('../team/OnboardingPage'));

// Advanced Task Views
const TaskDashboard = lazy(() => import('../tasks/TaskDashboard'));
const MyTasks = lazy(() => import('../tasks/MyTasks'));
const TaskBoard = lazy(() => import('../tasks/TaskBoard'));
const TeamPerformance = lazy(() => import('../tasks/TeamPerformance'));

// Payroll Modules
const PayrollLayout = lazy(() => import('../payroll/PayrollLayout'));
const SalaryOverview = lazy(() => import('../payroll/SalaryOverview'));
const LeavesAndHolidays = lazy(() => import('../payroll/LeavesAndHolidays'));
const Attendance = lazy(() => import('../payroll/Attendance'));
const Payslips = lazy(() => import('../payroll/Payslips'));

const SalaryCalculator = lazy(() => import('../payroll/SalaryCalculator'));

const DashboardLoading = () => (
    <div className="flex-1 flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
);

const Dashboard = () => {
    return (
        <DashboardLayout>
            <Suspense fallback={<DashboardLoading />}>
                <Routes>
                    {/* ... other routes ... */}
                    <Route index element={<Overview />} />
                    <Route path="clients" element={<ClientList />} />
                    <Route path="clients/:id" element={<ClientDetail />} />

                    {/* Advanced Task Module */}
                    <Route path="tasks" element={<TaskList />} />
                    <Route path="tasks/dashboard" element={<TaskDashboard />} />
                    <Route path="tasks/my-tasks" element={<MyTasks />} />
                    <Route path="tasks/board" element={<TaskBoard />} />

                    <Route path="tasks/:id" element={<TaskDetail />} />
                    <Route path="tasks/calendar" element={<CalendarView />} />
                    <Route path="tasks/performance" element={<TeamPerformance />} />
                    <Route path="calendar" element={<CalendarView />} />

                    {/* Module 3: Accounting Routes */}
                    <Route path="accounts" element={<AccountsDashboard />} />
                    <Route path="accounts/new" element={<TransactionEntry />} />
                    <Route path="accounts/overview" element={<AccountOverview />} />
                    <Route path="accounts/statement" element={<AccountStatement />} />
                    <Route path="accounts/history" element={<TransactionHistory />} />



                    {/* Module 4: Ad Intelligence */}
                    <Route path="roi" element={<ROIDashboard />} />

                    {/* Module 5: Team Management */}
                    <Route path="team" element={<TeamList />} />
                    <Route path="team/onboard" element={<OnboardingPage />} />
                    <Route path="team/edit/:id" element={<OnboardingPage />} />
                    <Route path="team/roles" element={<SystemRoleManagement />} />
                    <Route path="team/:id" element={<TeamProfile />} />

                    {/* Module 6: Payroll Management */}
                    <Route path="payroll" element={<PayrollLayout />}>
                        <Route index element={<Navigate to="calculator" replace />} />
                        <Route path="calculator" element={<SalaryCalculator />} />
                        <Route path="history" element={<Payslips />} />
                        <Route path="attendance-summary" element={<Attendance />} />
                        <Route path="leaves" element={<LeavesAndHolidays />} />
                        {/* Reports - Placeholder for now */}
                        <Route path="reports" element={<SalaryOverview />} />
                    </Route>
                </Routes>
            </Suspense>
        </DashboardLayout>
    );
};

export default Dashboard;
