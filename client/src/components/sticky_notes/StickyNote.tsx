
import React, { useState, useEffect, useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, Minus, Plus, Trash2, Check, GripVertical, GripHorizontal, Share2 } from 'lucide-react';
import { StickyNote, StickyTask } from '../../types/sticky';
import { useStickyStore } from '../../store/stickyStore';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ShareNoteModal } from './ShareNoteModal';

interface Props {
    note: StickyNote;
    zIndex: number;
    onFocus: () => void;
}

const COLORS = [
    '#feff9c', // Yellow
    '#fff740', // Bright Yellow
    '#7afcff', // Cyan
    '#ff7eb9', // Pink
    '#e2e2e2', // Grey
    '#a5ff9e'  // Green
];

export const StickyNoteComponent = ({ note, zIndex, onFocus }: Props) => {
    const { updateNote, deleteNote, addTask, toggleTask, deleteTask, updateLocalNote } = useStickyStore();
    const [newTask, setNewTask] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);

    // Local State for smooth Drag/Resize
    // We sync to Global Store on interaction end
    const [size, setSize] = useState({ width: note.width, height: note.height });

    // Resize Logic
    const resizeRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = Math.max(200, size.width + e.movementX);
            const newHeight = Math.max(200, size.height + e.movementY);
            setSize({ width: newWidth, height: newHeight });
        };

        const handleMouseUp = () => {
            if (isResizing) {
                setIsResizing(false);
                updateNote(note.id, { width: size.width, height: size.height });
            }
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, size, note.id, updateNote]);


    const handleDragEnd = (_: any, info: any) => {
        // Framer Motion uses translate3d. We need to grab the ACTUAL computed style or offset?
        // Actually, easiest is to store x/y in store.
        // But drag listener gives delta.
        // We can just rely on the visual position for the session, OR simpler:
        // Use `onDragEnd` to update the position in DB. 
        // Note: info.point is absolute page coordinates? No, it's relative?
        // Let's use `offset` which is { x, y } from start.
        // So newPos = oldPos + offset.

        const newX = note.position_x + info.offset.x;
        const newY = note.position_y + info.offset.y;
        updateNote(note.id, { position_x: newX, position_y: newY });
    };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        addTask(note.id, newTask);
        setNewTask('');
    };

    if (note.is_minimized) return null; // Handled by container tray

    return (
        <motion.div
            drag
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            initial={{ x: note.position_x, y: note.position_y, opacity: 0, scale: 0.8 }}
            animate={{ x: note.position_x, y: note.position_y, opacity: 1, scale: 1 }}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: size.width,
                height: size.height,
                backgroundColor: note.color,
                zIndex,
                touchAction: 'none'
            }}
            className="rounded-lg shadow-xl flex flex-col overflow-hidden border border-black/10 pointer-events-auto"
            onMouseDown={onFocus}
        >
            {/* Header / Drag Handle */}
            <div className="h-8 bg-black/5 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing shrink-0 select-none group">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <GripVertical size={14} className="text-black/30" />
                    {isEditingTitle ? (
                        <input
                            autoFocus
                            className="bg-transparent text-xs font-bold w-full outline-none"
                            defaultValue={note.title}
                            onBlur={(e) => {
                                setIsEditingTitle(false);
                                updateNote(note.id, { title: e.target.value });
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                        />
                    ) : (
                        <span
                            className="text-xs font-bold truncate w-full cursor-text"
                            onDoubleClick={() => setIsEditingTitle(true)}
                        >
                            {note.title || "Untitled"}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => setIsShareOpen(true)}
                        className="p-1 hover:bg-blue-500/20 hover:text-blue-600 rounded" title="Share"
                    >
                        <Share2 size={14} />
                    </button>
                    <button
                        onClick={() => updateNote(note.id, { is_minimized: true })}
                        className="p-1 hover:bg-black/10 rounded" title="Minimize"
                    >
                        <Minus size={14} />
                    </button>
                    <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1 hover:bg-red-500/20 hover:text-red-600 rounded" title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <ShareNoteModal note={note} isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />

            {/* Toolbar (Colors) */}
            <div className="h-6 bg-white/30 flex items-center px-2 gap-1 shrink-0">
                {COLORS.map(c => (
                    <button
                        key={c}
                        className={cn("w-3 h-3 rounded-full border border-black/10 hover:scale-110 transition-transform", note.color === c && "ring-1 ring-black ring-offset-1")}
                        style={{ backgroundColor: c }}
                        onClick={() => updateNote(note.id, { color: c })}
                    />
                ))}
                <div className="flex-1" />
                <span className="text-[10px] text-black/40 font-mono">
                    {format(new Date(note.updatedAt || new Date()), 'HH:mm')}
                </span>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-2 min-h-0 bg-white/20 custom-scrollbar">
                {/* Task Input */}
                <form onSubmit={handleAddTask} className="mb-2 flex gap-1">
                    <Plus size={16} className="text-black/40 mt-1" />
                    <input
                        className="bg-transparent text-sm w-full outline-none placeholder:text-black/40"
                        placeholder="Add a task..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                    />
                </form>

                {/* Task List */}
                <div className="space-y-1">
                    {note.tasks?.map(task => (
                        <div key={task.id} className="group flex items-start gap-2 text-sm hover:bg-black/5 p-1 rounded transition-colors">
                            <button
                                onClick={() => toggleTask(note.id, task.id, !task.is_completed)}
                                className={cn(
                                    "mt-0.5 w-4 h-4 border border-black/30 rounded flex items-center justify-center transition-colors",
                                    task.is_completed ? "bg-black/70 border-black/70 text-white" : "hover:border-black/60"
                                )}
                            >
                                {task.is_completed && <Check size={10} strokeWidth={4} />}
                            </button>

                            <span className={cn(
                                "flex-1 break-words transition-all duration-200",
                                task.is_completed && "text-red-800 line-through decoration-red-600/50 decoration-2 opacity-60"
                            )}>
                                {task.content}
                            </span>

                            <button
                                onClick={() => deleteTask(note.id, task.id)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-black/30 hover:text-red-600 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    {note.tasks?.length === 0 && (
                        <div className="text-xs text-center text-black/30 py-4 italic">
                            Empty note
                        </div>
                    )}
                </div>
            </div>

            {/* Resize Handle */}
            <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-center justify-center opacity-50 hover:opacity-100"
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizing(true);
                }}
            >
                <div className="w-2 h-2 border-r-2 border-b-2 border-black/30 rounded-br-[1px]" />
            </div>
        </motion.div>
    );
};
