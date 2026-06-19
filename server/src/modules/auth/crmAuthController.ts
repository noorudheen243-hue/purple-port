import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const loginCrmUser = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'User ID/Email and password are required' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = password.trim();

    try {
        // CRM users can log in using either their user_id or email
        const crmUser = await prisma.crmUser.findFirst({
            where: {
                OR: [
                    { user_id: normalizedUsername },
                    { email: normalizedUsername }
                ]
            },
            include: {
                client: {
                    select: {
                        name: true,
                        logo_url: true
                    }
                },
                campaign_group: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!crmUser) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (crmUser.status !== 'ACTIVE') {
            return res.status(403).json({ message: 'This account is inactive. Please contact support.' });
        }

        const isMatch = await bcrypt.compare(normalizedPassword, crmUser.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate CRM Token
        const token = jwt.sign(
            { crmUserId: crmUser.id, email: crmUser.email },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Set cookie
        res.cookie('crm_jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        // Log activity
        await prisma.crmActivityLog.create({
            data: {
                crm_user_id: crmUser.id,
                action: 'LOGIN',
                details: 'User logged in successfully'
            }
        });

        res.json({
            token,
            crmUser: {
                id: crmUser.id,
                full_name: crmUser.full_name,
                designation: crmUser.designation,
                email: crmUser.email,
                mobile: crmUser.mobile,
                user_id: crmUser.user_id,
                client_id: crmUser.client_id,
                campaign_group_id: crmUser.campaign_group_id,
                status: crmUser.status,
                clientName: crmUser.client.name,
                clientLogo: crmUser.client.logo_url,
                groupName: crmUser.campaign_group?.name || 'Full Access'
            }
        });

    } catch (error: any) {
        console.error('[CRM LOGIN ERROR]', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const getCrmMe = async (req: Request, res: Response) => {
    if (!req.crmUser) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const crmUser = await prisma.crmUser.findUnique({
            where: { id: req.crmUser.id },
            include: {
                client: {
                    select: {
                        name: true,
                        logo_url: true
                    }
                },
                campaign_group: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!crmUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            crmUser: {
                id: crmUser.id,
                full_name: crmUser.full_name,
                designation: crmUser.designation,
                email: crmUser.email,
                mobile: crmUser.mobile,
                user_id: crmUser.user_id,
                client_id: crmUser.client_id,
                campaign_group_id: crmUser.campaign_group_id,
                status: crmUser.status,
                clientName: crmUser.client.name,
                clientLogo: crmUser.client.logo_url,
                groupName: crmUser.campaign_group?.name || 'Full Access'
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const logoutCrmUser = async (req: Request, res: Response) => {
    if (req.crmUser) {
        // Log activity if logged in
        try {
            await prisma.crmActivityLog.create({
                data: {
                    crm_user_id: req.crmUser.id,
                    action: 'LOGOUT',
                    details: 'User logged out'
                }
            });
        } catch (e) {
            // Ignored
        }
    }

    res.cookie('crm_jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });

    res.status(200).json({ message: 'Logged out successfully' });
};
