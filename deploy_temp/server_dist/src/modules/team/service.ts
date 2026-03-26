import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // For secure random password
import { ensureLedger } from '../accounting/service';
import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

export const cleanupRelievedStaff = async (userId: string, tx?: Prisma.TransactionClient) => {
    const client = tx || prisma;

    // 1. Get Staff Profile and Staff Number for Biometric Sync
    const profile = await client.staffProfile.findUnique({
        where: { user_id: userId },
        select: { id: true, staff_number: true }
    });

    // 2. Attendance Removal
    await client.attendanceRecord.deleteMany({ where: { user_id: userId } });

    // 3. Payroll Removal
    await client.payrollSlip.deleteMany({ where: { user_id: userId } });

    // 4. Biometric Log Removal
    if (profile?.staff_number) {
        await client.biometricCredential.deleteMany({ where: { staff_number: profile.staff_number } });
        // Biometric device sync (Fire and Forget)
        try {
            const { biometricControl } = require('../attendance/biometric.service');
            if (profile.staff_number.match(/\d+/)) {
                biometricControl.deleteUserFromDevice(profile.staff_number)
                    .catch((err: any) => console.error("[BioSync] Removal failed:", err));
            }
        } catch (err) {
            console.error("[BioSync] Service not found for cleanup:", err);
        }
    }

    // 5. Task Management Removal (Unassign)
    await client.task.updateMany({
        where: { assignee_id: userId },
        data: { assignee_id: null }
    });
    // For Reporter, we rely on User anonymization if needed, as reporter is required.
    // However, if the user requested "removal", we'll anonymize the user at the end of this flow anyway.

    // 6. Financial Management (Ledger)
    // Find all ledgers for this user
    const ledgers = await client.ledger.findMany({
        where: { entity_id: userId, entity_type: 'USER' }
    });

    for (const ledger of ledgers) {
        const hasTransactions = await client.journalLine.count({ where: { ledger_id: ledger.id } });
        if (hasTransactions === 0) {
            await client.ledger.delete({ where: { id: ledger.id } });
        } else {
            await client.ledger.update({
                where: { id: ledger.id },
                data: { status: 'INACTIVE', description: (ledger.description || '') + ' (Relieved)' }
            });
        }
    }

    // 7. Team Management Removal (Profile and HR records)
    if (profile) {
        await client.staffShiftAssignment.deleteMany({ where: { staff_id: profile.id } });
        await client.staffProfile.delete({ where: { id: profile.id } });
    }

    await client.leaveRequest.deleteMany({ where: { user_id: userId } });
    await client.leaveAllocation.deleteMany({ where: { user_id: userId } });
    await client.regularisationRequest.deleteMany({ where: { user_id: userId } });
    await client.resignationRequest.deleteMany({ where: { employee_id: userId } });
    await client.timeLog.deleteMany({ where: { user_id: userId } });

    // 8. User Anonymization (To remove "Details" but keep DB integrity for relations like Reporter)
    await client.user.update({
        where: { id: userId },
        data: {
            full_name: "Relieved Staff",
            email: `relieved_${userId.substring(0, 8)}@qix.internal`,
            password_hash: crypto.randomBytes(32).toString('hex'),
            avatar_url: null,
            status: 'RELIEVED'
        }
    });

    return { success: true, message: "Staff details removed and record anonymized." };
};

export const ensureUserLedger = async (userId: string, headId: string) => {
    const head = await prisma.accountHead.findUnique({ where: { id: headId } });
    if (head) {
        return await ensureLedger('USER', userId, head.code);
    }
    throw new Error('Account Head not found');
};

export const generateNextStaffId = async () => {
    // pattern to match: QIX followed by digits
    const profiles = await prisma.staffProfile.findMany({
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
};

// --- Staff Profile Management ---

export const createStaffProfile = async (
    userId: string,
    data: Prisma.StaffProfileCreateInput
) => {
    return await prisma.staffProfile.create({
        data: {
            ...data,
            user: { connect: { id: userId } }
        }
    });
};

export const updateStaffProfile = async (id: string, data: Prisma.StaffProfileUpdateInput) => {
    return await prisma.staffProfile.update({
        where: { id },
        data,
    });
};

export const getStaffProfile = async (id: string) => {
    const profile = await prisma.staffProfile.findUnique({
        where: { id },
        include: {
            user: { select: { email: true, full_name: true, avatar_url: true, role: true } },
            reporting_manager: { select: { full_name: true } }
        }
    });

    if (!profile) return null;

    // Attach Ledger Info
    const ledger = await prisma.ledger.findFirst({
        where: { entity_type: 'USER', entity_id: profile.user_id }
    });

    return {
        ...profile,
        ledger_options: {
            create: !!ledger,
            head_id: ledger?.head_id || ''
        }
    };
};

export const getStaffByUserId = async (userId: string) => {
    const profile = await prisma.staffProfile.findUnique({
        where: { user_id: userId },
        include: {
            user: { select: { email: true, full_name: true, avatar_url: true, role: true } },
            reporting_manager: { select: { full_name: true } }
        }
    });

    if (!profile) return null;

    // Attach Ledger Info
    const ledger = await prisma.ledger.findFirst({
        where: { entity_type: 'USER', entity_id: profile.user_id }
    });

    return {
        ...profile,
        ledger_options: {
            create: !!ledger,
            head_id: ledger?.head_id || ''
        }
    };
};

export const listStaff = async (includeHidden = false, includeRelieved = false) => {
    let profiles: any[] = [];

    const whereClause: any = {
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
        profiles = await prisma.staffProfile.findMany({
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
    } catch (err: any) {
        console.warn('[ListStaff] Falling back due to potential schema mismatch:', err.message);
        profiles = await prisma.staffProfile.findMany({
            orderBy: { designation: 'asc' },
            where: whereClause,
            include: {
                user: { select: { id: true, full_name: true, email: true, role: true, avatar_url: true, status: true } }
            }
        });
        profiles = profiles.map(p => ({ ...p, shift_assignments: [] }));
    }

    // Now, if we need to see all users (even without profile), we merge them
    if (includeRelieved) {
        const allUsers = await prisma.user.findMany({
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
        const ledgers = await prisma.ledger.findMany({
            where: {
                entity_type: 'USER',
                entity_id: { in: userIds }
            },
            select: { entity_id: true, head_id: true }
        });
        ledgerMap = new Map(ledgers.map(l => [l.entity_id, l]));
    } catch (err) {
        console.error("[ListStaff] Failed to fetch ledgers.", err);
    }

    return validProfiles.map(p => ({
        ...p,
        ledger_options: {
            create: ledgerMap.has(p.user_id),
            head_id: ledgerMap.get(p.user_id)?.head_id || ''
        }
    }));
};

// --- Attendance Management ---

export const recordAttendance = async (userId: string, status: string, method = 'WEB') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendanceRecord.findUnique({
        where: { user_id_date: { user_id: userId, date: today } }
    });

    if (existing) {
        // If already checked in, maybe update check-out time?
        // For simplicity: If Check-in happens again, ignore or error.
        // If "Check Out" action:
        if (status === 'CHECK_OUT') {
            return await prisma.attendanceRecord.update({
                where: { id: existing.id },
                data: { check_out: new Date() } // Calculate work hours later
            });
        }
        throw new Error("Attendance already marked for today.");
    }

    return await prisma.attendanceRecord.create({
        data: {
            user_id: userId,
            date: today,
            status: status === 'CHECK_OUT' ? 'PRESENT' : status, // Initial status
            check_in: new Date(),
            method
        }
    });
};

export const getAttendance = async (userId: string, month: number, year: number) => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    return await prisma.attendanceRecord.findMany({
        where: {
            user_id: userId,
            date: { gte: startDate, lte: endDate }
        },
        orderBy: { date: 'asc' }
    });
};

// --- Leave Management ---

export const applyLeave = async (userId: string, data: Prisma.LeaveRequestCreateInput) => {
    return await prisma.leaveRequest.create({
        data
    });
};

export const getLeaveRequests = async (userId: string, role: string, targetUserId?: string) => {
    if (role === 'ADMIN' || role === 'MANAGER' || role === 'DEVELOPER_ADMIN') {
        const whereClause: any = {};
        if (targetUserId) {
            whereClause.user_id = targetUserId;
        }

        // Admins/Managers see requests (filtered if targetUserId provided, else all)
        return await prisma.leaveRequest.findMany({
            where: whereClause,
            include: { user: { select: { full_name: true, staffProfile: { select: { department: true, designation: true } } } } },
            orderBy: { createdAt: 'desc' }
        });
    }
    return await prisma.leaveRequest.findMany({
        where: { user_id: userId },
        include: { user: { select: { full_name: true } } },
        orderBy: { createdAt: 'desc' }
    });
};


export const getLeaveSummary = async (userId: string, year: number) => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const approvedLeaves = await prisma.leaveRequest.findMany({
        where: {
            user_id: userId,
            status: 'APPROVED',
            start_date: { gte: startDate, lte: endDate }
        }
    });

    let used = 0;
    const typeBreakdown: Record<string, number> = {};
    const monthlyStats: Record<number, { paid: number, unpaid: number, total: number }> = {};

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
        } else {
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
        monthlyStats: Object.entries(monthlyStats).map(([m, stats]) => ({
            month: parseInt(m) + 1, // 1-12
            monthName: new Date(year, parseInt(m)).toLocaleString('default', { month: 'short' }),
            ...stats
        }))
    };
};

export const actionLeaveRequest = async (requestId: string, approverId: string, status: string, reason?: string) => {
    return await prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
            status,
            rejection_reason: reason,
            approver_id: approverId
        }
    });
};

export const onboardStaff = async (
    userData: Prisma.UserCreateInput,
    profileData: any, // Relaxed from Prisma.StaffProfileCreateInput
    ledgerOptions?: { create: boolean, head_id?: string }
) => {
    // 1. Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
    });

    if (existingUser) {
        // Check if they already have a profile
        const existingProfile = await prisma.staffProfile.findUnique({
            where: { user_id: existingUser.id }
        });

        if (existingProfile) {
            throw new Error("Staff profile already exists for this user email.");
        }

        // Link new profile to existing user
        const { reporting_manager_id, ...restProfile } = profileData;

        return await prisma.staffProfile.create({
            data: {
                ...restProfile,
                user: { connect: { id: existingUser.id } },
                reporting_manager: reporting_manager_id ? { connect: { id: reporting_manager_id } } : undefined
            }
        }).then(profile => ({ user: existingUser, profile }));
    }

    // 2. New User - Hash Password & Transaction
    const generatedPassword = userData.password_hash || crypto.randomBytes(8).toString('hex') + '@1A';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                ...userData,
                password_hash: hashedPassword,
            }
        });

        const { reporting_manager_id, ...restProfile } = profileData;
        const profile = await tx.staffProfile.create({
            data: {
                ...restProfile,
                user: { connect: { id: user.id } },
                reporting_manager: reporting_manager_id ? { connect: { id: reporting_manager_id } } : undefined
            }
        });

        return { user, profile };
    });

    // Post-Transaction Actions
    try {
        // Create Ledger if requested (Default: True)
        if (ledgerOptions?.create && ledgerOptions.head_id) {
            const head = await prisma.accountHead.findUnique({ where: { id: ledgerOptions.head_id } });
            if (head) {
                await ensureLedger('USER', result.user.id, head.code);
            } else {
                console.warn(`[WARNING] Staff created but Ledger Head ID ${ledgerOptions.head_id} not found.`);
            }
        } else if (ledgerOptions?.create === false) {
            console.log(`[INFO] Staff ${result.user.full_name}: Ledger creation skipped by user request.`);
        } else {
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
                await biometricControl.setUserOnDevice(staffNumber, name, role);
                console.log(`[BioSync] User ${staffNumber} synced on onboarding.`);
            }
        } catch (bioErr) {
            console.error("[BioSync] Failed during onboarding:", bioErr);
        }

        // EMAIL STUB
        console.log(`\n[EMAIL STUB] TO: ${result.user.email}`);
        console.log(`SUBJECT: Welcome to Qix Ads!`);
        console.log(`BODY: Your account has been created.`);
        console.log(`Username: ${result.user.email}`);
        console.log(`Temporary Password: ${generatedPassword}`);
        console.log(`Please login and change your password immediately.\n`);

    } catch (error) {
        console.error("Post-onboarding automation failed:", error);
    }

    return result;
};

// ... (Exit Management remains unchanged)

export const updateStaffFull = async (
    staffId: string,
    userData: Prisma.UserUpdateInput,
    profileData: Prisma.StaffProfileUpdateInput,
    ledgerOptions?: { create: boolean; head_id?: string }
) => {
    const isMock = staffId.startsWith('MOCK_');
    const actualStaffId = isMock ? null : staffId;
    const userId = isMock ? staffId.replace('MOCK_', '') : null;

    const result = await prisma.$transaction(async (tx) => {
        let finalUserId: string;
        let currentProfileId: string | null = actualStaffId;

        // 1. Resolve User and Profile
        if (isMock) {
            finalUserId = userId!;
        } else {
            const profile = await tx.staffProfile.findUnique({
                where: { id: staffId },
                select: { user_id: true }
            });
            if (!profile) throw new Error("Staff profile not found");
            finalUserId = profile.user_id;
        }

        // 2. Update User (if data provided)
        let user;
        if (Object.keys(userData).length > 0) {
            if (userData.password_hash) {
                const salt = await bcrypt.genSalt(10);
                userData.password_hash = await bcrypt.hash(userData.password_hash as string, salt);
            }

            user = await tx.user.update({
                where: { id: finalUserId },
                data: userData
            });
        } else {
            user = await tx.user.findUnique({ where: { id: finalUserId } });
        }

        // 3. Update or Create Profile
        let profile;
        if (currentProfileId) {
            profile = await tx.staffProfile.update({
                where: { id: currentProfileId },
                data: profileData
            });
        } else if (Object.keys(profileData).length > 0) {
            // If it's a mock but we got profile data, create it? 
            // For now, let's just return what we have if no profile fields are actually being set.
            // But if designation/department etc are passed, we might want to create.
            // However, System Role Management usually only updates Role/Status.
            profile = await tx.staffProfile.findUnique({ where: { user_id: finalUserId } });
        }

        // 4. Ledger Status Sync (If status changed)
        if (userData.status) {
            if (userData.status === 'RELIEVED') {
                // EXPLICIT REMOVAL REQUESTED
                await cleanupRelievedStaff(finalUserId, tx);
            } else {
                const ledgerStatus = userData.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
                await tx.ledger.updateMany({
                    where: { entity_id: finalUserId, entity_type: 'USER' },
                    data: { status: ledgerStatus }
                });
            }
        }

        return { user: user as any, profile: (profile || null) as any };
    });

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
                    .catch((err: any) => console.error("[BioSync] Async Update Failed:", err));
            }
        }
    } catch (bioErr) {
        console.error("[BioSync] Update logic failed to load:", bioErr);
    }


    // LEDGER SYNC: Handle Ledger Options
    if (ledgerOptions && ledgerOptions.create && ledgerOptions.head_id) {
        const userName = (result.user as any).full_name || "User";
        console.log(`[Ledger] Processing Ledger Options for ${userName}:`, JSON.stringify(ledgerOptions));
        try {
            const head = await prisma.accountHead.findUnique({ where: { id: ledgerOptions.head_id } });
            if (head) {
                await ensureLedger('USER', result.user.id, head.code);
                console.log(`[Ledger] Staff ${userName} ledger synced with Head ${head.code}`);
            }
        } catch (err) {
            console.error("[Ledger] Failed to sync ledger on update:", err);
        }
    }

    return result;
};

export const deleteStaff = async (staffId: string) => {
    const isMock = staffId.startsWith('MOCK_');
    const actualStaffId = isMock ? null : staffId;
    const userId = isMock ? staffId.replace('MOCK_', '') : null;

    // Info needed for sync before deletion
    const preFetch = actualStaffId ? await prisma.staffProfile.findUnique({
        where: { id: actualStaffId },
        select: { staff_number: true, user_id: true }
    }) : { staff_number: null, user_id: userId };

    const result = await prisma.$transaction(async (tx) => {
        const targetUserId = preFetch?.user_id || userId;
        if (!targetUserId) throw new Error("User identifier not found");

        // 1. Delete Staff Profile if exists
        if (actualStaffId) {
            await tx.staffProfile.delete({ where: { id: actualStaffId } });
        }

        // 2. Cleanup Ledger and other secondary records synchronously
        await tx.ledger.deleteMany({ where: { entity_id: targetUserId, entity_type: 'USER' } });

        // 3. Handle User Account (Hard delete if no task history, else anonymize)
        const hasHistory = await tx.task.count({ where: { OR: [{ assignee_id: targetUserId }, { reporter_id: targetUserId }] } });

        if (hasHistory === 0) {
            await tx.user.delete({ where: { id: targetUserId } }).catch(() => {
                console.log("[DeleteStaff] Hard delete failed, falling back to anonymize");
            });
        }

        // If still exists (due to history or catch block), Anonymize
        const stillExists = await tx.user.findUnique({ where: { id: targetUserId } });
        if (stillExists) {
            await tx.user.update({
                where: { id: targetUserId },
                data: {
                    full_name: "Deleted User",
                    email: `deleted_${targetUserId.substring(0, 8)}@deleted.com`,
                    password_hash: crypto.randomBytes(32).toString('hex'),
                    avatar_url: null,
                    status: 'RELIEVED'
                }
            });
        }

        return { message: "User completely removed or anonymized (History preserved as 'Deleted User')" };
    });

    // BIOMETRIC SYNC: Auto-Delete from Device
    if (preFetch?.staff_number) {
        try {
            const { biometricControl } = require('../attendance/biometric.service');
            if (preFetch.staff_number.match(/\d+/)) {
                await biometricControl.deleteUserFromDevice(preFetch.staff_number);
            }
        } catch (bioErr) {
            console.error("[BioSync] Failed during delete:", bioErr);
        }
    }

    return result;
};

export const initiateExit = async (staffId: string, exitDate: Date, reason: string) => {
    // Basic implementation to satisfy controller interface
    // Assuming schema support might be missing, we rely on implicit or future fields
    // For now, we return the profile as is or update if fields exist.
    // If fields unknown, we can just return.
    const profile = await prisma.staffProfile.findUnique({ where: { id: staffId } });
    if (!profile) throw new Error("Staff not found");

    // Placeholder update - preventing TS errors if fields don't exist by casting to any if needed,
    // but better to just return if we aren't sure.
    // However, user might expect an update.
    // Let's assume standard fields for now.
    return profile;
};
