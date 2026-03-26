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
function checkFathimaAttendance() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("--- Fathima Hasna K Attendance Audit ---\n");
        const staff = yield db.staffProfile.findFirst({
            where: { staff_number: 'QIX0013' },
            include: { user: { select: { id: true, full_name: true } } }
        });
        if (!staff || !staff.user) {
            console.log("Staff not found.");
            return;
        }
        const records = yield db.attendanceRecord.findMany({
            where: { user_id: staff.user.id },
            orderBy: { date: 'desc' },
            take: 10
        });
        console.log(`Staff: ${staff.user.full_name} (${staff.staff_number})`);
        console.log(`Attendance Records Found: ${records.length}`);
        records.forEach(r => {
            var _a;
            console.log(`[${r.date.toISOString().split('T')[0]}] Check In: ${((_a = r.check_in) === null || _a === void 0 ? void 0 : _a.toISOString()) || '-'}, Method: ${r.method}, Status: ${r.status}`);
        });
    });
}
checkFathimaAttendance()
    .catch(console.error)
    .finally(() => db.$disconnect());
