import { PrismaClient } from '@prisma/client';
import { CriteriaService } from '../modules/attendance/criteria.service';
import { ShiftService } from '../modules/attendance/shift.service';

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
            user: true
        }
    });

    const formatIST = (d: Date | null) => d ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(d) : 'null';

    let count = 0;
    for (const rec of records) {
        let newIn = rec.check_in;
        let newOut = rec.check_out;
        let changed = false;

        const OFFSET = 5.5 * 60 * 60 * 1000;

        if (newIn) {
            const istTime = new Date(newIn.getTime() + OFFSET);
            if (istTime.getUTCHours() >= 1 && istTime.getUTCHours() < 7) {
                newIn = new Date(newIn.getTime() + OFFSET);
                changed = true;
            }
        }
        
        if (newOut) {
            const istTimeOut = new Date(newOut.getTime() + OFFSET);
            if (istTimeOut.getUTCHours() >= 4 && istTimeOut.getUTCHours() < 14) {
                newOut = new Date(newOut.getTime() + OFFSET);
                changed = true;
            }
        }

        if (changed) {
            console.log(`Fixing [${rec.date.toISOString()}] user: ${rec.user?.full_name || rec.user_id}`);
            console.log(`  OLD IN : ${formatIST(rec.check_in)} | OLD OUT : ${formatIST(rec.check_out)}`);
            console.log(`  NEW IN : ${formatIST(newIn)} | NEW OUT : ${formatIST(newOut)}`);
            
            const workHours = newIn && newOut ? (newOut.getTime() - newIn.getTime()) / (1000 * 60 * 60) : 0;

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
