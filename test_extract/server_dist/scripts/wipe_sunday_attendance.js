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
function wipeSundayAttendance() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Starting Sunday Attendance Wipe...');
            // Fetch all attendance records
            const allRecords = yield prisma.attendanceRecord.findMany({
                select: { id: true, date: true }
            });
            const sundayRecordIds = [];
            for (const record of allRecords) {
                const date = new Date(record.date);
                if (date.getDay() === 0) { // 0 is Sunday
                    sundayRecordIds.push(record.id);
                }
            }
            if (sundayRecordIds.length > 0) {
                const result = yield prisma.attendanceRecord.deleteMany({
                    where: {
                        id: { in: sundayRecordIds }
                    }
                });
                console.log(`Deleted ${result.count} attendance records found on Sundays.`);
            }
            else {
                console.log('No attendance records found on Sundays.');
            }
            console.log('Successfully wiped Sunday attendance.');
        }
        catch (error) {
            console.error('Error wiping Sunday attendance:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
wipeSundayAttendance();
