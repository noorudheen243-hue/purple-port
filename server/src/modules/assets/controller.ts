import { Request, Response } from 'express';
import * as assetService from './service';

export const uploadAsset = async (req: Request, res: Response) => {
    try {
        const { task_id, original_name, file_url, file_type, size_bytes } = req.body;

        if (!task_id || !file_url) {
            return res.status(400).json({ message: 'Task ID and file URL are required' });
        }

        const asset = await assetService.createAsset({
            original_name: original_name || 'unknown',
            file_url,
            file_type: file_type || 'application/octet-stream',
            size_bytes: size_bytes || 0,
            task_id,
            uploader_id: req.user!.id
        });

        res.status(201).json(asset);
    } catch (error: any) {
        console.error('Asset creation error:', error);
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
