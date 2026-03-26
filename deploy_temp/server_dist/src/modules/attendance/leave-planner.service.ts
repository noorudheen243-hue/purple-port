
import prisma from '../../utils/prisma';

export class LeavePlannerService {

    // --- HOLIDAYS ---

    static async getHolidays(year: number) {
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59);

        return await prisma.holiday.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: { date: 'asc' }
        });
    }

    static async addHoliday(data: { name: string, date: string, description?: string, is_recurring?: boolean }) {
        // Check if exists
        const dateObj = new Date(data.date);
        const existing = await prisma.holiday.findUnique({
            where: { date: dateObj }
        });

        if (existing) {
            throw new Error(`Holiday already exists on ${data.date}`);
        }

        return await prisma.holiday.create({
            data: {
                name: data.name,
                date: dateObj,
                description: data.description,
                is_recurring: data.is_recurring || false
            }
        });
    }

    static async deleteHoliday(id: string) {
        return await prisma.holiday.delete({ where: { id } });
    }

    static async populateSundays(year: number) {
        // 1. Generate all Sundays for the year
        const sundays = [];
        const date = new Date(year, 0, 1);

        while (date.getFullYear() === year) {
            if (date.getDay() === 0) { // 0 = Sunday
                sundays.push(new Date(date));
            }
            date.setDate(date.getDate() + 1);
        }

        let addedCount = 0;
        for (const sunday of sundays) {
            // Check existence to avoid error or duplicate if not ID based?
            // Schema has `date` as @unique. Best to use upsert or ignore catch.
            try {
                // Upsert based on date? Prisma unique constraint on date.
                // We'll try create and ignore failure.
                await prisma.holiday.upsert({
                    where: { date: sunday },
                    update: {}, // Do nothing if exists
                    create: {
                        name: 'Sunday Holiday',
                        date: sunday,
                        description: 'Weekly Off',
                        is_recurring: true
                    }
                });
                addedCount++;
            } catch (e) {
                // Ignore collision
            }
        }
        return { message: `Processed ${sundays.length} Sundays.` };
    }

    // --- LEAVE ALLOCATIONS ---

    static async getLeaveAllocations(year: number, userId?: string) {
        // Get all staff (active) and their allocations
        const whereClause: any = { payroll_status: 'ACTIVE' };
        if (userId) whereClause.user_id = userId;

        const staff = await prisma.staffProfile.findMany({
            where: {
                ...whereClause,
                staff_number: { notIn: ['QIX0001', 'QIX0002'] }
            },
            include: {
                user: {
                    select: { id: true, full_name: true, avatar_url: true, department: true }
                }
            }
        });

        // Fetch allocations for these users for the year
        const userIds = staff.map(s => s.user_id);
        const allocations = await prisma.leaveAllocation.findMany({
            where: {
                user_id: { in: userIds },
                year: year
            }
        });

        const allocMap = new Map(allocations.map(a => [a.user_id, a]));

        // Merge
        return staff.map(s => {
            const alloc = allocMap.get(s.user_id) || {
                casual_leave: 0,
                sick_leave: 0,
                earned_leave: 0,
                unpaid_leave: 0
            };
            return {
                user_id: s.user_id,
                staff_number: s.staff_number,
                name: s.user.full_name,
                department: s.department,
                avatar_url: s.user.avatar_url,
                allocation: alloc
            };
        });
    }

    static async updateAllocation(data: { user_id: string, year: number, casual: number, sick: number, earned: number, unpaid: number }) {
        return await prisma.leaveAllocation.upsert({
            where: {
                user_id_year: {
                    user_id: data.user_id,
                    year: data.year
                }
            },
            update: {
                casual_leave: data.casual,
                sick_leave: data.sick,
                earned_leave: data.earned,
                unpaid_leave: data.unpaid
            },
            create: {
                user_id: data.user_id,
                year: data.year,
                casual_leave: data.casual,
                sick_leave: data.sick,
                earned_leave: data.earned,
                unpaid_leave: data.unpaid
            }
        });
    }
}
