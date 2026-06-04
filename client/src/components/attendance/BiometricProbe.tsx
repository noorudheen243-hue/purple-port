import { useEffect } from 'react';
import axios from 'axios';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export const BiometricProbe = () => {
    const { user, isAuthenticated } = useAuthStore();

    useEffect(() => {
        // Only run for Admins or Managers to register Office IP
        if (!isAuthenticated || !user) return;
        
        const isPrivileged = ['ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'].includes(user.role);
        if (!isPrivileged) return;

        const probeOfficeIP = async () => {
            // Prevent multiple probes in the same session
            const lastProbe = sessionStorage.getItem('last_bio_probe');
            const now = Date.now();
            if (lastProbe && now - parseInt(lastProbe) < 3600000) return; // 1 hour cooldown

            try {
                // Silent Probe: Try to reach the biometric device's local IP
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1500);
                const startTime = Date.now();

                try {
                    await fetch('http://192.168.1.201', { 
                        mode: 'no-cors', 
                        signal: controller.signal 
                    });
                    clearTimeout(timeoutId);
                    // If it doesn't throw, we are likely in the office!
                    console.log("[Biometric] Local device responded. Registering Office IP...");
                    await register();
                } catch (e: any) {
                    clearTimeout(timeoutId);
                    const duration = Date.now() - startTime;
                    const isTimeout = e.name === 'AbortError' || duration >= 1400;

                    if (!isTimeout) {
                        // Connection Refused or CORS error - indicates host is active in local subnet!
                        console.log("[Biometric] Local device probed (Connection Refused/Instantly Failed in " + duration + "ms). Registering Office IP...");
                        await register();
                    } else {
                        console.log("[Biometric] Local device probe timed out (" + duration + "ms). Likely outside office network:", e.name || e.message || e);
                    }
                }
            } catch (err) {
                // Silently ignore failures
            } finally {
                sessionStorage.setItem('last_bio_probe', String(Date.now()));
            }
        };

        const register = async () => {
            try {
                await api.post('/attendance/biometric/register-office-ip');
            } catch (e) {
                console.error("[Biometric] Failed to register Office IP", e);
            }
        };

        probeOfficeIP();
    }, [isAuthenticated, user]);

    return null; // Silent component
};
