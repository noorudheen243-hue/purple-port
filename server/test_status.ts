
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.biometricDeviceStatus.findUnique({ where: { id: 'CURRENT' } }).then(status => {
  console.log(status);
  process.exit(0);
});

