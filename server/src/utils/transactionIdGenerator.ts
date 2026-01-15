
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Generates a unique Transaction ID in the format QTN[YY][MM][SEQUENCE]
 * Example: QTN2601000023
 * @param tx Prisma Transaction Client
 */
export const generateTransactionId = async (tx: Prisma.TransactionClient): Promise<string> => {
    const now = new Date();
    // Use IST or local server time? User mentioned "if year 2026... if month december".
    // We'll use local server time (which is likely UTC or configured timezone).
    // Given the previous conversation, user is in IST (+05:30).
    // Let's explicitly offset to IST if we want to be precise, or just use getFullYear().
    // Assuming server time is what matters.

    const year = now.getFullYear(); // e.g. 2026
    const month = now.getMonth() + 1; // 1-12

    const yy = year.toString().slice(-2);
    const mm = month.toString().padStart(2, '0');

    // Upsert sequence
    // @ts-ignore
    const sequence = await tx.transactionSequence.upsert({
        where: {
            year_month: {
                year: year,
                month: month
            }
        },
        update: {
            last_seq: { increment: 1 }
        },
        create: {
            year: year,
            month: month,
            last_seq: 1
        }
    });

    const seqStr = sequence.last_seq.toString().padStart(6, '0');
    return `QTN${yy}${mm}${seqStr}`;
};
