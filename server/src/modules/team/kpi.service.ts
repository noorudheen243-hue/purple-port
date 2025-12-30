import prisma from '../../utils/prisma';

export interface KPIMetrics {
    totalTasks: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
    onTimeRate: number;
    productivityScore: number; // 0-100
    utilization: number; // % of available hours (160h/mo)
}

export const calculateTeamKPIs = async (month: number, year: number): Promise<KPIMetrics> => {
    // 1. Date Range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // 2. Fetch All Tasks in Range
    const tasks = await prisma.task.findMany({
        where: {
            createdAt: { gte: startDate, lte: endDate },
            // Or should we count tasks updated/completed in this month?
            // "Task deadlines & completion dates" 
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
        if (t.status !== 'COMPLETED' || !t.completed_date || !t.due_date) return false;
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
};

export const calculateIndividualKPI = async (userId: string, month: number, year: number): Promise<KPIMetrics> => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const tasks = await prisma.task.findMany({
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
        if (t.status !== 'COMPLETED' || !t.completed_date || !t.due_date) return false;
        return t.completed_date <= t.due_date;
    }).length;

    const onTimeRate = completed > 0 ? (onTimeTasks / completed) * 100 : 0;
    const productivityScore = (completionRate * 0.6) + (onTimeRate * 0.4);

    // Utilization: Actual Time / Available Time (160h)
    // Fetch TimeLogs
    const timeLogs = await prisma.timeLog.findMany({
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
};
