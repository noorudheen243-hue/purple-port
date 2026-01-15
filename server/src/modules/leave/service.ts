import db from '../../utils/prisma';

export class LeaveService {

    static async applyLeave(userId: string, type: string, startDate: Date, endDate: Date, reason: string) {
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
                        status: 'LEAVE',
                        work_hours: 0
                    },
                    create: {
                        user_id: request.user_id,
                        date: new Date(current),
                        status: 'LEAVE',
                        check_in: null,
                        check_out: null,
                        work_hours: 0
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
}
