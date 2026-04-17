import prisma from '../../utils/prisma';

export const getContentTypes = async () => {
    return await prisma.contentType.findMany({
        orderBy: { name: 'asc' }
    });
};

export const createContentType = async (data: { name: string, is_custom?: boolean }) => {
    return await prisma.contentType.create({
        data: {
            name: data.name,
            is_custom: data.is_custom !== undefined ? data.is_custom : true
        }
    });
};
