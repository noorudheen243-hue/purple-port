
export interface StickyTask {
    id: string;
    content: string;
    is_completed: boolean;
    createdAt: string;
}

export interface StickyNotePermission {
    id: string;
    user_id: string;
    role: 'EDITOR' | 'VIEWER';
    user: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
}

export interface StickyNote {
    id: string;
    title: string;
    color: string;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    is_minimized: boolean;
    is_visible: boolean;
    user_id: string; // Owner
    user?: {
        id: string;
        full_name: string;
    };
    tasks: StickyTask[];
    permissions: StickyNotePermission[];
    updatedAt?: string;
    createdAt?: string;
}
