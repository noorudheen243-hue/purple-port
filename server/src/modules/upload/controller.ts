import { Request, Response } from 'express';

export const uploadFile = (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Construct standard URL
        // Assuming server is served at root or we just return relative path
        // Client usually prepends API_URL or base URL
        const fileUrl = `/uploads/${req.file.filename}`;

        res.status(201).json({
            message: 'File uploaded successfully',
            url: fileUrl,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
