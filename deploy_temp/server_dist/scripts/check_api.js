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
const service_1 = require("../modules/attendance/service");
const prisma = new client_1.PrismaClient();
function checkApiOutput() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Simulating API call for Biometric Logs (Feb 17)...");
        const startDate = new Date('2026-02-17');
        const endDate = new Date('2026-02-17');
        // Simulate what the controller does
        const logs = yield service_1.AttendanceService.getBiometricLogs(startDate, endDate);
        console.log(`Retrieved ${logs.length} logs.`);
        const targets = logs.filter(l => l.user_name.includes('Basil') || l.user_name.includes('Nidhin'));
        console.log("\n--- API Response Simulation ---");
        targets.forEach(l => {
            console.log(`User: ${l.user_name.padEnd(20)} | Status: ${l.status}`);
        });
    });
}
checkApiOutput()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
