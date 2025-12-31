import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import * as userService from '../users/service';
import { generateToken, clearToken } from '../../utils/auth';

const registerSchema = z.object({
    full_name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['ADMIN', 'MANAGER', 'MARKETING_EXEC', 'DESIGNER', 'WEB_SEO']),
    department: z.enum(['CREATIVE', 'MARKETING', 'WEB', 'MANAGEMENT']),
});

export const registerUser = async (req: Request, res: Response) => {
    try {
        const validatedData = registerSchema.parse(req.body);

        const userExists = await userService.findUserByEmail(validatedData.email);
        if (userExists) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const user = await userService.createUser({
            full_name: validatedData.full_name,
            email: validatedData.email,
            password_hash: validatedData.password, // Will be hashed in service
            role: validatedData.role,
            department: validatedData.department
        });

        if (user) {
            generateToken(res, user.id, user.role);
            res.status(201).json({
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                department: user.department,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: error.errors });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
};

export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    console.log(`[LOGIN ATTEMPT] Email: ${email}, Password Provided: ${!!password}`);

    try {
        const user = await userService.findUserByEmail(email);
        console.log(`[LOGIN DEBUG] User found: ${!!user}`);

        if (user) {
            const isMatch = await bcrypt.compare(password, user.password_hash);
            console.log(`[LOGIN DEBUG] Password Match: ${isMatch}`);

            if (isMatch) {
                generateToken(res, user.id, user.role);
                res.json({
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role,
                    department: user.department,
                });
                return;
            }
        }

        console.log('[LOGIN FAILED] Invalid credentials');
        res.status(401).json({ message: 'Invalid email or password' });
    } catch (error: any) {
        console.error('[LOGIN ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

export const logoutUser = (req: Request, res: Response) => {
    clearToken(res);
    res.status(200).json({ message: 'Logged out successfully' });
};

export const getMe = async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
    }
    const user = await userService.findUserById(req.user.id);
    res.json(user);
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!req.user?.id) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const user = await userService.findUserByIdWithPassword(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify Current Password
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        // Hash New Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update User
        await userService.updateUserPassword(user.id, hashedPassword);

        res.json({ message: 'Password updated successfully' });

    } catch (error: any) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
