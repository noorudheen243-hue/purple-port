
import React, { useEffect, useState } from 'react';
import { useStickyStore } from '../../store/stickyStore';
import { StickyNoteComponent } from './StickyNote';
import { StickyNote as LucideSticky, Plus, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const StickyNoteContainer = () => {
    const { notes, fetchNotes, addNote, updateNote } = useStickyStore();
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [isTrayOpen, setIsTrayOpen] = useState(true);

    useEffect(() => {
        fetchNotes();
    }, []);

    // Active notes that are NOT minimized
    const safeNotes = Array.isArray(notes) ? notes : [];
    const activeNotes = safeNotes.filter(n => !n.is_minimized && n.is_visible);
    // Minimized notes sit in the tray
    const minimizedNotes = safeNotes.filter(n => n.is_minimized && n.is_visible);

    const bringToFront = (id: string) => setFocusedId(id);

    return (
        <>
            {/* Active Floating Notes Layer */}
            <div className="fixed inset-0 pointer-events-none z-[50] overflow-hidden">
                <div className="relative w-full h-full pointer-events-none">
                    {activeNotes.map((note) => (
                        <StickyNoteComponent
                            key={note.id}
                            note={note}
                            zIndex={focusedId === note.id ? 50 : 10}
                            onFocus={() => bringToFront(note.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Floating Restore Tray (Bottom Right) */}
            <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2">

                {/* Minimized Stack */}
                <AnimatePresence>
                    {isTrayOpen && minimizedNotes.map((note) => (
                        <motion.button
                            key={note.id}
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 50, opacity: 0 }}
                            whileHover={{ scale: 1.05, x: -5 }}
                            onClick={() => updateNote(note.id, { is_minimized: false })}
                            className="w-48 h-10 rounded-l-md shadow-lg border-l-4 flex items-center px-3 gap-2 bg-white hover:bg-gray-50 transition-colors pointer-events-auto"
                            style={{ borderLeftColor: note.color }}
                        >
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: note.color }} />
                            <span className="text-xs font-medium truncate flex-1 text-left">{note.title || "Untitled"}</span>
                        </motion.button>
                    ))}
                </AnimatePresence>

                {/* Main Action Button */}
                <div className="flex items-center gap-2 pointer-events-auto">
                    {minimizedNotes.length > 0 && (
                        <button
                            onClick={() => setIsTrayOpen(!isTrayOpen)}
                            className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-primary transition-colors hover:scale-110"
                        >
                            <div className={`transition-transform duration-300 ${isTrayOpen ? 'rotate-180' : ''}`}>
                                <ChevronUp size={20} />
                            </div>
                        </button>
                    )}

                    <button
                        onClick={() => addNote()}
                        className="w-14 h-14 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full shadow-xl flex items-center justify-center text-yellow-900 hover:scale-110 active:scale-95 transition-all group"
                        title="Create Sticky Note"
                    >
                        <LucideSticky size={24} className="group-hover:rotate-12 transition-transform" />
                        <div className="absolute top-0 right-0 bg-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center -mt-1 -mr-1 border-2 border-white">
                            <Plus size={12} strokeWidth={3} />
                        </div>
                    </button>
                </div>
            </div>
        </>
    );
};
