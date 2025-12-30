import { Request, Response } from 'express';
import * as userService from './service';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await userService.getAllUsers();
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
