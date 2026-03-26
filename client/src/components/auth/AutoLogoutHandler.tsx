import React, { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import Swal from 'sweetalert2';

interface AutoLogoutHandlerProps {
    children: React.ReactNode;
}

const AutoLogoutHandler: React.FC<AutoLogoutHandlerProps> = ({ children }) => {
    const { isAuthenticated, logout } = useAuthStore();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const logoutLimitRef = useRef<number>(30); // Default 30 minutes

    const fetchLogoutLimit = useCallback(async () => {
        try {
            const { data } = await api.get('/system/settings');
            if (data.AUTO_LOGOUT_LIMIT) {
                logoutLimitRef.current = parseInt(data.AUTO_LOGOUT_LIMIT, 10);
            }
        } catch (error) {
            console.error('Failed to fetch auto-logout limit:', error);
        }
    }, []);

    const handleAutoLogout = useCallback(() => {
        if (!isAuthenticated) return;

        logout();
        Swal.fire({
            icon: 'info',
            title: 'Logged Out',
            text: 'You have been logged out due to inactivity. Please log in again.',
            confirmButtonText: 'Login'
        });
    }, [isAuthenticated, logout]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        
        if (isAuthenticated) {
            const timeoutMs = logoutLimitRef.current * 60 * 1000;
            timerRef.current = setTimeout(handleAutoLogout, timeoutMs);
        }
    }, [isAuthenticated, handleAutoLogout]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchLogoutLimit();
            
            const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
            
            const eventHandler = () => resetTimer();
            
            events.forEach(event => {
                window.addEventListener(event, eventHandler);
            });

            resetTimer();

            return () => {
                if (timerRef.current) clearTimeout(timerRef.current);
                events.forEach(event => {
                    window.removeEventListener(event, eventHandler);
                });
            };
        }
    }, [isAuthenticated, fetchLogoutLimit, resetTimer]);

    return <>{children}</>;
};

export default AutoLogoutHandler;
