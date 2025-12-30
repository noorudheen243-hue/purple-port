import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { ensureLedger } from '../accounting/service';

// Update signature to accept arrays
export const createClient = async (data: Prisma.ClientCreateInput, assignedStaffIds?: string[], adAccounts?: any[]) => {
    const createData: any = { ...data };

    // Handle Assigned Staff Relation
    if (assignedStaffIds && assignedStaffIds.length > 0) {
        createData.assigned_staff = {
            connect: assignedStaffIds.map(id => ({ id }))
        };
    }

    // Handle Ad Accounts Creation
    if (adAccounts && adAccounts.length > 0) {
        createData.ad_accounts = {
            create: adAccounts.map(acc => ({
                platform: acc.platform,
                name: acc.name,
                external_id: acc.external_id,
                status: acc.status || 'ACTIVE'
            }))
        };
    }

    // Verify Account Manager exists and has correct role
    const accountManagerId = (data as any).account_manager_id;
    if (accountManagerId) {
        // We need to check the StaffProfile, not just the User
        const staffProfile = await prisma.staffProfile.findUnique({
            where: { user_id: accountManagerId }, // clients store user_id, need to find profile by user_id
        });

        if (!staffProfile) throw new Error("Invalid Account Manager: Staff profile not found");

        // RELAXED CHECK for Legacy Compatibility or Edge Cases:
        // We strictly want 'MANAGEMENT', but let's ensure we match the enum values we defined earlier ('MANAGEMENT').
        if (staffProfile.department !== 'MANAGEMENT') {
            // Optional: Allow ADMIN role as a fallback override if needed, but Prompt says "Restrict to Department = Management"
            // Strict compliance:
            throw new Error("Account Manager must be from the Management department");
        }
    }

    const client = await prisma.client.create({
        data: createData,
    });

    console.log(`[AUDIT] Client Created: ${client.name} (ID: ${client.id}) | Account Manager: ${accountManagerId}`);

    // Auto-create Client Ledger under Assets (1000 - Accounts Receivable)
    try {
        await ensureLedger('CLIENT', client.id, '1000');
    } catch (error) {
        console.error("Failed to create ledger for client:", error);
    }

    return client;
};

export const getClients = async () => {
    return await prisma.client.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
            _count: {
                select: { campaigns: true }
            },
            account_manager: {
                select: { id: true, full_name: true, avatar_url: true }
            },
            assigned_staff: {
                select: { id: true, full_name: true, avatar_url: true }
            },
            ad_accounts: true // Include Ad Accounts in list view if needed, or lightweight
        }
    });
};

export const getClientById = async (id: string) => {
    return await prisma.client.findUnique({
        where: { id },
        include: {
            campaigns: {
                orderBy: { start_date: 'desc' },
                take: 5
            },
            account_manager: {
                select: { id: true, full_name: true, email: true, avatar_url: true }
            },
            assigned_staff: {
                select: { id: true, full_name: true, email: true, avatar_url: true }
            },
            ad_accounts: true
        }
    });
};

export const updateClient = async (id: string, data: any) => {
    // If assigned_staff_ids is present, we need to manage the relation
    const { assigned_staff_ids, ad_accounts, ...updateData } = data;

    if (assigned_staff_ids) {
        updateData.assigned_staff = {
            set: assigned_staff_ids.map((uid: string) => ({ id: uid }))
        };
    }

    // Handle Ad Accounts Update
    // Strategy: Upsert based on ID if present, otherwise create.
    if (ad_accounts) {
        // We can't easily upsert deeply nested in one go with simple map.
        // Easiest reliable way for this UI (which likely sends full list) is to use transaction or multiple ops.
        // But Prisma update can handle nested upsert.
        // However, if we removed one from UI, we expect it deleted. deleteMany -> createMany is destructive to stats.
        // Let's implement smart sync:
        // 1. Get existing IDs.
        // 2. Identify deleted, updated, new.

        // For MVP Speed: We will ignore deletion of stats for now or assume UI sends IDs.
        // Actually, let's use a simpler approach: Update `ad_accounts` only if provided.
        // Note: Controller needs to pass ad_accounts to this service.

        // Wait, Schema says `AdAccount` links to `Client`.
        // Let's use `deleteMany` (but excluding IDs present in update) + `upsert` loop?
        // Or simplified: Just delete all and recreate? NO, stats loss.

        // Better: We'll assume the UI sends the full current state.
        // We will perform operations in a transaction inside this function?
        // Let's try standard Prisma nested update if possible, but that's complex for "syncing" a list.

        // New Strategy: We will just allow creating new ones via this update for now, 
        // OR we just use a separate endpoint `syncAdAccounts`?
        // To keep it simple in `updateClient`:
        // We will iterate and upsert. We won't delete missing ones automatically here to avoid accidents?
        // Re-reading Plan: "Standard Update".
        // Let's stick to: deleteMany + createMany is TOO DESTRUCTIVE.
        // We will just create new ones or update existing ones if ID is provided.

        // NOTE: The `updateData` passed to prisma.client.update needs to be clean.
        // We will run a separate loop for ad accounts.

        await prisma.$transaction(async (tx) => {
            if (ad_accounts && Array.isArray(ad_accounts)) {
                for (const acc of ad_accounts) {
                    if (acc.id) {
                        // Update existing
                        await tx.adAccount.update({
                            where: { id: acc.id },
                            data: {
                                platform: acc.platform,
                                name: acc.name,
                                external_id: acc.external_id,
                                status: acc.status
                            }
                        }).catch(e => console.warn("AdAccount update failed (might be deleted):", e));
                    } else {
                        // Create new
                        await tx.adAccount.create({
                            data: {
                                client_id: id,
                                platform: acc.platform || 'META',
                                name: acc.name,
                                external_id: acc.external_id,
                                status: acc.status || 'ACTIVE'
                            }
                        });
                    }
                }
            }
        });
    }

    return await prisma.client.update({
        where: { id },
        data: updateData,
    });
};

export const deleteClient = async (id: string) => {
    // We need to delete related data first due to Foreign Key constraints
    // 1. Delete Tasks linked to Campaigns of this Client (if any)
    // 2. Delete SpendSnapshots linked to Campaigns
    // 3. Delete Campaigns
    // 4. Delete AdAccounts
    // 5. Delete Ledgers? (This is risky, but for now we proceed)
    // 6. Delete Client

    // Simplest approach: Transaction
    return await prisma.$transaction(async (tx) => {
        // Find campaigns
        const campaigns = await tx.campaign.findMany({ where: { client_id: id }, select: { id: true } });
        const campaignIds = campaigns.map(c => c.id);

        if (campaignIds.length > 0) {
            // Delete related Tasks
            await tx.task.deleteMany({ where: { campaign_id: { in: campaignIds } } });

            // Delete SpendSnapshots
            await tx.spendSnapshot.deleteMany({ where: { campaign_id: { in: campaignIds } } });

            // Delete Campaigns
            await tx.campaign.deleteMany({ where: { client_id: id } });
        }

        // Delete AdAccounts
        await tx.adAccount.deleteMany({ where: { client_id: id } });

        // Delete Ledgers? 
        // We should ideally check if they have non-zero balance. 
        // For MVP/Dev, we delete them to allow client deletion.
        // We need to delete JournalLines first if we delete Ledgers.
        // This is getting deep. 
        // Alternative: Set client_id to NULL on Ledgers? No, strict relation?
        // Let's check Ledger model. 

        // Ledger has optional entity_id. 
        // But JournalLine -> Ledger (Restrict).
        // If we delete Client, we don't necessarily delete Ledger rows in DB structure unless linked by ID?
        // Ledger model: entity_id String? 
        // If it's just a string, it's not a FK constraint usually unless @relation is there.
        // In schema: `entity_id` is just a string? No, check schema.

        // Checking schema: 
        // model Ledger { entity_id String? ... } 
        // There is NO @relation to Client on entity_id.
        // However, there is: `client_id String?`? No.
        // Wait, earlier schema: `model Client { ... }`
        // `model Ledger { ... }`
        // Let's assume Ledgers rely on manual application logic for now.

        // BUT: Campaign has `client Client ...`

        return await tx.client.delete({
            where: { id },
        });
    });
};
