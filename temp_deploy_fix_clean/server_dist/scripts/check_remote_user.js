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
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const email = 'noorudheen243@gmail.com';
        console.log(`Checking for user: ${email}...`);
        try {
            const user = yield prisma.user.findUnique({
                where: { email }
            });
            if (user) {
                console.log('✅ User FOUND in database.');
                console.log(`- ID: ${user.id}`);
                console.log(`- Role: ${user.role}`);
                console.log(`- Password Hash (first 20 chars): ${user.password_hash.substring(0, 20)}...`);
                console.log(`- Updated At: ${user.updatedAt}`);
            }
            else {
                console.log('❌ User NOT FOUND in database.');
                // List all users to see who IS there
                const allUsers = yield prisma.user.findMany({
                    select: { email: true, role: true }
                });
                console.log(`Total Users: ${allUsers.length}`);
                allUsers.forEach(u => console.log(`- ${u.email} (${u.role})`));
            }
        }
        catch (error) {
            console.error('Error querying database:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
main();
