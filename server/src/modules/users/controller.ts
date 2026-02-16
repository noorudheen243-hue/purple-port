import { Request, Response } from 'express';
import * as userService from './service';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const includeHidden = req.query.include_hidden === 'true';
        const users = await userService.getAllUsers(includeHidden);
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const user = await userService.findUserById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
// ... (getUserById above)

// ... (previous code)

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { password, ...otherData } = req.body;

        // Map password to password_hash if present
        const updateData: any = { ...otherData };
        if (password) {
            updateData.password_hash = password; // Service will hash this
        }

        const user = await userService.updateUser(id, updateData);
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // 1. Fetch user to check Role
        const userToDelete = await userService.findUserById(id);
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 2. Prevent deleting Developer Admin
        if (userToDelete.role === 'DEVELOPER_ADMIN') {
            return res.status(403).json({ message: 'Cannot delete a Developer Admin user.' });
        }

        // 3. Perform Delete
        await userService.deleteUser(id);
        res.json({ message: 'User deleted successfully' });

    } catch (error: any) {
        // Handle FK Constraint errors gracefully if possible
        if (error.code === 'P2003') { // Prisma FK violation
            return res.status(400).json({ message: 'Cannot delete user: They have associated records (Tasks, Clients, etc.).' });
        }
        res.status(500).json({ message: error.message });
    }
};
