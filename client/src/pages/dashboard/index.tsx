import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../../components/layouts/DashboardLayout';

// Lazy Load Dashboard Components
const Overview = lazy(() => import('./Overview'));
const ChatLayout = lazy(() => import('../../pages/chat/ChatLayout'));
const TaskList = lazy(() => import('../tasks/TaskList'));
const CalendarView = lazy(() => import('../calendar/CalendarView'));
const ClientList = lazy(() => import('../clients/ClientList'));
const ClientDetail = lazy(() => import('../clients/ClientDetail'));
const ClientCredentialsPage = lazy(() => import('../clients/ClientCredentialsPage'));
const ClientContentStatus = lazy(() => import('../clients/ClientContentStatus'));
// const ClientAdsPage = lazy(() => import('../../pages/clients/ClientAdsPage')); // DEPRECATED
const ClientAccountsPage = lazy(() => import('../../pages/clients/ClientAccountsPage'));
const TaskDetail = lazy(() => import('../tasks/TaskDetail'));

// Client Portal Modules
const ClientPortalLayout = lazy(() => import('../../pages/portal/ClientPortalLayout'));
const PortalDashboard = lazy(() => import('../../pages/portal/PortalDashboard'));
// Services
const MetaAdsView = lazy(() => import('../../pages/portal/services/MetaAdsView'));
const GoogleAdsView = lazy(() => import('../../pages/portal/services/GoogleAdsView'));
const SeoView = lazy(() => import('../../pages/portal/services/SeoView'));
const WebDevView = lazy(() => import('../../pages/portal/services/WebDevView'));
const ContentBrandingView = lazy(() => import('../../pages/portal/services/ContentBrandingView'));
const ApprovalsView = lazy(() => import('../../pages/portal/ApprovalsView'));
const ReportsView = lazy(() => import('../../pages/portal/ReportsView'));

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
const DataSync = lazy(() => import('../admin/DataSync')); // [New Route]
const SettingsPage = lazy(() => import('../settings/index'));


// Advanced Task Views
const TaskDashboard = lazy(() => import('../tasks/TaskDashboard'));
const MyTasks = lazy(() => import('../tasks/MyTasks'));
const TaskBoard = lazy(() => import('../tasks/TaskBoard'));
const TaskReports = lazy(() => import('../tasks/reports/index'));
const TeamPerformance = lazy(() => import('../tasks/TeamPerformance'));

// Payroll Modules
const PayrollLayout = lazy(() => import('../payroll/PayrollLayout'));
const SalaryOverview = lazy(() => import('../payroll/SalaryOverview'));
const LeavesAndHolidays = lazy(() => import('../payroll/LeavesAndHolidays'));
const Attendance = lazy(() => import('../payroll/Attendance'));
const Payslips = lazy(() => import('../payroll/Payslips'));

const SalaryCalculator = lazy(() => import('../payroll/SalaryCalculator'));
const SalaryStatementPage = lazy(() => import('../payroll/SalaryStatementPage'));
const PayrollCalendar = lazy(() => import('../payroll/PayrollCalendar'));
const PayrollSettings = lazy(() => import('../payroll/PayrollSettings'));
const PayrollProcess = lazy(() => import('../payroll/PayrollProcess'));
const PayrollReports = lazy(() => import('../payroll/PayrollReports'));

// Attendance Module
const RequestPage = lazy(() => import('../attendance/RequestPage'));
const LeaveSummaryPage = lazy(() => import('../attendance/LeaveSummaryPage'));
const CalendarPage = lazy(() => import('../attendance/CalendarPage'));
const AttendanceSummaryPage = lazy(() => import('../attendance/AttendanceSummaryPage'));
const RegularisationPage = lazy(() => import('../attendance/RegularisationPage'));
const RequestsPage = lazy(() => import('../attendance/RequestsPage'));
const LeaveHistoryPage = lazy(() => import('../attendance/LeaveHistoryPage'));
const ReportsPage = lazy(() => import('../attendance/ReportsPage'));
const BiometricDetailsPage = lazy(() => import('../attendance/BiometricDetailsPage'));
const BiometricManagerPage = lazy(() => import('../attendance/BiometricManagerPage'));
const HolidayLeavePlannerPage = lazy(() => import('../attendance/HolidayLeavePlannerPage'));
const InvoiceModule = lazy(() => import('../finance/index'));

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
                    <Route path="chat" element={<ChatLayout />} />
                    <Route path="clients" element={<ClientList />} />
                    <Route path="clients/credentials" element={<ClientCredentialsPage />} />
                    <Route path="clients/content-status" element={<ClientContentStatus />} />
                    <Route path="clients/:id" element={<ClientDetail />} />

                    {/* Advanced Task Module */}
                    <Route path="tasks" element={<TaskList />} />
                    <Route path="tasks/dashboard" element={<TaskDashboard />} />
                    <Route path="tasks/my-tasks" element={<MyTasks />} />
                    <Route path="tasks/board" element={<TaskBoard />} />

                    <Route path="tasks/:id" element={<TaskDetail />} />
                    <Route path="tasks/calendar" element={<CalendarView />} />
                    <Route path="tasks/performance" element={<TeamPerformance />} />
                    <Route path="tasks/reports" element={<TaskReports />} />
                    <Route path="calendar" element={<CalendarView />} />

                    {/* Module 3: Accounting Routes */}
                    <Route path="accounts" element={<AccountsDashboard />} />
                    <Route path="accounts/new" element={<TransactionEntry />} />
                    <Route path="accounts/overview" element={<AccountOverview />} />
                    <Route path="accounts/statement" element={<AccountStatement />} />
                    <Route path="accounts/history" element={<TransactionHistory />} />

                    {/* Finance Module */}
                    <Route path="finance/invoices" element={<InvoiceModule />} />



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
                        <Route index element={<Navigate to="history" replace />} />
                        <Route path="calculator" element={<SalaryCalculator />} />
                        <Route path="history" element={<Payslips />} />
                        <Route path="statement" element={<SalaryStatementPage />} />
                        <Route path="calendar" element={<PayrollCalendar />} />
                        <Route path="process" element={<PayrollProcess />} />
                        <Route path="reports" element={<PayrollReports />} />
                        <Route path="settings" element={<PayrollSettings />} />
                    </Route>

                    {/* Module: Attendance & Leave */}
                    <Route path="attendance/summary" element={<AttendanceSummaryPage />} />
                    <Route path="attendance/leave-request" element={<RequestPage />} />
                    <Route path="attendance/leave-summary" element={<LeaveSummaryPage />} />
                    <Route path="attendance/planner" element={<HolidayLeavePlannerPage />} />
                    <Route path="attendance/calendar" element={<CalendarPage />} />
                    <Route path="attendance/regularisation" element={<RegularisationPage />} />
                    <Route path="attendance/requests" element={<RequestsPage />} />
                    <Route path="attendance/history" element={<LeaveHistoryPage />} />
                    <Route path="attendance/history" element={<LeaveHistoryPage />} />
                    <Route path="attendance/reports" element={<ReportsPage />} />
                    <Route path="attendance/biometric" element={<BiometricDetailsPage />} />
                    <Route path="attendance/biometric-manager" element={<BiometricManagerPage />} />

                    {/* Client Dashboard Routes */}
                    <Route path="client/accounts" element={<ClientAccountsPage />} />

                    {/* NEW Client Portal Routes */}
                    <Route path="client-portal" element={<ClientPortalLayout />}>
                        <Route index element={<PortalDashboard />} />
                        <Route path="meta-ads" element={<MetaAdsView />} />
                        <Route path="google-ads" element={<GoogleAdsView />} />
                        <Route path="seo" element={<SeoView />} />
                        <Route path="web-dev" element={<WebDevView />} />
                        <Route path="content" element={<ContentBrandingView />} />
                        <Route path="branding" element={<ContentBrandingView />} />
                        <Route path="approvals" element={<ApprovalsView />} />
                        <Route path="reports" element={<ReportsView />} />
                    </Route>

                    {/* Admin Tools */}

                    <Route path="admin/sync" element={<DataSync />} />
                    <Route path="settings" element={<SettingsPage />} />

                </Routes>
            </Suspense>
        </DashboardLayout>
    );
};

export default Dashboard;
