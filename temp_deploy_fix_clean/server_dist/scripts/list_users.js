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
        console.log('--- SYSTEM USERS REPORT ---');
        try {
            const users = yield prisma.user.findMany();
            if (users.length === 0) {
                console.log("!!! DATABASE IS EMPTY !!! (No users found)");
            }
            else {
                console.table(users.map(u => ({
                    Email: u.email,
                    Role: u.role,
                    PasswordHash: u.password_hash.substring(0, 10) + '...'
                })));
            }
        }
        catch (e) {
            console.error("Error connecting to database:", e);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
main();
