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
function wipeRegularisation() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Starting Regularisation Wipe...');
            // 1. Delete Attendance Records marked as 'REGULARISATION'
            // This effectively marks them as Absent (since no record = Absent logic)
            const deletedRecords = yield prisma.attendanceRecord.deleteMany({
                where: {
                    method: 'REGULARISATION'
                }
            });
            console.log(`Deleted ${deletedRecords.count} Attendance Records created via Regularisation.`);
            // 2. Delete all Regularisation Requests (History)
            const deletedRequests = yield prisma.regularisationRequest.deleteMany({});
            console.log(`Deleted ${deletedRequests.count} Regularisation Requests.`);
            console.log('Successfully wiped all regularization history.');
        }
        catch (error) {
            console.error('Error wiping regularisation:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
wipeRegularisation();
