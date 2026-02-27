
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStaff() {
    try {
        const staff = await prisma.staffProfile.findFirst({
            where: {
                OR: [
                    { staff_number: 'QIX0013' },
                    { biometric_device_id: '13' },
                    { biometric_device_id: 'QIX0013' }
                ]
            },
            include: {
                user: {
                    select: {
                        full_name: true,
                        role: true
                    }
                }
            }
        });

        console.log('Staff Profile Details:');
        console.log(JSON.stringify(staff, null, 2));

        if (!staff) {
            console.log('No staff profile found for QIX0013 or UID 13.');
        } else {
            if (staff.biometric_device_id !== '13') {
                console.log(`\nISSUE DETECTED: biometric_device_id is "${staff.biometric_device_id}", but should probably be "13" to match the bridge logs.`);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkStaff();
