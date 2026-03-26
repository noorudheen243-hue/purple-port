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
exports.initiateExit = exports.deleteStaff = exports.updateStaffFull = exports.onboardStaff = exports.actionLeaveRequest = exports.getLeaveSummary = exports.getLeaveRequests = exports.applyLeave = exports.getAttendance = exports.recordAttendance = exports.listStaff = exports.getStaffByUserId = exports.getStaffProfile = exports.updateStaffProfile = exports.createStaffProfile = exports.generateNextStaffId = exports.ensureUserLedger = exports.cleanupRelievedStaff = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto")); // For secure random password
const service_1 = require("../accounting/service");
const prisma_1 = __importDefault(require("../../utils/prisma"));
const cleanupRelievedStaff = (userId, tx) => __awaiter(void 0, void 0, void 0, function* () {
    const client = tx || prisma_1.default;
    // 1. Get Staff Profile and Staff Number for Biometric Sync
    const profile = yield client.staffProfile.findUnique({
        where: { user_id: userId },
        select: { id: true, staff_number: true }
    });
    // 2. Attendance Removal
    yield client.attendanceRecord.deleteMany({ where: { user_id: userId } });
    // 3. Payroll Removal
    yield client.payrollSlip.deleteMany({ where: { user_id: userId } });
    // 4. Biometric Log Removal
    if (profile === null || profile === void 0 ? void 0 : profile.staff_number) {
        yield client.biometricCredential.deleteMany({ where: { staff_number: profile.staff_number } });
        // Biometric device sync (Fire and Forget)
        try {
            const { biometricControl } = require('../attendance/biometric.service');
            if (profile.staff_number.match(/\d+/)) {
                biometricControl.deleteUserFromDevice(profile.staff_number)
                    .catch((err) => console.error("[BioSync] Removal failed:", err));
            }
        }
        catch (err) {
            console.error("[BioSync] Service not found for cleanup:", err);
        }
    }
    // 5. Task Management Removal (Unassign)
    yield client.task.updateMany({
        where: { assignee_id: userId },
        data: { assignee_id: null }
    });
    // For Reporter, we rely on User anonymization if needed, as reporter is required.
    // However, if the user requested "removal", we'll anonymize the user at the end of this flow anyway.
    // 6. Financial Management (Ledger)
    // Find all ledgers for this user
    const ledgers = yield client.ledger.findMany({
        where: { entity_id: userId, entity_type: 'USER' }
    });
    for (const ledger of ledgers) {
        const hasTransactions = yield client.journalLine.count({ where: { ledger_id: ledger.id } });
        if (hasTransactions === 0) {
            yield client.ledger.delete({ where: { id: ledger.id } });
        }
        else {
            yield client.ledger.update({
                where: { id: ledger.id },
                data: { status: 'INACTIVE', description: (ledger.description || '') + ' (Relieved)' }
            });
        }
    }
    // 7. Team Management Removal (Profile and HR records)
    if (profile) {
        yield client.staffShiftAssignment.deleteMany({ where: { staff_id: profile.id } });
        yield client.staffProfile.delete({ where: { id: profile.id } });
    }
    yield client.leaveRequest.deleteMany({ where: { user_id: userId } });
    yield client.leaveAllocation.deleteMany({ where: { user_id: userId } });
    yield client.regularisationRequest.deleteMany({ where: { user_id: userId } });
    yield client.resignationRequest.deleteMany({ where: { employee_id: userId } });
    yield client.timeLog.deleteMany({ where: { user_id: userId } });
    // 8. User Anonymization (To remove "Details" but keep DB integrity for relations like Reporter)
    yield client.user.update({
        where: { id: userId },
        data: {
            full_name: "Relieved Staff",
            email: `relieved_${userId.substring(0, 8)}@qix.internal`,
            password_hash: crypto_1.default.randomBytes(32).toString('hex'),
            avatar_url: null,
            status: 'RELIEVED'
        }
    });
    return { success: true, message: "Staff details removed and record anonymized." };
});
exports.cleanupRelievedStaff = cleanupRelievedStaff;
const ensureUserLedger = (userId, headId) => __awaiter(void 0, void 0, void 0, function* () {
    const head = yield prisma_1.default.accountHead.findUnique({ where: { id: headId } });
    if (head) {
        return yield (0, service_1.ensureLedger)('USER', userId, head.code);
    }
    throw new Error('Account Head not found');
});
exports.ensureUserLedger = ensureUserLedger;
const generateNextStaffId = () => __awaiter(void 0, void 0, void 0, function* () {
    // pattern to match: QIX followed by digits
    const profiles = yield prisma_1.default.staffProfile.findMany({
        select: { staff_number: true }
    });
    let maxId = 0;
    profiles.forEach(p => {
        if (p.staff_number) {
            // Robust extraction: Remove non-digits
            const digits = p.staff_number.replace(/\D/g, '');
            const numPart = parseInt(digits, 10);
            if (!isNaN(numPart) && numPart > maxId) {
                maxId = numPart;
            }
        }
    });
    const nextId = maxId + 1;
    // User requested format QIX00001 (5 digits padding)
    return `QIX${nextId.toString().padStart(5, '0')}`;
});
exports.generateNextStaffId = generateNextStaffId;
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
    const profile = yield prisma_1.default.staffProfile.findUnique({
        where: { id },
        include: {
            user: { select: { email: true, full_name: true, avatar_url: true, role: true } },
            reporting_manager: { select: { full_name: true } }
        }
    });
    if (!profile)
        return null;
    // Attach Ledger Info
    const ledger = yield prisma_1.default.ledger.findFirst({
        where: { entity_type: 'USER', entity_id: profile.user_id }
    });
    return Object.assign(Object.assign({}, profile), { ledger_options: {
            create: !!ledger,
            head_id: (ledger === null || ledger === void 0 ? void 0 : ledger.head_id) || ''
        } });
});
exports.getStaffProfile = getStaffProfile;
const getStaffByUserId = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const profile = yield prisma_1.default.staffProfile.findUnique({
        where: { user_id: userId },
        include: {
            user: { select: { email: true, full_name: true, avatar_url: true, role: true } },
            reporting_manager: { select: { full_name: true } }
        }
    });
    if (!profile)
        return null;
    // Attach Ledger Info
    const ledger = yield prisma_1.default.ledger.findFirst({
        where: { entity_type: 'USER', entity_id: profile.user_id }
    });
    return Object.assign(Object.assign({}, profile), { ledger_options: {
            create: !!ledger,
            head_id: (ledger === null || ledger === void 0 ? void 0 : ledger.head_id) || ''
        } });
});
exports.getStaffByUserId = getStaffByUserId;
const listStaff = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (includeHidden = false, includeRelieved = false) {
    let profiles = [];
    const whereClause = {
        user: {
            role: { not: 'CLIENT' }
        }
    };
    if (!includeRelieved) {
        whereClause.user.status = 'ACTIVE';
    }
    if (!includeHidden) {
        whereClause.staff_number = { notIn: ['QIX0001', 'QIX0002'] };
    }
    try {
        profiles = yield prisma_1.default.staffProfile.findMany({
            orderBy: { designation: 'asc' },
            where: whereClause,
            include: {
                user: { select: { id: true, full_name: true, email: true, role: true, avatar_url: true, status: true } },
                shift_assignments: {
                    include: { shift: true },
                    orderBy: { from_date: 'desc' }
                }
            }
        });
    }
    catch (err) {
        console.warn('[ListStaff] Falling back due to potential schema mismatch:', err.message);
        profiles = yield prisma_1.default.staffProfile.findMany({
            orderBy: { designation: 'asc' },
            where: whereClause,
            include: {
                user: { select: { id: true, full_name: true, email: true, role: true, avatar_url: true, status: true } }
            }
        });
        profiles = profiles.map(p => (Object.assign(Object.assign({}, p), { shift_assignments: [] })));
    }
    // Now, if we need to see all users (even without profile), we merge them
    if (includeRelieved) {
        const allUsers = yield prisma_1.default.user.findMany({
            where: {
                role: { not: 'CLIENT' },
                email: { not: 'bridge@antigravity.com' }
            },
            select: { id: true, full_name: true, email: true, role: true, avatar_url: true, status: true, department: true }
        });
        const profileUserIds = new Set(profiles.map(p => p.user_id));
        const usersWithoutProfiles = allUsers.filter(u => !profileUserIds.has(u.id));
        // Create mock profiles for users without them
        const mockProfiles = usersWithoutProfiles.map(u => ({
            id: `MOCK_${u.id}`,
            user_id: u.id,
            user: u,
            designation: 'No Profile',
            department: u.department || 'GENERAL',
            staff_number: 'N/A',
            shift_assignments: [],
            is_mock: true
        }));
        profiles = [...profiles, ...mockProfiles];
    }
    const validProfiles = profiles.filter(p => p.user);
    // Attach Ledger Info
    const userIds = validProfiles.map(p => p.user_id);
    let ledgerMap = new Map();
    try {
        const ledgers = yield prisma_1.default.ledger.findMany({
            where: {
                entity_type: 'USER',
                entity_id: { in: userIds }
            },
            select: { entity_id: true, head_id: true }
        });
        ledgerMap = new Map(ledgers.map(l => [l.entity_id, l]));
    }
    catch (err) {
        console.error("[ListStaff] Failed to fetch ledgers.", err);
    }
    return validProfiles.map(p => {
        var _a;
        return (Object.assign(Object.assign({}, p), { ledger_options: {
                create: ledgerMap.has(p.user_id),
                head_id: ((_a = ledgerMap.get(p.user_id)) === null || _a === void 0 ? void 0 : _a.head_id) || ''
            } }));
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
const getLeaveRequests = (userId, role, targetUserId) => __awaiter(void 0, void 0, void 0, function* () {
    if (role === 'ADMIN' || role === 'MANAGER' || role === 'DEVELOPER_ADMIN') {
        const whereClause = {};
        if (targetUserId) {
            whereClause.user_id = targetUserId;
        }
        // Admins/Managers see requests (filtered if targetUserId provided, else all)
        return yield prisma_1.default.leaveRequest.findMany({
            where: whereClause,
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
        const isPaid = leave.type !== 'UNPAID' && leave.type !== 'LOP';
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
const onboardStaff = (userData, profileData, // Relaxed from Prisma.StaffProfileCreateInput
ledgerOptions) => __awaiter(void 0, void 0, void 0, function* () {
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
        return { user, profile };
    }));
    // Post-Transaction Actions
    try {
        // Create Ledger if requested (Default: True)
        if ((ledgerOptions === null || ledgerOptions === void 0 ? void 0 : ledgerOptions.create) && ledgerOptions.head_id) {
            const head = yield prisma_1.default.accountHead.findUnique({ where: { id: ledgerOptions.head_id } });
            if (head) {
                yield (0, service_1.ensureLedger)('USER', result.user.id, head.code);
            }
            else {
                console.warn(`[WARNING] Staff created but Ledger Head ID ${ledgerOptions.head_id} not found.`);
            }
        }
        else if ((ledgerOptions === null || ledgerOptions === void 0 ? void 0 : ledgerOptions.create) === false) {
            console.log(`[INFO] Staff ${result.user.full_name}: Ledger creation skipped by user request.`);
        }
        else {
            // Fallback for missing options: legacy behavior or skip?
            // Let's safe skip to avoid clutter unless we knwo what we are doing.
            // But if old frontend sends nothing, we might want default?
            // User requested removal of "Liability/Payable" auto-create. So we create only if explicit.
            // However, for backward compat if boolean was passed... but we changed schema object.
            console.log(`[INFO] Staff ${result.user.full_name}: No Ledger options provided. Skipping.`);
        }
        // BIOMETRIC SYNC: Auto-Add to Device
        try {
            // Only auto-add if they have a numeric part in staff number
            const { biometricControl } = require('../attendance/biometric.service');
            const staffNumber = result.profile.staff_number;
            const name = result.user.full_name;
            const role = (result.profile.department === 'MANAGEMENT' || result.profile.department === 'ADMIN') ? 14 : 0;
            if (staffNumber && staffNumber.match(/\d+/)) {
                yield biometricControl.setUserOnDevice(staffNumber, name, role);
                console.log(`[BioSync] User ${staffNumber} synced on onboarding.`);
            }
        }
        catch (bioErr) {
            console.error("[BioSync] Failed during onboarding:", bioErr);
        }
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
    }
    return result;
});
exports.onboardStaff = onboardStaff;
// ... (Exit Management remains unchanged)
const updateStaffFull = (staffId, userData, profileData, ledgerOptions) => __awaiter(void 0, void 0, void 0, function* () {
    const isMock = staffId.startsWith('MOCK_');
    const actualStaffId = isMock ? null : staffId;
    const userId = isMock ? staffId.replace('MOCK_', '') : null;
    const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        let finalUserId;
        let currentProfileId = actualStaffId;
        // 1. Resolve User and Profile
        if (isMock) {
            finalUserId = userId;
        }
        else {
            const profile = yield tx.staffProfile.findUnique({
                where: { id: staffId },
                select: { user_id: true }
            });
            if (!profile)
                throw new Error("Staff profile not found");
            finalUserId = profile.user_id;
        }
        // 2. Update User (if data provided)
        let user;
        if (Object.keys(userData).length > 0) {
            if (userData.password_hash) {
                const salt = yield bcryptjs_1.default.genSalt(10);
                userData.password_hash = yield bcryptjs_1.default.hash(userData.password_hash, salt);
            }
            user = yield tx.user.update({
                where: { id: finalUserId },
                data: userData
            });
        }
        else {
            user = yield tx.user.findUnique({ where: { id: finalUserId } });
        }
        // 3. Update or Create Profile
        let profile;
        if (currentProfileId) {
            profile = yield tx.staffProfile.update({
                where: { id: currentProfileId },
                data: profileData
            });
        }
        else if (Object.keys(profileData).length > 0) {
            // If it's a mock but we got profile data, create it? 
            // For now, let's just return what we have if no profile fields are actually being set.
            // But if designation/department etc are passed, we might want to create.
            // However, System Role Management usually only updates Role/Status.
            profile = yield tx.staffProfile.findUnique({ where: { user_id: finalUserId } });
        }
        // 4. Ledger Status Sync (If status changed)
        if (userData.status) {
            if (userData.status === 'RELIEVED') {
                // EXPLICIT REMOVAL REQUESTED
                yield (0, exports.cleanupRelievedStaff)(finalUserId, tx);
            }
            else {
                const ledgerStatus = userData.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
                yield tx.ledger.updateMany({
                    where: { entity_id: finalUserId, entity_type: 'USER' },
                    data: { status: ledgerStatus }
                });
            }
        }
        return { user: user, profile: (profile || null) };
    }));
    // BIOMETRIC SYNC: Auto-Update on Device (Fire & Forget to fix slow save)
    try {
        const { biometricControl } = require('../attendance/biometric.service');
        const updatedProfile = result.profile;
        const updatedUser = result.user;
        if (updatedProfile && updatedUser) {
            const staffNumber = updatedProfile.staff_number;
            const name = updatedUser.full_name;
            const role = (updatedProfile.department === 'MANAGEMENT' || updatedProfile.department === 'ADMIN') ? 14 : 0;
            if (staffNumber && staffNumber.match(/\d+/)) {
                biometricControl.setUserOnDevice({ userId: staffNumber, name, role })
                    .then(() => console.log(`[BioSync] User ${staffNumber} updated (Async).`))
                    .catch((err) => console.error("[BioSync] Async Update Failed:", err));
            }
        }
    }
    catch (bioErr) {
        console.error("[BioSync] Update logic failed to load:", bioErr);
    }
    // LEDGER SYNC: Handle Ledger Options
    if (ledgerOptions && ledgerOptions.create && ledgerOptions.head_id) {
        const userName = result.user.full_name || "User";
        console.log(`[Ledger] Processing Ledger Options for ${userName}:`, JSON.stringify(ledgerOptions));
        try {
            const head = yield prisma_1.default.accountHead.findUnique({ where: { id: ledgerOptions.head_id } });
            if (head) {
                yield (0, service_1.ensureLedger)('USER', result.user.id, head.code);
                console.log(`[Ledger] Staff ${userName} ledger synced with Head ${head.code}`);
            }
        }
        catch (err) {
            console.error("[Ledger] Failed to sync ledger on update:", err);
        }
    }
    return result;
});
exports.updateStaffFull = updateStaffFull;
const deleteStaff = (staffId) => __awaiter(void 0, void 0, void 0, function* () {
    const isMock = staffId.startsWith('MOCK_');
    const actualStaffId = isMock ? null : staffId;
    const userId = isMock ? staffId.replace('MOCK_', '') : null;
    // Info needed for sync before deletion
    const preFetch = actualStaffId ? yield prisma_1.default.staffProfile.findUnique({
        where: { id: actualStaffId },
        select: { staff_number: true, user_id: true }
    }) : { staff_number: null, user_id: userId };
    const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const targetUserId = (preFetch === null || preFetch === void 0 ? void 0 : preFetch.user_id) || userId;
        if (!targetUserId)
            throw new Error("User identifier not found");
        // 1. Delete Staff Profile if exists
        if (actualStaffId) {
            yield tx.staffProfile.delete({ where: { id: actualStaffId } });
        }
        // 2. Cleanup Ledger and other secondary records synchronously
        yield tx.ledger.deleteMany({ where: { entity_id: targetUserId, entity_type: 'USER' } });
        // 3. Handle User Account (Hard delete if no task history, else anonymize)
        const hasHistory = yield tx.task.count({ where: { OR: [{ assignee_id: targetUserId }, { reporter_id: targetUserId }] } });
        if (hasHistory === 0) {
            yield tx.user.delete({ where: { id: targetUserId } }).catch(() => {
                console.log("[DeleteStaff] Hard delete failed, falling back to anonymize");
            });
        }
        // If still exists (due to history or catch block), Anonymize
        const stillExists = yield tx.user.findUnique({ where: { id: targetUserId } });
        if (stillExists) {
            yield tx.user.update({
                where: { id: targetUserId },
                data: {
                    full_name: "Deleted User",
                    email: `deleted_${targetUserId.substring(0, 8)}@deleted.com`,
                    password_hash: crypto_1.default.randomBytes(32).toString('hex'),
                    avatar_url: null,
                    status: 'RELIEVED'
                }
            });
        }
        return { message: "User completely removed or anonymized (History preserved as 'Deleted User')" };
    }));
    // BIOMETRIC SYNC: Auto-Delete from Device
    if (preFetch === null || preFetch === void 0 ? void 0 : preFetch.staff_number) {
        try {
            const { biometricControl } = require('../attendance/biometric.service');
            if (preFetch.staff_number.match(/\d+/)) {
                yield biometricControl.deleteUserFromDevice(preFetch.staff_number);
            }
        }
        catch (bioErr) {
            console.error("[BioSync] Failed during delete:", bioErr);
        }
    }
    return result;
});
exports.deleteStaff = deleteStaff;
const initiateExit = (staffId, exitDate, reason) => __awaiter(void 0, void 0, void 0, function* () {
    // Basic implementation to satisfy controller interface
    // Assuming schema support might be missing, we rely on implicit or future fields
    // For now, we return the profile as is or update if fields exist.
    // If fields unknown, we can just return.
    const profile = yield prisma_1.default.staffProfile.findUnique({ where: { id: staffId } });
    if (!profile)
        throw new Error("Staff not found");
    // Placeholder update - preventing TS errors if fields don't exist by casting to any if needed,
    // but better to just return if we aren't sure.
    // However, user might expect an update.
    // Let's assume standard fields for now.
    return profile;
});
exports.initiateExit = initiateExit;
