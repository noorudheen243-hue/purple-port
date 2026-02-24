"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const app = (0, express_1.default)();
// System: Accounting Module Loaded
// 1. General Rate Limiter (Relaxed)
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // Increased for dev/testing
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
// 2. Strict Auth Limiter (Brute-force protection)
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 500, // Increased from 50 to 500 to allow frequent logins/testing
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts, please try again later.'
});
// Middleware
app.use((0, compression_1.default)()); // GZIP Compression
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(limiter);
app.use('/api/auth', authLimiter); // Apply strict limit to auth routes
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:4001', // Allow backend-to-backend calls
        'http://72.61.246.22', // Old VPS IP
        'http://72.61.246.22:4001',
        'http://66.116.224.221', // New VPS IP
        'http://66.116.224.221:4001',
        'https://port.qixads.com', // Custom Domain
        'https://www.port.qixads.com',
        process.env.CLIENT_URL || ''
    ].filter(Boolean),
    credentials: true
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const routes_1 = __importDefault(require("./modules/auth/routes"));
const routes_2 = __importDefault(require("./modules/tasks/routes"));
const routes_3 = __importDefault(require("./modules/clients/routes"));
const routes_4 = __importDefault(require("./modules/campaigns/routes"));
const routes_5 = __importDefault(require("./modules/assets/routes"));
const routes_6 = __importDefault(require("./modules/comments/routes"));
const routes_7 = __importDefault(require("./modules/analytics/routes"));
const routes_8 = __importDefault(require("./modules/notifications/routes"));
const routes_9 = __importDefault(require("./modules/accounting/routes"));
const routes_10 = __importDefault(require("./modules/ad_intelligence/routes"));
const routes_11 = __importDefault(require("./modules/team/routes"));
const routes_12 = __importDefault(require("./modules/upload/routes"));
const routes_13 = __importDefault(require("./modules/users/routes"));
const routes_14 = __importDefault(require("./modules/payroll/routes"));
const routes_15 = __importDefault(require("./modules/backup/routes"));
const routes_16 = __importDefault(require("./modules/client_portal/routes"));
const path_1 = __importDefault(require("path"));
// Serve Uploads
app.use('/api/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
const routes_17 = __importDefault(require("./modules/system/routes")); // Legacy System Routes
const routes_18 = __importDefault(require("./modules/deployment/routes")); // New Auto-Update Routes
app.use('/api/auth', routes_1.default);
app.use('/api/tasks', routes_2.default);
app.use('/api/clients', routes_3.default);
app.use('/api/campaigns', routes_4.default);
app.use('/api/assets', routes_5.default);
app.use('/api/comments', routes_6.default);
app.use('/api/analytics', routes_7.default);
app.use('/api/notifications', routes_8.default);
app.use('/api/accounting', routes_9.default);
app.use('/api/ad-intelligence', routes_10.default);
app.use('/api/team', routes_11.default);
app.use('/api/users', routes_13.default);
app.use('/api/upload', routes_12.default);
// System / Deployment Access
app.use('/api/system', routes_17.default);
app.use('/api/deployment', routes_18.default); // Registered here
app.use('/api/client-portal', routes_16.default);
app.use('/api/payroll', routes_14.default);
app.use('/api/backup', routes_15.default);
const routes_19 = __importDefault(require("./modules/sticky_notes/routes"));
const routes_20 = __importDefault(require("./modules/team/resignation/routes"));
const routes_21 = __importDefault(require("./modules/attendance/routes"));
const biometric_control_routes_1 = __importDefault(require("./modules/attendance/biometric_control.routes"));
const routes_22 = __importDefault(require("./modules/billing/routes"));
const routes_23 = __importDefault(require("./modules/leave/routes"));
app.use('/api/billing', routes_22.default);
app.use('/api/sticky-notes', routes_19.default);
app.use('/api/team/resignation', routes_20.default); // New Module
app.use('/api/attendance/biometric', biometric_control_routes_1.default); // Specific route first
app.use('/api/attendance', routes_21.default); // Generic route second
app.use('/api/leave', routes_23.default);
const routes_24 = __importDefault(require("./modules/chat/routes"));
const routes_25 = __importDefault(require("./modules/launcher/routes"));
const routes_26 = __importDefault(require("./modules/admin/routes"));
app.use('/api/chat', routes_24.default);
app.use('/api/launcher', routes_25.default);
app.use('/api/admin', routes_26.default);
// --- Production: Serve Frontend ---
// In production, we assume the React build is copied to a 'public' folder in the root
if (process.env.NODE_ENV === 'production') {
    // Serve static files from the React app
    // Correct Path: 'public' folder in the root of the deployment
    const publicPath = path_1.default.join(process.cwd(), 'public');
    app.use(express_1.default.static(publicPath, {
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('index.html')) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }
        }
    }));
    // The "catchall" handler: for any request that doesn't
    // match one above, send back React's index.html file.
    app.get('*', (req, res) => {
        // Prevent API calls from returning HTML
        if (req.path.startsWith('/api')) {
            res.status(404).json({ message: "API endpoint not found" });
            return;
        }
        res.sendFile(path_1.default.join(publicPath, 'index.html'), {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    });
}
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Global Error:', err);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
        message,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
});
exports.default = app;
