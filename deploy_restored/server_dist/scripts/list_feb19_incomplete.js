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
function listIncompleteRecords() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Searching for Incomplete Attendance Records (Feb 19)...");
        // Targets: Date Key = Feb 19 00:00 UTC OR Feb 18 18:30 UTC
        // We want to find anyone who Checked In but is NOT Checked Out
        // Key 1: Feb 18 18:30 UTC (IST Midnight)
        const dateKeyIST = new Date('2026-02-18T18:30:00.000Z');
        // Key 2: Feb 19 00:00 UTC (Old Logic)
        const dateKeyUTC = new Date('2026-02-19T00:00:00.000Z');
        const records = yield prisma.attendanceRecord.findMany({
            where: {
                date: { in: [dateKeyIST, dateKeyUTC] },
                check_in: { not: null },
                check_out: null
            },
            include: {
                user: { select: { full_name: true, staffProfile: { select: { staff_number: true } } } }
            }
        });
        console.log(`Found ${records.length} incomplete records.`);
        records.forEach(r => {
            var _a, _b;
            console.log(`- ${r.user.full_name} (${(_a = r.user.staffProfile) === null || _a === void 0 ? void 0 : _a.staff_number}) | In: ${(_b = r.check_in) === null || _b === void 0 ? void 0 : _b.toISOString()} | DateKey: ${r.date.toISOString()}`);
        });
    });
}
listIncompleteRecords()
    .catch(console.error)
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
