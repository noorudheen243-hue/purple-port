import prisma from '../../../utils/prisma';
import { Prisma } from '@prisma/client';

/**
 * Calculate the expected relieving date based on notice period.
 */
export const calculateRelievingDate = (startDate: Date, days: number): Date => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
    return date;
};

/**
 * 1. Employee applies for resignation.
 */
export const createResignationRequest = async (userId: string, reason: string, requestedDate: Date) => {
    // Check if pending request exists
    const existing = await prisma.resignationRequest.findFirst({
        where: {
            employee_id: userId,
            status: { in: ['APPLIED', 'UNDER_NOTICE'] }
        }
    });

    if (existing) {
        throw new Error("You already have a pending or active resignation request.");
    }

    const defaultNotice = 30; // Default policy
    // If requested date is earlier than policy, we still save it, but logic might flag it.
    // For now, we trust the input but the "final" date will be set on approval.

    return await prisma.resignationRequest.create({
        data: {
            employee_id: userId,
            reason,
            requested_relieving_date: requestedDate,
            default_notice_period_days: defaultNotice,
            status: 'APPLIED'
        }
    });
};

/**
 * 2. Get Employee's Resignation Details
 */
export const getMyResignation = async (userId: string) => {
    const requests = await prisma.resignationRequest.findMany({
        where: { employee_id: userId },
        orderBy: { createdAt: 'desc' },
        include: {
            approver: { select: { full_name: true } }
        }
    });

    if (!requests) return [];

    // Computed: Remaining Days for each
    return requests.map(request => {
        let remainingDays = 0;
        if (request.status === 'UNDER_NOTICE' && request.approved_relieving_date) {
            const today = new Date();
            const diffTime = request.approved_relieving_date.getTime() - today.getTime();
            remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (remainingDays < 0) remainingDays = 0;
        }
        return { ...request, remaining_days: remainingDays };
    });
};

/**
 * 3. List All Requests (Manager/Admin)
 */
export const getAllResignationRequests = async () => {
    const requests = await prisma.resignationRequest.findMany({
        include: {
            employee: {
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    role: true,
                    department: true,
                    avatar_url: true,
                    staffProfile: { select: { designation: true, staff_number: true } }
                }
            },
            approver: { select: { full_name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Compute remaining days for all
    const today = new Date();
    return requests.map(req => {
        let remainingDays = 0;
        if (req.status === 'UNDER_NOTICE' && req.approved_relieving_date) {
            const diffTime = req.approved_relieving_date.getTime() - today.getTime();
            remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (remainingDays < 0) remainingDays = 0;
        }
        return { ...req, remaining_days: remainingDays };
    });
};

/**
 * 4. Approve Request (Start Notice Period)
 */
export const approveResignation = async (requestId: string, approverId: string, customRelievingDate?: Date) => {
    const request = await prisma.resignationRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");

    let finalRelievingDate = customRelievingDate;
    if (!finalRelievingDate) {
        finalRelievingDate = calculateRelievingDate(new Date(), request.default_notice_period_days);
    }

    // Calculate final notice days based on this date vs today
    const msDiff = finalRelievingDate.getTime() - new Date().getTime();
    const daysDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

    return await prisma.resignationRequest.update({
        where: { id: requestId },
        data: {
            status: 'UNDER_NOTICE',
            approval_date: new Date(),
            approval_by: approverId,
            approved_relieving_date: finalRelievingDate,
            final_notice_period_days: daysDiff > 0 ? daysDiff : 0
        }
    });
};

/**
 * 5. Reject Request
 */
export const rejectResignation = async (requestId: string, approverId: string, reason: string) => {
    return await prisma.resignationRequest.update({
        where: { id: requestId },
        data: {
            status: 'REJECTED',
            approval_by: approverId,
            rejection_reason: reason,
            approval_date: new Date()
        }
    });
};

/**
 * 6. Revise Notice Period (Admin Override)
 */
export const reviseNoticePeriod = async (requestId: string, approverId: string, newDays: number, reason: string) => {
    const request = await prisma.resignationRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");

    // Recalculate relieving date from Approval Date (or Today if not approved yet, but usually revision happens during or after approval)
    // If status is APPLIED, we change parameters for Approval.
    // If status is UNDER_NOTICE, we shift the date.

    let baseDate = request.approval_date || new Date();
    const newRelievingDate = calculateRelievingDate(baseDate, newDays);

    return await prisma.resignationRequest.update({
        where: { id: requestId },
        data: {
            revised_notice_period_days: newDays,
            final_notice_period_days: newDays,
            revision_reason: reason,
            approved_relieving_date: newRelievingDate,
            status: request.status === 'APPLIED' ? 'APPLIED' : 'UNDER_NOTICE' // Keep status unless we auto-approve? Let's keep status.
        }
    });
};

/**
 * 7. Mark as Completed (Exit)
 */
export const completeResignation = async (requestId: string) => {
    return await prisma.resignationRequest.update({
        where: { id: requestId },
        data: {
            status: 'COMPLETED',
            handover_completed: true // Simplified
        }
    });
};

/**
 * 8. Delete Resignation Request (Admin/Manager)
 */
export const deleteResignationRequest = async (requestId: string) => {
    return await prisma.resignationRequest.delete({
        where: { id: requestId }
    });
};

/**
 * 9. Generic Update (Admin/Manager)
 */
export const updateResignationRequest = async (
    requestId: string,
    data: {
        status?: string,
        approved_relieving_date?: Date,
        final_notice_period_days?: number
    }
) => {
    return await prisma.resignationRequest.update({
        where: { id: requestId },
        data
    });
};
