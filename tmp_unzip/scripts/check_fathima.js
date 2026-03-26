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
function checkFathima() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log("--- Fathima Hasna K Mapping Check ---\n");
        const staff = yield db.staffProfile.findFirst({
            where: { staff_number: 'QIX0013' },
            include: { user: { select: { full_name: true } } }
        });
        if (staff) {
            console.log(`Staff Number: ${staff.staff_number}`);
            console.log(`Full Name:    ${(_a = staff.user) === null || _a === void 0 ? void 0 : _a.full_name}`);
            console.log(`Biometric ID: ${staff.biometric_device_id}`);
            if (staff.biometric_device_id === '13') {
                console.log("\nStatus: Mapping is correct (ID=13).");
            }
            else {
                console.log(`\nStatus: Mapping is INCORRECT or MISSING. Current ID: ${staff.biometric_device_id}, Expected: 13`);
            }
        }
        else {
            console.log("Staff QIX0013 not found in DB.");
        }
    });
}
checkFathima()
    .catch(console.error)
    .finally(() => db.$disconnect());
