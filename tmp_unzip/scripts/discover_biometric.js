"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const net = __importStar(require("net"));
function scanSubnet(subnet) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Scanning subnet ${subnet}.x for biometric devices on port 4370...`);
        const promises = [];
        for (let i = 1; i <= 254; i++) {
            const ip = `${subnet}.${i}`;
            promises.push(checkPort(ip, 4370, 500));
        }
        const results = yield Promise.all(promises);
        const activeIps = results.filter(r => r.active).map(r => r.ip);
        if (activeIps.length === 0) {
            console.log('No devices found on port 4370 in this subnet.');
            return;
        }
        console.log(`Found ${activeIps.length} potential devices:`, activeIps);
        for (const ip of activeIps) {
            console.log(`Testing connection to ${ip}...`);
            const zk = new zkteco_js_1.default(ip, 4370, 5000, 4000);
            try {
                yield zk.ztcp.createSocket();
                yield zk.ztcp.connect();
                console.log(`✅ SUCCESS: Biometric device found and connected at ${ip}`);
                const info = yield zk.getDeviceInfo();
                console.log('Device Info:', info);
                yield zk.disconnect();
            }
            catch (e) {
                console.log(`❌ Failed to connect to ${ip}:`, e.message);
            }
        }
    });
}
function checkPort(ip, port, timeout) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let status = false;
        socket.on('connect', () => {
            status = true;
            socket.destroy();
        });
        socket.on('timeout', () => {
            socket.destroy();
        });
        socket.on('error', () => {
            socket.destroy();
        });
        socket.on('close', () => {
            resolve({ ip, active: status });
        });
        socket.setTimeout(timeout);
        socket.connect(port, ip);
    });
}
// Based on ipconfig: 192.168.29.129
scanSubnet('192.168.29');
