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
exports.getPayrollHistory = exports.confirmPayrollRun = exports.savePayrollSlip = exports.getSalaryDraft = exports.deleteHoliday = exports.createHoliday = exports.listHolidays = void 0;
const payrollService = __importStar(require("./service"));
const listHolidays = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const holidays = yield payrollService.listHolidays();
        res.json(holidays);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.listHolidays = listHolidays;
const createHoliday = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, date, description } = req.body;
        const holiday = yield payrollService.createHoliday({
            name,
            date: new Date(date),
            description
        });
        res.status(201).json(holiday);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createHoliday = createHoliday;
const deleteHoliday = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield payrollService.deleteHoliday(id);
        res.json({ message: "Holiday deleted" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteHoliday = deleteHoliday;
// --- PAYROLL PROCESSING ---
const getSalaryDraft = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, month, year } = req.query;
        if (!userId || !month || !year) {
            return res.status(400).json({ message: "UserId, Month, and Year are required." });
        }
        const draft = yield payrollService.getSalaryDraft(userId, parseInt(month), parseInt(year));
        res.json(draft);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getSalaryDraft = getSalaryDraft;
const savePayrollSlip = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month, year, userId, data } = req.body;
        if (!userId || !month || !year || !data) {
            return res.status(400).json({ message: "Missing required fields." });
        }
        const slip = yield payrollService.savePayrollSlip(month, year, Object.assign(Object.assign({}, data), { user_id: userId }));
        res.json(slip);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.savePayrollSlip = savePayrollSlip;
const confirmPayrollRun = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month, year } = req.body;
        if (!month || !year) {
            return res.status(400).json({ message: "Month/Year required." });
        }
        const result = yield payrollService.confirmPayrollRun(month, year);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.confirmPayrollRun = confirmPayrollRun;
const getPayrollHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // TODO: Implement list of past runs
        res.json([]);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPayrollHistory = getPayrollHistory;
