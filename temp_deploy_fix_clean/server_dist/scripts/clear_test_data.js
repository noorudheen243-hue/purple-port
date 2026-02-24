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
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting data cleanup...');
        try {
            // 1. Delete Notifications
            const deletedNotifications = yield prisma.notification.deleteMany({});
            console.log(`Deleted ${deletedNotifications.count} notifications.`);
            // 2. Delete Leave Requests
            const deletedLeaves = yield prisma.leaveRequest.deleteMany({});
            console.log(`Deleted ${deletedLeaves.count} leave requests.`);
            // 3. Delete Regularisation Requests
            const deletedRegularisations = yield prisma.regularisationRequest.deleteMany({});
            console.log(`Deleted ${deletedRegularisations.count} regularisation requests.`);
            // 4. Delete Attendance Records
            const deletedAttendance = yield prisma.attendanceRecord.deleteMany({});
            console.log(`Deleted ${deletedAttendance.count} attendance records.`);
            console.log('Data cleanup completed successfully.');
        }
        catch (error) {
            console.error('Error clearing data:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
main();
