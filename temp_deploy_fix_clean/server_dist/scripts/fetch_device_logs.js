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
function fetchDeviceLogs() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Fetching logs from device...');
            const logs = yield biometric_service_1.biometricControl.getAttendanceLogs();
            console.log(`Fetched ${logs.length} logs.`);
            const today = new Date();
            const todayLogs = logs.filter((l) => {
                const logDate = new Date(l.recordTime || l.record_time);
                return logDate.getDate() === today.getDate() &&
                    logDate.getMonth() === today.getMonth() &&
                    logDate.getFullYear() === today.getFullYear();
            });
            console.log(`Found ${todayLogs.length} logs for TODAY (${today.toDateString()}):`);
            if (todayLogs.length > 0) {
                console.log('Log Keys:', Object.keys(todayLogs[0]));
            }
            todayLogs.forEach((l) => {
                console.log(`User ID: ${l.user_id} (Type: ${typeof l.user_id}) | Time: ${l.recordTime || l.record_time}`);
            });
        }
        catch (error) {
            console.error('Error:', error);
        }
    });
}
fetchDeviceLogs();
