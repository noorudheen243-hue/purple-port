"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateResignationRequest = exports.deleteResignationRequest = exports.completeResignation = exports.reviseNoticePeriod = exports.rejectResignation = exports.approveResignation = exports.getAllResignationRequests = exports.getMyResignation = exports.createResignationRequest = exports.calculateRelievingDate = void 0;
const prisma_1 = __importDefault(require("../../../utils/prisma"));
/**
 * Calculate the expected relieving date based on notice period.
 */
const calculateRelievingDate = (startDate, days) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
    return date;
};
exports.calculateRelievingDate = calculateRelievingDate;
/**
 * 1. Employee applies for resignation.
 */
const createResignationRequest = (userId, reason, requestedDate) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if pending request exists
    const existing = yield prisma_1.default.resignationRequest.findFirst({
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
    return yield prisma_1.default.resignationRequest.create({
        data: {
            employee_id: userId,
            reason,
            requested_relieving_date: requestedDate,
            default_notice_period_days: defaultNotice,
            status: 'APPLIED'
        }
    });
});
exports.createResignationRequest = createResignationRequest;
/**
 * 2. Get Employee's Resignation Details
 */
const getMyResignation = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const requests = yield prisma_1.default.resignationRequest.findMany({
        where: { employee_id: userId },
        orderBy: { createdAt: 'desc' },
        include: {
            approver: { select: { full_name: true } }
        }
    });
    if (!requests)
        return [];
    // Computed: Remaining Days for each
    return requests.map(request => {
        let remainingDays = 0;
        if (request.status === 'UNDER_NOTICE' && request.approved_relieving_date) {
            const today = new Date();
            const diffTime = request.approved_relieving_date.getTime() - today.getTime();
            remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (remainingDays < 0)
                remainingDays = 0;
        }
        return Object.assign(Object.assign({}, request), { remaining_days: remainingDays });
    });
});
exports.getMyResignation = getMyResignation;
/**
 * 3. List All Requests (Manager/Admin)
 */
const getAllResignationRequests = () => __awaiter(void 0, void 0, void 0, function* () {
    const requests = yield prisma_1.default.resignationRequest.findMany({
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
            if (remainingDays < 0)
                remainingDays = 0;
        }
        return Object.assign(Object.assign({}, req), { remaining_days: remainingDays });
    });
});
exports.getAllResignationRequests = getAllResignationRequests;
/**
 * 4. Approve Request (Start Notice Period)
 */
const approveResignation = (requestId, approverId, customRelievingDate) => __awaiter(void 0, void 0, void 0, function* () {
    const request = yield prisma_1.default.resignationRequest.findUnique({ where: { id: requestId } });
    if (!request)
        throw new Error("Request not found");
    let finalRelievingDate = customRelievingDate;
    if (!finalRelievingDate) {
        finalRelievingDate = (0, exports.calculateRelievingDate)(new Date(), request.default_notice_period_days);
    }
    // Calculate final notice days based on this date vs today
    const msDiff = finalRelievingDate.getTime() - new Date().getTime();
    const daysDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    return yield prisma_1.default.resignationRequest.update({
        where: { id: requestId },
        data: {
            status: 'UNDER_NOTICE',
            approval_date: new Date(),
            approval_by: approverId,
            approved_relieving_date: finalRelievingDate,
            final_notice_period_days: daysDiff > 0 ? daysDiff : 0
        }
    });
});
exports.approveResignation = approveResignation;
/**
 * 5. Reject Request
 */
const rejectResignation = (requestId, approverId, reason) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.resignationRequest.update({
        where: { id: requestId },
        data: {
            status: 'REJECTED',
            approval_by: approverId,
            rejection_reason: reason,
            approval_date: new Date()
        }
    });
});
exports.rejectResignation = rejectResignation;
/**
 * 6. Revise Notice Period (Admin Override)
 */
const reviseNoticePeriod = (requestId, approverId, newDays, reason) => __awaiter(void 0, void 0, void 0, function* () {
    const request = yield prisma_1.default.resignationRequest.findUnique({ where: { id: requestId } });
    if (!request)
        throw new Error("Request not found");
    // Recalculate relieving date from Approval Date (or Today if not approved yet, but usually revision happens during or after approval)
    // If status is APPLIED, we change parameters for Approval.
    // If status is UNDER_NOTICE, we shift the date.
    let baseDate = request.approval_date || new Date();
    const newRelievingDate = (0, exports.calculateRelievingDate)(baseDate, newDays);
    return yield prisma_1.default.resignationRequest.update({
        where: { id: requestId },
        data: {
            revised_notice_period_days: newDays,
            final_notice_period_days: newDays,
            revision_reason: reason,
            approved_relieving_date: newRelievingDate,
            status: request.status === 'APPLIED' ? 'APPLIED' : 'UNDER_NOTICE' // Keep status unless we auto-approve? Let's keep status.
        }
    });
});
exports.reviseNoticePeriod = reviseNoticePeriod;
/**
 * 7. Mark as Completed (Exit)
 */
const completeResignation = (requestId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.resignationRequest.update({
        where: { id: requestId },
        data: {
            status: 'COMPLETED',
            handover_completed: true // Simplified
        }
    });
});
exports.completeResignation = completeResignation;
/**
 * 8. Delete Resignation Request (Admin/Manager)
 */
const deleteResignationRequest = (requestId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.resignationRequest.delete({
        where: { id: requestId }
    });
});
exports.deleteResignationRequest = deleteResignationRequest;
/**
 * 9. Generic Update (Admin/Manager)
 */
const updateResignationRequest = (requestId, data) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.resignationRequest.update({
        where: { id: requestId },
        data
    });
});
exports.updateResignationRequest = updateResignationRequest;
