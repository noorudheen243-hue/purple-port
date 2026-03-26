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
function cleanTodayGhosts() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Cleaning Ghost Records for Today...');
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            // Delete records declared 'PRESENT' but with NO check_in
            const result = yield prisma.attendanceRecord.deleteMany({
                where: {
                    date: {
                        gte: todayStart,
                        lte: todayEnd
                    },
                    status: 'PRESENT',
                    check_in: null
                }
            });
            console.log(`Deleted ${result.count} ghost 'Present' records for today.`);
        }
        catch (error) {
            console.error('Error cleaning ghosts:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
cleanTodayGhosts();
