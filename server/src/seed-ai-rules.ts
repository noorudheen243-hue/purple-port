import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DEFAULT_RULES = [
    { name: 'Task Overdue Level 1', trigger_type: 'TASK_DELAY', config_json: JSON.stringify({ threshold_days: 1 }), message_template: "Task '{task_name}' is pending beyond expected time. Please take action.", is_active: true },
    { name: 'Task Overdue Level 2 (Manager)', trigger_type: 'TASK_DELAY', config_json: JSON.stringify({ threshold_days: 3 }), message_template: "Urgent: '{task_name}' assigned to {staff_name} is delayed by {delay_days} days.", is_active: true },
    { name: 'Attendance Pattern Warning', trigger_type: 'ATTENDANCE_PATTERN', config_json: JSON.stringify({ threshold_count: 3, period_days: 7 }), message_template: "You have been marked late {late_count} times this week.", is_active: true },
    { name: 'Request Pending Alert', trigger_type: 'PENDING_REQUEST', config_json: JSON.stringify({ threshold_hours: 24 }), message_template: "A leave/regularization request by {staff_name} is pending for more than 24 hours.", is_active: true },
    { name: 'MoM Followup Alert', trigger_type: 'MEETING_FOLLOWUP', config_json: JSON.stringify({ threshold_hours: 24 }), message_template: "MoM for meeting '{meeting_title}' is pending over 24 hours.", is_active: true },
    { name: 'Payroll Reminder', trigger_type: 'PAYROLL', config_json: JSON.stringify({ expected_day: 1 }), message_template: "Payroll processing for the current cycle is pending.", is_active: true }
];

async function seed() {
    console.log('🌱 Seeding AI Notification Rules...');
    for (const rule of DEFAULT_RULES) {
        await prisma.aINotificationRule.upsert({
            where: { name: rule.name },
            update: {},
            create: rule
        });
        console.log(` - Rule '${rule.name}' ensured.`);
    }
    console.log('✅ AI Rules seeded successfully.');
}

seed()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
