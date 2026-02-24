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
exports.calculateIndividualKPI = exports.calculateTeamKPIs = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const calculateTeamKPIs = (month, year) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Date Range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    // 2. Fetch All Tasks in Range
    const tasks = yield prisma_1.default.task.findMany({
        where: {
            createdAt: { gte: startDate, lte: endDate },
            // Exclude Co-founders' tasks from Team Stats
            assignee: {
                staffProfile: {
                    staff_number: { notIn: ['QIX0001', 'QIX0002'] }
                }
            }
        }
    });
    if (tasks.length === 0) {
        return { totalTasks: 0, completed: 0, pending: 0, overdue: 0, completionRate: 0, onTimeRate: 0, productivityScore: 0, utilization: 0 };
    }
    // 3. Aggregate
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const pending = total - completed;
    const overdue = tasks.filter(t => t.sla_status === 'BREACHED' || (t.due_date && t.due_date < new Date() && t.status !== 'COMPLETED')).length;
    const completionRate = (completed / total) * 100;
    // On Time: Completed tasks where completed_date <= due_date
    const onTimeTasks = tasks.filter(t => {
        if (t.status !== 'COMPLETED' || !t.completed_date || !t.due_date)
            return false;
        return t.completed_date <= t.due_date;
    }).length;
    const onTimeRate = completed > 0 ? (onTimeTasks / completed) * 100 : 0;
    // Productivity Score (Simple Heuristic)
    // Weighted: 60% Completion Rate + 40% On-Time Rate
    const productivityScore = (completionRate * 0.6) + (onTimeRate * 0.4);
    return {
        totalTasks: total,
        completed,
        pending,
        overdue,
        completionRate: Math.round(completionRate),
        onTimeRate: Math.round(onTimeRate),
        productivityScore: Math.round(productivityScore),
        utilization: 0 // Need time logs for this
    };
});
exports.calculateTeamKPIs = calculateTeamKPIs;
const calculateIndividualKPI = (userId, month, year) => __awaiter(void 0, void 0, void 0, function* () {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const tasks = yield prisma_1.default.task.findMany({
        where: {
            assignee_id: userId,
            createdAt: { gte: startDate, lte: endDate }
        }
    });
    if (tasks.length === 0) {
        return { totalTasks: 0, completed: 0, pending: 0, overdue: 0, completionRate: 0, onTimeRate: 0, productivityScore: 0, utilization: 0 };
    }
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const pending = total - completed;
    const overdue = tasks.filter(t => t.sla_status === 'BREACHED' || (t.due_date && t.due_date < new Date() && t.status !== 'COMPLETED')).length;
    const completionRate = (completed / total) * 100;
    const onTimeTasks = tasks.filter(t => {
        if (t.status !== 'COMPLETED' || !t.completed_date || !t.due_date)
            return false;
        return t.completed_date <= t.due_date;
    }).length;
    const onTimeRate = completed > 0 ? (onTimeTasks / completed) * 100 : 0;
    const productivityScore = (completionRate * 0.6) + (onTimeRate * 0.4);
    // Utilization: Actual Time / Available Time (160h)
    // Fetch TimeLogs
    const timeLogs = yield prisma_1.default.timeLog.findMany({
        where: {
            user_id: userId,
            start_time: { gte: startDate, lte: endDate }
        }
    });
    const totalMinutes = timeLogs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0);
    const totalHours = totalMinutes / 60;
    const availableHours = 160;
    const utilization = Math.min((totalHours / availableHours) * 100, 100);
    return {
        totalTasks: total,
        completed,
        pending,
        overdue,
        completionRate: Math.round(completionRate),
        onTimeRate: Math.round(onTimeRate),
        productivityScore: Math.round(productivityScore),
        utilization: Math.round(utilization)
    };
});
exports.calculateIndividualKPI = calculateIndividualKPI;
