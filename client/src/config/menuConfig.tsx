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
    ScrollText,
    LogOut
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
        // Reverted to single view as per request
    },
    {
        label: "Task Management",
        icon: CheckSquare,
        path: "/dashboard/tasks/manager"
    }
];

export const STAFF_MENU: MenuItem[] = [

    {
        label: "Client Management",
        path: "/dashboard/client-manager",
        icon: User
    },
    {
        label: "Task Management",
        icon: CheckSquare,
        path: "/dashboard/tasks/manager"
    },
    {
        label: "Attendance",
        icon: UserCheck,
        path: '/dashboard/attendance/summary'
    },
    {
        label: "Leave",
        path: "/dashboard/leave",
        icon: Calendar
    },
    {
        label: "Payroll",
        icon: Banknote,
        path: '/dashboard/payroll/manager'
    },
    {
        label: "Relieve / Resignation",
        path: "/dashboard/team/resignation",
        icon: LogOut
    }
];

export const CLIENT_MENU: MenuItem[] = [
    {
        label: "Service Portal",
        path: "/dashboard/client-portal",
        icon: TrendingUp
    },
    {
        label: "Lead Management",
        path: "/dashboard/client-portal/manage-services",
        icon: UsersIcon
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
