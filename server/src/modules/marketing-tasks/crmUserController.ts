import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../utils/prisma';

// Helper to validate client context for normal app users (Admin, Manager, or Client)
const getAppValidatedClientId = (req: Request): string | null => {
    const user = req.user as any;
    if (!user) return null;
    const requestedClientId = req.query.clientId as string || req.body.clientId as string || req.body.client_id as string;

    if (!requestedClientId) return null;

    if (user.role === 'CLIENT') {
        if (requestedClientId !== user.linked_client_id) {
            return null; // Security violation
        }
    }
    return requestedClientId;
};

// 1. Get CRM Users
export const getCrmUsers = async (req: Request, res: Response) => {
    try {
        const clientId = getAppValidatedClientId(req);
        if (!clientId) {
            return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });
        }

        const users = await prisma.crmUser.findMany({
            where: { client_id: clientId },
            select: {
                id: true,
                full_name: true,
                designation: true,
                email: true,
                mobile: true,
                user_id: true,
                status: true,
                client_id: true,
                campaign_group_id: true,
                createdAt: true,
                updatedAt: true,
                campaign_group: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(users);
    } catch (error: any) {
        console.error('getCrmUsers Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// 2. Create CRM User
export const createCrmUser = async (req: Request, res: Response) => {
    try {
        const clientId = getAppValidatedClientId(req);
        if (!clientId) {
            return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });
        }

        const { full_name, designation, email, mobile, user_id, password, campaign_group_id, status } = req.body;

        if (!full_name || !user_id || !password) {
            return res.status(400).json({ message: 'Full name, user ID, and password are required' });
        }

        const emailTrimmed = email && email.trim().length > 0 ? email.trim().toLowerCase() : null;
        const userIdTrimmed = user_id.trim().toLowerCase();

        // Check if user_id or email (if provided) already exists
        const existingUser = await prisma.crmUser.findFirst({
            where: {
                OR: [
                    { user_id: userIdTrimmed },
                    ...(emailTrimmed ? [{ email: emailTrimmed }] : [])
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'A user with this Email or User ID already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await prisma.crmUser.create({
            data: {
                full_name: full_name.trim(),
                designation: designation?.trim() || null,
                email: emailTrimmed,
                mobile: mobile?.trim() || null,
                user_id: userIdTrimmed,
                password_hash,
                status: status || 'ACTIVE',
                client_id: clientId,
                campaign_group_id: campaign_group_id || null
            },
            select: {
                id: true,
                full_name: true,
                designation: true,
                email: true,
                mobile: true,
                user_id: true,
                status: true,
                client_id: true,
                campaign_group_id: true,
                createdAt: true
            }
        });

        res.status(201).json(newUser);
    } catch (error: any) {
        console.error('createCrmUser Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// 3. Update CRM User
export const updateCrmUser = async (req: Request, res: Response) => {
    try {
        const clientId = getAppValidatedClientId(req);
        if (!clientId) {
            return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });
        }

        const { id } = req.params;
        const { full_name, designation, email, mobile, user_id, password, campaign_group_id, status } = req.body;

        const user = await prisma.crmUser.findFirst({
            where: { id, client_id: clientId }
        });

        if (!user) {
            return res.status(404).json({ message: 'CRM User not found' });
        }

        const updateData: any = {};
        if (full_name !== undefined) updateData.full_name = full_name.trim();
        if (designation !== undefined) updateData.designation = designation?.trim() || null;
        if (mobile !== undefined) updateData.mobile = mobile?.trim() || null;
        if (campaign_group_id !== undefined) updateData.campaign_group_id = campaign_group_id || null;
        if (status !== undefined) updateData.status = status;

        if (email !== undefined) {
            const emailLower = email && email.trim().length > 0 ? email.trim().toLowerCase() : null;
            if (emailLower && emailLower !== user.email) {
                const existingEmail = await prisma.crmUser.findFirst({
                    where: { email: emailLower, NOT: { id } }
                });
                if (existingEmail) {
                    return res.status(400).json({ message: 'Email is already in use by another user' });
                }
            }
            updateData.email = emailLower;
        }

        if (user_id !== undefined && user_id.trim().toLowerCase() !== user.user_id) {
            const userIdLower = user_id.trim().toLowerCase();
            const existingUserId = await prisma.crmUser.findFirst({
                where: { user_id: userIdLower, NOT: { id } }
            });
            if (existingUserId) {
                return res.status(400).json({ message: 'User ID is already in use by another user' });
            }
            updateData.user_id = userIdLower;
        }

        if (password && password.trim().length > 0) {
            const salt = await bcrypt.genSalt(10);
            updateData.password_hash = await bcrypt.hash(password, salt);
        }

        const updatedUser = await prisma.crmUser.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                full_name: true,
                designation: true,
                email: true,
                mobile: true,
                user_id: true,
                status: true,
                client_id: true,
                campaign_group_id: true,
                createdAt: true,
                updatedAt: true
            }
        });

        res.json(updatedUser);
    } catch (error: any) {
        console.error('updateCrmUser Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// 4. Delete CRM User
export const deleteCrmUser = async (req: Request, res: Response) => {
    try {
        const clientId = getAppValidatedClientId(req);
        if (!clientId) {
            return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });
        }

        const { id } = req.params;

        const user = await prisma.crmUser.findFirst({
            where: { id, client_id: clientId }
        });

        if (!user) {
            return res.status(404).json({ message: 'CRM User not found' });
        }

        await prisma.crmUser.delete({
            where: { id }
        });

        res.json({ message: 'CRM User deleted successfully' });
    } catch (error: any) {
        console.error('deleteCrmUser Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};
