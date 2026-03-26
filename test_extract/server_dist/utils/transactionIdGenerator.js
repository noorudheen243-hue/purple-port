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
exports.generateTransactionId = void 0;
/**
 * Generates a unique Transaction ID in the format QTN[YY][MM][SEQUENCE]
 * Example: QTN2601000023
 * @param tx Prisma Transaction Client
 */
const generateTransactionId = (tx) => __awaiter(void 0, void 0, void 0, function* () {
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
    const sequence = yield tx.transactionSequence.upsert({
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
});
exports.generateTransactionId = generateTransactionId;
