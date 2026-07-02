import { PrismaClient } from '@prisma/client';
import { CriteriaService } from '../modules/attendance/criteria.service';

const db = new PrismaClient();

async function runFix() {
    const records = await db.attendanceRecord.findMany({
        where: { 
            method: 'BIOMETRIC',
            date: { 
                gte: new Date('2026-06-30T00:00:00Z'),
                lte: new Date('2026-07-05T00:00:00Z')
            }
        },
        include: {
            user: {
                include: {
                    staffProfile: true
                }
            }
        }
    });

    const formatIST = (d: Date | null) => d ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(d) : 'null';

    let count = 0;
    for (const rec of records) {
        let newIn = rec.check_in;
        let newOut = rec.check_out;
        let changed = false;

        const OFFSET = 5.5 * 60 * 60 * 1000;

        // If the check-in looks shifted by 5.5 hours back (e.g. 03:52 AM instead of 09:22 AM)
        if (newIn) {
            const istTime = new Date(newIn.getTime() + OFFSET); // This gets the time the UI *currently* displays
            // If the UI is currently displaying between 1 AM and 7 AM, it's definitely the bug!
            if (istTime.getUTCHours() >= 1 && istTime.getUTCHours() < 7) {
                newIn = new Date(newIn.getTime() + OFFSET);
                changed = true;
            }
        }
        
        // Wait, for check_out, Fida's OUT was 09:22 AM.
        // If Fida punched out at 02:52 PM (14:52), the UI displays 09:22 AM.
        // If the UI displays between 9 AM and 4 PM, it's shifted!
        // The safest way is to just apply it if both in and out are shifted, OR if we just blindly add 5.5 hours to any biometric record in July 1st.
        // Actually, Fida's check_out is currently displaying 09:22 AM (03:52 UTC).
        if (newOut) {
            // Check if OUT is extremely early (e.g. 9 AM - 1 PM) for a 5 PM shift
            const istTimeOut = new Date(newOut.getTime() + OFFSET);
            if (istTimeOut.getUTCHours() >= 4 && istTimeOut.getUTCHours() < 14) {
                newOut = new Date(newOut.getTime() + OFFSET);
                changed = true;
            }
        }

        if (changed) {
            console.log(`Fixing [${rec.date.toISOString()}] user: ${rec.user_id}`);
            console.log(`  OLD IN : ${formatIST(rec.check_in)} | OLD OUT : ${formatIST(rec.check_out)}`);
            console.log(`  NEW IN : ${formatIST(newIn)} | NEW OUT : ${formatIST(newOut)}`);
            
            const workHours = newIn && newOut ? (newOut.getTime() - newIn.getTime()) / (1000 * 60 * 60) : 0;

            const { ShiftService } = require('./modules/attendance/shift.service');
            const shift = await ShiftService.getShiftForDate(rec.user_id, newIn || new Date());

            let statusResult = { status: rec.status, rule_applied: rec.criteria_mode };
            
            if (newIn && newOut) {
                statusResult = await CriteriaService.evaluateStatus({
                    userId: rec.user_id,
                    date: rec.date,
                    checkIn: newIn,
                    checkOut: newOut,
                    isPastDay: true,
                    shift: shift,
                    holiday: null,
                    approvedLeave: null,
                    approvedRegularization: null
                });
            }

            await db.attendanceRecord.update({
                where: { id: rec.id },
                data: {
                    check_in: newIn,
                    check_out: newOut,
                    work_hours: workHours,
                    status: statusResult.status,
                    criteria_mode: statusResult.rule_applied
                }
            });
            count++;
        }
    }
    console.log(`Fixed ${count} records.`);
}

runFix().catch(console.error).finally(() => process.exit(0));
