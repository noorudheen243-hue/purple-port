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
function debugMapping() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("--- Staff Mapping Debug ---\n");
        // 1. List all Staff Profiles
        const staff = yield db.staffProfile.findMany({
            include: { user: { select: { full_name: true, id: true } } }
        });
        console.log(pad("Staff Number", 15) + " | " + pad("User Name", 20) + " | " + pad("User ID", 36));
        console.log("-".repeat(80));
        staff.forEach(s => {
            var _a, _b;
            console.log(pad(s.staff_number, 15) + " | " +
                pad(((_a = s.user) === null || _a === void 0 ? void 0 : _a.full_name) || 'Unlinked', 20) + " | " +
                pad(((_b = s.user) === null || _b === void 0 ? void 0 : _b.id) || 'N/A', 36));
        });
        // 2. Dump recent 20 Attendance Records (All methods)
        console.log("\n--- Recent 20 Attendance Records (ANY Date) ---\n");
        const logs = yield db.attendanceRecord.findMany({
            take: 20,
            orderBy: { updatedAt: 'desc' },
            include: { user: { select: { full_name: true } } }
        });
        console.log(pad("Date", 12) + " | " + pad("User", 20) + " | " + pad("Check In", 10) + " | " + pad("Created At", 25));
        console.log("-".repeat(80));
        logs.forEach(l => {
            var _a;
            const d = l.date.toISOString().substr(0, 10);
            const ci = l.check_in ? l.check_in.toISOString().substr(11, 8) : '-';
            console.log(pad(d, 12) + " | " +
                pad(((_a = l.user) === null || _a === void 0 ? void 0 : _a.full_name) || 'Unknown', 20) + " | " +
                pad(ci, 10) + " | " +
                pad(l.createdAt.toISOString(), 25));
        });
    });
}
function pad(str, len) {
    return (str || '').padEnd(len).substring(0, len);
}
debugMapping()
    .catch(console.error)
    .finally(() => db.$disconnect());
