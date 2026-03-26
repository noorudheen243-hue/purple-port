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
function checkStatusAndCriteria() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Checking Status and Criteria for Basil and Nidhin K...");
        const targetDate = new Date('2026-02-16T18:30:00.000Z'); // Feb 17 IST
        const records = yield prisma.attendanceRecord.findMany({
            where: {
                date: targetDate,
                user: {
                    full_name: { in: ['Basil', 'Nidhin K (Edited)'] }
                }
            },
            include: {
                user: {
                    include: { staffProfile: true }
                }
            }
        });
        console.log(`Found ${records.length} records.`);
        for (const r of records) {
            const staff = r.user.staffProfile;
            const criteria = staff.punch_in_criteria || 'N/A';
            const workHours = r.work_hours || 0;
            console.log(`User: ${r.user.full_name}`);
            console.log(`  Current Status: ${r.status}`);
            console.log(`  Criteria: ${criteria}`);
            console.log(`  Work Hours: ${workHours.toFixed(2)}`);
            console.log(`  Check In: ${r.check_in}`);
            console.log(`  Check Out: ${r.check_out}`);
            console.log('---');
        }
    });
}
checkStatusAndCriteria()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
