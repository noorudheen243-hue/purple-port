import {
    LayoutDashboard,
    User,
    Users,
    Shield,
    CheckSquare,
    TrendingUp,
    Wallet,
    KanbanSquare,
    Zap,
    Users as UsersIcon,
    List,
    PlusCircle,
    ClipboardList,
    Calendar,
    BarChart3,
    FileText,
    Banknote,
    Settings,
    Calculator,
    MessageSquare
} from 'lucide-react';
import { ROLES } from '../utils/roles';

export interface MenuItem {
    label: string;
    path?: string;
    icon?: any;
    children?: MenuItem[];
    roles?: string[]; // If specific items inside a menu are restricted
    highlight?: boolean;
}

export const ADMIN_MANAGER_MENU: MenuItem[] = [
    {
        label: "Overview",
        path: "/dashboard",
        icon: LayoutDashboard
    },
    {
        label: "Client Management",
        path: "/dashboard/client-manager",
        icon: User
    },
    {
        label: "Financial Management",
        icon: Wallet,
        roles: [ROLES.ADMIN, ROLES.DEVELOPER_ADMIN],
        children: [
            { label: "Account Overview", path: "/dashboard/accounts/overview", icon: BarChart3 },
            { label: "Ledger Master", path: "/dashboard/accounts", icon: List },
            { label: "Transaction History", path: "/dashboard/accounts/history", icon: ClipboardList },
            { label: "Record Transaction", path: "/dashboard/accounts/new", icon: PlusCircle },
            { label: "Account Statement", path: "/dashboard/accounts/statement", icon: FileText },
            { label: "Client Invoice", path: "/dashboard/finance/invoices", icon: FileText, roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN] },
        ]
    },
    {
        label: "Team Management",
        icon: Users,
        children: [
            { label: "Team", path: "/dashboard/team", icon: List },
            { label: "Systems Roles", path: "/dashboard/team/roles", icon: Shield, roles: [ROLES.ADMIN, ROLES.DEVELOPER_ADMIN], highlight: true },
            { label: "Attendance", path: "/dashboard/attendance/summary", icon: ClipboardList },
            { label: "Biometric Manager", path: "/dashboard/attendance/biometric-manager", icon: Shield, roles: [ROLES.ADMIN, ROLES.DEVELOPER_ADMIN] },
            { label: "Leave", path: "/dashboard/leave", icon: Calendar },
            {
                label: "Payroll",
                icon: Banknote,
                children: [
                    { label: "Salary Calculator", path: "/dashboard/payroll/calculator", icon: Calculator, roles: [ROLES.ADMIN, ROLES.DEVELOPER_ADMIN] },
                    { label: "Payslip History", path: "/dashboard/payroll/history", icon: FileText },
                    { label: "Salary Statement", path: "/dashboard/payroll/statement", icon: FileText },
                    { label: "Payroll Calendar", path: "/dashboard/payroll/calendar", icon: Calendar },
                    { label: "Payroll Process", path: "/dashboard/payroll/process", icon: CheckSquare, roles: [ROLES.ADMIN, ROLES.DEVELOPER_ADMIN] },
                    { label: "Payroll Reports", path: "/dashboard/payroll/reports", icon: BarChart3, roles: [ROLES.ADMIN, ROLES.DEVELOPER_ADMIN] },
                    { label: "Payroll Settings", path: "/dashboard/payroll/settings", icon: Settings, roles: [ROLES.ADMIN, ROLES.DEVELOPER_ADMIN] }
                ]
            }
        ]
    },
    {
        label: "Task Management",
        icon: CheckSquare,
        children: [
            { label: "Dashboard", path: "/dashboard/tasks/dashboard", icon: LayoutDashboard },
            { label: "DM Tasks", path: "/dashboard/client-portal", icon: TrendingUp },
            {
                label: "Creative Tasks",
                icon: Zap,
                children: [
                    { label: "My Tasks", path: "/dashboard/tasks/my-tasks", icon: ClipboardList },
                    { label: "New Task", path: "/dashboard/tasks?action=new", icon: PlusCircle },
                    { label: "Task Board", path: "/dashboard/tasks/board", icon: KanbanSquare },
                    { label: "Calendar", path: "/dashboard/tasks/calendar", icon: Calendar },
                    { label: "Team Performance", path: "/dashboard/tasks/performance", icon: UsersIcon, roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN] },
                    { label: "Reports", path: "/dashboard/tasks/reports", icon: BarChart3, roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.DEVELOPER_ADMIN] }
                ]
            }
        ]
    },
    {
        label: "Payroll",
        icon: Banknote,
        children: [
            { label: "Salary Calculator", path: "/dashboard/payroll/calculator", icon: Calculator, roles: [ROLES.ADMIN, ROLES.DEVELOPER_ADMIN] },
            { label: "Payslip History", path: "/dashboard/payroll/history", icon: FileText },
            { label: "Salary Statement", path: "/dashboard/payroll/statement", icon: FileText },
            { label: "Payroll Calendar", path: "/dashboard/payroll/calendar", icon: Calendar },
            { label: "Payroll Process", path: "/dashboard/payroll/process", icon: CheckSquare, roles: [ROLES.ADMIN, ROLES.DEVELOPER_ADMIN] },
            { label: "Payroll Reports", path: "/dashboard/payroll/reports", icon: BarChart3, roles: [ROLES.ADMIN, ROLES.DEVELOPER_ADMIN] },
            { label: "Payroll Settings", path: "/dashboard/payroll/settings", icon: Settings, roles: [ROLES.ADMIN, ROLES.DEVELOPER_ADMIN] }
        ]
    }
];

export const STAFF_MENU: MenuItem[] = [
    {
        label: "Overview",
        path: "/dashboard",
        icon: LayoutDashboard
    },
    {
        label: "Client Management",
        path: "/dashboard/client-manager",
        icon: User
    },
    {
        label: "Task Management",
        icon: CheckSquare,
        children: [
            { label: "Dashboard", path: "/dashboard/tasks/dashboard", icon: LayoutDashboard },
            { label: "DM Tasks", path: "/dashboard/client-portal", icon: TrendingUp },
            {
                label: "Creative Tasks",
                icon: Zap,
                children: [
                    { label: "My Tasks", path: "/dashboard/tasks/my-tasks", icon: ClipboardList },
                    { label: "New Task", path: "/dashboard/tasks?action=new", icon: PlusCircle },
                    { label: "Task Board", path: "/dashboard/tasks/board", icon: KanbanSquare },
                    { label: "Calendar", path: "/dashboard/tasks/calendar", icon: Calendar }
                ]
            }
        ]
    },
    {
        label: "Calendar",
        path: "/dashboard/calendar",
        icon: Calendar
    },
    {
        label: "Leave",
        path: "/dashboard/leave",
        icon: Calendar
    },
    {
        label: "Payroll",
        icon: Banknote,
        children: [
            { label: 'Payslips', path: '/dashboard/payroll/history', icon: FileText },
            { label: 'Salary Statement', path: '/dashboard/payroll/statement', icon: FileText },
            { label: 'Payroll Calendar', path: '/dashboard/payroll/calendar', icon: Calendar }
        ]
    },

];

export const CLIENT_MENU: MenuItem[] = [
    {
        label: "Service Portal",
        path: "/dashboard/client-portal",
        icon: TrendingUp
    },
    {
        label: "Accounts",
        path: "/dashboard/client/accounts",
        icon: Wallet
    },
    {
        label: "Settings",
        path: "/dashboard/settings",
        icon: Settings
    }
];
