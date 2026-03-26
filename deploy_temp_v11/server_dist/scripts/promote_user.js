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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function promoteUser() {
    return __awaiter(this, void 0, void 0, function* () {
        const email = 'noorudheen243@gmail.com';
        const targetRole = 'DEVELOPER_ADMIN';
        console.log(`Searching for user: ${email}...`);
        try {
            const user = yield prisma.user.findUnique({
                where: { email }
            });
            if (!user) {
                console.error(`User with email ${email} not found!`);
                return;
            }
            console.log(`Found user: ${user.full_name} (Current Role: ${user.role})`);
            if (user.role === targetRole) {
                console.log('User is already a Developer Admin.');
                return;
            }
            yield prisma.user.update({
                where: { email },
                data: { role: targetRole }
            });
            console.log(`✅ Success! ${user.full_name} has been promoted to ${targetRole}.`);
        }
        catch (error) {
            console.error('Error upgrading user:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
promoteUser();
