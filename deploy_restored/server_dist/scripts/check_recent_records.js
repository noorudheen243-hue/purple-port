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
const db = new client_1.PrismaClient();
function checkRecentRecords() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("--- Recent Attendance Records Audit (Last 1 Hour) ---\n");
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const records = yield db.attendanceRecord.findMany({
            where: { createdAt: { gte: oneHourAgo } },
            include: { user: { select: { full_name: true } } },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`Total Records Found: ${records.length}`);
        records.forEach(r => {
            var _a, _b;
            console.log(`[${r.date.toISOString().split('T')[0]}] User: ${((_a = r.user) === null || _a === void 0 ? void 0 : _a.full_name) || 'Unknown'}, Check In: ${((_b = r.check_in) === null || _b === void 0 ? void 0 : _b.toISOString()) || '-'}, Method: ${r.method}, CreatedAt: ${r.createdAt.toISOString()}`);
        });
        if (records.length === 0) {
            console.log("No new records created in the last hour. This means the sync might have matched existing records or failed silently.");
        }
    });
}
checkRecentRecords()
    .catch(console.error)
    .finally(() => db.$disconnect());
