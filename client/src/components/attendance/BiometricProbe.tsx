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

                // Use a no-cors fetch to avoid CORS preflight issues on a raw TCP port (though fetch usually fails for raw TCP)
                // However, many ZKTeco devices have a tiny web server on port 80/4370 for info.
                // Even if it fails with "Connection Refused", that's often enough to prove we're in the same subnet
                // compared to a "Timeout" which happens on outside networks.
                
                try {
                    await fetch('http://192.168.1.201', { 
                        mode: 'no-cors', 
                        signal: controller.signal 
                    });
                    // If it doesn't throw a Timeout, we are likely in the office!
                    await register();
                } catch (e: any) {
                    // In many browsers, a "Connection Refused" (office) is distinguishable from "Timeout" (home)
                    // but we'll be optimistic: if it's not an AbortError, it might be a connectivity proof.
                    if (e.name !== 'AbortError') {
                        console.log("[Biometric] Local device sensed. Registering Office IP...");
                        await register();
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
