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
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const email = 'noorudheen243@gmail.com';
        const passwordRaw = 'password123';
        console.log(`Creating/Updating Developer Admin: ${email}...`);
        const salt = yield bcryptjs_1.default.genSalt(10);
        const passwordHash = yield bcryptjs_1.default.hash(passwordRaw, salt);
        const user = yield prisma.user.upsert({
            where: { email },
            update: {
                role: 'DEVELOPER_ADMIN',
                password_hash: passwordHash,
                department: 'MANAGEMENT'
            },
            create: {
                email,
                full_name: 'Noorudheen (Dev Admin)',
                password_hash: passwordHash,
                role: 'DEVELOPER_ADMIN',
                department: 'MANAGEMENT'
            }
        });
        console.log(`User ${user.email} created/updated successfully.`);
        console.log(`Role: ${user.role}`);
        console.log(`Password set to: ${passwordRaw}`);
    });
}
main()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
