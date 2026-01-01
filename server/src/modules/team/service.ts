import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // For secure random password
import { ensureLedger } from '../accounting/service';
import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

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
    return await prisma.staffProfile.findUnique({
        where: { id },
        include: {
            user: { select: { email: true, full_name: true, avatar_url: true, role: true } },
            reporting_manager: { select: { full_name: true } }
        }
    });
};

export const getStaffByUserId = async (userId: string) => {
    return await prisma.staffProfile.findUnique({
        where: { user_id: userId },
        include: {
            user: { select: { email: true, full_name: true, avatar_url: true, role: true } },
            reporting_manager: { select: { full_name: true } }
        }
    });
};

export const listStaff = async () => {
    return await prisma.staffProfile.findMany({
        orderBy: { designation: 'asc' },
        include: {
            user: { select: { id: true, full_name: true, email: true, role: true, avatar_url: true } }
        }
    });
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

export const getLeaveRequests = async (userId: string, role: string) => {
    if (role === 'ADMIN' || role === 'MANAGER') {
        // Admins/Managers see all requests (could filter by department later)
        return await prisma.leaveRequest.findMany({
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
        const isPaid = leave.type !== 'UNPAID';

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
    createLedger: boolean = true
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
        // Using Head Code 2000 (Liabilities) for Staff Payable Account
        if (createLedger) {
            await ensureLedger('USER', result.user.id, '2000');
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
        // Don't fail the request, just log.
    }

    return result;
};

// --- Exit Management ---

export const initiateExit = async (staffId: string, exitDate: Date, reason?: string) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Get Profile & User
        const profile = await tx.staffProfile.findUnique({
            where: { id: staffId },
            include: { user: true }
        });
        if (!profile) throw new Error("Staff not found");

        // 2. Update Profile Status
        await tx.staffProfile.update({
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
            const crash = crypto.randomBytes(16).toString('hex');
            await tx.user.update({
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
    });
};

export const updateStaffFull = async (
    staffId: string,
    userData: Prisma.UserUpdateInput,
    profileData: Prisma.StaffProfileUpdateInput
) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Get User ID from Staff Profile
        const currentProfile = await tx.staffProfile.findUnique({
            where: { id: staffId },
            select: { user_id: true }
        });

        if (!currentProfile) throw new Error("Staff profile not found");

        // 2. Update User (if data provided)
        let user;
        if (Object.keys(userData).length > 0) {
            if (userData.password_hash) {
                const salt = await bcrypt.genSalt(10);
                userData.password_hash = await bcrypt.hash(userData.password_hash as string, salt);
            }

            user = await tx.user.update({
                where: { id: currentProfile.user_id },
                data: userData
            });
        }

        // 3. Update Profile (if data provided)
        const profile = await tx.staffProfile.update({
            where: { id: staffId },
            data: profileData
        });

        return { user, profile };
    });
};

export const deleteStaff = async (staffId: string) => {
    return await prisma.$transaction(async (tx) => {
        const profile = await tx.staffProfile.findUnique({
            where: { id: staffId },
            select: { user_id: true, user: { select: { email: true } } }
        });

        if (!profile) throw new Error("Staff profile not found");
        const userId = profile.user_id;

        // 1. Delete Staff Profile (Removes them from Team List & Payroll)
        await tx.staffProfile.delete({ where: { id: staffId } });

        // 2. Handle User Account (Cannot hard delete due to History/Tasks)
        // Strategy: Anonymize and Deactivate (Scramble Password)
        // Check if they have critical history
        const hasHistory = await tx.task.count({ where: { OR: [{ assignee_id: userId }, { reporter_id: userId }] } });

        if (hasHistory === 0) {
            // Safe to hard delete if no tasks
            // Check other relations? Comments? 
            // Simplest: Anonymize always to be safe against random FKs (Logs, etc.)
            await tx.user.delete({ where: { id: userId } }).catch(() => {
                // Fallback to anonymize if delete fails
                console.log("Hard delete failed, falling back to anonymize");
            });
        }

        // If still exists (or we skipped delete), Anonymize
        const stillExists = await tx.user.findUnique({ where: { id: userId } });
        if (stillExists) {
            await tx.user.update({
                where: { id: userId },
                data: {
                    full_name: "Deleted User",
                    email: `deleted_${userId.substring(0, 8)}@deleted.com`, // Ensure unique email
                    password_hash: crypto.randomBytes(32).toString('hex'), // Lock account
                    avatar_url: null,
                    role: 'DM_EXECUTIVE', // Downgrade role
                    department: 'ADMIN' // Dump in Admin or specific 'ARCHIVE' dept if exists
                }
            });
        }

        return { message: "Staff deleted successfully (History preserved)" };
    });
};
