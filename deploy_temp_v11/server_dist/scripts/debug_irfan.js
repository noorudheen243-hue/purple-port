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
function debugIrfan() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Debugging Irfan's Record (Feb 19)...");
        const user = yield prisma.user.findFirst({
            where: { staffProfile: { staff_number: 'QIX0011' } } // Irfan's ID
        });
        if (!user) {
            console.log("User Irfan (QIX0011) not found.");
            return;
        }
        // List ALL records for him for Feb 18/19 just to be sure
        const records = yield prisma.attendanceRecord.findMany({
            where: {
                user_id: user.id,
                date: {
                    gte: new Date('2026-02-18T00:00:00.000Z'),
                    lte: new Date('2026-02-20T00:00:00.000Z')
                }
            }
        });
        console.log(`Found ${records.length} records for Irfan.`);
        records.forEach(r => {
            var _a, _b;
            console.log(`Date: ${r.date.toISOString()} | In: ${(_a = r.check_in) === null || _a === void 0 ? void 0 : _a.toISOString()} | Out: ${(_b = r.check_out) === null || _b === void 0 ? void 0 : _b.toISOString()} | Status: ${r.status}`);
        });
    });
}
debugIrfan()
    .catch(console.error)
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
