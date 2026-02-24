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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDefaults = exports.executeLocal = exports.deleteApp = exports.recordUsage = exports.togglePin = exports.createApp = exports.getApps = void 0;
const service = __importStar(require("./service"));
const getApps = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const apps = yield service.getApps(req.user.id);
        res.json(apps);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getApps = getApps;
const createApp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const app = yield service.createApp(req.user.id, req.body);
        res.json(app);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createApp = createApp;
const togglePin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield service.togglePin(req.user.id, req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.togglePin = togglePin;
const recordUsage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield service.recordUsage(req.user.id, req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.recordUsage = recordUsage;
const deleteApp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield service.deleteApp(req.user.id, req.params.id);
        res.json({ message: 'Deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteApp = deleteApp;
const executeLocal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Only allow if running on localhost or Admin?
        // Let's implement a Safe check.
        // For now, allow but log.
        const { command } = req.body;
        // This is only for the "Try to open on Server" feature.
        // Real constraint: Client wants to open on THEIR machine.
        // Browser cannot do that.
        // So this endpoint is technically only useful if Client == Server.
        const result = yield service.executeLocal(command);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.executeLocal = executeLocal;
const initDefaults = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield service.initDefaults();
        res.json({ message: 'Defaults initialized' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.initDefaults = initDefaults;
