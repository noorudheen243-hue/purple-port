import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../utils/prisma';

if (!process.env.JWT_SECRET) {
    throw new Error('FATAL ERROR: JWT_SECRET environment variable is not defined.');
}
const JWT_SECRET = process.env.JWT_SECRET;

// Extend Express Request interface
declare global {
    namespace Express {
        interface Request {
            crmUser?: {
                id: string;
                full_name: string;
                email: string | null;
                user_id: string;
                client_id: string;
                campaign_group_id: string | null;
                status: string;
            };
        }
    }
}

interface DecodedCrmToken {
    crmUserId: string;
    email: string;
}

export const protectCrmUser = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    // Check for token in cookies
    token = req.cookies.crm_jwt;

    // Prioritize CRM-specific header over generic Authorization header
    if (!token && req.headers['crm-auth-token']) {
        token = req.headers['crm-auth-token'] as string;
    }

    // Fall back to generic Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as DecodedCrmToken;

            // Handle cases where a valid token for a different user type (e.g. admin) is decoded
            if (!decoded || !decoded.crmUserId) {
                return res.status(401).json({ message: 'Not authorized, invalid CRM token payload' });
            }

            const crmUser = await prisma.crmUser.findUnique({
                where: { id: decoded.crmUserId },
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    user_id: true,
                    client_id: true,
                    campaign_group_id: true,
                    status: true
                }
            });

            if (crmUser) {
                if (crmUser.status !== 'ACTIVE') {
                    return res.status(403).json({ message: 'User account is not active' });
                }
                req.crmUser = crmUser;
                next();
            } else {
                res.status(401).json({ message: 'Not authorized, CRM user not found' });
            }
        } catch (error) {
            console.error('CRM Auth Middleware Error:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};
