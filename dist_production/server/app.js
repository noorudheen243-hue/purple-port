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
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const app = (0, express_1.default)();
// System: Accounting Module Loaded
// Rate Limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Relaxed limit for development
    standardHeaders: true,
    legacyHeaders: false,
});
// Middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(limiter);
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'http://localhost:5174', process.env.CLIENT_URL || ''],
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
const path_1 = __importDefault(require("path"));
// Serve Uploads
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
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
app.use('/api/payroll', routes_14.default);
app.use('/api/backup', routes_15.default);
// --- Production: Serve Frontend ---
// In production, we assume the React build is copied to a 'public' folder in the root
if (process.env.NODE_ENV === 'production') {
    const publicPath = path_1.default.join(process.cwd(), 'public');
    app.use(express_1.default.static(publicPath));
    // SPA Catch-all: Any request not handled by API or static files returns index.html
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(publicPath, 'index.html'));
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
