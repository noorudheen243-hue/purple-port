import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const CREATIVE_CATEGORIES = {
    'Graphics Work': ['Poster', 'Carousel', 'Web Img', 'Other Graphics'],
    'Branding Works': ['Logo', 'Book', 'Mockups', 'Other Branding'],
    'Video Works': ['AI Video', 'Motion', 'Logo Anim', 'Corporate', 'Reel Edit', 'Podcast', 'Testimonial', 'Normal Video', 'Other Video'],
    'Printables': ['Brochure', 'Flyer', 'Flex', 'Van Ad', 'Biz Card', 'Letterhead', 'ID Card', 'Corp Profile', 'Catalogue', 'Menu', 'Other Print'],
    'Edu Project': ['Animated', 'Shoot', 'Other Edu']
};

const DEFAULT_TASK_TYPES = [
    // We will automatically flatten the categories and add group keys
];

// Helper to get all default keys (groups and types)
const getAllConfigKeys = () => {
    const keys = [];
    for (const [group, types] of Object.entries(CREATIVE_CATEGORIES)) {
        keys.push(`GROUP:${group}`);
        types.forEach(t => keys.push(t));
    }
    return keys;
};

export const getRates = async (req: Request, res: Response) => {
    try {
        let rates = await prisma.creativeServiceRate.findMany({
            orderBy: { task_type: 'asc' }
        });

        // Initialize defaults if they don't exist
        const allKeys = getAllConfigKeys();
        
        if (rates.length === 0) {
            const data = allKeys.map(type => ({
                task_type: type,
                standard_value: 0
            }));
            await prisma.creativeServiceRate.createMany({ data });
            rates = await prisma.creativeServiceRate.findMany({ orderBy: { task_type: 'asc' } });
        } else {
            // Check for missing defaults
            const existingTypes = new Set(rates.map(r => r.task_type));
            const missingTypes = allKeys.filter(t => !existingTypes.has(t));
            if (missingTypes.length > 0) {
                await prisma.creativeServiceRate.createMany({
                    data: missingTypes.map(type => ({ task_type: type, standard_value: 0 }))
                });
                rates = await prisma.creativeServiceRate.findMany({ orderBy: { task_type: 'asc' } });
            }
        }

        res.json(rates);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateRate = async (req: Request, res: Response) => {
    const { task_type, standard_value } = req.body;
    try {
        const existing = await prisma.creativeServiceRate.findUnique({ where: { task_type } });
        
        if (existing && existing.standard_value !== standard_value) {
            // Log history
            await prisma.creativeServiceRateHistory.create({
                data: {
                    task_type: existing.task_type,
                    standard_value: existing.standard_value,
                    effective_from: existing.effective_from,
                    effective_to: new Date(),
                    rate_id: existing.id
                }
            });
        }

        const updated = await prisma.creativeServiceRate.upsert({
            where: { task_type },
            update: {
                standard_value: Number(standard_value),
                effective_from: new Date()
            },
            create: {
                task_type,
                standard_value: Number(standard_value),
                effective_from: new Date()
            }
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getOverrides = async (req: Request, res: Response) => {
    try {
        const overrides = await prisma.creativeRateOverride.findMany({
            include: { client: true }
        });
        res.json(overrides);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const upsertOverride = async (req: Request, res: Response) => {
    const { client_id, task_type, override_value } = req.body;
    try {
        const override = await prisma.creativeRateOverride.upsert({
            where: { client_id_task_type: { client_id, task_type } },
            update: { override_value: Number(override_value) },
            create: {
                client_id,
                task_type,
                override_value: Number(override_value)
            }
        });
        res.json(override);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const calculatePerformance = async (req: Request, res: Response) => {
    const { from_date, to_date, employee_id, client_id, campaign_id, task_type } = req.body;

    try {
        // Build filters for tasks
        const filters: any = {
            status: 'COMPLETED',
            // Or 'APPROVED' if you have an approval flow. Requirements state "Completed + Approved"
            // The Task model might just have COMPLETED. We'll stick to COMPLETED for now.
        };

        if (from_date && to_date) {
            const start = new Date(from_date);
            const end = new Date(to_date);
            end.setHours(23, 59, 59, 999);
            
            filters.OR = [
                {
                    completed_date: {
                        gte: start,
                        lte: end
                    }
                },
                {
                    completed_date: null,
                    updatedAt: {
                        gte: start,
                        lte: end
                    }
                }
            ];
        }
        if (employee_id) filters.assignee_id = employee_id;
        if (client_id) filters.client_id = client_id;
        if (campaign_id) filters.campaign_id = campaign_id;
        if (task_type) filters.task_type = task_type; // Task model has task_type

        // Fetch completed tasks assigned to creative staff
        const tasks = await prisma.task.findMany({
            where: {
                ...filters,
                assignee: {
                    department: 'CREATIVE'
                }
            },
            include: {
                assignee: true,
                client: true,
                campaign: true,
                creative_revenue: true
            }
        });

        // Fetch current rates and overrides
        const rates = await prisma.creativeServiceRate.findMany();
        const overrides = await prisma.creativeRateOverride.findMany();

        const rateMap = new Map(rates.map(r => [r.task_type, r]));
        const overrideMap = new Map(overrides.map(o => [`${o.client_id}_${o.task_type}`, o]));

        const results = [];

        for (const task of tasks) {
            let appliedValue = 0;
            let overrideId = null;

            if (task.creative_revenue) {
                // Historically protected value
                appliedValue = task.creative_revenue.applied_value;
            } else {
                // Calculate new value
                const tType = task.task_type || 'Custom Content Type';
                const clientOverride = task.client_id ? overrideMap.get(`${task.client_id}_${tType}`) : null;

                if (clientOverride) {
                    appliedValue = clientOverride.override_value;
                    overrideId = clientOverride.id;
                } else {
                    const standardRate = rateMap.get(tType);
                    const groupKey = task.task_group ? `GROUP:${task.task_group}` : null;
                    const groupRate = groupKey ? rateMap.get(groupKey) : null;
                    
                    if (standardRate && standardRate.standard_value > 0) {
                        appliedValue = standardRate.standard_value;
                    } else if (groupRate && groupRate.standard_value > 0) {
                        appliedValue = groupRate.standard_value;
                    } else {
                        appliedValue = 0;
                    }
                }

                // Save to historical summary
                await prisma.creativeTaskRevenueSummary.create({
                    data: {
                        task_id: task.id,
                        applied_value: appliedValue,
                        effective_date: task.completed_date || new Date(),
                        client_override_id: overrideId
                    }
                });
            }

            results.push({
                ...task,
                revenue_value: appliedValue
            });
        }

        // Aggregate by employee
        const employeeStats = new Map();
        const categoryBreakdown: Record<string, number> = {};
        let totalRevenue = 0;
        let totalTasks = 0;

        for (const r of results) {
            totalRevenue += r.revenue_value;
            totalTasks++;
            
            const group = r.task_group || 'Uncategorized';
            categoryBreakdown[group] = (categoryBreakdown[group] || 0) + r.revenue_value;

            if (!r.assignee_id) continue;
            
            const empId = r.assignee_id;
            if (!employeeStats.has(empId)) {
                employeeStats.set(empId, {
                    employee: r.assignee,
                    task_counts: {},
                    total_revenue: 0,
                    total_tasks: 0,
                    tasks: []
                });
            }

            const stats = employeeStats.get(empId);
            stats.total_revenue += r.revenue_value;
            stats.total_tasks++;
            const tType = r.task_type || 'Custom Content Type';
            stats.task_counts[tType] = (stats.task_counts[tType] || 0) + 1;
            stats.tasks.push({
                id: r.id,
                title: r.title,
                task_type: tType,
                completed_date: r.completed_date,
                client: r.client?.name,
                revenue_value: r.revenue_value
            });
        }

        const employeeArray = Array.from(employeeStats.values());
        // Sort by revenue descending
        employeeArray.sort((a, b) => b.total_revenue - a.total_revenue);

        // Assign ranks
        employeeArray.forEach((emp, index) => emp.rank = index + 1);

        res.json({
            kpis: {
                total_revenue: totalRevenue,
                total_tasks: totalTasks,
                avg_revenue_per_task: totalTasks > 0 ? (totalRevenue / totalTasks) : 0,
                top_contributor: employeeArray.length > 0 ? employeeArray[0].employee : null
            },
            employee_performance: employeeArray,
            category_breakdown: categoryBreakdown,
            raw_tasks: results
        });

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
