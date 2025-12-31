
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
    Settings
} from 'lucide-react';

export interface MenuItem {
    label: string;
    path?: string;
    icon?: any;
    children?: MenuItem[];
    roles?: string[]; // If specific items inside a menu are restricted
}

export const ADMIN_MANAGER_MENU: MenuItem[] = [
    {
        label: "Overview",
        path: "/dashboard",
        icon: LayoutDashboard
    },
    {
        label: "Client",
        icon: User,
        children: [
            { label: "View Clients", path: "/dashboard/clients", icon: List },
            { label: "Add New Client", path: "/dashboard/clients?action=new", icon: PlusCircle },
            { label: "Content Status", path: "/dashboard/clients/content-status", icon: BarChart3 }
        ]
    },
    {
        label: "Financial Management",
        icon: Wallet,
        roles: ['ADMIN'],
        children: [
            { label: "Account Overview", path: "/dashboard/accounts/overview", icon: BarChart3 },
            { label: "Ledger Master", path: "/dashboard/accounts", icon: List },
            { label: "Transaction History", path: "/dashboard/accounts/history", icon: ClipboardList },
            { label: "Record Transaction", path: "/dashboard/accounts/new", icon: PlusCircle },
            { label: "Account Statement", path: "/dashboard/accounts/statement", icon: FileText },
        ]
    },
    {
        label: "Team",
        icon: Users,
        children: [
            { label: "Team", path: "/dashboard/team", icon: List },
            { label: "Systems Roles", path: "/dashboard/team/roles", icon: Shield, roles: ['ADMIN'] }
        ]
    },
    {
        label: "Tasks",
        icon: CheckSquare,
        children: [
            { label: "Dashboard", path: "/dashboard/tasks/dashboard", icon: LayoutDashboard },
            { label: "My Tasks", path: "/dashboard/tasks/my-tasks", icon: ClipboardList },
            { label: "New Task", path: "/dashboard/tasks?action=new", icon: PlusCircle },
            { label: "Task Board", path: "/dashboard/tasks/board", icon: KanbanSquare },
            { label: "Calendar", path: "/dashboard/tasks/calendar", icon: Calendar },
            { label: "Automation", path: "/dashboard/tasks/automation", icon: Zap, roles: ['ADMIN', 'MANAGER'] },
            { label: "Team Performance", path: "/dashboard/tasks/performance", icon: UsersIcon, roles: ['ADMIN', 'MANAGER'] },
            { label: "Reports", path: "/dashboard/tasks/reports", icon: BarChart3, roles: ['ADMIN', 'MANAGER'] }
        ]
    },
    {
        label: "Ads",
        icon: TrendingUp,
        children: [
            { label: "Campaigns", path: "/dashboard/roi", icon: List },
            { label: "ROI", path: "/dashboard/roi", icon: TrendingUp },
            { label: "Reports", path: "/dashboard/roi", icon: BarChart3 }
        ]
    },
    {
        label: "Payroll",
        icon: Banknote,
        children: [
            { label: "Salary Calculator", path: "/dashboard/payroll/calculator", icon: Banknote, roles: ['ADMIN'] },
            { label: "Salary Slip & Statements", path: "/dashboard/payroll/history", icon: FileText },
            { label: "Payroll Reports", path: "/dashboard/payroll/reports", icon: BarChart3, roles: ['ADMIN'] },
            { label: "Leave & LOP Summary", path: "/dashboard/payroll/leaves", icon: Calendar },
            { label: "Payroll Settings", path: "/dashboard/payroll/settings", icon: Settings, roles: ['ADMIN'] }
        ]
    },
    {
        label: "System",
        icon: Shield,
        roles: ['ADMIN'],
        children: [
            { label: "Data Sync", path: "/dashboard/admin/sync", icon: TrendingUp }
        ]
    },
    {
        label: "Settings",
        path: "/dashboard/settings",
        icon: Settings
    }
];

export const STAFF_MENU: MenuItem[] = [
    {
        label: "Overview",
        path: "/dashboard",
        icon: LayoutDashboard
    },
    {
        label: "Tasks",
        icon: CheckSquare,
        children: [
            { label: "My Tasks", path: "/dashboard/tasks/my-tasks", icon: ClipboardList },
            { label: "Task Board", path: "/dashboard/tasks/board", icon: KanbanSquare },
            { label: "Calendar", path: "/dashboard/tasks/calendar", icon: Calendar }
        ]
    },
    {
        label: "Calendar",
        path: "/dashboard/calendar",
        icon: Calendar
    },
    {
        label: "Payroll",
        icon: Banknote,
        children: [
            { label: "My Payslips", path: "/dashboard/payroll/payslips", icon: FileText },
            { label: "Leaves", path: "/dashboard/payroll/leaves", icon: Calendar }
        ]
    },
    {
        label: "Settings",
        path: "/dashboard/settings",
        icon: Settings
    }
];
