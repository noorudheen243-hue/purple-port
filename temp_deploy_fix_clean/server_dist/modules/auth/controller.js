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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emergencyReset = exports.changePassword = exports.getMe = exports.logoutUser = exports.loginUser = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const userService = __importStar(require("../users/service"));
const auth_1 = require("../../utils/auth");
const registerSchema = zod_1.z.object({
    full_name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(['ADMIN', 'MANAGER', 'MARKETING_EXEC', 'DESIGNER', 'WEB_SEO']),
    department: zod_1.z.enum(['CREATIVE', 'MARKETING', 'WEB', 'MANAGEMENT']),
});
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = registerSchema.parse(req.body);
        const userExists = yield userService.findUserByEmail(validatedData.email);
        if (userExists) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }
        const user = yield userService.createUser({
            full_name: validatedData.full_name,
            email: validatedData.email,
            password_hash: validatedData.password, // Will be hashed in service
            role: validatedData.role,
            department: validatedData.department
        });
        if (user) {
            (0, auth_1.generateToken)(res, user.id, user.role);
            res.status(201).json({
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                department: user.department,
                linked_client_id: user.linked_client_id,
            });
        }
        else {
            res.status(400).json({ message: 'Invalid user data' });
        }
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
exports.registerUser = registerUser;
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { email, password } = req.body;
    // Normalize inputs
    if (email)
        email = email.trim().toLowerCase();
    if (password)
        password = password.trim();
    console.log(`[LOGIN ATTEMPT] Email: ${email}, Password Provided: ${!!password}`);
    try {
        const user = yield userService.findUserByEmail(email);
        console.log(`[LOGIN DEBUG] User found: ${!!user}`);
        if (user) {
            const isMatch = yield bcryptjs_1.default.compare(password, user.password_hash);
            console.log(`[LOGIN DEBUG] Password Match: ${isMatch}`);
            if (isMatch) {
                const token = (0, auth_1.generateToken)(res, user.id, user.role);
                res.json({
                    token,
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role,
                    department: user.department,
                    linked_client_id: user.linked_client_id,
                });
                return;
            }
        }
        console.log('[LOGIN FAILED] Invalid credentials');
        res.status(401).json({ message: 'Invalid email or password' });
    }
    catch (error) {
        console.error('[LOGIN ERROR]', error);
        res.status(500).json({ message: error.message });
    }
});
exports.loginUser = loginUser;
const logoutUser = (req, res) => {
    (0, auth_1.clearToken)(res);
    res.status(200).json({ message: 'Logged out successfully' });
};
exports.logoutUser = logoutUser;
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
    }
    const user = yield userService.findUserById(req.user.id);
    res.json(user);
});
exports.getMe = getMe;
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { currentPassword, newPassword } = req.body;
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const user = yield userService.findUserByIdWithPassword(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Verify Current Password
        const isMatch = yield bcryptjs_1.default.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }
        // Hash New Password
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, salt);
        // Update User
        yield userService.updateUserPassword(user.id, hashedPassword);
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.changePassword = changePassword;
const emergencyReset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const EMAIL = "noorudheen243@gmail.com";
        const NEW_PASS = "password123";
        const user = yield userService.findUserByEmail(EMAIL);
        if (!user) {
            return res.status(404).json({ message: `User ${EMAIL} not found on this server.` });
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(NEW_PASS, salt);
        yield userService.updateUserPassword(user.id, hashedPassword);
        res.json({
            message: "EMERGENCY RESET SUCCESSFUL",
            email: EMAIL,
            new_password: NEW_PASS,
            server_time: new Date().toISOString()
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
exports.emergencyReset = emergencyReset;
