import prisma from '../../utils/prisma';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';



export const createUser = async (data: Prisma.UserCreateInput) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password_hash, salt);

    const user = await prisma.user.create({
        data: {
            ...data,
            password_hash: hashedPassword,
        },
    });

    // Auto-Create Ledger


    return user;
};

export const findUserByEmail = async (email: string) => {
    return await prisma.user.findUnique({
        where: { email },
    });
};



export const findUserById = async (id: string) => {
    return await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            full_name: true,
            email: true,
            role: true,
            department: true,
            avatar_url: true,
            linked_client_id: true,
        }
    });
};

export const getAllUsers = async (includeHidden = false) => {
    // Base Where: Always hide Bridge Agent
    const whereClause: any = {
        email: { not: 'bridge@antigravity.com' }
    };

    // If NOT asking for hidden users (default behavior for Dropdowns), apply strict filters
    if (!includeHidden) {
        whereClause.role = { not: 'CLIENT' }; // Exclude Clients
        whereClause.staffProfile = {
            staff_number: { notIn: ['QIX0001', 'QIX0002'] } // Exclude Co-founders
        };
    }

    return await prisma.user.findMany({
        where: whereClause,
        select: {
            id: true,
            full_name: true,
            email: true,
            role: true,
            department: true,
            avatar_url: true,
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const deleteUser = async (id: string) => {
    return await prisma.user.delete({
        where: { id },
    });
};

export const updateUser = async (id: string, data: Prisma.UserUpdateInput) => {
    if (data.password_hash) {
        const salt = await bcrypt.genSalt(10);
        data.password_hash = await bcrypt.hash(data.password_hash as string, salt);
    }
    return await prisma.user.update({
        where: { id },
        data
    });
};

export const updateUserPassword = async (id: string, passwordHash: string) => {
    return await prisma.user.update({
        where: { id },
        data: { password_hash: passwordHash }
    });
};

export const findUserByIdWithPassword = async (id: string) => {
    return await prisma.user.findUnique({
        where: { id }
    });
};
