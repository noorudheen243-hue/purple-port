import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLauncherStore } from '../../store/launcherStore';
import { LauncherIcon } from './LauncherIcon';
import { Search, ChevronRight, X, Plus, Pin, PinOff, Trash2 } from 'lucide-react';

export const AppLauncher = () => {
    const {
        isOpen, toggleLauncher, apps, searchQuery, setSearchQuery,
        fetchApps, executeApp, togglePin, deleteApp, setOpen
    } = useLauncherStore();

    // Fetch apps on mount
    useEffect(() => {
        fetchApps();
    }, []);

    // Keyboard Shortcut (Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(!isOpen); // Toggle
                // Focus search if opening?
            }
            if (e.key === 'Escape' && isOpen) {
                setOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const filteredApps = apps.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pinnedApps = filteredApps.filter(a => a.is_pinned);
    const otherApps = filteredApps.filter(a => !a.is_pinned);

    return (
        <>
            {/* Toggle Handle (Visible when closed) */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ x: 100 }}
                        animate={{ x: 0 }}
                        exit={{ x: 100 }}
                        className="fixed right-0 top-1/2 -translate-y-1/2 z-[60] group cursor-pointer"
                        onClick={toggleLauncher}
                    >
                        <div className="
                            bg-white/80 backdrop-blur-md border border-gray-200 
                            rounded-l-xl shadow-xl p-2 
                            group-hover:pl-4 transition-all duration-300
                            flex items-center justify-center
                        ">
                            <div className="w-1 h-8 bg-gray-300 rounded-full mr-1 group-hover:bg-blue-500 transition-colors"></div>
                            <ChevronRight size={20} className="text-gray-500 rotate-180" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Slide-in Bar */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Overlay backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[60]"
                        />

                        {/* Sidebar */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-[260px] bg-white/60 backdrop-blur-xl border-l border-white/20 shadow-2xl z-[70] flex flex-col font-sans"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-white/20 flex items-center justify-between bg-white/20">
                                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest shadow-white drop-shadow-sm">Launcher</h2>
                                <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black">
                                    <ChevronRight size={24} />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="p-4">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-600 transition-colors" size={16} />
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Search apps..."
                                        className="w-full bg-white/40 border border-white/40 rounded-xl pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-sm placeholder:text-gray-600 font-medium"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Apps List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

                                {/* Favorites Section */}
                                {pinnedApps.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pl-2">
                                            <Pin size={10} /> Favorites
                                        </div>
                                        <div className="space-y-1">
                                            {pinnedApps.map(app => (
                                                <div
                                                    key={app.id}
                                                    className="group flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100/80 cursor-pointer transition-colors relative"
                                                    onClick={() => executeApp(app)}
                                                >
                                                    <LauncherIcon
                                                        name={app.name}
                                                        icon={app.icon}
                                                        onClick={() => { }} // Handled by parent
                                                    />
                                                    <span className="text-sm font-medium text-gray-700 group-hover:text-black">{app.name}</span>

                                                    {/* Context Actions */}
                                                    <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); togglePin(app.id); }}
                                                            className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-yellow-500 shadow-sm"
                                                            title="Unpin"
                                                        >
                                                            <PinOff size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* All Apps Section */}
                                <div className="space-y-2">
                                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-2">
                                        All Apps
                                    </div>
                                    <div className="space-y-1">
                                        {otherApps.map(app => (
                                            <div
                                                key={app.id}
                                                className="group flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100/80 cursor-pointer transition-colors relative"
                                                onClick={() => executeApp(app)}
                                            >
                                                <LauncherIcon
                                                    name={app.name}
                                                    icon={app.icon}
                                                    onClick={() => { }}
                                                />
                                                <span className="text-sm font-medium text-gray-700 group-hover:text-black">{app.name}</span>

                                                {/* Context Actions */}
                                                <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); togglePin(app.id); }}
                                                        className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-blue-500 shadow-sm"
                                                        title="Pin to Favorites"
                                                    >
                                                        <Pin size={14} />
                                                    </button>
                                                    {!app.is_global && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteApp(app.id); }}
                                                            className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 shadow-sm"
                                                            title="Delete Shortcut"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {filteredApps.length === 0 && (
                                    <div className="text-center py-10 text-gray-400 text-sm">
                                        No apps found.
                                    </div>
                                )}
                            </div>

                            {/* Add New Section */}
                            <AddShortcutForm />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

const AddShortcutForm = () => {
    const [isAdding, setIsAdding] = React.useState(false);
    const [name, setName] = React.useState('');
    const [url, setUrl] = React.useState('');
    const { createApp } = useLauncherStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !url) return;

        await createApp({ name, url, icon: 'default' });
        setName('');
        setUrl('');
        setIsAdding(false);
    };

    if (!isAdding) {
        return (
            <div className="p-4 border-t border-white/20 bg-white/30 backdrop-blur-md">
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-2.5 rounded-xl bg-white/60 hover:bg-white/80 text-gray-700 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm border border-white/50"
                >
                    <Plus size={16} /> Add Shortcut
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 border-t border-white/20 bg-white/40 backdrop-blur-md animate-in slide-in-from-bottom-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">New Shortcut</h3>
            <form onSubmit={handleSubmit} className="space-y-2">
                <input
                    type="text"
                    placeholder="App Name"
                    className="w-full bg-white/70 border border-white/50 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                />
                <input
                    type="url"
                    placeholder="https://example.com"
                    className="w-full bg-white/70 border border-white/50 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                />
                <div className="flex gap-2 pt-1">
                    <button
                        type="button"
                        onClick={() => setIsAdding(false)}
                        className="flex-1 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-md"
                    >
                        Add
                    </button>
                </div>
            </form>
        </div>
    );
};
