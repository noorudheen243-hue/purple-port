import prisma from '../utils/prisma';
import cron from 'node-cron';
import { sendSmartNotification } from '../modules/notifications/engine';
import { subDays, differenceInHours } from 'date-fns';

// --- HELPERS ---

const getAIRule = async (name: string) => {
    return await prisma.aINotificationRule.findUnique({
        where: { name }
    });
};

const createAlertLog = async (userId: string, type: 'WARNING' | 'CRITICAL' | 'INSIGHT', title: string, msg: string, reqAction: string, level: number = 1) => {
    return await prisma.aIAlertLog.create({
        data: {
            user_id: userId,
            alert_type: type,
            title,
            message: msg,
            suggestion: reqAction,
            escalation_level: level
        }
    });
};

const notifyAdminOrManager = async (managerId: string | null, title: string, msg: string, category: string) => {
    if (managerId) {
        await sendSmartNotification(managerId, category, title, msg, '/dashboard');
    } else {
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        for (const admin of admins) {
            await sendSmartNotification(admin.id, category, title, msg, '/dashboard');
        }
    }
};

const formatTemplate = (template: string, data: Record<string, any>) => {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    return result;
};

// --- CORE AI LOGIC ---

export const runTaskDelayDetection = async () => {
    console.log("[AI Engine] Scanning for Task Delays...");
    const now = new Date();
    
    // Level 1 Rule
    const ruleL1 = await getAIRule('Task Overdue Level 1');
    const ruleL2 = await getAIRule('Task Overdue Level 2 (Manager)');

    if (!ruleL1?.is_active && !ruleL2?.is_active) return;

    const delayedTasks = await prisma.task.findMany({
        where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
            due_date: { lt: now }
        },
        include: { assignee: { include: { staffProfile: true } } }
    });

    for (const task of delayedTasks) {
        if (!task.assignee_id) continue;
        
        const overdueDays = Math.floor((now.getTime() - new Date(task.due_date!).getTime()) / (1000 * 3600 * 24));
        const configL1 = JSON.parse(ruleL1?.config_json || '{"threshold_days":1}');
        const configL2 = JSON.parse(ruleL2?.config_json || '{"threshold_days":3}');

        if (ruleL2?.is_active && overdueDays >= configL2.threshold_days) {
            const managerId = task.assignee?.staffProfile?.reporting_manager_id || null;
            const msg = formatTemplate(ruleL2.message_template, { 
                task_name: task.title, 
                staff_name: task.assignee?.full_name, 
                delay_days: overdueDays 
            });
            
            await createAlertLog(task.assignee_id, 'CRITICAL', 'Task Escalation', msg, 'Intervention recommended.', 3);
            await notifyAdminOrManager(managerId, 'Task Escalation', msg, 'TASKS');
            await sendSmartNotification(task.assignee_id, 'TASKS', 'Critical Delay', msg, `/dashboard/tasks/${task.id}`);
        } 
        else if (ruleL1?.is_active && overdueDays >= configL1.threshold_days) {
            const msg = formatTemplate(ruleL1.message_template, { task_name: task.title });
            await createAlertLog(task.assignee_id, 'WARNING', 'Task Delay', msg, 'Prioritize completion.', 1);
            await sendSmartNotification(task.assignee_id, 'TASKS', 'Task Reminder', msg, `/dashboard/tasks/${task.id}`);
        }
    }
};

export const runAttendancePatternDetection = async () => {
    console.log("[AI Engine] Scanning Attendance Patterns...");
    const rule = await getAIRule('Attendance Pattern Warning');
    if (!rule || !rule.is_active) return;

    const config = JSON.parse(rule.config_json || '{"threshold_count":3, "period_days":7}');
    const periodStart = subDays(new Date(), config.period_days);
    
    // Simplified late logic
    const records = await prisma.attendanceRecord.findMany({
        where: { date: { gte: periodStart }, status: 'PRESENT', check_in: { not: null } }
    });
    
    const userLateCounts = new Map<string, number>();
    records.forEach(r => {
        const time = new Date(r.check_in!);
        if (time.getHours() > 10 || (time.getHours() === 10 && time.getMinutes() > 15)) {
            userLateCounts.set(r.user_id, (userLateCounts.get(r.user_id) || 0) + 1);
        }
    });

    for (const [userId, count] of userLateCounts.entries()) {
        if (count >= config.threshold_count) {
            const user = await prisma.user.findUnique({ where: { id: userId }, include: { staffProfile: true } });
            if (!user) continue;

            const msg = formatTemplate(rule.message_template, { late_count: count });
            await createAlertLog(userId, 'WARNING', 'Trend Detected', msg, 'Review punctuality.', 2);
            await sendSmartNotification(userId, 'ATTENDANCE', 'Pattern Alert', msg, '/dashboard/attendance');
            await notifyAdminOrManager(user.staffProfile?.reporting_manager_id || null, 'Late Trend', `${user.full_name} was late ${count} times recently.`, 'ATTENDANCE');
        }
    }
};

export const runPendingRequestCheck = async () => {
    console.log("[AI Engine] Scanning Pending Requests...");
    const rule = await getAIRule('Request Pending Alert');
    if (!rule || !rule.is_active) return;

    const config = JSON.parse(rule.config_json || '{"threshold_hours":24}');
    
    const pendingLeaves = await prisma.leaveRequest.findMany({
        where: { status: 'PENDING', createdAt: { lt: subDays(new Date(), config.threshold_hours / 24) } },
        include: { user: true }
    });

    for (const req of pendingLeaves) {
        const msg = formatTemplate(rule.message_template, { staff_name: req.user.full_name });
        // Notify Admins about the pending request
        await notifyAdminOrManager(null, 'Pending Leave Approval', msg, 'REQUESTS');
    }
};

export const runMoMFollowupScanner = async () => {
    console.log("[AI Engine] Scanning MoM Expiry...");
    const rule = await getAIRule('MoM Followup Alert');
    if (!rule || !rule.is_active) return;

    const config = JSON.parse(rule.config_json || '{"threshold_hours":24}');
    
    const meetings = await prisma.meeting.findMany({
        where: { 
            status: { not: 'CANCELLED' },
            mom: null,
            date: { lte: new Date() } 
        },
        include: { organizer: true }
    });

    for (const mtg of meetings) {
        const mtgDateTime = new Date(`${mtg.date.toISOString().slice(0,10)}T${mtg.time}`);
        if (differenceInHours(new Date(), mtgDateTime) >= config.threshold_hours) {
            const msg = formatTemplate(rule.message_template, { meeting_title: mtg.title });
            await createAlertLog(mtg.organizer_id, 'WARNING', 'MoM Missing', msg, 'Submit MoM immediately.', 2);
            await sendSmartNotification(mtg.organizer_id, 'MEETINGS', 'MoM Expired', msg, '/dashboard/meetings');
        }
    }
};

export const initAIEngine = () => {
    // Every 5 minutes for prompt local feedback
    cron.schedule('*/5 * * * *', async () => {
        try {
            await runTaskDelayDetection();
            await runAttendancePatternDetection();
            await runPendingRequestCheck();
            await runMoMFollowupScanner();
        } catch (e) {
            console.error("[AI Engine] Fatal:", e);
        }
    });
    console.log('🤖 AI Smart Notification Engine v2 Online.');
};
