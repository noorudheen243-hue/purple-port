import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const getAssetUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:')) return path; // Already full URL

    // Remote server URL (Production/Dev)
    // If we are strictly using Vite proxy, we might not need this, 
    // but for <img> src tags, they sometimes bypass proxy if not careful or if on different port.
    // Safest is to prepend API URL root.

    // We assume the API_URL env is set, or default to localhost:4000
    const baseUrl = (import.meta as any).env.VITE_API_URL
        ? (import.meta as any).env.VITE_API_URL.replace('/api', '') // Remove /api suffix if present
        : 'http://localhost:4001';

    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${cleanPath}`;
}
