import { useEffect, Suspense, lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useCrmAuthStore } from './store/crmAuthStore'
import ErrorBoundary from './components/ErrorBoundary';
import AutoLogoutHandler from './components/auth/AutoLogoutHandler';
import { BiometricProbe } from './components/attendance/BiometricProbe';

// Lazy Load Pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Dashboard = lazy(() => import('./pages/dashboard'));
const StrategyReportView = lazy(() => import('./pages/portal/StrategyWizard/StrategyReportView'));
const CategoryTransactionsView = lazy(() => import('./pages/accounts/CategoryTransactionsView'));
const PerformanceTaskDetails = lazy(() => import('./pages/tasks/PerformanceTaskDetails'));
const CrmLogin = lazy(() => import('./pages/crm/CrmLogin'));
const CrmUserDashboard = lazy(() => import('./pages/crm/CrmUserDashboard'));


const queryClient = new QueryClient()

const LoadingFallback = () => (
    <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
);

function MetaPixelTracker() {
    const location = useLocation();

    useEffect(() => {
        if (typeof (window as any).fbq === 'function') {
            (window as any).fbq('track', 'PageView');
        }
    }, [location.pathname, location.search]);

    return null;
}

const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) return <LoadingFallback />;

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const ProtectedCrmRoute = () => {
    const { isAuthenticated, isLoading } = useCrmAuthStore();

    if (isLoading) return <LoadingFallback />;

    return isAuthenticated ? <Outlet /> : <Navigate to="/crm-login" replace />;
};

function App() {
    const { checkAuth } = useAuthStore();
    const { checkAuth: checkCrmAuth } = useCrmAuthStore();

    useEffect(() => {
        checkAuth();
        checkCrmAuth();

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

    }, [checkAuth, checkCrmAuth]);

    const isCrmSubdomain = window.location.hostname.startsWith('crm.') || window.location.hostname.startsWith('crm-');

    if (isCrmSubdomain) {
        return (
            <QueryClientProvider client={queryClient}>
                <ErrorBoundary>
                    <BrowserRouter>
                        <div className="min-h-screen bg-background text-foreground font-sans antialiased relative">
                            <Suspense fallback={<LoadingFallback />}>
                                <Routes>
                                    <Route path="/login" element={<CrmLogin />} />
                                    <Route element={<ProtectedCrmRoute />}>
                                        <Route path="/*" element={<CrmUserDashboard />} />
                                    </Route>
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </Suspense>
                        </div>
                    </BrowserRouter>
                </ErrorBoundary>
            </QueryClientProvider>
        );
    }

    return (
        <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
                <BrowserRouter>
                    <MetaPixelTracker />
                    <AutoLogoutHandler>
                        <div className="min-h-screen bg-background text-foreground font-sans antialiased relative">
                            <BiometricProbe />
                            <Suspense fallback={<LoadingFallback />}>
                                <Routes>
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/register" element={<Register />} />
                                    <Route path="/crm-login" element={<CrmLogin />} />

                                    <Route element={<ProtectedRoute />}>
                                        <Route path="/dashboard/*" element={<Dashboard />} />
                                        <Route path="/strategy/report/:id" element={<StrategyReportView />} />
                                        <Route path="/accounts/category-transactions/:category" element={<CategoryTransactionsView />} />
                                        <Route path="/tasks/performance/details" element={<PerformanceTaskDetails />} />
                                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                    </Route>

                                    <Route element={<ProtectedCrmRoute />}>
                                        <Route path="/crm-dashboard/*" element={<CrmUserDashboard />} />
                                    </Route>
                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                </Routes>
                            </Suspense>
                        </div>
                    </AutoLogoutHandler>
                </BrowserRouter>
            </ErrorBoundary>
        </QueryClientProvider>
    )
}

export default App
