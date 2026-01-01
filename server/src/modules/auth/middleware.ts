import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// Extend Express Request interface
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
                department: string;
            };
        }
    }
}

interface DecodedToken {
    userId: string;
    role: string;
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    // Check for token in cookies
    token = req.cookies.jwt;

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, role: true, department: true }, // Select minimal fields
            });

            if (user) {
                req.user = {
                    id: user.id,
                    role: user.role,
                    department: user.department
                };
                next();
            } else {
                res.status(401).json({ message: 'Not authorized, user not found' });
            }
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Developer Admin has access to everything
        if (req.user && (req.user.role === 'DEVELOPER_ADMIN' || roles.includes(req.user.role))) {
            next();
        } else {
            res.status(403).json({ message: 'Not authorized to access this route' });
        }
    };
};
