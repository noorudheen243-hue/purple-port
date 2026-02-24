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
exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../../utils/prisma"));
const roles_1 = require("./roles");
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token;
    // Check for token in cookies
    token = req.cookies.jwt;
    // Check for token in Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const user = yield prisma_1.default.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, role: true, department: true, linked_client_id: true }, // Select minimal fields
            });
            if (user) {
                req.user = {
                    id: user.id,
                    role: user.role,
                    department: user.department,
                    linked_client_id: user.linked_client_id
                };
                next();
            }
            else {
                res.status(401).json({ message: 'Not authorized, user not found' });
            }
        }
        catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
});
exports.protect = protect;
const authorize = (...roles) => {
    return (req, res, next) => {
        // Developer Admin has access to everything
        // ADMIN usually has access to everything unless restricted logic is applied elsewhere
        if (req.user && (req.user.role === roles_1.ROLES.DEVELOPER_ADMIN || roles.includes(req.user.role))) {
            next();
        }
        else {
            res.status(403).json({ message: 'Not authorized to access this route' });
        }
    };
};
exports.authorize = authorize;
