import jwt from 'jsonwebtoken';
import { Response } from 'express';

if (!process.env.JWT_SECRET) {
    throw new Error('FATAL ERROR: JWT_SECRET environment variable is not defined.');
}
const JWT_SECRET = process.env.JWT_SECRET;

interface UserPayload {
    userId: string;
    role: string;
}

export const generateToken = (res: Response, userId: string, role: string) => {
    const token = jwt.sign({ userId, role }, JWT_SECRET, {
        expiresIn: '30d',
    });

    res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return token;
};

export const clearToken = (res: Response) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0),
    });
};
