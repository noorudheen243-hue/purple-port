
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'noorudheen243@gmail.com'; // Hardcoded for safety/specificity
    const newPassword = 'password123';

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { email },
            data: {
                password_hash: hashedPassword,
                role: 'DEVELOPER_ADMIN', // Ensure role is correct
            }
        });

        console.log(`Success: Password for ${email} has been reset to '${newPassword}'`);

    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
