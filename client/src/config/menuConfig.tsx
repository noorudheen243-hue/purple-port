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
    MessageSquare,
    UserCheck,
    ScrollText
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
        label: "Client Management",
        path: "/dashboard/client-manager",
        icon: User
    },
    {
        label: "Financial Management",
        path: "/dashboard/finance",
        icon: Wallet,
        roles: [ROLES.ADMIN, ROLES.DEVELOPER_ADMIN]
    },
    {
        label: "Team Management",
        path: "/dashboard/team-management",
        icon: Users,
        // Remove children, it's now a single view
    },
    {
        label: "Task Management",
        path: "/dashboard/tasks/manager",
        icon: CheckSquare
    },

];

export const STAFF_MENU: MenuItem[] = [

    {
        label: "Client Management",
        path: "/dashboard/client-manager",
        icon: User
    },
    {
        label: "Task Management",
        path: "/dashboard/tasks/manager",
        icon: CheckSquare
    },
    {
        label: "Attendance",
        icon: UserCheck,
        children: [
            { label: 'Attendance Register', path: '/dashboard/attendance/summary', icon: Calendar },
            { label: 'Regularisation', path: '/dashboard/attendance/regularisation', icon: CheckSquare },
            { label: 'Attendance Log', path: '/dashboard/attendance/biometric', icon: ScrollText }
        ]
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
