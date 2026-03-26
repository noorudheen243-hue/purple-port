import { PrismaClient } from '@prisma/client';

const isProduction = process.env.NODE_ENV === 'production';

const prisma = new PrismaClient({
    log: isProduction ? ['error', 'warn'] : ['query', 'info', 'warn', 'error'],
});

// Enable WAL mode for better concurrency with SQLite
// We run this on initialization to ensure the DB is optimized
if (isProduction) {
    prisma.$queryRaw`PRAGMA journal_mode = WAL;`
        .then(() => console.log('SQLite WAL Mode Verified'))
        .catch(err => console.error('Failed to set WAL mode:', err));
} else {
    // In dev, we can be more explicit
    (async () => {
        try {
            await prisma.$queryRaw`PRAGMA journal_mode = WAL;`;
            console.log('SQLite WAL Mode Enabled');
        } catch (error) {
            console.error('Failed to enable WAL mode:', error);
        }
    })();
}

export default prisma;
