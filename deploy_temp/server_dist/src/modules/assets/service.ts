import prisma from '../../utils/prisma';
import fs from 'fs';
import path from 'path';

export const createAsset = async (data: {
    original_name: string;
    file_url: string;
    file_type: string;
    size_bytes: number;
    task_id: string;
    uploader_id: string;
}) => {
    // Check for previous versions to increment version number
    const latestAsset = await prisma.asset.findFirst({
        where: { task_id: data.task_id },
        orderBy: { version: 'desc' }
    });

    const version = latestAsset ? latestAsset.version + 1 : 1;

    return await prisma.asset.create({
        data: {
            ...data,
            version
        }
    });
};

export const getAssetsByTask = async (taskId: string) => {
    return await prisma.asset.findMany({
        where: { task_id: taskId },
        orderBy: { createdAt: 'desc' },
        include: {
            uploader: { select: { id: true, full_name: true, avatar_url: true } }
        }
    });
};

export const deleteAsset = async (id: string) => {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return null;

    // Delete file from disk
    const filePath = path.join(process.cwd(), asset.file_url); // file_url stored as 'uploads/filename...'
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    return await prisma.asset.delete({ where: { id } });
};

export const approveAsset = async (id: string, is_approved: boolean) => {
    return await prisma.asset.update({
        where: { id },
        data: { is_approved }
    });
};
