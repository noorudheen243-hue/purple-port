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
const EMAIL = "noorudheen243@gmail.com";
const NEW_PASSWORD = "password123";
function forceReset() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Finding user: ${EMAIL}...`);
        const user = yield prisma.user.findUnique({ where: { email: EMAIL } });
        if (!user) {
            console.error("❌ User not found!");
            return;
        }
        console.log(`Found user: ${user.full_name} (${user.role})`);
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hash = yield bcryptjs_1.default.hash(NEW_PASSWORD, salt);
        yield prisma.user.update({
            where: { id: user.id },
            data: { password_hash: hash }
        });
        console.log(`\n✅ Password for ${EMAIL} has been forcefully set to: ${NEW_PASSWORD}`);
        console.log("Try logging in now.");
    });
}
forceReset()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
