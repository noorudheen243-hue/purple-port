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
function checkRecentLogs() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Checking recent biometric logs...');
        // Check constraint used in service: method='BIOMETRIC' and updatedAt >= 24h ago
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
        const count = yield prisma.attendanceRecord.count({
            where: {
                updatedAt: { gte: yesterday }
            }
        });
        console.log(`Logs updated in last 24h (ANY METHOD): ${count}`);
        const lastLog = yield prisma.attendanceRecord.findFirst({
            orderBy: { updatedAt: 'desc' }
        });
        if (lastLog) {
            console.log('Most Recent Log Updated At:', lastLog.updatedAt);
            console.log('Is Recent?', lastLog.updatedAt >= yesterday);
            console.log('Log Data:', lastLog);
        }
        else {
            console.log('No biometric logs found at all.');
        }
    });
}
checkRecentLogs()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
