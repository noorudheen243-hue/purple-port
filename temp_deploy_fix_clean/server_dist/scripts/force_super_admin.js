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
        console.log(`Checking user: ${email}...`);
        const user = yield prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            console.error("User not found!");
            return;
        }
        console.log(`Current Role: ${user.role}`);
        if (user.role !== 'DEVELOPER_ADMIN') {
            console.log("Updating to DEVELOPER_ADMIN...");
            yield prisma.user.update({
                where: { email },
                data: { role: 'DEVELOPER_ADMIN' }
            });
            console.log("Success! Role updated.");
        }
        else {
            console.log("User is already DEVELOPER_ADMIN.");
        }
    });
}
main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
