import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const idsToDelete = [
    '7a3b5d83-6f1f-49b4-b52b-fc4fce876b89', // Admin User
    'd1511158-2c99-4a08-ae73-14bfeb209512', // Sali
    '6a71cb3f-0fb5-4c2e-90d2-bc88304d5536', // Admin User Updated
    '481e9b58-88b1-4470-9016-aeade9c2798e', // Admin User
    'a667f57b-7d6e-4296-87a8-d479ca9dc1b8', // Deleted User
    'ecd0e572-e055-4f20-84e6-7d2b60fed47f'  // Arjun (Duplicate)
];

async function main() {
    console.log(`Starting cleanup for ${idsToDelete.length} users...`);

    // 1. Staff Profile
    await prisma.staffProfile.deleteMany({ where: { user_id: { in: idsToDelete } } });

    // 2. Attendance
    await prisma.attendanceRecord.deleteMany({ where: { user_id: { in: idsToDelete } } });

    // 3. Leave Requests
    await prisma.leaveRequest.deleteMany({ where: { user_id: { in: idsToDelete } } });
    // Update approvals
    await prisma.leaveRequest.updateMany({
        where: { approver_id: { in: idsToDelete } },
        data: { approver_id: null }
    });

    // 4. Regularisation
    await prisma.regularisationRequest.deleteMany({ where: { user_id: { in: idsToDelete } } });
    await prisma.regularisationRequest.updateMany({
        where: { approver_id: { in: idsToDelete } },
        data: { approver_id: null }
    });

    // 5. Payroll
    await prisma.payrollSlip.deleteMany({ where: { user_id: { in: idsToDelete } } });

    // 6. Time Logs
    await prisma.timeLog.deleteMany({ where: { user_id: { in: idsToDelete } } });

    // 7. Comments
    await prisma.comment.deleteMany({ where: { author_id: { in: idsToDelete } } });

    // 8. Notifications
    await prisma.notification.deleteMany({ where: { user_id: { in: idsToDelete } } });

    // 9. Assets
    await prisma.asset.deleteMany({ where: { uploader_id: { in: idsToDelete } } });

    // 10. Sticky Notes
    await prisma.stickyNotePermission.deleteMany({ where: { user_id: { in: idsToDelete } } });
    await prisma.stickyNote.deleteMany({ where: { user_id: { in: idsToDelete } } });

    // 11. Tasks (Reporter is required, so delete tasks reported by them)
    await prisma.task.deleteMany({ where: { reporter_id: { in: idsToDelete } } });
    // Update assignee to null
    await prisma.task.updateMany({
        where: { assignee_id: { in: idsToDelete } },
        data: { assignee_id: null }
    });
    // Update assigned_by to null
    await prisma.task.updateMany({
        where: { assigned_by_id: { in: idsToDelete } },
        data: { assigned_by_id: null }
    });

    // 12. Campaigns
    await prisma.campaign.updateMany({
        where: { default_assignee_id: { in: idsToDelete } },
        data: { default_assignee_id: null }
    });

    // 13. Clients managed
    await prisma.client.updateMany({
        where: { account_manager_id: { in: idsToDelete } },
        data: { account_manager_id: null }
    });

    // 14. Finally, DELETE USERS
    const result = await prisma.user.deleteMany({
        where: {
            id: {
                in: idsToDelete
            }
        }
    });

    console.log(`Successfully deleted ${result.count} users and related data.`);
}

main()
    .catch(e => {
        console.error('Error cleaning up users:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
