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
function debugDateMatcher() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Debugging Date Matcher...");
        // 1. Simulate the DB Record (Stored as IST Midnight)
        // Feb 19 IST Midnight = Feb 18 18:30 UTC
        const istMidnight = new Date('2026-02-18T18:30:00.000Z');
        // Create a dummy record if not exists
        const userId = 'DEBUG_USER_ID'; // We'll just print values, not query real DB for now
        console.log(`DB Record Date (IST Midnight): ${istMidnight.toISOString()}`);
        // 2. Simulate the Input (Biometric Punch)
        // Feb 19 09:00 IST = Feb 19 03:30 UTC
        const punchTime = new Date('2026-02-19T03:30:00.000Z');
        console.log(`Punch Time (UTC): ${punchTime.toISOString()}`);
        // 3. Simulate Current Service Logic (Server is UTC)
        const currentLogicDateKey = new Date(punchTime);
        currentLogicDateKey.setHours(0, 0, 0, 0); // Uses Local Server time (Assume UTC for simulation)
        // NOTE: setHours uses Local. In Node on UTC server, it's UTC. 
        // If I run this locally and I am in IST, it will actually work! 
        // I need to force simulate UTC behavior.
        const simulatedUtcKey = new Date(punchTime);
        simulatedUtcKey.setUTCHours(0, 0, 0, 0);
        console.log(`Current Logic Key (UTC Server): ${simulatedUtcKey.toISOString()}`);
        console.log(`MATCH? ${istMidnight.getTime() === simulatedUtcKey.getTime()}`);
        // 4. Proposed Fix Logic (IST Aware)
        const IST_OFFSET = 330 * 60 * 1000;
        const istDate = new Date(punchTime.getTime() + IST_OFFSET);
        istDate.setUTCHours(0, 0, 0, 0);
        const fixedLogicKey = new Date(istDate.getTime() - IST_OFFSET);
        console.log(`Fixed Logic Key: ${fixedLogicKey.toISOString()}`);
        console.log(`MATCH? ${istMidnight.getTime() === fixedLogicKey.getTime()}`);
    });
}
debugDateMatcher();
