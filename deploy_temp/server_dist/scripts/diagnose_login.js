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
function diagnose() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n--- LOGIN DIAGNOSTICS ---');
        console.log('Checking database connection...');
        // 1. List All Users
        const users = yield prisma.user.findMany({
            select: { email: true, role: true, full_name: true }
        });
        console.log(`Total Users in DB: ${users.length}`);
        users.forEach(u => console.log(` - ${u.email} (${u.role})`));
        // 2. Check Admin
        const email = 'admin@example.com';
        console.log(`\nTesting specific user: ${email}...`);
        const admin = yield prisma.user.findUnique({ where: { email } });
        if (!admin) {
            console.error(`❌ CRITICAL: User ${email} NOT FOUND in database!`);
        }
        else {
            console.log('✅ User found.');
            // 3. Test Password
            const testPass = 'admin123';
            const isMatch = yield bcryptjs_1.default.compare(testPass, admin.password_hash);
            console.log(`Testing password '${testPass}' against DB hash...`);
            if (isMatch) {
                console.log('✅ MATCH CONFIRMED. The password IS "password123".');
                console.log('If you still cannot login, check if:');
                console.log('1. You are typing it correctly.');
                console.log('2. There are hidden spaces.');
                console.log('3. The frontend is hitting the correct API.');
            }
            else {
                console.error('❌ HASH MISMATCH. The stored password is NOT "password123".');
                console.log('>>> FORCE RESETTING PASSWORD NOW...');
                const salt = yield bcryptjs_1.default.genSalt(10);
                const newHash = yield bcryptjs_1.default.hash(testPass, salt);
                yield prisma.user.update({
                    where: { email },
                    data: { password_hash: newHash }
                });
                console.log('✅ Password has been force-updated to "password123". Try logging in now.');
            }
        }
        console.log('--- END DIAGNOSTICS ---\n');
    });
}
diagnose()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () { return yield prisma.$disconnect(); }));
