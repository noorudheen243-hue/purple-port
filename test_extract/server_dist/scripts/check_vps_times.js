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
function checkVPSTimes() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Checking Punch-Out Times for Feb 19...");
        const dateKeyIST = new Date('2026-02-18T18:30:00.000Z');
        const dateKeyUTC = new Date('2026-02-19T00:00:00.000Z');
        const records = yield prisma.attendanceRecord.findMany({
            where: {
                date: { in: [dateKeyIST, dateKeyUTC] },
                check_in: { not: null }
            },
            include: {
                user: { include: { staffProfile: true } }
            }
        });
        console.log(`Found ${records.length} records.`);
        records.forEach(r => {
            var _a;
            const name = r.user.full_name;
            const staffId = (_a = r.user.staffProfile) === null || _a === void 0 ? void 0 : _a.staff_number;
            const inTime = r.check_in ? r.check_in.toISOString() : 'N/A';
            const outTime = r.check_out ? r.check_out.toISOString() : 'MISSING';
            console.log(`${staffId} | ${name} | In: ${inTime} | Out: ${outTime}`);
        });
    });
}
checkVPSTimes()
    .catch(console.error)
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
