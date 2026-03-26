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
exports.updateResignation = exports.deleteResignation = exports.completeResignation = exports.reviseNoticePeriod = exports.rejectResignation = exports.approveResignation = exports.listResignations = exports.getMyResignation = exports.applyResignation = void 0;
const zod_1 = require("zod");
const resignationService = __importStar(require("./service"));
// Schemas
const applySchema = zod_1.z.object({
    reason: zod_1.z.string().min(5, "Reason must be at least 5 characters"),
    requested_relieving_date: zod_1.z.string().transform(str => new Date(str))
});
const reviseSchema = zod_1.z.object({
    days: zod_1.z.number().min(0, "Days cannot be negative"), // 0 allows immediate relieve
    reason: zod_1.z.string().min(5, "Revision reason is required")
});
const rejectSchema = zod_1.z.object({
    reason: zod_1.z.string().min(5, "Rejection reason is required")
});
// Controllers
const applyResignation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reason, requested_relieving_date } = applySchema.parse(req.body);
        const result = yield resignationService.createResignationRequest(req.user.id, reason, requested_relieving_date);
        res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ message: error.errors });
        }
        else {
            res.status(500).json({ message: error.message });
        }
    }
});
exports.applyResignation = applyResignation;
const getMyResignation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield resignationService.getMyResignation(req.user.id);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMyResignation = getMyResignation;
const listResignations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Admin/Manager check already done by route middleware usually, but good to be safe
        const result = yield resignationService.getAllResignationRequests();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.listResignations = listResignations;
const approveResignation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { approved_relieving_date } = req.body;
        const result = yield resignationService.approveResignation(id, req.user.id, approved_relieving_date ? new Date(approved_relieving_date) : undefined);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.approveResignation = approveResignation;
const rejectResignation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { reason } = rejectSchema.parse(req.body);
        const result = yield resignationService.rejectResignation(id, req.user.id, reason);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.rejectResignation = rejectResignation;
const reviseNoticePeriod = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { days, reason } = reviseSchema.parse(req.body);
        const result = yield resignationService.reviseNoticePeriod(id, req.user.id, days, reason);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.reviseNoticePeriod = reviseNoticePeriod;
const completeResignation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield resignationService.completeResignation(id);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.completeResignation = completeResignation;
const deleteResignation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield resignationService.deleteResignationRequest(id);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteResignation = deleteResignation;
const updateResignation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield resignationService.updateResignationRequest(id, req.body);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateResignation = updateResignation;
