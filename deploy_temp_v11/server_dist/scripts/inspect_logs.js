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
function inspectLogs() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Fetching logs for inspection...');
            const logs = yield biometric_service_1.biometricControl.getAttendanceLogs();
            console.log(`Fetched ${logs.length} logs.`);
            console.log('\nFirst 20 Logs Detail:');
            logs.slice(0, 20).forEach((l, i) => {
                var _a, _b, _c;
                console.log(`${i + 1}. UID/UserID: ${(_c = (_b = (_a = l.user_id) !== null && _a !== void 0 ? _a : l.userId) !== null && _b !== void 0 ? _b : l.deviceUserId) !== null && _c !== void 0 ? _c : l.uid}, Time: ${l.record_time || l.recordTime || l.time}`);
            });
            const uid13Logs = logs.filter((l) => { var _a, _b, _c; return String((_c = (_b = (_a = l.user_id) !== null && _a !== void 0 ? _a : l.userId) !== null && _b !== void 0 ? _b : l.deviceUserId) !== null && _c !== void 0 ? _c : l.uid) === '13'; });
            console.log(`\nFound ${uid13Logs.length} logs for UID 13.`);
            if (uid13Logs.length > 0) {
                console.log('First 5 logs for UID 13:');
                uid13Logs.slice(0, 5).forEach((l) => {
                    console.log(`- Time: ${l.record_time || l.recordTime || l.time}`);
                });
            }
        }
        catch (error) {
            console.error('Error:', error);
        }
    });
}
inspectLogs();
