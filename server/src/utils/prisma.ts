import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

// Enable WAL mode for better concurrency with SQLite
async function enableWal() {
    try {
        await prisma.$queryRaw`PRAGMA journal_mode = WAL;`;
        console.log('SQLite WAL Mode Enabled');
    } catch (error) {
        console.error('Failed to enable WAL mode:', error);
    }
}

enableWal();

export default prisma;
