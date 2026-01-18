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
                            v2.0 - Reset Enabled
                        </div>
                    </div>
                </BrowserRouter>
            </ErrorBoundary>
        </QueryClientProvider>
    )
}

export default App
