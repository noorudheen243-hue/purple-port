import { Request, Response } from 'express';
import * as service from './service';

export const getTypes = async (req: Request, res: Response) => {
    try {
        const types = await service.getContentTypes();
        res.json(types);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createType = async (req: Request, res: Response) => {
    try {
        const newType = await service.createContentType(req.body);
        res.status(201).json(newType);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
