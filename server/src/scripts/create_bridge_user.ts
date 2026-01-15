
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createBridgeUser() {
    try {
        const email = 'bridge@antigravity.com';
        const password = 'bridge_secure_password';

        // Check if exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            console.log("Bridge user already exists.");
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await prisma.user.create({
            data: {
                full_name: 'Biometric Bridge Agent',
                email: email,
                password_hash: passwordHash,
                role: 'ADMIN',
                department: 'IT'
            }
        });

        console.log(`Bridge user created: ${email}`);
    } catch (error) {
        console.error('Error creating bridge user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createBridgeUser();
