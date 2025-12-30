
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAll() {
    console.log('>>> RESETTING ALL PASSWORDS...');

    // 1. Generate Hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 2. Update All Users
    const result = await prisma.user.updateMany({
        data: {
            password_hash: hashedPassword
        }
    });

    console.log(`>>> Updated ${result.count} existing users.`);

    // 3. Ensure Admin Exists
    const adminEmail = 'admin@qixads.com';
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!admin) {
        console.log('>>> Admin not found. Creating admin@qixads.com ...');
        await prisma.user.create({
            data: {
                email: adminEmail,
                full_name: 'Super Admin',
                password_hash: hashedPassword,
                role: 'ADMIN',
                department: 'MANAGEMENT',
                staffProfile: {
                    create: {
                        staff_number: 'ADM001',
                        designation: 'Administrator',
                        department: 'MANAGEMENT',
                        date_of_joining: new Date(),
                    }
                }
            }
        });
        console.log('>>> Admin created successfully.');
    }

    console.log('>>> All passwords are now: password123');
}

resetAll()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
