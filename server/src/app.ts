import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import compression from 'compression';
import rateLimit from 'express-rate-limit';

const app = express();

// System: Accounting Module Loaded

// 1. General Rate Limiter (Relaxed)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// 2. Strict Auth Limiter (Brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // 50 login attempts per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts, please try again later.'
});

// Middleware
app.use(compression()); // GZIP Compression
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(limiter);
app.use('/api/auth', authLimiter); // Apply strict limit to auth routes
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:4001', // Allow backend-to-backend calls
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
import clientPortalRoutes from './modules/client_portal/routes';

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
app.use('/api/client-portal', clientPortalRoutes);

app.use('/api/payroll', payrollRoutes);
app.use('/api/backup', backupRoutes);
import stickyNoteRoutes from './modules/sticky_notes/routes';
import attendanceRoutes from './modules/attendance/routes';
import biometricControlRoutes from './modules/attendance/biometric_control.routes';
import billingRoutes from './modules/billing/routes';
import leaveRoutes from './modules/leave/routes';

app.use('/api/billing', billingRoutes);
app.use('/api/sticky-notes', stickyNoteRoutes);
app.use('/api/attendance/biometric', biometricControlRoutes); // Specific route first
app.use('/api/attendance', attendanceRoutes); // Generic route second
app.use('/api/leave', leaveRoutes);

import chatRoutes from './modules/chat/routes';
import launcherRoutes from './modules/launcher/routes';
app.use('/api/chat', chatRoutes);
app.use('/api/launcher', launcherRoutes);

// --- Production: Serve Frontend ---
// In production, we assume the React build is copied to a 'public' folder in the root
if (process.env.NODE_ENV === 'production') {
    // Serve static files from the React app
    const publicPath = path.join(process.cwd(), 'public');
    app.use(express.static(publicPath, {
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
    app.get('*', (req: express.Request, res: express.Response) => {
        res.sendFile(path.join(publicPath, 'index.html'), {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
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
