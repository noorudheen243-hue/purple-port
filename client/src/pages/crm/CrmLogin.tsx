import React, { useState, useEffect } from 'react';
import { useCrmAuthStore } from '../../store/crmAuthStore';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { APP_VERSION } from '../../version';

const CrmLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useCrmAuthStore();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const originalTitle = document.title;
        const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        let originalFaviconHref = '';
        if (favicon) {
            originalFaviconHref = favicon.href;
        }

        document.title = "crm.qixport";

        if (favicon) {
            const img = new Image();
            img.src = '/favicon.png';
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width || 32;
                canvas.height = img.height || 32;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imgData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const a = data[i + 3];
                        if (a > 0) {
                            if (r > 120 && g > 100 && b < 130) {
                                const brightness = (r + g + b) / 3;
                                data[i] = (124 / 255) * brightness * 1.5;
                                data[i + 1] = (58 / 255) * brightness * 0.8;
                                data[i + 2] = (237 / 255) * brightness * 1.5;
                            }
                        }
                    }
                    ctx.putImageData(imgData, 0, 0);
                    favicon.href = canvas.toDataURL('image/png');
                }
            };
        }

        return () => {
            document.title = originalTitle;
            if (favicon && originalFaviconHref) {
                favicon.href = originalFaviconHref;
            }
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login({
                username: username.trim(),
                password: password.trim()
            });
            navigate('/crm-dashboard');
        } catch (err: any) {
            console.error('CRM Login Error:', err);
            const status = err.response?.status;
            let message = 'Invalid User ID/Email or Password';

            if (err.response?.data?.message) {
                message = String(err.response.data.message);
            } else if (err.message) {
                message = err.message;
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 p-4 font-sans relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-8 md:p-10 space-y-8 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-500 relative z-10">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <img
                                src="/qix_logo.png"
                                alt="QIX Ads Logo"
                                className="h-20 w-auto object-contain"
                                style={{ filter: 'brightness(0) invert(1)' }}
                            />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-200 via-purple-250 to-pink-200 bg-clip-text text-transparent">
                            QIX CRM Portal
                        </h1>
                        <p className="text-slate-400 mt-2 text-sm md:text-base font-medium">
                            External Sales Team Workspace Sign In
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 text-sm text-red-300 bg-red-950/40 border border-red-900/50 rounded-2xl flex items-start gap-3 animate-in shake duration-300">
                        <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300" htmlFor="username">
                            User ID or Email
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
                            <input
                                id="username"
                                type="text"
                                className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-12 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/80 transition-all font-medium"
                                placeholder="Enter your User ID or Email"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300" htmlFor="password">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-12 pr-12 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/80 transition-all font-medium"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="text-center text-xs text-slate-650 pt-2 border-t border-slate-850">
                    CRM Agent Portal v{APP_VERSION}
                </div>
            </div>
        </div>
    );
};

export default CrmLogin;
