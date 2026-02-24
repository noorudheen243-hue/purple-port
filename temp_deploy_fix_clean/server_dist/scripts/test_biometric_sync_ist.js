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
const service_1 = require("../modules/attendance/service");
const prisma = new client_1.PrismaClient();
function testBiometricSyncIST() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Testing Biometric Sync (IST Logic)...");
        // 1. Setup Test User
        const staffNumber = 'TEST_IST_001';
        let user = yield prisma.user.findFirst({ where: { staffProfile: { staff_number: staffNumber } } });
        if (!user) {
            // Create dummy if needed
            user = yield prisma.user.create({
                data: {
                    email: 'test_ist@example.com',
                    full_name: 'Test IST User',
                    password_hash: 'dummy',
                    role: 'DM_EXECUTIVE',
                    department: 'MARKETING',
                    staffProfile: {
                        create: {
                            staff_number: staffNumber,
                            designation: 'Tester',
                            department: 'MARKETING',
                            date_of_joining: new Date(),
                        }
                    }
                }
            });
        }
        // 2. Setup Existing Record (Morning Punch) stored as IST Midnight
        // Date: Feb 19 IST Midnight = Feb 18 18:30 UTC
        const istMidnight = new Date('2026-02-18T18:30:00.000Z');
        yield prisma.attendanceRecord.deleteMany({
            where: { user_id: user.id, date: istMidnight }
        });
        console.log(`Creating initial record for date: ${istMidnight.toISOString()}`);
        yield prisma.attendanceRecord.create({
            data: {
                user_id: user.id,
                date: istMidnight,
                check_in: new Date('2026-02-19T03:30:00.000Z'), // 09:00 IST
                status: 'PRESENT',
                method: 'BIOMETRIC'
            }
        });
        // 3. Simulate Evening Punch Out
        // Feb 19 18:00 IST = Feb 19 12:30 UTC
        const punchOutTime = '2026-02-19T12:30:00.000Z';
        const logs = [{
                staff_number: staffNumber,
                timestamp: punchOutTime
            }];
        console.log(`Processing Punch Out: ${punchOutTime}`);
        const result = yield service_1.AttendanceService.processBiometricLogs(logs);
        console.log("Sync Result:", JSON.stringify(result));
        // 4. Verify Update
        const record = yield prisma.attendanceRecord.findFirst({
            where: { user_id: user.id, date: istMidnight }
        });
        if (record === null || record === void 0 ? void 0 : record.check_out) {
            console.log(`SUCCESS: Check out updated! Value: ${record.check_out.toISOString()}`);
        }
        else {
            console.log(`FAILURE: Check out still null.`);
        }
    });
}
testBiometricSyncIST()
    .catch(console.error)
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
