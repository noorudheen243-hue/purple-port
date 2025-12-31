import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import rateLimit from 'express-rate-limit';

const app = express();

// System: Accounting Module Loaded

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Relaxed limit for development
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(limiter);
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://72.61.246.22', // VPS IP
        'http://72.61.246.22:4001',
        process.env.CLIENT_URL || ''
    ].filter(Boolean),
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import authRoutes from './modules/auth/routes';
import taskRoutes from './modules/tasks/routes';
import clientRoutes from './modules/clients/routes';
import campaignRoutes from './modules/campaigns/routes';
import assetRoutes from './modules/assets/routes';
import commentRoutes from './modules/comments/routes';
import analyticsRoutes from './modules/analytics/routes';
import notificationRoutes from './modules/notifications/routes';
import accountingRoutes from './modules/accounting/routes';
import adIntelligenceRoutes from './modules/ad_intelligence/routes';
import teamRoutes from './modules/team/routes';
import uploadRoutes from './modules/upload/routes';
import userRoutes from './modules/users/routes';
import payrollRoutes from './modules/payroll/routes';
import backupRoutes from './modules/backup/routes';
import path from 'path';

// Serve Uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/ad-intelligence', adIntelligenceRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/backup', backupRoutes);
import stickyNoteRoutes from './modules/sticky_notes/routes';
app.use('/api/sticky-notes', stickyNoteRoutes);

// --- Production: Serve Frontend ---
// In production, we assume the React build is copied to a 'public' folder in the root
if (process.env.NODE_ENV === 'production') {
    const publicPath = path.join(process.cwd(), 'public');
    app.use(express.static(publicPath));

    // SPA Catch-all: Any request not handled by API or static files returns index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(publicPath, 'index.html'));
    });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global Error:', err);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
        message,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
});

export default app;
