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
        const email = 'noorudheen243@gmail.com'; // Hardcoded for safety/specificity
        const newPassword = 'password123';
        try {
            const user = yield prisma.user.findUnique({
                where: { email }
            });
            if (!user) {
                console.error(`User with email ${email} not found.`);
                process.exit(1);
            }
            const salt = yield bcryptjs_1.default.genSalt(10);
            const hashedPassword = yield bcryptjs_1.default.hash(newPassword, salt);
            yield prisma.user.update({
                where: { email },
                data: {
                    password_hash: hashedPassword,
                    role: 'DEVELOPER_ADMIN', // Ensure role is correct
                }
            });
            console.log(`Success: Password for ${email} has been reset to '${newPassword}'`);
        }
        catch (error) {
            console.error('Error resetting password:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
main();
