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
function wipeData() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('--- STARTING DATA WIPE ---');
            // 1. Delete Regularisation Requests (Dependent on User, linked to Attendance logic)
            const reg = yield prisma.regularisationRequest.deleteMany({});
            console.log(`Deleted ${reg.count} Regularisation Requests.`);
            // 2. Delete Leave Requests
            const leaves = yield prisma.leaveRequest.deleteMany({});
            console.log(`Deleted ${leaves.count} Leave Requests.`);
            // 3. Delete Attendance Records
            const att = yield prisma.attendanceRecord.deleteMany({});
            console.log(`Deleted ${att.count} Attendance Records.`);
            console.log('--- WIPE COMPLETE ---');
        }
        catch (error) {
            console.error('Error wiping data:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
wipeData();
