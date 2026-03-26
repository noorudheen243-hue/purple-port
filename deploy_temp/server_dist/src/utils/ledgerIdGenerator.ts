import { Prisma } from '@prisma/client';

/**
 * Generates a unique Ledger Code in the format QIXFML[SEQUENCE]
 * Example: QIXFML0072
 * @param tx Prisma Transaction Client (or main PrismaClient)
 */
export const generateLedgerCode = async (tx: Prisma.TransactionClient | any): Promise<string> => {
    // Note: TypeScript might complain about 'any' if we strictly type tx, 
    // but allowing any makes it easier to pass normal prisma client or transaction client.

    // 1. Find the highest ledger_code
    const lastLedger = await tx.ledger.findFirst({
        where: {
            ledger_code: {
                startsWith: 'QIXFML'
            }
        },
        orderBy: {
            ledger_code: 'desc'
        }
    });

    let nextSequence = 1;

    // 2. Extract number and increment
    if (lastLedger && lastLedger.ledger_code) {
        const lastCode = lastLedger.ledger_code; // e.g., "QIXFML0071"
        const numPart = lastCode.replace('QIXFML', '');
        const lastNum = parseInt(numPart, 10);
        if (!isNaN(lastNum)) {
            nextSequence = lastNum + 1;
        }
    }

    // 3. Format to 4 digits (or more if it exceeds 9999)
    const seqStr = nextSequence.toString().padStart(4, '0');
    return `QIXFML${seqStr}`;
};
