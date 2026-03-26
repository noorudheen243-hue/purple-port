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
function updateFathimaTo15() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("--- Updating Fathima Hasna K Mapping to UID 15 ---\n");
        const staff = yield db.staffProfile.findFirst({
            where: { staff_number: 'QIX0013' }
        });
        if (staff) {
            yield db.staffProfile.update({
                where: { id: staff.id },
                data: { biometric_device_id: '15' }
            });
            console.log("SUCCESS: Biometric ID updated to '15'.");
        }
        else {
            console.log("ERROR: Staff QIX0013 not found in DB.");
        }
    });
}
updateFathimaTo15()
    .catch(console.error)
    .finally(() => db.$disconnect());
