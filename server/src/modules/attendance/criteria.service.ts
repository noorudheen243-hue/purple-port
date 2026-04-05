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
                return { status: 'ABSENT', rule_applied: 'B2' };
            } else if (!isLOP && ruleA3) {
                return { status: 'LEAVE', rule_applied: 'A3' };
            }
        }

        // 2. Regularization Approved
        
        // Rule A2: Regularization approved
        const ruleA2 = findRule('A2');
        if (ruleA2 && context.approvedRegularization) {
            return { status: 'PRESENT', rule_applied: 'A2' };
        }

        // --- CALCULATION HELPERS ---
        const workHours = (context.checkIn && context.checkOut) 
            ? Math.max(0, (context.checkOut.getTime() - context.checkIn.getTime()) / (1000 * 60 * 60))
            : 0;
            
        const isLate = context.checkIn ? this.isLate(context.shift.start_time, context.checkIn, 15) : true; // Default grace 15
        const isEarlyExit = context.checkOut ? this.isEarlyDeparture(context.shift.end_time, context.checkOut) : true;
        
        // 3. Present Rules
        
        // Rule A1: Punch-In AND Punch-Out within shift time
        const ruleA1 = findRule('A1');
        if (ruleA1 && context.checkIn && context.checkOut) {
            const params = JSON.parse(ruleA1.parameters);
            const graceMinutes = params.grace_minutes || 15;
            const actualLate = this.isLate(context.shift.start_time, context.checkIn, graceMinutes);
            const actualEarly = this.isEarlyDeparture(context.shift.end_time, context.checkOut);
            
            if (!actualLate && !actualEarly) {
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
            // Since checkout is missing, workHours is effectively what they did until they left.
            // Biometric or System might have a recorded check_out even if user missed it? 
            // In case of truly missing punch, workHours is 0 unless system estiminated.
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

        // Rule C5: Late Punch-In (after Grace Time)
        const ruleC5 = findRule('C5');
        if (ruleC5 && context.checkIn && !context.checkOut && isLate) {
             return { status: 'HALF_DAY', rule_applied: 'C5' };
        }

        // Rule C6: Early Punch-Out AND Worked Hours >= 4
        const ruleC6 = findRule('C6');
        if (ruleC6 && context.checkIn && context.checkOut && isEarlyExit) {
             if (workHours >= (JSON.parse(ruleC6.parameters).min_hours || minHalfDayHours)) {
                 return { status: 'HALF_DAY', rule_applied: 'C6' };
             }
        }

        // Rule C4: Missing any one punch (default case)
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

        // Final Fallback for past days
        if (context.isPastDay) {
            if (workHours < 4) return { status: 'ABSENT', rule_applied: 'MIN_HOURS_NOT_MET' };
            if (workHours < 7.5) return { status: 'HALF_DAY', rule_applied: 'PARTIAL_DAY' };
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
        const checkInMins = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
        const [sh, sm] = shiftStart24h.split(':').map(Number);
        const shiftMins = sh * 60 + sm;
        return checkInMins > (shiftMins + graceMinutes);
    }

    private static isEarlyDeparture(shiftEnd24h: string, checkOut: Date): boolean {
        const istDate = new Date(checkOut.getTime() + (330 * 60 * 1000));
        const checkOutMins = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
        const [eh, em] = shiftEnd24h.split(':').map(Number);
        const shiftMins = eh * 60 + em;
        return checkOutMins < shiftMins;
    }
}
