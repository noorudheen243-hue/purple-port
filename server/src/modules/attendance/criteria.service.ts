import db from '../../utils/prisma';

export interface CriteriaContext {
    userId: string;
    date: Date;
    checkIn: Date | null;
    checkOut: Date | null;
    isPastDay: boolean;
    shift: any;
    holiday?: any;
    approvedLeave?: any;
    approvedRegularization?: any;
}

export class CriteriaService {
    static async evaluateStatus(context: CriteriaContext): Promise<{ status: string; rule_applied: string }> {
        // 1. Fetch Enabled Rules
        const rules = await db.attendanceCriteriaConfig.findMany({
            where: { is_enabled: true },
        });

        const findRule = (code: string) => rules.find(r => r.rule_code === code);

        // --- RULE PRIORITY ENGINE ---
        
        // 1. Holiday / Leave
        
        // Rule A4: Holidays (Sundays + Admin-defined)
        const ruleA4 = findRule('A4');
        if (ruleA4 && (context.holiday || this.isSunday(context.date))) {
            return { status: 'HOLIDAY', rule_applied: 'A4' };
        }

        // Rule A3: Approved Leave (excluding LOP)
        // Rule B2: Approved LOP
        if (context.approvedLeave) {
            const ruleB2 = findRule('B2');
            const ruleA3 = findRule('A3');
            
            const isLOP = ['LOP', 'UNPAID'].includes(context.approvedLeave.type);
            
            if (isLOP && ruleB2) {
                return { status: 'LOP', rule_applied: 'B2' };
            } else if (!isLOP && ruleA3) {
                return { status: 'LEAVE', rule_applied: 'A3' };
            }
        }

        // 2. Regularization Approved
        
        // Rule A2: Regularization approved
        const ruleA2 = findRule('A2');
        if (ruleA2 && context.approvedRegularization) {
            return { status: 'REGULARIZED', rule_applied: 'A2' };
        }

        // --- CALCULATION HELPERS ---
        const workHours = (context.checkIn && context.checkOut) 
            ? Math.max(0, (context.checkOut.getTime() - context.checkIn.getTime()) / (1000 * 60 * 60))
            : 0;
            
        const ruleA1 = findRule('A1');
        const ruleA1Params = ruleA1 ? JSON.parse(ruleA1.parameters) : {};
        const graceMinutes = context.shift.default_grace_time ?? ruleA1Params.grace_minutes ?? 15;

        const isLate = context.checkIn ? this.isLate(context.shift.start_time, context.checkIn, graceMinutes) : true;
        const isEarlyExit = context.checkOut ? this.isEarlyDeparture(context.shift.end_time, context.checkOut) : true;
        
        // Rule C7: Late In OR Early Out OR Work Hours < 7.45
        const ruleC7 = findRule('C7');
        if (ruleC7 && context.checkIn && context.checkOut) {
            const reqHours = JSON.parse(ruleC7.parameters).min_hours || 7.45;
            if (isLate || isEarlyExit || workHours < reqHours) {
                return { status: 'HALF_DAY', rule_applied: 'C7' };
            }
        }

        // Unconditional Late Punch or Early Punch-Out = HALF_DAY (unless worked >= 7.5 hours)
        if (context.checkIn && isLate) {
            if (workHours >= 7.5) {
                return { status: 'PRESENT', rule_applied: 'LATE_BUT_WORKED_FULL' };
            }
            return { status: 'HALF_DAY', rule_applied: 'LATE_PUNCH' };
        }
        if (context.checkOut && isEarlyExit) {
            if (workHours >= 7.5) {
                return { status: 'PRESENT', rule_applied: 'EARLY_BUT_WORKED_FULL' };
            }
            return { status: 'HALF_DAY', rule_applied: 'EARLY_EXIT' };
        }
        
        // 3. Present Rules
        
        // Rule A1: Punch-In AND Punch-Out within shift time
        if (ruleA1 && context.checkIn && context.checkOut) {
            if (!isLate && !isEarlyExit) {
                return { status: 'PRESENT', rule_applied: 'A1' };
            }
        }

        // 4. Half-Day Rules
        
        const minHalfDayHours = 4; // Configurable soon?

        // Rule C1: Late In + Missing Out AND Worked Hours >= 4
        const ruleC1 = findRule('C1');
        if (ruleC1 && context.checkIn && !context.checkOut && context.isPastDay) {
            const params = JSON.parse(ruleC1.parameters);
            const threshold = params.min_hours || minHalfDayHours;
            if (workHours >= threshold) return { status: 'HALF_DAY', rule_applied: 'C1' };
        }

        // Rule C2: Missing Punch-In + Early Out AND Worked Hours >= 4
        const ruleC2 = findRule('C2');
        if (ruleC2 && !context.checkIn && context.checkOut && context.isPastDay) {
            if (workHours >= (JSON.parse(ruleC2.parameters).min_hours || minHalfDayHours)) {
                return { status: 'HALF_DAY', rule_applied: 'C2' };
            }
        }

        // Rule C3: Late Punch-In + Early Punch-Out AND Worked Hours >= 4
        const ruleC3 = findRule('C3');
        if (ruleC3 && context.checkIn && context.checkOut) {
            if (isLate && isEarlyExit && workHours >= (JSON.parse(ruleC3.parameters).min_hours || minHalfDayHours)) {
                return { status: 'HALF_DAY', rule_applied: 'C3' };
            }
        }

        // Rule C5: Extreme Late Arrival
        const ruleC5 = findRule('C5');
        if (ruleC5 && context.checkIn && isLate) {
             return { status: 'HALF_DAY', rule_applied: 'C5' };
        }

        // Rule C6: Early Punch-Out
        const ruleC6 = findRule('C6');
        if (ruleC6 && context.checkIn && context.checkOut && isEarlyExit) {
             if (workHours >= (JSON.parse(ruleC6.parameters).min_hours || minHalfDayHours)) {
                 return { status: 'HALF_DAY', rule_applied: 'C6' };
             } else if (context.isPastDay) {
                 return { status: 'ABSENT', rule_applied: 'C6_FAIL' }; // Did not meet min hours for half day
             }
        }

        // 4.5 Rule C4: Missing any one punch (default case for single punch)
        const ruleC4 = findRule('C4');
        if (ruleC4 && ((context.checkIn && !context.checkOut) || (!context.checkIn && context.checkOut))) {
            if (context.isPastDay) {
                return { status: 'HALF_DAY', rule_applied: 'C4' };
            }
        }

        // 5. Absent Rules
        
        // Rule B1: No Punch-In AND No Punch-Out
        const ruleB1 = findRule('B1');
        if (ruleB1 && !context.checkIn && !context.checkOut && context.isPastDay) {
            return { status: 'ABSENT', rule_applied: 'B1' };
        }

        // Final Default: If no rules matched and it's a past day, it means they violated some rule 
        // (like Late In or Early Out but workHours were very low). We should not mark PRESENT if they missed A1.
        // Wait, if it's today and they just punched in normally, they should be PRESENT.
        if (!context.isPastDay && context.checkIn && !isLate) {
            return { status: 'PRESENT', rule_applied: 'DEFAULT' };
        }
        
        if (context.isPastDay && context.checkIn) {
             // If it's a past day and A1 didn't match (meaning they were late or left early or missing punch)
             // but somehow fell through all C rules, default to ABSENT to be safe.
             // Actually, if they were not late, and not early exit, and had both punches, A1 would have caught them.
             // If they fell through, they must be missing a punch or didn't meet min hours.
             return { status: 'ABSENT', rule_applied: 'DEFAULT_PAST' };
        }

        return { status: 'PRESENT', rule_applied: 'DEFAULT' };
    }

    private static isSunday(date: Date): boolean {
        // Correctly handle UTC vs Local?
        const d = new Date(date);
        const IST_OFFSET = 330 * 60 * 1000;
        const istDate = new Date(d.getTime() + IST_OFFSET);
        return istDate.getUTCDay() === 0;
    }

    private static isLate(shiftStart24h: string, checkIn: Date, graceMinutes: number): boolean {
        const istDate = new Date(checkIn.getTime() + (330 * 60 * 1000));
        const checkInSeconds = istDate.getUTCHours() * 3600 + istDate.getUTCMinutes() * 60 + istDate.getUTCSeconds();
        const [sh, sm] = shiftStart24h.split(':').map(Number);
        const shiftSeconds = (sh * 60 + sm + graceMinutes) * 60;
        return checkInSeconds > shiftSeconds;
    }

    private static isEarlyDeparture(shiftEnd24h: string, checkOut: Date): boolean {
        const istDate = new Date(checkOut.getTime() + (330 * 60 * 1000));
        const checkOutSeconds = istDate.getUTCHours() * 3600 + istDate.getUTCMinutes() * 60 + istDate.getUTCSeconds();
        const [eh, em] = shiftEnd24h.split(':').map(Number);
        const shiftSeconds = (eh * 60 + em) * 60;
        return checkOutSeconds < shiftSeconds;
    }
}
