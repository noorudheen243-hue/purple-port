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
const db = new client_1.PrismaClient();
function inspectRecords() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const records = yield db.attendanceRecord.findMany({
                where: {
                    date: {
                        gte: new Date('2026-02-18T00:00:00.000Z'),
                        lte: new Date('2026-02-18T23:59:59.999Z')
                    }
                },
                include: { user: { select: { full_name: true } } },
                orderBy: { updatedAt: 'desc' },
                take: 20
            });
            console.log("=== DB Record Inspection ===\n");
            records.forEach((r) => {
                var _a, _b, _c;
                console.log(`User: ${pad((_a = r.user) === null || _a === void 0 ? void 0 : _a.full_name, 20)} | Date: ${r.date.toISOString().substr(0, 10)} | In: ${((_b = r.check_in) === null || _b === void 0 ? void 0 : _b.toISOString()) || 'N/A'} | Out: ${((_c = r.check_out) === null || _c === void 0 ? void 0 : _c.toISOString()) || 'N/A'} | Method: ${r.method} | Status: ${r.status}`);
            });
        }
        finally {
            yield db.$disconnect();
        }
    });
}
function pad(str, len) {
    return (str || '').padEnd(len).substring(0, len);
}
inspectRecords().catch(console.error);
