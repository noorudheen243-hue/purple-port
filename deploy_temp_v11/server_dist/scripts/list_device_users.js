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
const biometric_service_1 = require("../modules/attendance/biometric.service");
function listDeviceUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Fetching users from device...');
            const result = yield biometric_service_1.biometricControl.getDeviceUsers();
            const users = result.data;
            console.log(`\nFound ${users.length} users on device.`);
            console.log(pad("UID", 10) + " | " + pad("UserID", 15) + " | " + pad("Name", 20));
            console.log("-".repeat(50));
            users.forEach((u) => {
                console.log(pad(String(u.uid), 10) + " | " + pad(String(u.userId), 15) + " | " + pad(String(u.name), 20));
            });
        }
        catch (error) {
            console.error('Error:', error);
        }
    });
}
function pad(str, len) {
    return (str || '').padEnd(len).substring(0, len);
}
listDeviceUsers();
