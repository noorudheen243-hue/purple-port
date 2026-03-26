import db from '../../utils/prisma';

export class LeaveService {

    static async applyLeave(userId: string, type: string, startDate: Date, endDate: Date, reason: string, isHalfDay: boolean = false) {
        // Casual Leave Restriction (1 day per month)
        if (type === 'CASUAL') {
            const date = new Date(startDate);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

            const existingCasualLeaves = await db.leaveRequest.findMany({
                where: {
                    user_id: userId,
                    type: 'CASUAL',
                    status: { not: 'REJECTED' },
                    start_date: {
                        gte: monthStart,
                        lte: monthEnd
                    }
                }
            });

            let totalUsed = 0;
            existingCasualLeaves.forEach(leave => {
                if (leave.is_half_day) {
                    totalUsed += 0.5;
                } else {
                    // Calculate days between start and end (inclusive)
                    const diffTime = Math.abs(leave.end_date.getTime() - leave.start_date.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    totalUsed += diffDays;
                }
            });

            const currentRequestDuration = isHalfDay ? 0.5 : (Math.ceil(Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

            if (totalUsed + currentRequestDuration > 1.0) {
                throw new Error("you can't apply more than 1 casual leave in a month");
            }
        }

        // Validations
        if (endDate < startDate) {
            throw new Error("End date cannot be before start date");
        }

        // Check for overlapping leaves?
        const overlap = await db.leaveRequest.findFirst({
            where: {
                user_id: userId,
                status: { not: 'REJECTED' },
                OR: [
                    {
                        start_date: { lte: endDate },
                        end_date: { gte: startDate }
                    }
                ]
            }
        });

        if (overlap) {
            throw new Error("Date overlaps with an existing leave request");
        }

        const leaveRequest = await db.leaveRequest.create({
            data: {
                user_id: userId,
                type,
                start_date: startDate,
                end_date: endDate,
                reason,
                is_half_day: isHalfDay,
                status: 'PENDING'
            },
            include: { user: true }
        });

        // Notify Admins
        const { notifyAdmins } = require('../notifications/service');
        await notifyAdmins(
            'LEAVE_REQUEST',
            `${leaveRequest.user.full_name} applied for leave (${type})`,
            `/dashboard?action=review_request&requestId=${leaveRequest.id}&type=LEAVE`
        );

        return leaveRequest;
    }

    static async getLeaveRequests(userId?: string, status?: string) {
        const whereClause: any = {};
        if (userId) whereClause.user_id = userId;
        if (status) whereClause.status = status;

        return await db.leaveRequest.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        full_name: true,
                        department: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async updateLeaveStatus(requestId: string, approverId: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
        const request = await db.leaveRequest.findUnique({ where: { id: requestId } });
        if (!request) throw new Error("Request not found");

        if (request.status !== 'PENDING') {
            throw new Error("Request is already processed");
        }

        const updated = await db.leaveRequest.update({
            where: { id: requestId },
            data: {
                status,
                approver_id: approverId,
                rejection_reason: rejectionReason
            }
        });

        // Sync with Attendance Records
        if (status === 'APPROVED') {
            const current = new Date(request.start_date);
            const end = new Date(request.end_date);

            while (current <= end) {
                await db.attendanceRecord.upsert({
                    where: {
                        user_id_date: {
                            user_id: request.user_id,
                            date: new Date(current)
                        }
                    },
                    update: {
                        status: request.is_half_day ? 'PRESENT' : 'LEAVE',
                        work_hours: request.is_half_day ? undefined : 0
                    },
                    create: {
                        user_id: request.user_id,
                        date: new Date(current),
                        status: request.is_half_day ? 'PRESENT' : 'LEAVE',
                        check_in: null,
                        check_out: null,
                        work_hours: request.is_half_day ? undefined : 0
                    }
                });
                current.setDate(current.getDate() + 1);
            }
        }

        return updated;
    }
    static async getLeaveHistory(month: number, year: number, status?: string) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const whereClause: any = {
            start_date: {
                gte: startDate,
                lte: endDate
            }
        };

        if (status && status !== 'ALL') {
            whereClause.status = status;
        }

        return await db.leaveRequest.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        full_name: true,
                        department: true,
                        staffProfile: {
                            select: { designation: true }
                        }
                    }
                },
                approver: {
                    select: {
                        full_name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async revertLeaveStatus(requestId: string) {
        const request = await db.leaveRequest.findUnique({ where: { id: requestId } });
        if (!request) throw new Error("Request not found");

        // If it was APPROVED, we must clear the attendance records
        if (request.status === 'APPROVED') {
            await db.attendanceRecord.deleteMany({
                where: {
                    user_id: request.user_id,
                    status: 'LEAVE',
                    date: {
                        gte: request.start_date,
                        lte: request.end_date
                    }
                }
            });
        }

        return await db.leaveRequest.update({
            where: { id: requestId },
            data: {
                status: 'PENDING',
                approver_id: null,
                rejection_reason: null
            }
        });
    }

    static async deleteLeaveRequest(requestId: string) {
        const request = await db.leaveRequest.findUnique({ where: { id: requestId } });
        if (!request) throw new Error("Request not found");

        // If it was APPROVED, we must clear the attendance records
        if (request.status === 'APPROVED') {
            await db.attendanceRecord.deleteMany({
                where: {
                    user_id: request.user_id,
                    status: 'LEAVE',
                    date: {
                        gte: request.start_date,
                        lte: request.end_date
                    }
                }
            });
        }

        return await db.leaveRequest.delete({
            where: { id: requestId }
        });
    }
    // Update Leave Request Details (Edit)
    static async updateLeaveDetails(requestId: string, data: { status?: string, start_date?: Date, end_date?: Date, type?: string, reason?: string, is_half_day?: boolean }) {
        const request = await db.leaveRequest.findUnique({ where: { id: requestId } });
        if (!request) throw new Error("Request not found");

        if (request.status !== 'PENDING') {
            throw new Error("Cannot edit a processed request. Revert or Create new one.");
        }

        return await db.leaveRequest.update({
            where: { id: requestId },
            data
        });
    }
}
