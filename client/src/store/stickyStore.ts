
import { create } from 'zustand';
import axios from '../lib/api';
import { StickyNote } from '../types/sticky';

interface StickyState {
    notes: StickyNote[];
    isLoading: boolean;
    fetchNotes: () => Promise<void>;
    addNote: () => Promise<void>;
    updateNote: (id: string, data: Partial<StickyNote>) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;

    // Task Actions
    addTask: (noteId: string, content: string) => Promise<void>;
    toggleTask: (noteId: string, taskId: string, is_completed: boolean) => Promise<void>;
    deleteTask: (noteId: string, taskId: string) => Promise<void>;

    // UI Local Updates (Optimistic)
    updateLocalNote: (id: string, data: Partial<StickyNote>) => void;
}

export const useStickyStore = create<StickyState>((set, get) => ({
    notes: [],
    isLoading: false,

    fetchNotes: async () => {
        set({ isLoading: true });
        try {
            const res = await axios.get('/sticky-notes');
            set({ notes: res.data });
        } catch (error) {
            console.error("Failed to fetch notes", error);
        } finally {
            set({ isLoading: false });
        }
    },

    addNote: async () => {
        try {
            const res = await axios.post('/sticky-notes', {
                title: 'New Note',
                color: '#feff9c'
            });
            set(state => ({ notes: [...state.notes, res.data] }));
        } catch (error) {
            console.error("Failed to create note", error);
        }
    },

    updateNote: async (id, data) => {
        // Optimistic Update
        get().updateLocalNote(id, data);

        // Debounce? For now, we assume this is called on dragEnd or blur
        try {
            await axios.put(`/sticky-notes/${id}`, data);
        } catch (error) {
            console.error("Failed to update note", error);
            get().fetchNotes(); // Revert on fail
        }
    },

    deleteNote: async (id) => {
        const prev = get().notes;
        set(state => ({ notes: state.notes.filter(n => n.id !== id) }));
        try {
            await axios.delete(`/sticky-notes/${id}`);
        } catch (error) {
            console.error("Failed to delete note", error);
            set({ notes: prev });
        }
    },

    addTask: async (noteId, content) => {
        try {
            const res = await axios.post(`/sticky-notes/${noteId}/tasks`, { content });
            set(state => ({
                notes: state.notes.map(n =>
                    n.id === noteId ? { ...n, tasks: [...n.tasks, res.data] } : n
                )
            }));
        } catch (error) {
            console.error("Failed to add task", error);
        }
    },

    toggleTask: async (noteId, taskId, is_completed) => {
        // Optimistic
        set(state => ({
            notes: state.notes.map(n =>
                n.id === noteId ? {
                    ...n,
                    tasks: n.tasks.map(t => t.id === taskId ? { ...t, is_completed } : t)
                } : n
            )
        }));

        try {
            await axios.put(`/sticky-notes/tasks/${taskId}`, { is_completed });
        } catch (error) {
            console.error("Failed to toggle task", error);
            get().fetchNotes();
        }
    },

    deleteTask: async (noteId, taskId) => {
        set(state => ({
            notes: state.notes.map(n =>
                n.id === noteId ? {
                    ...n,
                    tasks: n.tasks.filter(t => t.id !== taskId)
                } : n
            )
        }));
        try {
            await axios.delete(`/sticky-notes/tasks/${taskId}`);
        } catch (error) {
            console.error("Failed to delete task", error);
            get().fetchNotes();
        }
    },

    updateLocalNote: (id, data) => {
        set(state => ({
            notes: state.notes.map(n => n.id === id ? { ...n, ...data } : n)
        }));
    }
}));
