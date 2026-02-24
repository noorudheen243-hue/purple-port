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
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function fixJan12Mismatch() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Fixing January 12th Date Mismatch...');
            const startJan12 = new Date('2026-01-12T00:00:00.000Z');
            const endJan12 = new Date('2026-01-12T23:59:59.999Z');
            const targetDate = new Date('2026-01-13T00:00:00.000Z'); // Tuesday
            const records = yield prisma.attendanceRecord.findMany({
                where: {
                    date: {
                        gte: startJan12,
                        lte: endJan12
                    }
                }
            });
            console.log(`Checking ${records.length} records...`);
            let updatedCount = 0;
            for (const record of records) {
                if (record.check_in) {
                    const checkInDate = new Date(record.check_in);
                    // If check_in is on Jan 13th (Day 13), but record date is Jan 12th
                    if (checkInDate.getDate() === 13) {
                        yield prisma.attendanceRecord.update({
                            where: { id: record.id },
                            data: {
                                date: targetDate
                            }
                        });
                        updatedCount++;
                    }
                }
            }
            console.log(`Successfully moved ${updatedCount} records from Jan 12 to Jan 13.`);
        }
        catch (error) {
            console.error('Error fixing mismatch:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
fixJan12Mismatch();
