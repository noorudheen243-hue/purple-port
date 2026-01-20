import React, { ReactNode, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Menu,
    X,
    LogOut,
    ChevronDown,
    ChevronRight,
    Settings,
    Sun,
    Moon,
    Upload
} from 'lucide-react';
import api from '../../lib/api';
import Swal from 'sweetalert2';
import { getAssetUrl } from '../../lib/utils';
import { ROLES } from '../../utils/roles';
// ... existing imports ...

// ... inside component ...
import NotificationBell from '../notifications/NotificationBell';
import ProfileSettingsModal from '../users/ProfileSettingsModal';
import { ADMIN_MANAGER_MENU, STAFF_MENU, CLIENT_MENU, MenuItem } from '../../config/menuConfig';
import { StickyNoteContainer } from '../sticky_notes/StickyNoteContainer';
import { ChatFloatingIcon } from '../chat/ChatFloatingIcon';
import { ChatPopup } from '../chat/ChatPopup';
import { AnimatePresence } from 'framer-motion';
import { AppLauncher } from '../launcher/AppLauncher';
import { WidgetManager } from '../widgets/WidgetManager';
import { useRealTimeSync } from '../../hooks/useRealTimeSync';

const SidebarItem = ({ item, isActive, depth = 0, closeSidebar, index }: { item: MenuItem; isActive: (path: string) => boolean; depth?: number; closeSidebar: () => void, index: number }) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = item.children && item.children.length > 0;
    const active = item.path ? isActive(item.path) : false;
    const isMain = depth === 0;

    // Master UI Color System
    // Main: Dark Purple. Sub: Yellow/Amber.
    // Using distinct classes for Main vs Sub items.

    // Base colors
    // Base colors - Alternate based on index
    // Even (0, 2...): Purple (Primary) -> White Text
    // Odd (1, 3...): Yellow (Secondary) -> Black Text

    const isPurple = index % 2 === 0;

    // active class uses solid background
    // hover class uses lighter background? Or solid on hover? 
    // "change the colour as, yellow and purple... change text colour aswel" - implies solid buttons potentially, or at least colored text/bg.
    // Let's try Solid Background for high contrast as "buttons".

    // BUT sidebar items are usually transparent/subtle until active.
    // "colour of side bar buttons" implies they look like buttons.

    // Simplified logic: Even = Purple, Odd = Yellow
    // User requested "buttons", implying solid blocks.

    // Inactive state:
    const inactiveClass = isPurple
        ? "bg-primary/10 text-purple-900 dark:text-purple-200 hover:bg-primary hover:text-white"
        : "bg-secondary/10 text-yellow-900 dark:text-yellow-200 hover:bg-secondary hover:text-black";

    // Active state:
    const activeClass = isPurple
        ? "bg-primary text-white"
        : "bg-secondary text-black";

    const finalClass = active && !hasChildren ? activeClass : inactiveClass;

    const textColor = isPurple
        ? (active || hasChildren /* hover handles text color */ ? "text-current" : "text-purple-950 dark:text-purple-100")
        : (active || hasChildren ? "text-current" : "text-yellow-900 dark:text-yellow-100");

    const iconColor = "currentColor";

    const handleClick = () => {
        if (hasChildren) {
            setIsOpen(!isOpen);
        } else if (item.path) {
            closeSidebar();
        }
    };

    return (
        <div className="select-none">
            <div
                onClick={hasChildren ? handleClick : undefined}
                className={`
                    flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-all cursor-pointer mb-1
                    ${finalClass}
                    ${item.highlight ? 'bg-red-50 border border-red-200 hover:bg-red-100' : ''}
                    ${depth > 0 ? 'ml-6 border-l-2 border-yellow-200/30 pl-4' : ''}
                    ${isMain ? 'font-bold tracking-wide' : 'font-medium'}
                    ${!active && !hasChildren && !item.highlight ? textColor : ''}
                `}
            >
                {item.path && !hasChildren ? (
                    <Link to={item.path} onClick={closeSidebar} className="flex-1 flex items-center gap-3">
                        <span className={active ? "text-current" : iconColor}>
                            {item.icon && <item.icon size={20} fill={isMain ? "currentColor" : "none"} fillOpacity={isMain ? 0.1 : 0} strokeWidth={2} />}
                        </span>
                        {item.label}
                    </Link>
                ) : (
                    <div className={`flex-1 flex items-center gap-3 ${item.highlight ? 'text-red-700 font-bold' : ''}`}>
                        <span className={iconColor}>
                            {item.highlight ? (
                                <span className="text-red-600 flex items-center justify-center bg-red-100 p-0.5 rounded-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                </span>
                            ) : (
                                item.icon && <item.icon size={20} fill={isMain ? "currentColor" : "none"} fillOpacity={isMain ? 0.1 : 0} strokeWidth={2} />
                            )}
                        </span>
                        {item.label}
                    </div>
                )}

                {hasChildren && (
                    <span onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className={iconColor}>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                )}
            </div>

            {hasChildren && isOpen && (
                <div className="mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                    {item.children?.map((child, index) => (
                        <SidebarItem
                            key={index}
                            item={child}
                            isActive={isActive}
                            depth={depth + 1}
                            closeSidebar={closeSidebar}
                            index={index} // Children also alternate? Or keep parent color? 
                        // Let's alternate children too for fun, or keep same index to group?
                        // Logic: "yellow and purple sequal". Let's alternate children based on THEIR index.
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { user } = useAuthStore();
    const location = useLocation();



    const isActive = (path: string) => path === location.pathname || (path !== '/dashboard' && location.pathname.startsWith(path));

    const filterMenuByRole = (items: MenuItem[], role: string): MenuItem[] => {
        return items
            .filter(item => !item.roles || item.roles.includes(role))
            .map(item => ({
                ...item,
                children: item.children ? filterMenuByRole(item.children, role) : undefined
            }));
    };


    // ...

    let rawMenuItems = STAFF_MENU;
    if (user?.role === ROLES.CLIENT) {
        rawMenuItems = CLIENT_MENU;
    } else if (user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER || user?.role === ROLES.DEVELOPER_ADMIN) {
        rawMenuItems = ADMIN_MANAGER_MENU;
    }

    const menuItems = user ? filterMenuByRole(rawMenuItems, user.role) : [];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`
                w-64 bg-card border-r border-border h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                md:translate-x-0 overflow-y-auto
            `}>
                <div className="p-6 flex justify-between items-center sticky top-0 bg-card z-10">
                    <div>
                        <img src="/qix_logo.png" alt="Qix Ads" className="h-16 w-auto mb-2" />
                        <div className="text-xs text-muted-foreground mt-1 px-1 py-0.5 rounded bg-muted inline-block">
                            {user?.role.replace('_', ' ')}
                        </div>
                    </div>
                    <button onClick={onClose} className="md:hidden text-muted-foreground">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 pb-20">
                    {menuItems.map((item, index) => (
                        <SidebarItem
                            key={index}
                            item={item}
                            isActive={isActive}
                            closeSidebar={onClose}
                            index={index}
                        />
                    ))}


                </nav>


            </aside>
        </>
    );
};



const DashboardLayout = ({ children }: { children: ReactNode }) => {
    // ... hooks
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

    // Global Real-Time Sync
    useRealTimeSync();

    // Toggle Theme Logic
    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        document.documentElement.classList.toggle('dark', newMode);
        localStorage.setItem('theme', newMode ? 'dark' : 'light');
    };

    // Initialize Theme
    React.useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    // Initialize Socket
    React.useEffect(() => {
        const token = localStorage.getItem('token'); // Simplest way, assuming authStore syncs with localStorage or we can ignore if token missing
        if (token) {
            import('../../services/socketService').then(({ default: socketService }) => {
                socketService.connect(token);
            });
        }
    }, [user]); // Re-connect if user changes (re-login)

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleDeploy = async () => {
        const result = await Swal.fire({
            title: 'Deploy to Cloud?',
            text: "This will sync your local code changes to the VPS. Ensure you have internet access.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Sync Now',
            confirmButtonColor: '#6366f1'
        });

        if (result.isConfirmed) {
            try {
                // Show loading state
                Swal.fire({
                    title: 'Syncing...',
                    text: 'Pushing code to repository. Please wait.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                await api.post('/system/deploy');

                Swal.fire('Success!', 'Sync initiated. The Cloud VPS will update automatically in ~2 minutes.', 'success');
            } catch (error: any) {
                Swal.fire('Sync Failed', error.response?.data?.message || 'Unknown error', 'error');
            }
        }
    };

    const [isChatOpen, setIsChatOpen] = useState(false);

    // Calculate Unread Count (Global)
    const conversations = useChatStore(state => state.conversations);
    const unreadCount = conversations.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <div className="print-hidden">
                <StickyNoteContainer />
            </div>
            <AppLauncher />
            <WidgetManager />

            <AnimatePresence>
                {isChatOpen && <ChatPopup onClose={() => {
                    setIsChatOpen(false);
                    useChatStore.getState().deselectConversation();
                }} />}
            </AnimatePresence>

            <div className="relative z-50 print-hidden">
                <ChatFloatingIcon
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    count={unreadCount}
                />
            </div>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="ml-0 md:ml-64 p-4 md:p-8 transition-[margin] duration-300">
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden p-2 -ml-2 hover:bg-accent rounded-md"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <div>
                            <h2 className="text-xl md:text-2xl font-semibold">Welcome back, {user?.full_name.split(' ')[0]}</h2>
                            <p className="text-sm md:text-base text-muted-foreground hidden md:block">Here's what's happening today.</p>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-4">
                            {/* Theme Toggle Button - Moved to Header as requested */}
                            <button
                                onClick={toggleTheme}
                                className={`
                                    p-2 rounded-full transition-colors
                                    ${isDarkMode ? 'bg-secondary/20 text-yellow-400 hover:bg-secondary/30' : 'bg-primary/10 text-primary hover:bg-primary/20'}
                                `}
                                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            <div className="hidden md:block text-[10px] text-gray-400 mr-2 border border-gray-200 p-1 rounded">
                                v2.2 | Role: {user?.role || 'None'}
                            </div>

                            {(user?.role === ROLES.DEVELOPER_ADMIN || user?.role === ROLES.ADMIN) && (
                                <button
                                    onClick={handleDeploy}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                    title={(import.meta as any).env.DEV ? "Sync Updates to Cloud" : "Update from Cloud"}
                                >
                                    {(import.meta as any).env.DEV ? <Upload size={18} /> : <Upload className="rotate-180" size={18} />}
                                    <span className="hidden md:inline">
                                        {(import.meta as any).env.DEV ? "Sync to Cloud" : "Update System"}
                                    </span>
                                </button>
                            )}

                            <NotificationBell />
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                                title="Settings"
                            >
                                <Settings size={18} />
                                <span className="hidden md:inline">Settings</span>
                            </button>

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                                title="Logout"
                            >
                                <LogOut size={18} />
                                <span className="hidden md:inline">Logout</span>
                            </button>

                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shadow-sm border-2 border-white print-hidden">
                                {user?.avatar_url ? (
                                    <img
                                        src={getAssetUrl(user.avatar_url)}
                                        alt={user.full_name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-xl">{user?.full_name.charAt(0)}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </header>
                {children}
            </main>

            <ProfileSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            {/* WhatsApp Floating Icon - Only for certain roles ideally, but global for now as user requested */}

        </div>
    );
};

export default DashboardLayout;
