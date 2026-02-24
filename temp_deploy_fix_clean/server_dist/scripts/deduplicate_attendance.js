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
function deduplicateAttendance() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Deduplicating Attendance Records for Today...');
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            // Fetch all records for today
            const records = yield prisma.attendanceRecord.findMany({
                where: {
                    date: {
                        gte: todayStart,
                        lte: todayEnd
                    }
                },
                orderBy: { createdAt: 'asc' } // Keep the oldest? Or newest? Doesn't matter if identical.
            });
            const seenUsers = new Set();
            const duplicates = [];
            for (const r of records) {
                if (seenUsers.has(r.user_id)) {
                    duplicates.push(r.id);
                }
                else {
                    seenUsers.add(r.user_id);
                }
            }
            console.log(`Found ${duplicates.length} duplicate records.`);
            if (duplicates.length > 0) {
                const result = yield prisma.attendanceRecord.deleteMany({
                    where: {
                        id: { in: duplicates }
                    }
                });
                console.log(`Deleted ${result.count} duplicates.`);
            }
            else {
                console.log('No duplicates found needing deletion.');
            }
        }
        catch (error) {
            console.error('Error deduplicating:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
deduplicateAttendance();
