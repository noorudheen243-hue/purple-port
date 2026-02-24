"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateExit = exports.getKPIs = exports.getLeaveSummary = exports.approveLeave = exports.getLeaves = exports.applyLeave = exports.recordAttendance = exports.getNextStaffId = exports.getStaffById = exports.listStaff = exports.getMyProfile = exports.deleteStaff = exports.updateStaffFull = exports.onboardStaff = exports.createStaffProfile = void 0;
const zod_1 = require("zod");
const teamService = __importStar(require("./service"));
const kpiService = __importStar(require("./kpi.service"));
// Schemas
const staffProfileSchema = zod_1.z.object({
    staff_number: zod_1.z.string(),
    designation: zod_1.z.string(),
    department: zod_1.z.string(),
    date_of_joining: zod_1.z.string().transform(str => new Date(str)), // Accept ISO string
    personal_contact: zod_1.z.string().optional(),
    official_contact: zod_1.z.string().optional(),
    whatsapp_number: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    base_salary: zod_1.z.number().optional(),
});
const attendanceSchema = zod_1.z.object({
    status: zod_1.z.enum(['PRESENT', 'ABSENT', 'WFH', 'HALF_DAY', 'CHECK_OUT']),
});
const leaveRequestSchema = zod_1.z.object({
    type: zod_1.z.enum(['CASUAL', 'SICK', 'EARNED', 'UNPAID', 'MATERNITY/PATERNITY']),
    start_date: zod_1.z.string().transform(str => new Date(str)),
    end_date: zod_1.z.string().transform(str => new Date(str)),
    reason: zod_1.z.string().min(5),
});
const onboardSchema = zod_1.z.object({
    // User Data
    full_name: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    password: zod_1.z.any().optional(),
    role: zod_1.z.any().optional(),
    // Staff Profile Data - RELAXED EVERYTHING
    department: zod_1.z.any().optional(),
    staff_number: zod_1.z.any().optional(),
    // OPTIONAL FIELDS
    designation: zod_1.z.any().optional(),
    avatar_url: zod_1.z.any().optional(),
    // Safe Date Transform
    date_of_joining: zod_1.z.any().transform(val => val ? new Date(val) : new Date()),
    reporting_manager_id: zod_1.z.any().optional(),
    // Personal
    date_of_birth: zod_1.z.any().transform(val => val ? new Date(val) : null),
    marital_status: zod_1.z.any().optional(),
    personal_email: zod_1.z.any().optional(),
    personal_contact: zod_1.z.any().optional(),
    whatsapp_number: zod_1.z.any().optional(),
    official_contact: zod_1.z.any().optional(),
    address: zod_1.z.any().optional(),
    pincode: zod_1.z.any().optional(),
    // Emergency
    emergency_contact_name: zod_1.z.any().optional(),
    emergency_contact_number: zod_1.z.any().optional(),
    // Experience
    previous_company: zod_1.z.any().optional(),
    total_experience_years: zod_1.z.any().optional(),
    base_salary: zod_1.z.any().optional(),
    hra: zod_1.z.any().optional(),
    allowances: zod_1.z.any().optional(),
    conveyance_allowance: zod_1.z.any().optional(),
    accommodation_allowance: zod_1.z.any().optional(),
    // Payroll & Financial
    salary_type: zod_1.z.any().optional(),
    incentive_eligible: zod_1.z.any().optional(),
    payroll_status: zod_1.z.any().optional(),
    // Bank Details
    bank_name: zod_1.z.any().optional(),
    account_holder_name: zod_1.z.any().optional(),
    account_number: zod_1.z.any().optional(),
    ifsc_code: zod_1.z.any().optional(),
    account_type: zod_1.z.any().optional(),
    // OPTIONAL FIELDS - EXTENDED
    blood_group: zod_1.z.any().optional(),
    work_shift: zod_1.z.any().optional(),
    // Address Split - FULLY RELAXED
    current_address: zod_1.z.any().optional(),
    permanent_address: zod_1.z.any().optional(),
    // UPI
    upi_id: zod_1.z.any().optional(),
    upi_linked_mobile: zod_1.z.any().optional(),
    // Ledger Settings
    ledger_options: zod_1.z.object({
        create: zod_1.z.boolean(),
        head_id: zod_1.z.string().optional()
    }).optional(),
    // Documents/Financial Extras
    pan_number: zod_1.z.any().optional(),
    aadhar_number: zod_1.z.any().optional(),
    payment_method: zod_1.z.any().optional(),
});
// Controllers
const createStaffProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Assumes User is already created and ID is passed or current user
        // For Admin creating staff, we likely create User first then Profile.
        // For now, let's assume we link to an existing user_id provided in body
        const _a = req.body, { user_id } = _a, profileData = __rest(_a, ["user_id"]);
        const validatedData = staffProfileSchema.parse(profileData);
        // Safe casting the Zod output to match Prisma Input where needed
        const profile = yield teamService.createStaffProfile(user_id, validatedData);
        res.status(201).json(profile);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createStaffProfile = createStaffProfile;
const onboardStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("[OnboardStaff] Request Body:", JSON.stringify(req.body, null, 2));
        const data = onboardSchema.parse(req.body);
        console.log("[OnboardStaff] Parsed Data:", JSON.stringify(data, null, 2));
        const result = yield teamService.onboardStaff({
            full_name: data.full_name || "New Staff Member",
            email: data.email || `staff_${Date.now()}@placeholder.com`,
            password_hash: data.password || "Welcome@123",
            role: data.role || "DM_EXECUTIVE", // Default role
            department: data.department || "MARKETING", // Default dept
            avatar_url: data.avatar_url
        }, {
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
            current_address: data.current_address || undefined,
            permanent_address: data.permanent_address || undefined,
            // Fallback legacy address
            address: data.address || data.current_address || undefined,
            aadhar_number: data.aadhar_number || undefined,
            payment_method: data.payment_method || undefined,
            previous_company: data.previous_company || undefined,
            total_experience_years: data.total_experience_years ? Number(data.total_experience_years) : undefined,
            base_salary: data.base_salary ? Number(data.base_salary) : undefined,
            hra: data.hra ? Number(data.hra) : undefined,
            allowances: data.allowances ? Number(data.allowances) : undefined,
            conveyance_allowance: data.conveyance_allowance ? Number(data.conveyance_allowance) : undefined,
            accommodation_allowance: data.accommodation_allowance ? Number(data.accommodation_allowance) : undefined,
            salary_type: data.salary_type,
            incentive_eligible: data.incentive_eligible === 'true' || data.incentive_eligible === true,
            payroll_status: data.payroll_status,
            bank_name: data.bank_name,
            account_holder_name: data.account_holder_name,
            account_number: data.account_number,
            ifsc_code: data.ifsc_code,
            account_type: data.account_type,
            pan_number: data.pan_number,
            upi_id: data.upi_id,
            upi_linked_mobile: data.upi_linked_mobile
        }, data.ledger_options // Pass new ledger options object
        );
        res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ message: error.errors });
        }
        else {
            res.status(500).json({ message: error.message });
        }
    }
});
exports.onboardStaff = onboardStaff;
const updateStaffFull = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        console.log(`[UpdateStaff] Request for ID: ${id}`);
        console.log(`[UpdateStaff] Body:`, JSON.stringify(req.body, null, 2));
        const data = onboardSchema.partial().parse(req.body);
        console.log(`[UpdateStaff] Parsed Zod Data:`, JSON.stringify(data, null, 2));
        const userData = {};
        if (data.full_name)
            userData.full_name = data.full_name;
        if (data.email)
            userData.email = data.email;
        if (data.password)
            userData.password_hash = data.password;
        // --- DEVELOPER ADMIN PROTECTION START ---
        // 1. Check if we are trying to set DEVELOPER_ADMIN
        if (data.role === 'DEVELOPER_ADMIN') {
            if (req.user.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: "Only Developer Admins can assign this role." });
            }
        }
        // 2. Check if we are trying to modify an existing DEVELOPER_ADMIN
        // We need to fetch the current profile/user to check their current role
        const targetStaff = yield teamService.getStaffProfile(id);
        // SUPER ADMIN LOCK: noorudheen243@gmail.com
        if (targetStaff && targetStaff.user.email === 'noorudheen243@gmail.com') {
            // 1. Prevent changing their role to anything else
            if (data.role && data.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: "This Super User account cannot be demoted." });
            }
            // 2. Prevent others from editing this user unless they are also that user (Self-edit ok for details, but rarely role)
        }
        if (targetStaff && targetStaff.user.role === 'DEVELOPER_ADMIN') {
            if (req.user.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: "You cannot modify a Developer Admin account." });
            }
        }
        // --- DEVELOPER ADMIN PROTECTION END ---
        if (data.role)
            userData.role = data.role;
        if (data.department)
            userData.department = data.department;
        if (data.avatar_url !== undefined)
            userData.avatar_url = data.avatar_url;
        const profileData = {
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
            total_experience_years: data.total_experience_years ? Number(data.total_experience_years) : undefined,
            base_salary: data.base_salary ? Number(data.base_salary) : undefined,
            hra: data.hra ? Number(data.hra) : undefined,
            allowances: data.allowances ? Number(data.allowances) : undefined,
            conveyance_allowance: data.conveyance_allowance ? Number(data.conveyance_allowance) : undefined,
            accommodation_allowance: data.accommodation_allowance ? Number(data.accommodation_allowance) : undefined,
            // Payroll & Financial
            salary_type: data.salary_type,
            incentive_eligible: data.incentive_eligible === 'true' || data.incentive_eligible === true,
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
        const result = yield teamService.updateStaffFull(id, userData, profileData, data.ledger_options);
        // LEDGER AUTOMATION moved to service.
        res.json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ message: error.errors });
        }
        else {
            res.status(500).json({ message: error.message });
        }
    }
});
exports.updateStaffFull = updateStaffFull;
const deleteStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield teamService.deleteStaff(id);
        res.json({ message: "Staff member deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteStaff = deleteStaff;
const getMyProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const profile = yield teamService.getStaffByUserId(req.user.id); // Fixed: .id
        if (!profile)
            return res.status(404).json({ message: "Profile not found" });
        res.json(profile);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMyProfile = getMyProfile;
const listStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = yield teamService.listStaff();
        res.json(staff);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.listStaff = listStaff;
const getStaffById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const profile = yield teamService.getStaffProfile(id);
        if (!profile)
            return res.status(404).json({ message: "Staff profile not found" });
        res.json(profile);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getStaffById = getStaffById;
const getNextStaffId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const nextId = yield teamService.generateNextStaffId();
        res.json({ nextId });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getNextStaffId = getNextStaffId;
const recordAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = attendanceSchema.parse(req.body);
        const userId = req.user.id; // Fixed: .id
        const record = yield teamService.recordAttendance(userId, status);
        res.json(record);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.recordAttendance = recordAttendance;
const applyLeave = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = leaveRequestSchema.parse(req.body);
        const leave = yield teamService.applyLeave(req.user.id, Object.assign(Object.assign({}, validatedData), { user: { connect: { id: req.user.id } } // Fixed: .id
         }));
        res.status(201).json(leave);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.applyLeave = applyLeave;
const getLeaves = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.query;
        // If userId is passed, pass it as target. If 'me', resolving to undefined here relies on frontend sending UUID?
        // Actually, let's treat any string passed as target. Service handles permissions.
        const targetUserId = (typeof userId === 'string' && userId !== 'me') ? userId : undefined;
        // Note: If userId is 'me', targetUserId is undefined. Service returns ALL for Admin.
        // If Admin wants "My Leaves", frontend must send Admin's UUID.
        const leaves = yield teamService.getLeaveRequests(req.user.id, req.user.role, targetUserId); // Fixed: .id
        res.json(leaves);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getLeaves = getLeaves;
const approveLeave = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status, reason } = req.body; // APPROVED / REJECTED
        const leave = yield teamService.actionLeaveRequest(id, req.user.id, status, reason); // Fixed: .id
        res.json(leave);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.approveLeave = approveLeave;
const getLeaveSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, year } = req.query;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }
        // Auth check: Admin/Manager or Self
        if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER' && req.user.role !== 'DEVELOPER_ADMIN' && req.user.id !== userId) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const y = parseInt(year) || new Date().getFullYear();
        const summary = yield teamService.getLeaveSummary(userId, y);
        res.json(summary);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getLeaveSummary = getLeaveSummary;
// --- KPI & Exit ---
const getKPIs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month, year, userId } = req.query;
        const m = parseInt(month) || new Date().getMonth() + 1;
        const y = parseInt(year) || new Date().getFullYear();
        if (userId) {
            // Check auth (Self or Manager/Admin)
            if (req.user.role === 'WEB_SEO' || req.user.role === 'MARKETING_EXEC' || req.user.role === 'DESIGNER') {
                if (req.user.id !== userId)
                    return res.status(403).json({ message: "Forbidden" });
            }
            const kpis = yield kpiService.calculateIndividualKPI(userId, m, y);
            res.json(kpis);
        }
        else {
            // Team Overview (Admin/Manager only)
            if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER' && req.user.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: "Forbidden" });
            }
            const kpis = yield kpiService.calculateTeamKPIs(m, y);
            res.json(kpis);
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getKPIs = getKPIs;
const initiateExit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { exitDate, reason } = req.body; // exitDate string YYYY-MM-DD
        const result = yield teamService.initiateExit(id, new Date(exitDate), reason);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.initiateExit = initiateExit;
