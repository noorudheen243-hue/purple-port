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
const isProduction = process.env.NODE_ENV === 'production';
const prisma = new client_1.PrismaClient({
    log: isProduction ? ['error', 'warn'] : ['query', 'info', 'warn', 'error'],
});
// Enable WAL mode for better concurrency with SQLite
// We run this on initialization to ensure the DB is optimized
if (isProduction) {
    prisma.$queryRaw `PRAGMA journal_mode = WAL;`
        .then(() => console.log('SQLite WAL Mode Verified'))
        .catch(err => console.error('Failed to set WAL mode:', err));
}
else {
    // In dev, we can be more explicit
    (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield prisma.$queryRaw `PRAGMA journal_mode = WAL;`;
            console.log('SQLite WAL Mode Enabled');
        }
        catch (error) {
            console.error('Failed to enable WAL mode:', error);
        }
    }))();
}
exports.default = prisma;
