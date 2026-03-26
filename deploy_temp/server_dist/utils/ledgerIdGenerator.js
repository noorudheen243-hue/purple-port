"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLedgerCode = void 0;
/**
 * Generates a unique Ledger Code in the format QIXFML[SEQUENCE]
 * Example: QIXFML0072
 * @param tx Prisma Transaction Client (or main PrismaClient)
 */
const generateLedgerCode = (tx) => __awaiter(void 0, void 0, void 0, function* () {
    // Note: TypeScript might complain about 'any' if we strictly type tx, 
    // but allowing any makes it easier to pass normal prisma client or transaction client.
    // 1. Find the highest ledger_code
    const lastLedger = yield tx.ledger.findFirst({
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
});
exports.generateLedgerCode = generateLedgerCode;
