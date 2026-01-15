
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING FULL SYSTEM WIPE ---');
    console.log('WARNING: This will delete all transactions, tasks, finance data, and payroll data.');

    try {
        // --- 1. Finance & Accounting ---
        console.log('Deleting Finance Data...');
        await prisma.invoiceItem.deleteMany({});
        await prisma.clientInvoiceItem.deleteMany({});

        // Handle Journal Entry circular dependency (Invoice -> JournalEntry -> Invoice)
        // First disconnect Journals from Invoices
        await prisma.invoice.updateMany({ data: { journal_entry_id: null } });
        await prisma.invoice.deleteMany({});
        await prisma.clientInvoice.deleteMany({});

        await prisma.journalLine.deleteMany({});
        await prisma.journalEntry.deleteMany({});

        // Reset Ledger Balances (Do not delete ledgers as they are structural)
        console.log('Resetting Ledger Balances...');
        await prisma.ledger.updateMany({
            data: {
                balance: 0.0,
                campaign_id: null // Disconnect from campaigns before deletion
            }
        });

        // Reset Client Advance Balances
        await prisma.client.updateMany({ data: { advance_balance: 0.0 } });
        await prisma.user.updateMany({ data: { advance_balance: 0.0 } });

        // --- 2. Payroll ---
        console.log('Deleting Payroll Data...');
        await prisma.payrollSlip.deleteMany({});
        await prisma.payrollRun.deleteMany({});

        // Reset Payroll Settings in StaffProfile
        console.log('Resetting Staff Payroll Settings...');
        await prisma.staffProfile.updateMany({
            data: {
                base_salary: null,
                hra: null,
                allowances: null,
                conveyance_allowance: null,
                accommodation_allowance: null,
                salary_type: null, // "payrole settings" wipe
                incentive_eligible: false,
                // Keep bank details? User said "payroll details including payrole settings". 
                // Usually bank details are part of "Profile", not "Settings/Run". Keeping them effectively.
            }
        });

        // --- 3. Attendance & Leave ---
        console.log('Deleting Attendance & Leave Data...');
        await prisma.attendanceRecord.deleteMany({});
        await prisma.leaveRequest.deleteMany({});
        await prisma.regularisationRequest.deleteMany({});
        await prisma.leaveAllocation.deleteMany({});

        // --- 4. Tasks & Campaigns ---
        console.log('Deleting Tasks & Campaigns...');
        await prisma.timeLog.deleteMany({});
        await prisma.comment.deleteMany({});
        await prisma.asset.deleteMany({});
        await prisma.taskDependency.deleteMany({});

        // Delete Subtasks first? No, deleteMany handles it if no strict foreign key constraints block it.
        // But self-relation might be tricky. Recursive delete or multiple passes?
        // SQLite/Prisma usually handles it if onDelete: SetNull/Cascade.
        // Let's retry in loop or just delete tasks.
        const pendingTasks = await prisma.task.count();
        if (pendingTasks > 0) {
            // Unlink parents to avoid FK issues during delete
            await prisma.task.updateMany({ data: { parent_task_id: null } });
            await prisma.task.deleteMany({});
        }

        await prisma.campaign.deleteMany({});

        // --- 5. Client Portal / Marketing Data ---
        console.log('Deleting Marketing & Portal Data...');
        await prisma.clientContentStrategy.deleteMany({});
        await prisma.seoLog.deleteMany({});
        await prisma.metaAdsLog.deleteMany({});
        await prisma.googleAdsLog.deleteMany({});
        await prisma.webDevProject.deleteMany({});
        await prisma.contentDeliverable.deleteMany({});
        await prisma.report.deleteMany({});
        await prisma.lead.deleteMany({});

        await prisma.adInsight.deleteMany({});
        await prisma.adCreative.deleteMany({});
        await prisma.adSet.deleteMany({});
        await prisma.adCampaign.deleteMany({});
        await prisma.spendSnapshot.deleteMany({});

        // --- 6. Notifications & Chats ---
        console.log('Deleting Notifications & Chats...');
        await prisma.notification.deleteMany({});
        await prisma.chatReadReceipt.deleteMany({});
        await prisma.chatMessage.deleteMany({});
        await prisma.chatParticipant.deleteMany({});
        await prisma.chatConversation.deleteMany({});

        // --- 7. Sticky Notes ---
        console.log('Deleting Sticky Notes...');
        await prisma.stickyTask.deleteMany({});
        await prisma.stickyNotePermission.deleteMany({});
        await prisma.stickyNote.deleteMany({});

        // --- 8. Biometric (PRESERVE SETTINGS/CREDENTIALS) ---
        // Ensuring we didn't touch BiometricCredential
        const bioCount = await prisma.biometricCredential.count();
        console.log(`Saved ${bioCount} Biometric Credentials (Preserved).`);

        console.log('✅ FULL WIPE COMPLETED SUCCESSFULLY.');

    } catch (e) {
        console.error('❌ ERROR DURING WIPE:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
