import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { ensureLedger } from '../accounting/service';
import bcrypt from 'bcryptjs';

// Helper: Generate Single Client Credentials
export const createCredentialsForClient = async (client: { id: string, name: string }) => {
    const DEFAULT_PASS = "password123";
    const cleanedName = client.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    let username = `${cleanedName}@qix.com`;

    // Collision Check & handling
    let userExists = await prisma.user.findUnique({ where: { email: username } });
    let counter = 1;
    while (userExists) {
        username = `${cleanedName}${counter}@qix.com`;
        userExists = await prisma.user.findUnique({ where: { email: username } });
        counter++;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEFAULT_PASS, salt);

    return await prisma.user.create({
        data: {
            full_name: client.name,
            email: username,
            password_hash: passwordHash,
            role: 'CLIENT',
            department: 'CLIENT',
            linked_client_id: client.id
        }
    });
};

// Update signature to accept arrays
export const createClient = async (data: Prisma.ClientCreateInput, assignedStaffIds?: string[], adAccounts?: any[], ledgerOptions?: { create: boolean, head_id?: string }) => {
    const createData: any = { ...data };

    // Auto-generate Client Code (QCNxxxx)
    // Find last code to increment
    const lastClient = await prisma.client.findFirst({
        where: { client_code: { startsWith: 'QCN' } },
        orderBy: { client_code: 'desc' }
    });

    let nextCode = 'QCN0001';
    if (lastClient && lastClient.client_code) {
        const lastNum = parseInt(lastClient.client_code.replace('QCN', ''), 10);
        if (!isNaN(lastNum)) {
            nextCode = `QCN${(lastNum + 1).toString().padStart(4, '0')}`;
        }
    }
    createData.client_code = nextCode;

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

    // Handle Service Engagement JSON serialization
    if ((data as any).service_engagement && Array.isArray((data as any).service_engagement)) {
        createData.service_engagement = JSON.stringify((data as any).service_engagement);
    }

    // Handle Operating Locations JSON serialization
    if ((data as any).operating_locations && Array.isArray((data as any).operating_locations)) {
        createData.operating_locations_json = JSON.stringify((data as any).operating_locations);
        // Clean up UI-only field if passed
        delete createData.operating_locations;
    }

    // Verify Account Manager exists
    const accountManagerId = (data as any).account_manager_id;
    if (accountManagerId) {
        // Check that the user exists and has a staff profile
        const staffProfile = await prisma.staffProfile.findUnique({
            where: { user_id: accountManagerId },
        });

        if (!staffProfile) {
            throw new Error("Invalid Account Manager: Staff profile not found");
        }
        // Any team member can be an account manager - no department restriction
    }

    const client = await prisma.client.create({
        data: createData,
    });

    console.log(`[AUDIT] Client Created: ${client.name} (ID: ${client.id}) | Account Manager: ${accountManagerId}`);

    // Auto-create Client Ledger
    try {
        if (ledgerOptions?.create && ledgerOptions.head_id) {
            // User selected a specific head
            const head = await prisma.accountHead.findUnique({ where: { id: ledgerOptions.head_id } });
            if (head) {
                await ensureLedger('CLIENT', client.id, head.code);
            } else {
                console.warn(`[WARNING] Client created but Ledger Head ID ${ledgerOptions.head_id} not found. Defaulting to 4000.`);
                await ensureLedger('CLIENT', client.id, '4000');
            }
        } else if (ledgerOptions?.create === false) {
            console.log(`[INFO] Client ${client.name}: Ledger creation skipped by user request.`);
        } else {
            // Default Behavior (Fallback for legacy/unspecified)
            await ensureLedger('CLIENT', client.id, '4000');
        }

    } catch (error) {
        console.error("Failed to create ledger for client:", error);
    }

    // Auto-create Client Credentials
    try {
        await createCredentialsForClient(client);
        console.log(`[AUDIT] Generated credentials for ${client.name}`);
    } catch (error) {
        console.error("Failed to generate credentials for client:", error);
    }

    return client;
};

export const getClients = async () => {
    // 1. Fetch Clients
    const clients = await prisma.client.findMany({
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
            ad_accounts: true,
            content_strategies: true
        }
    });

    // 2. Fetch Ledgers for these Clients
    const clientIds = clients.map(c => c.id);
    const ledgers = await prisma.ledger.findMany({
        where: {
            entity_type: 'CLIENT',
            entity_id: { in: clientIds }
        },
        select: { entity_id: true }
    });

    const ledgerSet = new Set(ledgers.map(l => l.entity_id));

    // 3. Attach flag and parse JSONs
    return clients.map(client => ({
        ...client,
        service_engagement: client.service_engagement ? JSON.parse(client.service_engagement as string) : [],
        ledger_options: {
            create: ledgerSet.has(client.id)
        }
    }));
};

export const getClientById = async (id: string) => {
    const client = await prisma.client.findUnique({
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
            ad_accounts: true,
            content_strategies: true
        }
    });



    if (!client) return null;

    // Check for Ledger
    const ledger = await prisma.ledger.findFirst({
        where: {
            entity_type: 'CLIENT',
            entity_id: id
        }
    });

    // Parse JSON fields
    return {
        ...client,
        service_engagement: client.service_engagement ? JSON.parse(client.service_engagement) : [],
        social_links: client.social_links ? JSON.parse(client.social_links) : {},
        competitor_info: client.competitor_info ? JSON.parse(client.competitor_info) : [],
        customer_avatar: client.customer_avatar ? JSON.parse(client.customer_avatar) : {},
        operating_locations: client.operating_locations_json ? JSON.parse(client.operating_locations_json) : [],
        brand_colors: client.brand_colors ? JSON.parse(client.brand_colors) : {},
        ledger_options: {
            create: !!ledger,
            head_id: ledger?.head_id || ''
        }
    };
};

export const updateClient = async (id: string, data: any) => {
    // If assigned_staff_ids is present, we need to manage the relation
    const { assigned_staff_ids, ad_accounts, content_strategies, ledger_options, ...updateData } = data;

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

    // Helper to stringify if array, else leave as is (if string/null)
    if (updateData.operating_locations !== undefined) {
        if (Array.isArray(updateData.operating_locations)) {
            updateData.operating_locations_json = JSON.stringify(updateData.operating_locations);
        }
        delete updateData.operating_locations; // ALWAYS delete the non-schema field
    }

    if (updateData.service_engagement !== undefined) {
        if (Array.isArray(updateData.service_engagement)) {
            updateData.service_engagement = JSON.stringify(updateData.service_engagement);
        }
    }

    // Handle other JSON fields
    ['social_links', 'competitor_info', 'customer_avatar', 'brand_colors'].forEach(field => {
        if (updateData[field] !== undefined && typeof updateData[field] === 'object' && updateData[field] !== null) {
            updateData[field] = JSON.stringify(updateData[field]);
        }
    });

    console.log("[ClientUpdate] Final Payload:", JSON.stringify(updateData, null, 2));

    const updatedClient = await prisma.client.update({
        where: { id },
        data: updateData,
    });

    // Handle Ledger Creation on Update
    if (ledger_options && ledger_options.create) {
        try {
            if (ledger_options.head_id) {
                const head = await prisma.accountHead.findUnique({ where: { id: ledger_options.head_id } });
                if (head) {
                    await ensureLedger('CLIENT', id, head.code);
                    console.log(`[ClientUpdate] Ledger created for ${updatedClient.name} under head ${head.code}`);
                } else {
                    console.warn(`[ClientUpdate] Head ID ${ledger_options.head_id} not found. Defaulting to 4000.`);
                    await ensureLedger('CLIENT', id, '4000');
                }
            } else {
                await ensureLedger('CLIENT', id, '4000'); // Default
            }
        } catch (error) {
            console.error("[ClientUpdate] Failed to create ledger:", error);
        }
    }

    return updatedClient;
};

export const upsertContentStrategy = async (clientId: string, strategies: { type: string, quantity: number }[]) => {
    return await prisma.$transaction(async (tx) => {
        for (const s of strategies) {
            await tx.clientContentStrategy.upsert({
                where: { client_id_type: { client_id: clientId, type: s.type } },
                update: { quantity: s.quantity },
                create: {
                    client_id: clientId,
                    type: s.type,
                    quantity: s.quantity
                }
            });
        }
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
        // 1. Find campaigns
        const campaigns = await tx.campaign.findMany({ where: { client_id: id }, select: { id: true } });
        const campaignIds = campaigns.map(c => c.id);

        if (campaignIds.length > 0) {
            // Delete Tasks linked to these Campaigns
            await tx.task.deleteMany({ where: { campaign_id: { in: campaignIds } } });

            // Delete SpendSnapshots linked to these Campaigns
            await tx.spendSnapshot.deleteMany({ where: { campaign_id: { in: campaignIds } } });

            // Delete Campaigns
            await tx.campaign.deleteMany({ where: { client_id: id } });
        }

        // 2. Delete Direct Tasks (Tasks linked to Client directly, e.g. Internal/General)
        // Note: We deliberately delete these. In some systems, we might want to unlink them (set client_id = null),
        // but for a hard delete of a client, we usually remove their data.
        await tx.task.deleteMany({ where: { client_id: id } });

        // 3. Delete Invoices
        // (InvoiceItems cascade delete from Invoice, so just deleting Invoice is enough)
        await tx.invoice.deleteMany({ where: { client_id: id } });

        // 4. Delete AdAccounts
        await tx.adAccount.deleteMany({ where: { client_id: id } });

        // 5. Delete ClientContentStrategies (Handled by Cascade in Schema, but good to be explicit if needed. Schema has onDelete: Cascade)
        // await tx.clientContentStrategy.deleteMany({ where: { client_id: id } });

        return await tx.client.delete({
            where: { id },
        });
    });
};

export const generateClientCredentials = async () => {
    const clients = await prisma.client.findMany({
        where: { portalUser: null }, // Find clients without portal access
        select: { id: true, name: true, company_email: true }
    });

    const results = [];
    const DEFAULT_PASS = "password123";
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEFAULT_PASS, salt);

    for (const client of clients) {
        try {
            const user = await createCredentialsForClient(client);
            results.push({ client: client.name, email: user.email, status: 'CREATED' });
        } catch (e: any) {
            results.push({ client: client.name, status: 'ERROR', reason: e.message });
        }
    }
    return results;
};

export const getClientCredentials = async () => {
    return await prisma.client.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            portalUser: {
                select: {
                    id: true,
                    email: true,
                    // We don't return password hash
                }
            }
        }
    });
};

export const updateClientCredentials = async (clientId: string, data: { username?: string, password?: string }) => {
    const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: { portalUser: true }
    });

    if (!client) throw new Error("Client not found");

    if (!client.portalUser) {
        // Create if doesn't exist (Manual Create via Update)
        if (!data.username || !data.password) throw new Error("Credentials don't exist. Provide both username and password to create.");

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        return await prisma.user.create({
            data: {
                full_name: client.name,
                email: data.username,
                password_hash: hashedPassword,
                role: 'CLIENT',
                department: 'CLIENT',
                linked_client_id: client.id
            }
        });
    } else {
        // Update existing
        const updateData: any = {};
        if (data.username) updateData.email = data.username;
        if (data.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password_hash = await bcrypt.hash(data.password, salt);
        }

        return await prisma.user.update({
            where: { id: client.portalUser.id },
            data: updateData
        });
    }
};

export const getNextClientCode = async () => {
    const lastClient = await prisma.client.findFirst({
        where: { client_code: { startsWith: 'QCN' } },
        orderBy: { client_code: 'desc' }
    });

    let nextCode = 'QCN0001';
    if (lastClient && lastClient.client_code) {
        const lastNum = parseInt(lastClient.client_code.replace('QCN', ''), 10);
        if (!isNaN(lastNum)) {
            nextCode = `QCN${(lastNum + 1).toString().padStart(4, '0')}`;
        }
    }
    return nextCode;
};
