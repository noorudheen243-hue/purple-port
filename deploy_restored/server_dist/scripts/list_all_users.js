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
        try {
            const users = yield prisma.user.findMany({
                // Removed erroneous 'where' clause for deleted_at
                select: {
                    id: true,
                    email: true,
                    full_name: true,
                    role: true,
                    department: true, // Use department instead of designation/status
                },
                orderBy: {
                    role: 'asc',
                },
            });
            console.log('------------------------------------------------------------------------------------------------');
            console.log('| Role             | Name                 | Email                          | Department     |');
            console.log('------------------------------------------------------------------------------------------------');
            users.forEach(user => {
                console.log(`| ${user.role.padEnd(16)} | ${user.full_name.padEnd(20)} | ${user.email.padEnd(30)} | ${user.department.padEnd(14)} |`);
            });
            console.log('------------------------------------------------------------------------------------------------');
            console.log(`Total Users: ${users.length}`);
        }
        catch (error) {
            console.error('Error fetching users:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
main();
