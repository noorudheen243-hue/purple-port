import { PrismaClient } from '@prisma/client';
import { CriteriaService } from '../modules/attendance/criteria.service';

const db = new PrismaClient();

async function recalculate() {
    const records = await db.attendanceRecord.findMany({
        where: { 
            method: 'BIOMETRIC',
            date: { 
                gte: new Date('2026-05-30T00:00:00Z'),
                lte: new Date('2026-06-05T00:00:00Z')
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

    let count = 0;
    for (const rec of records) {
        if (!rec.check_in || !rec.check_out) continue;
        
        const workHours = (rec.check_out.getTime() - rec.check_in.getTime()) / (1000 * 60 * 60);

        const staff = (rec as any).user?.staffProfile?.[0];

        const { ShiftService } = require('../modules/attendance/shift.service');
        const shift = await ShiftService.getShiftForDate(rec.user_id, rec.check_in);

        const statusResult = await CriteriaService.evaluateStatus({
            userId: rec.user_id,
            date: rec.date,
            checkIn: rec.check_in,
            checkOut: rec.check_out,
            isPastDay: true,
            shift: shift,
            holiday: null,
            approvedLeave: null,
            approvedRegularization: null
        });

        await db.attendanceRecord.update({
            where: { id: rec.id },
            data: {
                work_hours: workHours,
                status: statusResult.status,
                criteria_mode: statusResult.rule_applied
            }
        });
        count++;
    }
    console.log(`Recalculated ${count} records.`);
}

recalculate().catch(console.error).finally(() => process.exit(0));
