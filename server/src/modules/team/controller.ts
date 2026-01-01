import { Request, Response } from 'express';
import { z } from 'zod';
import * as teamService from './service';
import * as kpiService from './kpi.service';


// Schemas
const staffProfileSchema = z.object({
    staff_number: z.string(),
    designation: z.string(),
    department: z.string(),
    date_of_joining: z.string().transform(str => new Date(str)), // Accept ISO string
    personal_contact: z.string().optional(),
    official_contact: z.string().optional(),
    whatsapp_number: z.string().optional(),
    address: z.string().optional(),
    base_salary: z.number().optional(),
});

const attendanceSchema = z.object({
    status: z.enum(['PRESENT', 'ABSENT', 'WFH', 'HALF_DAY', 'CHECK_OUT']),
});

const leaveRequestSchema = z.object({
    type: z.enum(['CASUAL', 'SICK', 'EARNED', 'UNPAID', 'MATERNITY/PATERNITY']),
    start_date: z.string().transform(str => new Date(str)),
    end_date: z.string().transform(str => new Date(str)),
    reason: z.string().min(5),
});

const onboardSchema = z.object({
    // User Data
    full_name: z.string().optional(),
    email: z.string().optional(),
    password: z.any().optional(),
    role: z.any().optional(),

    // Staff Profile Data - RELAXED EVERYTHING
    department: z.any().optional(),
    staff_number: z.any().optional(),

    // OPTIONAL FIELDS
    designation: z.any().optional(),
    avatar_url: z.any().optional(),

    // Safe Date Transform
    date_of_joining: z.any().transform(val => val ? new Date(val) : new Date()),
    reporting_manager_id: z.any().optional(),

    // Personal
    date_of_birth: z.any().transform(val => val ? new Date(val) : null),
    marital_status: z.any().optional(),
    personal_email: z.any().optional(),
    personal_contact: z.any().optional(),
    whatsapp_number: z.any().optional(),
    official_contact: z.any().optional(),
    address: z.any().optional(),
    pincode: z.any().optional(),

    // Emergency
    emergency_contact_name: z.any().optional(),
    emergency_contact_number: z.any().optional(),

    // Experience
    previous_company: z.any().optional(),
    total_experience_years: z.any().optional(),

    base_salary: z.any().optional(),

    // Payroll & Financial
    salary_type: z.any().optional(),
    incentive_eligible: z.any().optional(),
    payroll_status: z.any().optional(),

    // Bank Details
    bank_name: z.any().optional(),
    account_holder_name: z.any().optional(),
    account_number: z.any().optional(),
    ifsc_code: z.any().optional(),
    account_type: z.any().optional(),


    // OPTIONAL FIELDS - EXTENDED
    blood_group: z.any().optional(),
    work_shift: z.any().optional(),
    shift_timing: z.any().optional(),

    // Address Split - FULLY RELAXED
    current_address: z.any().optional(),
    permanent_address: z.any().optional(),

    // UPI
    upi_id: z.any().optional(),
    upi_linked_mobile: z.any().optional(),

    // Documents/Financial Extras
    pan_number: z.any().optional(),
    aadhar_number: z.any().optional(),
    payment_method: z.any().optional(),
    create_ledger: z.boolean().optional(),
});

// Controllers

export const createStaffProfile = async (req: Request, res: Response) => {
    try {
        // Assumes User is already created and ID is passed or current user
        // For Admin creating staff, we likely create User first then Profile.
        // For now, let's assume we link to an existing user_id provided in body
        const { user_id, ...profileData } = req.body;
        const validatedData = staffProfileSchema.parse(profileData);

        // Safe casting the Zod output to match Prisma Input where needed
        const profile = await teamService.createStaffProfile(user_id, validatedData as any);
        res.status(201).json(profile);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const onboardStaff = async (req: Request, res: Response) => {
    try {
        console.log("[OnboardStaff] Request Body:", JSON.stringify(req.body, null, 2));

        const data = onboardSchema.parse(req.body);
        console.log("[OnboardStaff] Parsed Data:", JSON.stringify(data, null, 2));

        const result = await teamService.onboardStaff(
            {
                full_name: data.full_name || "New Staff Member",
                email: data.email || `staff_${Date.now()}@placeholder.com`,
                password_hash: data.password || "Welcome@123",
                role: data.role || "DM_EXECUTIVE", // Default role
                department: data.department || "MARKETING", // Default dept
                avatar_url: data.avatar_url
            },
            {
                staff_number: data.staff_number,
                designation: data.designation,
                department: data.department,
                // Ensure date_of_joining is never undefined (Prisma Requirement)
                date_of_joining: data.date_of_joining || new Date(),
                reporting_manager_id: data.reporting_manager_id || undefined,

                date_of_birth: data.date_of_birth,
                marital_status: data.marital_status || undefined,
                personal_email: data.personal_email || undefined,
                personal_contact: data.personal_contact || undefined,
                whatsapp_number: data.whatsapp_number || undefined,
                official_contact: data.official_contact || undefined,
                pincode: data.pincode || undefined,

                emergency_contact_name: data.emergency_contact_name || undefined,
                emergency_contact_number: data.emergency_contact_number || undefined,

                blood_group: data.blood_group || undefined,
                work_shift: data.work_shift || undefined,
                shift_timing: data.shift_timing || undefined,

                current_address: data.current_address || undefined,
                permanent_address: data.permanent_address || undefined,
                // Fallback legacy address
                address: data.address || data.current_address || undefined,

                aadhar_number: data.aadhar_number || undefined,
                payment_method: data.payment_method || undefined,

                previous_company: data.previous_company || undefined,
                total_experience_years: data.total_experience_years,

                base_salary: data.base_salary,
                salary_type: data.salary_type,
                incentive_eligible: data.incentive_eligible,
                payroll_status: data.payroll_status,
                bank_name: data.bank_name,
                account_holder_name: data.account_holder_name,
                account_number: data.account_number,
                ifsc_code: data.ifsc_code,
                account_type: data.account_type,
                pan_number: data.pan_number,
                upi_id: data.upi_id,
                upi_linked_mobile: data.upi_linked_mobile
            },
            data.create_ledger !== false // Default to true if undefined? Or just pass value. Schema says optional. Let's default true if not provided.
        );

        res.status(201).json(result);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: error.errors });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
};

export const updateStaffFull = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        console.log(`[UpdateStaff] Request for ID: ${id}`);
        console.log(`[UpdateStaff] Body:`, JSON.stringify(req.body, null, 2));

        const data = onboardSchema.partial().parse(req.body);
        console.log(`[UpdateStaff] Parsed Zod Data:`, JSON.stringify(data, null, 2));

        const userData: any = {};
        if (data.full_name) userData.full_name = data.full_name;
        if (data.email) userData.email = data.email;
        if (data.password) userData.password_hash = data.password; // Note: Hashing should happen in service if raw
        if (data.role) userData.role = data.role;
        if (data.department) userData.department = data.department;
        if (data.avatar_url !== undefined) userData.avatar_url = data.avatar_url;

        const profileData: any = {
            staff_number: data.staff_number,
            designation: data.designation,
            department: data.department,
            date_of_joining: data.date_of_joining,
            // Fix: Convert empty string to null for disconnect
            reporting_manager_id: data.reporting_manager_id === "" ? null : data.reporting_manager_id,

            date_of_birth: data.date_of_birth,
            marital_status: data.marital_status,
            personal_email: data.personal_email,
            personal_contact: data.personal_contact,
            whatsapp_number: data.whatsapp_number,
            official_contact: data.official_contact,
            address: data.address,
            pincode: data.pincode,
            emergency_contact_name: data.emergency_contact_name,
            emergency_contact_number: data.emergency_contact_number,
            previous_company: data.previous_company,
            total_experience_years: data.total_experience_years,
            base_salary: data.base_salary,

            // Payroll & Financial
            salary_type: data.salary_type,
            incentive_eligible: data.incentive_eligible,
            payroll_status: data.payroll_status,

            // Bank Details
            bank_name: data.bank_name,
            account_holder_name: data.account_holder_name,
            account_number: data.account_number,
            ifsc_code: data.ifsc_code,
            account_type: data.account_type,
            pan_number: data.pan_number,
            aadhar_number: data.aadhar_number, // NEW
            payment_method: data.payment_method, // NEW

            // Extended Profile
            blood_group: data.blood_group, // NEW
            shift_timing: data.shift_timing, // NEW
            work_shift: data.work_shift, // Legacy
            current_address: data.current_address, // NEW
            permanent_address: data.permanent_address, // NEW

            // UPI
            upi_id: data.upi_id,
            upi_linked_mobile: data.upi_linked_mobile
        };

        // Clean undefined
        Object.keys(userData).forEach(key => userData[key] === undefined && delete userData[key]);
        Object.keys(profileData).forEach(key => profileData[key] === undefined && delete profileData[key]);

        console.log(`[UpdateStaff] Final UserData:`, JSON.stringify(userData, null, 2));
        console.log(`[UpdateStaff] Final ProfileData:`, JSON.stringify(profileData, null, 2));

        const result = await teamService.updateStaffFull(id, userData, profileData);
        res.json(result);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: error.errors });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
};

export const deleteStaff = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await teamService.deleteStaff(id);
        res.json({ message: "Staff member deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyProfile = async (req: Request, res: Response) => {
    try {
        const profile = await teamService.getStaffByUserId(req.user!.id); // Fixed: .id
        if (!profile) return res.status(404).json({ message: "Profile not found" });
        res.json(profile);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const listStaff = async (req: Request, res: Response) => {
    try {
        const staff = await teamService.listStaff();
        res.json(staff);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStaffById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const profile = await teamService.getStaffProfile(id);
        if (!profile) return res.status(404).json({ message: "Staff profile not found" });
        res.json(profile);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const recordAttendance = async (req: Request, res: Response) => {
    try {
        const { status } = attendanceSchema.parse(req.body);
        const userId = req.user!.id; // Fixed: .id
        const record = await teamService.recordAttendance(userId, status);
        res.json(record);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const applyLeave = async (req: Request, res: Response) => {
    try {
        const validatedData = leaveRequestSchema.parse(req.body);
        const leave = await teamService.applyLeave(req.user!.id, { // Fixed: .id
            ...validatedData,
            user: { connect: { id: req.user!.id } } // Fixed: .id
        });
        res.status(201).json(leave);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getLeaves = async (req: Request, res: Response) => {
    try {
        const leaves = await teamService.getLeaveRequests(req.user!.id, req.user!.role); // Fixed: .id
        res.json(leaves);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const approveLeave = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body; // APPROVED / REJECTED
        const leave = await teamService.actionLeaveRequest(id, req.user!.id, status, reason); // Fixed: .id
        res.json(leave);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getLeaveSummary = async (req: Request, res: Response) => {
    try {
        const { userId, year } = req.query;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Auth check: Admin/Manager or Self
        if (req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER' && req.user!.id !== userId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const y = parseInt(year as string) || new Date().getFullYear();
        const summary = await teamService.getLeaveSummary(userId as string, y);
        res.json(summary);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- KPI & Exit ---

export const getKPIs = async (req: Request, res: Response) => {
    try {
        const { month, year, userId } = req.query;
        const m = parseInt(month as string) || new Date().getMonth() + 1;
        const y = parseInt(year as string) || new Date().getFullYear();

        if (userId) {
            // Check auth (Self or Manager/Admin)
            if (req.user!.role === 'WEB_SEO' || req.user!.role === 'MARKETING_EXEC' || req.user!.role === 'DESIGNER') {
                if (req.user!.id !== userId) return res.status(403).json({ message: "Forbidden" });
            }

            const kpis = await kpiService.calculateIndividualKPI(userId as string, m, y);
            res.json(kpis);
        } else {
            // Team Overview (Admin/Manager only)
            if (req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER') {
                return res.status(403).json({ message: "Forbidden" });
            }
            const kpis = await kpiService.calculateTeamKPIs(m, y);
            res.json(kpis);
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const initiateExit = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { exitDate, reason } = req.body; // exitDate string YYYY-MM-DD

        const result = await teamService.initiateExit(
            id,
            new Date(exitDate),
            reason
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
