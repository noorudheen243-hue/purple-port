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
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
function resetAll() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('>>> RESETTING ALL PASSWORDS...');
        // 1. Generate Hash
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash('password123', salt);
        // 2. Update All Users
        const result = yield prisma.user.updateMany({
            data: {
                password_hash: hashedPassword
            }
        });
        console.log(`>>> Updated ${result.count} existing users.`);
        // 3. Ensure Admin Exists
        const adminEmail = 'admin@qixads.com';
        const admin = yield prisma.user.findUnique({ where: { email: adminEmail } });
        if (!admin) {
            console.log('>>> Admin not found. Creating admin@qixads.com ...');
            yield prisma.user.create({
                data: {
                    email: adminEmail,
                    full_name: 'Super Admin',
                    password_hash: hashedPassword,
                    role: 'ADMIN',
                    department: 'MANAGEMENT',
                    staffProfile: {
                        create: {
                            staff_number: 'ADM001',
                            designation: 'Administrator',
                            department: 'MANAGEMENT',
                            date_of_joining: new Date(),
                        }
                    }
                }
            });
            console.log('>>> Admin created successfully.');
        }
        console.log('>>> All passwords are now: password123');
    });
}
resetAll()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () { return yield prisma.$disconnect(); }));
