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
const service_1 = require("../modules/attendance/service");
function checkComputeStatus() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Simulating computeStatus Logic...");
        // Mock Staff (Basil)
        const staff = {
            shift_timing: "09:00 AM - 06:00 PM",
            grace_time: 10,
            punch_in_criteria: "GRACE_TIME" // Found from previous check
        };
        // Timestamps from logs (Feb 17)
        // In: 09:22
        // Out: 17:51
        // Timestamps need to be Dates. 
        // Let's create dates that result in these times in IST (+5:30).
        // 09:22 IST = 03:52 UTC
        const checkIn = new Date('2026-02-17T03:52:00.000Z');
        // 17:51 IST = 12:21 UTC
        const checkOut = new Date('2026-02-17T12:21:00.000Z');
        const status = service_1.AttendanceService.computeStatus(staff, checkIn, checkOut, false);
        console.log(`\nCriteria: ${staff.punch_in_criteria}`);
        console.log(`Shift: ${staff.shift_timing}`);
        console.log(`Grace: ${staff.grace_time}`);
        console.log(`Check In (UTC): ${checkIn.toISOString()}`);
        console.log(`Computed Status: ${status}`);
        // Check isLate helper too
        const shift = service_1.AttendanceService.parseShiftTiming(staff.shift_timing);
        const isLate = service_1.AttendanceService.isLate(shift.start, checkIn, staff.grace_time);
        console.log(`isLate: ${isLate}`);
    });
}
checkComputeStatus().catch(console.error);
