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
function searchQIX0013() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const logs = yield biometric_service_1.biometricControl.getAttendanceLogs();
            const targetLogs = logs.filter((l) => {
                var _a, _b, _c;
                const id = String((_c = (_b = (_a = l.user_id) !== null && _a !== void 0 ? _a : l.userId) !== null && _b !== void 0 ? _b : l.deviceUserId) !== null && _c !== void 0 ? _c : l.uid);
                return id === 'QIX0013' || id === '13';
            });
            console.log(`Search result for QIX0013/13: Found ${targetLogs.length} logs.`);
            if (targetLogs.length > 0) {
                targetLogs.slice(0, 10).forEach((l, i) => {
                    var _a, _b, _c;
                    console.log(`${i + 1}. ID: ${(_c = (_b = (_a = l.user_id) !== null && _a !== void 0 ? _a : l.userId) !== null && _b !== void 0 ? _b : l.deviceUserId) !== null && _c !== void 0 ? _c : l.uid}, Time: ${l.record_time || l.recordTime || l.time}`);
                });
            }
            // List all unique IDs in the device
            const uniqueIds = Array.from(new Set(logs.map((l) => { var _a, _b, _c; return String((_c = (_b = (_a = l.user_id) !== null && _a !== void 0 ? _a : l.userId) !== null && _b !== void 0 ? _b : l.deviceUserId) !== null && _c !== void 0 ? _c : l.uid); })));
            console.log('\nUnique IDs in Device Logs:', uniqueIds.join(', '));
        }
        catch (error) {
            console.error('Error:', error);
        }
    });
}
searchQIX0013();
