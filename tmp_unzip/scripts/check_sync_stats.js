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
function checkSyncStats() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("--- Sync Log Audit ---\n");
        const logs = yield db.biometricSyncLog.findMany({
            take: 10,
            orderBy: { sync_time: 'desc' }
        });
        console.log("Last 10 Syncs:");
        logs.forEach(l => {
            console.log(`[${l.sync_time.toISOString()}] Status: ${l.status}, Fetched: ${l.logs_fetched}, Saved: ${l.logs_saved}, Error: ${l.error_msg || 'None'}`);
        });
        // Check for any specific errors about UID 13
        const errors = yield db.biometricSyncLog.findMany({
            where: { error_msg: { contains: '13' } },
            take: 5
        });
        if (errors.length > 0) {
            console.log("\nFound errors related to '13':");
            errors.forEach(e => console.log(`- ${e.error_msg}`));
        }
        else {
            console.log("\nNo explicit errors mentioning '13' found in the main logs table.");
        }
    });
}
checkSyncStats()
    .catch(console.error)
    .finally(() => db.$disconnect());
