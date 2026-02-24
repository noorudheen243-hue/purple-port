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
function triggerManualSync() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Triggering Manual Sync...');
            const result = yield (0, biometric_service_1.syncBiometrics)();
            console.log('Sync Result:', result);
        }
        catch (error) {
            console.error('Error:', error);
        }
    });
}
triggerManualSync();
