import prisma from '../../utils/prisma';
import { startOfMonth, subMonths } from 'date-fns';

export const getManagerStats = async () => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const lastMonthStart = subMonths(currentMonthStart, 1);

    // Active Campaigns
    const activeCampaigns = await prisma.campaign.count({
        where: {
            status: { not: 'COMPLETED' }, // Assuming 'COMPLETED' is a status, though schema default is 'PLANNING'
            end_date: { gte: today }
        }
    });

    // Pending Reviews (Tasks in REVIEW)
    const pendingReviews = await prisma.task.count({
        where: { status: 'REVIEW' }
    });

    // Monthly Budget (Sum of budget of active campaigns overlapping this month)
    // Simplified: Sum of budgets of campaigns starting after currentMonthStart
    const campaignsThisMonth = await prisma.campaign.findMany({
        where: {
            start_date: { gte: currentMonthStart }
        },
        select: { budget: true }
    });
    const monthlyBudget = campaignsThisMonth.reduce((acc, curr) => acc + (curr.budget || 0), 0);

    // Productivity: Completed Tasks Count This Month
    const completedTasksThisMonth = await prisma.task.count({
        where: {
            status: 'COMPLETED',
            updatedAt: { gte: currentMonthStart } // Best proxy for completion date if completed_date is null
        }
    });

    return {
        activeCampaigns,
        pendingReviews,
        monthlyBudget,
        completedTasksThisMonth
    };
};

export const getTeamPerformanceStats = async (department?: string, startDate?: Date, endDate?: Date) => {
    // 1. Fetch Staff (Creative, Marketing, SEO)
    const targetDepartments = ['CREATIVE', 'MARKETING', 'WEB_SEO'];
    const whereUser: any = {
        department: { in: targetDepartments },
        role: { not: 'ADMIN' },
        staffProfile: {
            staff_number: { notIn: ['QIX0001', 'QIX0002'] }
        }
    };

    const staff = await prisma.user.findMany({
        where: whereUser,
        select: {
            id: true,
            full_name: true,
            role: true,
            department: true,
            avatar_url: true,
            staffProfile: {
                select: { designation: true }
            }
        }
    });

    const staffIds = staff.map(u => u.id);

    // 2. Fetch Tasks (Filter by Date if provided)
    // We want tasks ASSIGNED TO (assignee_id) the creative staff (Workload View)
    const whereTask: any = {
        assignee_id: { in: staffIds }
    };

    if (startDate && endDate) {
        whereTask.createdAt = {
            gte: startDate,
            lte: endDate
        };
    }

    const tasks = await prisma.task.findMany({
        where: whereTask,
        select: {
            id: true,
            assignee_id: true, // The "Assignee"
            status: true,
            nature: true,
            sla_status: true,
            type: true,
            estimated_hours: true,
            actual_time_minutes: true,
            priority: true
        }
    });

    // 3. Aggregate Data per User (Assignee)
    const performanceData = staff.map(user => {
        // Tasks assigned to this user
        const userTasks = tasks.filter(t => t.assignee_id === user.id);
        const totalTasks = userTasks.length;

        // A. Volume Metrics
        const completedTasks = userTasks.filter(t => t.status === 'COMPLETED').length;
        const pendingTasks = userTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'PLANNED').length;
        const reviewTasks = userTasks.filter(t => t.status === 'REVIEW').length;

        // B. Quality Metrics
        const reworkTasks = userTasks.filter(t => t.nature === 'REWORK').length;
        const slaBreaches = userTasks.filter(t => t.sla_status === 'BREACHED').length;
        const reworkRate = totalTasks > 0 ? (reworkTasks / totalTasks) * 100 : 0;

        // C. Efficiency Metrics (Hours)
        let totalEstHours = 0;
        let totalActHours = 0;
        userTasks.forEach(t => {
            totalEstHours += t.estimated_hours || 0;
            totalActHours += (t.actual_time_minutes || 0) / 60;
        });

        // D. Task Type Distribution
        const taskTypes: Record<string, number> = {};
        userTasks.forEach(t => {
            const type = t.type || 'Generic';
            taskTypes[type] = (taskTypes[type] || 0) + 1;
        });

        // E. Productivity Score Calculation
        const completionRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;
        const completionScore = completionRatio * 100;

        const qualityPenalty = (reworkTasks * 10) + (slaBreaches * 15);
        const qualityScore = Math.max(0, 100 - qualityPenalty);

        let efficiencyScore = 50;
        if (totalActHours > 0) {
            const ratio = totalEstHours / totalActHours;
            efficiencyScore = Math.min(100, ratio * 50);
        }

        const finalScore = Math.round(
            (completionScore * 0.5) +
            (qualityScore * 0.3) +
            (efficiencyScore * 0.2)
        );

        return {
            id: user.id,
            name: user.full_name,
            role: user.role,
            designation: user.staffProfile?.designation || user.role.replace(/_/g, ' '),
            department: user.department,
            avatar: user.avatar_url,

            metrics: {
                total: totalTasks,
                completed: completedTasks,
                pending: pendingTasks,
                review: reviewTasks,
                rework: reworkTasks,
                reworkRate: Math.round(reworkRate),
                slaBreaches
            },

            time: {
                estimated: parseFloat(totalEstHours.toFixed(1)),
                actual: parseFloat(totalActHours.toFixed(1))
            },

            taskTypes,
            productivityScore: finalScore
        };
    });

    // Sort by Productivity Score descending
    return performanceData.sort((a, b) => b.productivityScore - a.productivityScore);
};

export const getAttendanceStats = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get all active employees to calculate total expected vs present
    // Group by department
    // We need: Department Name, Present Count, Total Count (optional but good for %), Absent Count

    // 1. Get Today's Attendance Records
    const attendanceRecords = await prisma.attendanceRecord.findMany({
        where: {
            date: {
                gte: todayStart,
                lte: todayEnd
            },
            status: { in: ['PRESENT', 'WFH', 'HALF_DAY'] },
            check_in: { not: null }, // STRICT FILTER: Only count if actually punched in
            // Exclude Co-Founders by ID (Safer than nested StaffProfile relation)
            user_id: { notIn: ['9c2c3b09-1a4d-4e9f-a00a-fdcae89806a1', '0f602110-d76e-4f21-8bcf-c71959dd4015'] }
        },
        include: {
            user: {
                select: { department: true }
            }
        }
    });

    // 2. Aggregate counts by Department
    const departmentCounts: Record<string, number> = {
        'CREATIVE': 0,
        'MARKETING': 0,
        'WEB': 0, // Should map WEB_SEO to this
        'MANAGEMENT': 0
    };

    attendanceRecords.forEach(record => {
        let dept = record.user.department || 'OTHER';
        if (dept === 'WEB_SEO') dept = 'WEB'; // Map WEB_SEO to WEB

        if (departmentCounts[dept] !== undefined) {
            departmentCounts[dept]++;
        }
    });

    return [
        {
            department: 'Creative Team',
            count: departmentCounts['CREATIVE'],
            // Box: Purple, Value: Yellow, Text: White
            styles: {
                card: 'bg-primary', // Purple
                text: 'text-white',
                value: 'text-yellow-400',
                label: 'text-white/80' // Slightly muted white for label
            }
        },
        {
            department: 'Digital Marketing',
            count: departmentCounts['MARKETING'],
            // Box: Yellow, Value: Purple, Text: Black
            styles: {
                card: 'bg-secondary', // Yellow
                text: 'text-black',
                value: 'text-primary', // Purple
                label: 'text-black/70'
            }
        },
        {
            department: 'SEO & Web',
            count: departmentCounts['WEB'],
            // Box: Purple, Value: Yellow, Text: White
            styles: {
                card: 'bg-primary',
                text: 'text-white',
                value: 'text-yellow-400',
                label: 'text-white/80'
            }
        },
        {
            department: 'Management',
            count: departmentCounts['MANAGEMENT'],
            // Box: Yellow, Value: Purple, Text: Black
            styles: {
                card: 'bg-secondary',
                text: 'text-black',
                value: 'text-primary',
                label: 'text-black/70'
            }
        }
    ];
};

export const getCreativeTeamMetrics = async () => {
    // 1. Creative Team Users
    const creatives = await prisma.user.findMany({
        where: { department: 'CREATIVE' },
        select: { id: true }
    });
    const creativeIds = creatives.map(c => c.id);

    // 2. Task Counts
    const totalTasks = await prisma.task.count({
        where: { assignee_id: { in: creativeIds } }
    });

    const completedTasks = await prisma.task.count({
        where: { assignee_id: { in: creativeIds }, status: 'COMPLETED' }
    });

    const wipTasks = await prisma.task.count({
        where: { assignee_id: { in: creativeIds }, status: 'IN_PROGRESS' }
    });

    const reviewTasks = await prisma.task.count({
        where: { assignee_id: { in: creativeIds }, status: 'REVIEW' }
    });

    const plannedTasks = await prisma.task.count({
        where: { assignee_id: { in: creativeIds }, status: 'PLANNED' }
    });

    return {
        total: totalTasks,
        completed: completedTasks,
        wip: wipTasks,
        review: reviewTasks,
        planned: plannedTasks,
        pieChartData: [
            { name: 'Completed', value: completedTasks, fill: '#10b981' }, // Green
            { name: 'In Progress', value: wipTasks, fill: '#3b82f6' },     // Blue
            { name: 'Review', value: reviewTasks, fill: '#f59e0b' },       // Yellow
            { name: 'Planned', value: plannedTasks, fill: '#94a3b8' }      // Slate
        ]
    };
};
