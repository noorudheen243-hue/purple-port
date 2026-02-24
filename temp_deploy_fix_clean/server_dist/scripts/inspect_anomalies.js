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
function inspectAnomalies() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Inspecting Anomalies for Today...');
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            const records = yield prisma.attendanceRecord.findMany({
                where: {
                    date: {
                        gte: todayStart,
                        lte: todayEnd
                    }
                },
                include: {
                    user: {
                        select: { full_name: true, department: true, staffProfile: { select: { staff_number: true } } }
                    }
                }
            });
            console.log(`Total Records Found: ${records.length}`);
            records.forEach(r => {
                var _a;
                console.log(`User: ${r.user.full_name} (${(_a = r.user.staffProfile) === null || _a === void 0 ? void 0 : _a.staff_number}) | Status: ${r.status} | CheckIn: ${r.check_in}`);
            });
        }
        catch (error) {
            console.error('Error:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
inspectAnomalies();
