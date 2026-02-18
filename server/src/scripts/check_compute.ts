
import { AttendanceService } from '../modules/attendance/service';

async function checkComputeStatus() {
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

    const status = AttendanceService.computeStatus(staff, checkIn, checkOut, false);

    console.log(`\nCriteria: ${staff.punch_in_criteria}`);
    console.log(`Shift: ${staff.shift_timing}`);
    console.log(`Grace: ${staff.grace_time}`);
    console.log(`Check In (UTC): ${checkIn.toISOString()}`);
    console.log(`Computed Status: ${status}`);

    // Check isLate helper too
    const shift = AttendanceService.parseShiftTiming(staff.shift_timing);
    const isLate = AttendanceService.isLate(shift.start, checkIn, staff.grace_time);
    console.log(`isLate: ${isLate}`);
}

checkComputeStatus().catch(console.error);
