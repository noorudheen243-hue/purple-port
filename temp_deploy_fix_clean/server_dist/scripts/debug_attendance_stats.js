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
function debugAttendanceStats() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            console.log('--- DEBUG INFO ---');
            console.log('Today Start:', todayStart.toISOString());
            console.log('Today End:  ', todayEnd.toISOString());
            // 1. Get Today's Attendance Records
            const attendanceRecords = yield prisma.attendanceRecord.findMany({
                where: {
                    date: {
                        gte: todayStart,
                        lte: todayEnd
                    },
                    status: { in: ['PRESENT', 'WFH', 'HALF_DAY', 'LATE'] },
                    check_in: { not: null }, // STRICT FILTER
                    // Exclude Co-Founders
                    user: {
                        staffProfile: {
                            staff_number: { notIn: ['QIX0001', 'QIX0002'] }
                        }
                    }
                },
                include: {
                    user: {
                        select: { full_name: true, department: true }
                    }
                }
            });
            console.log(`Found ${attendanceRecords.length} records.`);
            attendanceRecords.forEach(r => {
                console.log(`- ${r.user.full_name} (${r.user.department}): ${r.status} | CheckIn: ${r.check_in}`);
            });
            // Test without CheckIn filter
            const allRecords = yield prisma.attendanceRecord.findMany({
                where: {
                    date: {
                        gte: todayStart,
                        lte: todayEnd
                    },
                    status: { in: ['PRESENT', 'WFH', 'HALF_DAY'] }
                }
            });
            console.log(`Total Records (ignoring check_in null): ${allRecords.length}`);
        }
        catch (error) {
            console.error('Error:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
debugAttendanceStats();
