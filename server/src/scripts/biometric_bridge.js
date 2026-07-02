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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
var zkteco_js_1 = __importDefault(require("zkteco-js"));
var axios_1 = __importDefault(require("axios"));
// --- CONFIGURATION ---
var DEVICE_IP = '192.168.1.201'; // Local Device IP
var DEVICE_PORT = 4370;
var SERVER_URL = 'https://qixport.com/api'; // Live VPS Backend URL
var BRIDGE_API_KEY = 'ag_bio_sync_v1_secret_key'; // Matches server .env
// ---------------------
var sleep = function (ms) { return new Promise(function (r) { return setTimeout(r, ms); }); };
var consecutiveFailures = 0;
function sync() {
    return __awaiter(this, void 0, void 0, function () {
        var zk, logsResp, data, cleanLogs, deviceUsers, usersResp, e_1, skipped, apiErr_1, BATCH_SIZE, i, chunk, resp, msg, apiErr_2, err_1, _1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    zk = new zkteco_js_1.default(DEVICE_IP, DEVICE_PORT, 10000, 4000);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 19, 20, 24]);
                    // Robust TCP Connection with 10s Timeout
                    return [4 /*yield*/, zk.ztcp.createSocket()];
                case 2:
                    // Robust TCP Connection with 10s Timeout
                    _b.sent();
                    return [4 /*yield*/, Promise.race([
                            zk.ztcp.connect(),
                            new Promise(function (_, rej) { return setTimeout(function () { return rej(new Error('Connection Timeout')); }, 10000); })
                        ])];
                case 3:
                    _b.sent();
                    zk.connectionType = 'tcp';
                    consecutiveFailures = 0; // Reset on success
                    return [4 /*yield*/, Promise.race([
                            zk.getAttendances(),
                            new Promise(function (_, rej) { return setTimeout(function () { return rej(new Error('Timeout fetching logs')); }, 20000); })
                        ])];
                case 4:
                    logsResp = _b.sent();
                    data = (logsResp === null || logsResp === void 0 ? void 0 : logsResp.data) || [];
                    if (data.length === 0) {
                        console.log("[".concat(ts(), "] \uD83D\uDCA4 Device Online. No logs on device."));
                        return [2 /*return*/];
                    }
                    cleanLogs = data.map(function (l) {
                        var _a, _b, _c, _d;
                        var rt = l.recordTime || l.record_time || l.time || new Date();
                        if (rt instanceof Date) {
                            var pad = function (n) { return n.toString().padStart(2, '0'); };
                            rt = "".concat(rt.getFullYear(), "-").concat(pad(rt.getMonth() + 1), "-").concat(pad(rt.getDate()), "T").concat(pad(rt.getHours()), ":").concat(pad(rt.getMinutes()), ":").concat(pad(rt.getSeconds()));
                        }
                        return {
                            // Try every known field name for user identifier
                            user_id: String((_d = (_c = (_b = (_a = l.user_id) !== null && _a !== void 0 ? _a : l.userId) !== null && _b !== void 0 ? _b : l.deviceUserId) !== null && _c !== void 0 ? _c : l.uid) !== null && _d !== void 0 ? _d : ''),
                            // Send explicit local digits without timezone marker
                            record_time: rt,
                        };
                    }).filter(function (l) { return l.user_id && l.user_id !== ''; });
                    console.log("[".concat(ts(), "] \uD83D\uDCE4 Found ").concat(data.length, " raw logs (").concat(cleanLogs.length, " valid). Uploading..."));
                    deviceUsers = [];
                    _b.label = 5;
                case 5:
                    _b.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, Promise.race([
                            zk.getUsers(),
                            new Promise(function (_, rej) { return setTimeout(function () { return rej(new Error('Timeout fetching users')); }, 10000); })
                        ])];
                case 6:
                    usersResp = _b.sent();
                    deviceUsers = (usersResp === null || usersResp === void 0 ? void 0 : usersResp.data) || [];
                    return [3 /*break*/, 8];
                case 7:
                    e_1 = _b.sent();
                    console.warn("[".concat(ts(), "] \u26A0\uFE0F  Could not fetch users:"), e_1.message);
                    return [3 /*break*/, 8];
                case 8:
                    skipped = data.length - cleanLogs.length;
                    if (skipped > 0) {
                        console.warn("[".concat(ts(), "] \u26A0\uFE0F  ").concat(skipped, " logs skipped (missing user_id). Raw sample:"), JSON.stringify(data[0]));
                    }
                    if (!(deviceUsers.length > 0)) return [3 /*break*/, 12];
                    _b.label = 9;
                case 9:
                    _b.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, axios_1.default.post("".concat(SERVER_URL, "/attendance/biometric/bridge/upload-users"), { users: deviceUsers }, {
                            headers: {
                                'x-api-key': BRIDGE_API_KEY,
                                'Content-Type': 'application/json'
                            },
                            timeout: 10000
                        })];
                case 10:
                    _b.sent();
                    console.log("[".concat(ts(), "] \uD83D\uDC65 Uploaded ").concat(deviceUsers.length, " enrolled users to bridge cache."));
                    return [3 /*break*/, 12];
                case 11:
                    apiErr_1 = _b.sent();
                    console.error("[".concat(ts(), "] \u274C User Upload Failed:"), apiErr_1.message);
                    return [3 /*break*/, 12];
                case 12:
                    BATCH_SIZE = 500;
                    i = 0;
                    _b.label = 13;
                case 13:
                    if (!(i < cleanLogs.length)) return [3 /*break*/, 18];
                    chunk = cleanLogs.slice(i, i + BATCH_SIZE);
                    _b.label = 14;
                case 14:
                    _b.trys.push([14, 16, , 17]);
                    return [4 /*yield*/, axios_1.default.post("".concat(SERVER_URL, "/attendance/biometric/bridge/upload"), { logs: chunk }, {
                            headers: {
                                'x-api-key': BRIDGE_API_KEY,
                                'Content-Type': 'application/json'
                            },
                            timeout: 15000
                        })];
                case 15:
                    resp = _b.sent();
                    msg = ((_a = resp.data) === null || _a === void 0 ? void 0 : _a.message) || 'OK';
                    console.log("[".concat(ts(), "] \u2705 Batch ").concat(Math.floor(i / BATCH_SIZE) + 1, ": ").concat(msg));
                    return [3 /*break*/, 17];
                case 16:
                    apiErr_2 = _b.sent();
                    console.error("[".concat(ts(), "] \u274C Upload Failed (batch ").concat(Math.floor(i / BATCH_SIZE) + 1, "):"), apiErr_2.message);
                    if (apiErr_2.response)
                        console.error('  Server:', apiErr_2.response.status, JSON.stringify(apiErr_2.response.data));
                    return [3 /*break*/, 17];
                case 17:
                    i += BATCH_SIZE;
                    return [3 /*break*/, 13];
                case 18: return [3 /*break*/, 24];
                case 19:
                    err_1 = _b.sent();
                    consecutiveFailures++;
                    console.error("[".concat(ts(), "] \u26A0\uFE0F  Device Error (attempt #").concat(consecutiveFailures, "):"), err_1.message || 'Unknown');
                    if (consecutiveFailures === 3) {
                        console.error("\n[".concat(ts(), "] \uD83D\uDD34 Device offline for 3 consecutive attempts!"));
                        console.error('  Check: Is this PC on the same network as the biometric device?');
                        console.error("  Device IP: ".concat(DEVICE_IP, ":").concat(DEVICE_PORT, "\n"));
                    }
                    return [3 /*break*/, 24];
                case 20:
                    _b.trys.push([20, 22, , 23]);
                    return [4 /*yield*/, zk.disconnect()];
                case 21:
                    _b.sent();
                    return [3 /*break*/, 23];
                case 22:
                    _1 = _b.sent();
                    return [3 /*break*/, 23];
                case 23: return [7 /*endfinally*/];
                case 24: return [2 /*return*/];
            }
        });
    });
}
function executeRemoteCommand(cmd) {
    return __awaiter(this, void 0, void 0, function () {
        var id, command, paramsStr, zk, status, resultJson, params, _a, uid, deleteUid, _2, e_2, _3, reportErr_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    id = cmd.id, command = cmd.command, paramsStr = cmd.params;
                    console.log("[".concat(ts(), "] \uD83E\uDD16 Executing Remote Command: ").concat(command, "..."));
                    zk = new zkteco_js_1.default(DEVICE_IP, DEVICE_PORT, 20000, 4000);
                    status = 'SUCCESS';
                    resultJson = {};
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 21, 22, 29]);
                    // Robust TCP Connection with 10s Timeout
                    return [4 /*yield*/, zk.ztcp.createSocket()];
                case 2:
                    // Robust TCP Connection with 10s Timeout
                    _b.sent();
                    return [4 /*yield*/, Promise.race([
                            zk.ztcp.connect(),
                            new Promise(function (_, rej) { return setTimeout(function () { return rej(new Error('Connection Timeout')); }, 10000); })
                        ])];
                case 3:
                    _b.sent();
                    zk.connectionType = 'tcp';
                    params = paramsStr ? JSON.parse(paramsStr) : {};
                    _a = command;
                    switch (_a) {
                        case 'RESTART': return [3 /*break*/, 4];
                        case 'SYNC_TIME': return [3 /*break*/, 6];
                        case 'CLEAR_LOGS': return [3 /*break*/, 8];
                        case 'SET_USER': return [3 /*break*/, 10];
                        case 'DELETE_USER': return [3 /*break*/, 12];
                        case 'FORCE_SYNC': return [3 /*break*/, 14];
                    }
                    return [3 /*break*/, 19];
                case 4: return [4 /*yield*/, zk.executeCmd(8)];
                case 5:
                    _b.sent(); // CMD_RESTART
                    resultJson = { message: 'Restart command sent.' };
                    return [3 /*break*/, 20];
                case 6: return [4 /*yield*/, zk.setTime(new Date())];
                case 7:
                    _b.sent();
                    resultJson = { message: 'Device time synchronized.' };
                    return [3 /*break*/, 20];
                case 8: return [4 /*yield*/, zk.clearAttendanceLog()];
                case 9:
                    _b.sent();
                    resultJson = { message: 'Logs cleared successfully.' };
                    return [3 /*break*/, 20];
                case 10:
                    uid = params.uid || (params.userId ? parseInt(params.userId.replace(/\D/g, '')) : 0);
                    if (!uid)
                        throw new Error('Missing UID for SET_USER');
                    return [4 /*yield*/, zk.setUser(uid, params.userId, params.name, params.password || '', params.role || 0, params.cardno || 0)];
                case 11:
                    _b.sent();
                    resultJson = { message: "User ".concat(params.userId, " set/updated.") };
                    return [3 /*break*/, 20];
                case 12:
                    deleteUid = parseInt(params.userId.replace(/\D/g, ''));
                    if (!deleteUid)
                        throw new Error('Missing UID for DELETE_USER');
                    return [4 /*yield*/, zk.deleteUser(deleteUid)];
                case 13:
                    _b.sent();
                    resultJson = { message: "User ".concat(params.userId, " deleted.") };
                    return [3 /*break*/, 20];
                case 14:
                    _b.trys.push([14, 16, , 17]);
                    return [4 /*yield*/, zk.disconnect()];
                case 15:
                    _b.sent();
                    return [3 /*break*/, 17];
                case 16:
                    _2 = _b.sent();
                    return [3 /*break*/, 17];
                case 17: return [4 /*yield*/, sync()];
                case 18:
                    _b.sent();
                    resultJson = { message: 'Force sync executed successfully.' };
                    return [3 /*break*/, 20];
                case 19: throw new Error("Command \"".concat(command, "\" not implemented in bridge."));
                case 20:
                    console.log("[".concat(ts(), "] \u2705 Command Success: ").concat(command));
                    return [3 /*break*/, 29];
                case 21:
                    e_2 = _b.sent();
                    status = 'FAILED';
                    resultJson = { error: e_2.message || 'Unknown device error' };
                    console.error("[".concat(ts(), "] \u274C Command Failed: ").concat(command), e_2.message);
                    return [3 /*break*/, 29];
                case 22:
                    _b.trys.push([22, 24, , 25]);
                    return [4 /*yield*/, zk.disconnect()];
                case 23:
                    _b.sent();
                    return [3 /*break*/, 25];
                case 24:
                    _3 = _b.sent();
                    return [3 /*break*/, 25];
                case 25:
                    _b.trys.push([25, 27, , 28]);
                    return [4 /*yield*/, axios_1.default.post("".concat(SERVER_URL, "/attendance/biometric/bridge/command-result"), { id: id, status: status, result: JSON.stringify(resultJson) }, {
                            headers: { 'x-api-key': BRIDGE_API_KEY },
                            timeout: 10000
                        })];
                case 26:
                    _b.sent();
                    return [3 /*break*/, 28];
                case 27:
                    reportErr_1 = _b.sent();
                    console.error("[".concat(ts(), "] \u274C Failed to report result to server:"), reportErr_1.message);
                    return [3 /*break*/, 28];
                case 28: return [7 /*endfinally*/];
                case 29: return [2 /*return*/];
            }
        });
    });
}
function heartbeat() {
    return __awaiter(this, void 0, void 0, function () {
        var resp, commands, _i, commands_1, cmd, e_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, axios_1.default.post("".concat(SERVER_URL, "/attendance/biometric/bridge/heartbeat"), {}, {
                            headers: {
                                'x-api-key': BRIDGE_API_KEY,
                                'Content-Type': 'application/json'
                            },
                            timeout: 10000
                        })];
                case 1:
                    resp = _b.sent();
                    commands = ((_a = resp.data) === null || _a === void 0 ? void 0 : _a.commands) || [];
                    if (!(commands.length > 0)) return [3 /*break*/, 6];
                    console.log("[".concat(ts(), "] \uD83D\uDCE5 Heartbeat: Found ").concat(commands.length, " pending commands."));
                    _i = 0, commands_1 = commands;
                    _b.label = 2;
                case 2:
                    if (!(_i < commands_1.length)) return [3 /*break*/, 5];
                    cmd = commands_1[_i];
                    return [4 /*yield*/, executeRemoteCommand(cmd)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 6];
                case 6: return [3 /*break*/, 8];
                case 7:
                    e_3 = _b.sent();
                    console.error("[".concat(ts(), "] \uD83D\uDC94 Heartbeat failed:"), e_3.message);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function ts() {
    return new Date().toLocaleTimeString('en-IN');
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('\n===================================================');
                    console.log('  Antigravity Biometric Bridge Agent (v2.0)');
                    console.log("  Target Device: ".concat(DEVICE_IP, ":").concat(DEVICE_PORT));
                    console.log("  Source Server: ".concat(SERVER_URL));
                    console.log('  Mode: Bidirectional (Sync + Remote Management)');
                    console.log('===================================================\n');
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 5];
                    // 1. Send Heartbeat and Process Remote Commands
                    return [4 /*yield*/, heartbeat()];
                case 2:
                    // 1. Send Heartbeat and Process Remote Commands
                    _a.sent();
                    // 2. Sync Logs
                    return [4 /*yield*/, sync()];
                case 3:
                    // 2. Sync Logs
                    _a.sent();
                    // Wait 30 seconds before next cycle
                    return [4 /*yield*/, sleep(30000)];
                case 4:
                    // Wait 30 seconds before next cycle
                    _a.sent();
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/];
            }
        });
    });
}
main();
