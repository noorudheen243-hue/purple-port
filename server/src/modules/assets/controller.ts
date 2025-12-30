import { Request, Response } from 'express';
import * as assetService from './service';

export const uploadAsset = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { task_id } = req.body;
        if (!task_id) {
            return res.status(400).json({ message: 'Task ID is required' });
        }

        // file_url will be relative path 'uploads/filename'
        // In production this might be a full S3 URL
        const file_url = `uploads/${req.file.filename}`;

        const asset = await assetService.createAsset({
            original_name: req.file.originalname,
            file_url,
            file_type: req.file.mimetype,
            size_bytes: req.file.size,
            task_id,
            uploader_id: req.user!.id
        });

        res.status(201).json(asset);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const approveAsset = async (req: Request, res: Response) => {
    try {
        const { is_approved } = req.body;
        const asset = await assetService.approveAsset(req.params.id, is_approved);
        res.json(asset);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteAsset = async (req: Request, res: Response) => {
    try {
        await assetService.deleteAsset(req.params.id);
        res.json({ message: 'Asset deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
