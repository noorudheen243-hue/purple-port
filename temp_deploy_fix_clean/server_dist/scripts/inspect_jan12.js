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
function inspectJan12() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Inspecting Attendance for Jan 12, 2026...');
            const startJan12 = new Date('2026-01-12T00:00:00.000Z');
            const endJan13 = new Date('2026-01-13T23:59:59.999Z');
            const records = yield prisma.attendanceRecord.findMany({
                where: {
                    date: {
                        gte: startJan12,
                        lte: endJan13
                    }
                },
                include: { user: true },
                orderBy: { date: 'asc' }
            });
            console.log(`Found ${records.length} records for Jan 12-13.`);
            records.forEach(r => {
                console.log(`- Date=${r.date.toISOString().split('T')[0]}, User=${r.user.full_name}, CheckIn=${r.check_in}`);
            });
        }
        catch (error) {
            console.error('Error inspecting Jan 12:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
inspectJan12();
