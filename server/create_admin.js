const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);

        const admin = await prisma.user.create({
            data: {
                name: 'Noorudheen',
                email: 'noorudheen243@gmail.com',
                password: hashedPassword,
                role: 'DEVELOPER_ADMIN',
                staff_number: 'ADMIN001',
                department: 'MANAGEMENT',
                position: 'Developer Admin',
                date_of_joining: new Date(),
                salary: 0,
                phone: '1234567890'
            }
        });

        console.log('\n✅ Admin user created successfully!');
        console.log('\nLogin Credentials:');
        console.log('Email:', admin.email);
        console.log('Password: password123');
        console.log('Role:', admin.role);

    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
