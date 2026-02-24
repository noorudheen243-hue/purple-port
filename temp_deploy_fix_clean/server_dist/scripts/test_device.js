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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const zkteco_js_1 = __importDefault(require("zkteco-js"));
const DEVICE_IP = '192.168.1.201';
const DEVICE_PORT = 4370;
function testConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log('=== Biometric Device Connection Test ===');
        console.log(`Target: ${DEVICE_IP}:${DEVICE_PORT}`);
        console.log('');
        const zk = new zkteco_js_1.default(DEVICE_IP, DEVICE_PORT, 10000, 4000);
        try {
            console.log('[1/4] Creating socket...');
            yield zk.ztcp.createSocket();
            console.log('✓ Socket created');
            console.log('[2/4] Attempting TCP connection...');
            yield zk.ztcp.connect();
            console.log('✓ TCP connected');
            zk.connectionType = 'tcp';
            console.log('[3/4] Fetching device info...');
            const deviceName = yield zk.getDeviceName();
            console.log(`✓ Device Name: ${deviceName}`);
            console.log('[4/4] Fetching attendance logs...');
            const logs = yield zk.getAttendances();
            console.log(`✓ Found ${((_a = logs === null || logs === void 0 ? void 0 : logs.data) === null || _a === void 0 ? void 0 : _a.length) || 0} logs`);
            console.log('');
            console.log('=== CONNECTION SUCCESSFUL ===');
            yield zk.disconnect();
            process.exit(0);
        }
        catch (error) {
            console.error('');
            console.error('=== CONNECTION FAILED ===');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            try {
                yield zk.disconnect();
            }
            catch (e) { }
            process.exit(1);
        }
    });
}
testConnection();
