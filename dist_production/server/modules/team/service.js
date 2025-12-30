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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStaff = exports.updateStaffFull = exports.initiateExit = exports.onboardStaff = exports.actionLeaveRequest = exports.getLeaveSummary = exports.getLeaveRequests = exports.applyLeave = exports.getAttendance = exports.recordAttendance = exports.listStaff = exports.getStaffByUserId = exports.getStaffProfile = exports.updateStaffProfile = exports.createStaffProfile = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto")); // For secure random password
const service_1 = require("../accounting/service");
const prisma_1 = __importDefault(require("../../utils/prisma"));
// --- Staff Profile Management ---
const createStaffProfile = (userId, data) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.staffProfile.create({
        data: Object.assign(Object.assign({}, data), { user: { connect: { id: userId } } })
    });
});
exports.createStaffProfile = createStaffProfile;
const updateStaffProfile = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.staffProfile.update({
        where: { id },
        data,
    });
});
exports.updateStaffProfile = updateStaffProfile;
const getStaffProfile = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.staffProfile.findUnique({
        where: { id },
        include: {
            user: { select: { email: true, full_name: true, avatar_url: true, role: true } },
            reporting_manager: { select: { full_name: true } }
        }
    });
});
exports.getStaffProfile = getStaffProfile;
const getStaffByUserId = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.staffProfile.findUnique({
        where: { user_id: userId },
        include: {
            user: { select: { email: true, full_name: true, avatar_url: true, role: true } },
            reporting_manager: { select: { full_name: true } }
        }
    });
});
exports.getStaffByUserId = getStaffByUserId;
const listStaff = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.staffProfile.findMany({
        orderBy: { designation: 'asc' },
        include: {
            user: { select: { id: true, full_name: true, email: true, role: true, avatar_url: true } }
        }
    });
});
exports.listStaff = listStaff;
// --- Attendance Management ---
const recordAttendance = (userId_1, status_1, ...args_1) => __awaiter(void 0, [userId_1, status_1, ...args_1], void 0, function* (userId, status, method = 'WEB') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = yield prisma_1.default.attendanceRecord.findUnique({
        where: { user_id_date: { user_id: userId, date: today } }
    });
    if (existing) {
        // If already checked in, maybe update check-out time?
        // For simplicity: If Check-in happens again, ignore or error.
        // If "Check Out" action:
        if (status === 'CHECK_OUT') {
            return yield prisma_1.default.attendanceRecord.update({
                where: { id: existing.id },
                data: { check_out: new Date() } // Calculate work hours later
            });
        }
        throw new Error("Attendance already marked for today.");
    }
    return yield prisma_1.default.attendanceRecord.create({
        data: {
            user_id: userId,
            date: today,
            status: status === 'CHECK_OUT' ? 'PRESENT' : status, // Initial status
            check_in: new Date(),
            method
        }
    });
});
exports.recordAttendance = recordAttendance;
const getAttendance = (userId, month, year) => __awaiter(void 0, void 0, void 0, function* () {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return yield prisma_1.default.attendanceRecord.findMany({
        where: {
            user_id: userId,
            date: { gte: startDate, lte: endDate }
        },
        orderBy: { date: 'asc' }
    });
});
exports.getAttendance = getAttendance;
// --- Leave Management ---
const applyLeave = (userId, data) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.leaveRequest.create({
        data
    });
});
exports.applyLeave = applyLeave;
const getLeaveRequests = (userId, role) => __awaiter(void 0, void 0, void 0, function* () {
    if (role === 'ADMIN' || role === 'MANAGER') {
        // Admins/Managers see all requests (could filter by department later)
        return yield prisma_1.default.leaveRequest.findMany({
            include: { user: { select: { full_name: true, staffProfile: { select: { department: true, designation: true } } } } },
            orderBy: { createdAt: 'desc' }
        });
    }
    return yield prisma_1.default.leaveRequest.findMany({
        where: { user_id: userId },
        include: { user: { select: { full_name: true } } },
        orderBy: { createdAt: 'desc' }
    });
});
exports.getLeaveRequests = getLeaveRequests;
const getLeaveSummary = (userId, year) => __awaiter(void 0, void 0, void 0, function* () {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const approvedLeaves = yield prisma_1.default.leaveRequest.findMany({
        where: {
            user_id: userId,
            status: 'APPROVED',
            start_date: { gte: startDate, lte: endDate }
        }
    });
    let used = 0;
    const typeBreakdown = {};
    const monthlyStats = {};
    // Initialize all 12 months
    for (let i = 0; i < 12; i++) {
        monthlyStats[i] = { paid: 0, unpaid: 0, total: 0 };
    }
    approvedLeaves.forEach(leave => {
        // Calculate days
        const diffTime = Math.abs(leave.end_date.getTime() - leave.start_date.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        used += days;
        typeBreakdown[leave.type] = (typeBreakdown[leave.type] || 0) + days;
        // Monthly Stats (Simplification: Assign entire leave to Start Month)
        // Ideally should split if spanning months, but for mvp start month is fine.
        const month = leave.start_date.getMonth(); // 0-11
        const isPaid = leave.type !== 'UNPAID';
        monthlyStats[month].total += days;
        if (isPaid) {
            monthlyStats[month].paid += days;
        }
        else {
            monthlyStats[month].unpaid += days;
        }
    });
    // Policy: 1 Paid Leave per month allowed = 12 per year (simplified)
    const entitled = 12;
    const balance = entitled - used;
    return {
        year,
        entitled,
        used,
        balance,
        typeBreakdown,
        monthlyStats: Object.entries(monthlyStats).map(([m, stats]) => (Object.assign({ month: parseInt(m) + 1, monthName: new Date(year, parseInt(m)).toLocaleString('default', { month: 'short' }) }, stats)))
    };
});
exports.getLeaveSummary = getLeaveSummary;
const actionLeaveRequest = (requestId, approverId, status, reason) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.leaveRequest.update({
        where: { id: requestId },
        data: {
            status,
            rejection_reason: reason,
            approver_id: approverId
        }
    });
});
exports.actionLeaveRequest = actionLeaveRequest;
const onboardStaff = (userData, profileData // Relaxed from Prisma.StaffProfileCreateInput to allow reporting_manager_id transformation
) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Check if user exists
    const existingUser = yield prisma_1.default.user.findUnique({
        where: { email: userData.email }
    });
    if (existingUser) {
        // Check if they already have a profile
        const existingProfile = yield prisma_1.default.staffProfile.findUnique({
            where: { user_id: existingUser.id }
        });
        if (existingProfile) {
            throw new Error("Staff profile already exists for this user email.");
        }
        // Link new profile to existing user
        const { reporting_manager_id } = profileData, restProfile = __rest(profileData, ["reporting_manager_id"]);
        return yield prisma_1.default.staffProfile.create({
            data: Object.assign(Object.assign({}, restProfile), { user: { connect: { id: existingUser.id } }, reporting_manager: reporting_manager_id ? { connect: { id: reporting_manager_id } } : undefined })
        }).then(profile => ({ user: existingUser, profile }));
    }
    // 2. New User - Hash Password & Transaction
    const generatedPassword = userData.password_hash || crypto_1.default.randomBytes(8).toString('hex') + '@1A';
    const salt = yield bcryptjs_1.default.genSalt(10);
    const hashedPassword = yield bcryptjs_1.default.hash(generatedPassword, salt);
    const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const user = yield tx.user.create({
            data: Object.assign(Object.assign({}, userData), { password_hash: hashedPassword })
        });
        const { reporting_manager_id } = profileData, restProfile = __rest(profileData, ["reporting_manager_id"]);
        const profile = yield tx.staffProfile.create({
            data: Object.assign(Object.assign({}, restProfile), { user: { connect: { id: user.id } }, reporting_manager: reporting_manager_id ? { connect: { id: reporting_manager_id } } : undefined })
        });
        // Auto-create Ledger under Salary & Wages (Use a standard code or lookup)
        // Assuming '6000' is the Head Code for Salaries.
        // We need to ensure the ledger is created.
        // inside transaction is tricky for ensureLedger if it uses separate prisma instance, 
        // but ensureLedger usually does check-then-create. 
        // We'll do it AFTER transaction or assume ensureLedger is safe to call independently.
        return { user, profile };
    }));
    // Post-Transaction Actions
    try {
        // Create Ledger
        yield (0, service_1.ensureLedger)('USER', result.user.id, '6000'); // Ensure this matches your Chart of Accounts
        // EMAIL STUB
        console.log(`\n[EMAIL STUB] TO: ${result.user.email}`);
        console.log(`SUBJECT: Welcome to Qix Ads!`);
        console.log(`BODY: Your account has been created.`);
        console.log(`Username: ${result.user.email}`);
        console.log(`Temporary Password: ${generatedPassword}`);
        console.log(`Please login and change your password immediately.\n`);
    }
    catch (error) {
        console.error("Post-onboarding automation failed:", error);
        // Don't fail the request, just log.
    }
    return result;
});
exports.onboardStaff = onboardStaff;
// --- Exit Management ---
const initiateExit = (staffId, exitDate, reason) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Get Profile & User
        const profile = yield tx.staffProfile.findUnique({
            where: { id: staffId },
            include: { user: true }
        });
        if (!profile)
            throw new Error("Staff not found");
        // 2. Update Profile Status
        yield tx.staffProfile.update({
            where: { id: staffId },
            data: {
                payroll_status: 'EXIT_INITIATED',
                // We might want a separate 'employment_status' field later, keeping it simple
            }
        });
        // 3. Lock User Access (Optional: Immediate or on Exit Date?)
        // Requirement says "Disable login access after exit date".
        // If exitDate is future, we schedule it? Or just set flag?
        // For now, let's assume if Last Working Day is passed or today, we lock.
        if (exitDate <= new Date()) {
            // Hack: scramble password or specific 'isActive' flag if exists. 
            // We don't have isActive on User. We can change role to 'GUEST' or similar?
            // Or just scramble password to prevent login.
            const crash = crypto_1.default.randomBytes(16).toString('hex');
            yield tx.user.update({
                where: { id: profile.user_id },
                data: { password_hash: crash }
            });
        }
        // 4. Calculate Final Settlement (Stub)
        // In real world: Calculate un-paid days + Leave Encashment - Recovery
        const settlementAmount = (profile.base_salary || 0) / 30 * 15; // Mock: 15 days pay
        return {
            message: "Exit Initiated",
            staff: profile.user.full_name,
            exitDate,
            estimatedSettlement: settlementAmount
        };
    }));
});
exports.initiateExit = initiateExit;
const updateStaffFull = (staffId, userData, profileData) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Get User ID from Staff Profile
        const currentProfile = yield tx.staffProfile.findUnique({
            where: { id: staffId },
            select: { user_id: true }
        });
        if (!currentProfile)
            throw new Error("Staff profile not found");
        // 2. Update User (if data provided)
        let user;
        if (Object.keys(userData).length > 0) {
            if (userData.password_hash) {
                const salt = yield bcryptjs_1.default.genSalt(10);
                userData.password_hash = yield bcryptjs_1.default.hash(userData.password_hash, salt);
            }
            user = yield tx.user.update({
                where: { id: currentProfile.user_id },
                data: userData
            });
        }
        // 3. Update Profile (if data provided)
        const profile = yield tx.staffProfile.update({
            where: { id: staffId },
            data: profileData
        });
        return { user, profile };
    }));
});
exports.updateStaffFull = updateStaffFull;
const deleteStaff = (staffId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const profile = yield tx.staffProfile.findUnique({
            where: { id: staffId },
            select: { user_id: true }
        });
        if (!profile)
            throw new Error("Staff profile not found");
        // Delete Profile first (FK constraints usually require this, or Cascade)
        yield tx.staffProfile.delete({ where: { id: staffId } });
        // Delete User
        yield tx.user.delete({ where: { id: profile.user_id } });
        return { message: "Deleted successfully" };
    }));
});
exports.deleteStaff = deleteStaff;
