import { useEffect, Suspense, lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import ErrorBoundary from './components/ErrorBoundary';

// Lazy Load Pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Dashboard = lazy(() => import('./pages/dashboard'));

const queryClient = new QueryClient()

const LoadingFallback = () => (
    <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
);

const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) return <LoadingFallback />;

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
    const { checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();

        // Auto-Reload on Version Mismatch (Chunk Load Error)
        const handleChunkError = (event: ErrorEvent) => {
            const isChunkError =
                event.message?.includes('Failed to fetch dynamically imported module') ||
                event.message?.includes('Importing a module script failed');

            if (isChunkError) {
                console.log('Version mismatch detected. Reloading...');
                // Prevent infinite loops: check if we just reloaded
                const lastReload = sessionStorage.getItem('last_chunk_reload');
                const now = Date.now();
                if (!lastReload || now - parseInt(lastReload) > 10000) {
                    sessionStorage.setItem('last_chunk_reload', String(now));
                    window.location.reload();
                }
            }
        }

        window.addEventListener('error', handleChunkError);
        return () => window.removeEventListener('error', handleChunkError);

    }, [checkAuth]);

    return (
        <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
                <BrowserRouter>
                    <div className="min-h-screen bg-background text-foreground font-sans antialiased relative">
                        <Suspense fallback={<LoadingFallback />}>
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />

                                <Route element={<ProtectedRoute />}>
                                    <Route path="/dashboard/*" element={<Dashboard />} />
                                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                </Route>
                            </Routes>
                        </Suspense>
                        {/* VERSION INDICATOR */}
                        <div className="fixed bottom-1 right-1 opacity-50 text-[10px] bg-black/80 text-white px-2 py-0.5 rounded pointer-events-none z-[9999]">
                            v2.1 - Auto-Reload Enabled
                        </div>
                    </div>
                </BrowserRouter>
            </ErrorBoundary>
        </QueryClientProvider>
    )
}

export default App
