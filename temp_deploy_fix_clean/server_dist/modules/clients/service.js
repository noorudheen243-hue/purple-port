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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextClientCode = exports.updateClientCredentials = exports.getClientCredentials = exports.generateClientCredentials = exports.deleteClient = exports.upsertContentStrategy = exports.updateClient = exports.getClientById = exports.getClients = exports.createClient = exports.createCredentialsForClient = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const service_1 = require("../accounting/service");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Helper: Generate Single Client Credentials
const createCredentialsForClient = (client) => __awaiter(void 0, void 0, void 0, function* () {
    const DEFAULT_PASS = "password123";
    const cleanedName = client.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    let username = `${cleanedName}@qix.com`;
    // Collision Check & handling
    let userExists = yield prisma_1.default.user.findUnique({ where: { email: username } });
    let counter = 1;
    while (userExists) {
        username = `${cleanedName}${counter}@qix.com`;
        userExists = yield prisma_1.default.user.findUnique({ where: { email: username } });
        counter++;
    }
    const salt = yield bcryptjs_1.default.genSalt(10);
    const passwordHash = yield bcryptjs_1.default.hash(DEFAULT_PASS, salt);
    return yield prisma_1.default.user.create({
        data: {
            full_name: client.name,
            email: username,
            password_hash: passwordHash,
            role: 'CLIENT',
            department: 'CLIENT',
            linked_client_id: client.id
        }
    });
});
exports.createCredentialsForClient = createCredentialsForClient;
// Update signature to accept arrays
const createClient = (data, assignedStaffIds, adAccounts, ledgerOptions) => __awaiter(void 0, void 0, void 0, function* () {
    const createData = Object.assign({}, data);
    // Auto-generate Client Code (QCNxxxx)
    // Find last code to increment
    const lastClient = yield prisma_1.default.client.findFirst({
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
    if (data.service_engagement && Array.isArray(data.service_engagement)) {
        createData.service_engagement = JSON.stringify(data.service_engagement);
    }
    // Handle Operating Locations JSON serialization
    if (data.operating_locations && Array.isArray(data.operating_locations)) {
        createData.operating_locations_json = JSON.stringify(data.operating_locations);
        // Clean up UI-only field if passed
        delete createData.operating_locations;
    }
    // Verify Account Manager exists
    const accountManagerId = data.account_manager_id;
    if (accountManagerId) {
        // Check that the user exists and has a staff profile
        const staffProfile = yield prisma_1.default.staffProfile.findUnique({
            where: { user_id: accountManagerId },
        });
        if (!staffProfile) {
            throw new Error("Invalid Account Manager: Staff profile not found");
        }
        // Any team member can be an account manager - no department restriction
    }
    const client = yield prisma_1.default.client.create({
        data: createData,
    });
    console.log(`[AUDIT] Client Created: ${client.name} (ID: ${client.id}) | Account Manager: ${accountManagerId}`);
    // Auto-create Client Ledger
    try {
        if ((ledgerOptions === null || ledgerOptions === void 0 ? void 0 : ledgerOptions.create) && ledgerOptions.head_id) {
            // User selected a specific head
            const head = yield prisma_1.default.accountHead.findUnique({ where: { id: ledgerOptions.head_id } });
            if (head) {
                yield (0, service_1.ensureLedger)('CLIENT', client.id, head.code);
            }
            else {
                console.warn(`[WARNING] Client created but Ledger Head ID ${ledgerOptions.head_id} not found. Defaulting to 4000.`);
                yield (0, service_1.ensureLedger)('CLIENT', client.id, '4000');
            }
        }
        else if ((ledgerOptions === null || ledgerOptions === void 0 ? void 0 : ledgerOptions.create) === false) {
            console.log(`[INFO] Client ${client.name}: Ledger creation skipped by user request.`);
        }
        else {
            // Default Behavior (Fallback for legacy/unspecified)
            yield (0, service_1.ensureLedger)('CLIENT', client.id, '4000');
        }
    }
    catch (error) {
        console.error("Failed to create ledger for client:", error);
    }
    // Auto-create Client Credentials
    try {
        yield (0, exports.createCredentialsForClient)(client);
        console.log(`[AUDIT] Generated credentials for ${client.name}`);
    }
    catch (error) {
        console.error("Failed to generate credentials for client:", error);
    }
    return client;
});
exports.createClient = createClient;
const getClients = () => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Fetch Clients
    const clients = yield prisma_1.default.client.findMany({
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
    const ledgers = yield prisma_1.default.ledger.findMany({
        where: {
            entity_type: 'CLIENT',
            entity_id: { in: clientIds }
        },
        select: { entity_id: true, head_id: true }
    });
    const ledgerMap = new Map(ledgers.map(l => [l.entity_id, l.head_id]));
    // 3. Attach flag and parse JSONs
    return clients.map(client => (Object.assign(Object.assign({}, client), { service_engagement: client.service_engagement ? JSON.parse(client.service_engagement) : [], ledger_options: {
            create: ledgerMap.has(client.id),
            head_id: ledgerMap.get(client.id) || ''
        } })));
});
exports.getClients = getClients;
const getClientById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield prisma_1.default.client.findUnique({
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
    if (!client)
        return null;
    // Check for Ledger
    const ledger = yield prisma_1.default.ledger.findFirst({
        where: {
            entity_type: 'CLIENT',
            entity_id: id
        }
    });
    // Parse JSON fields
    return Object.assign(Object.assign({}, client), { service_engagement: client.service_engagement ? JSON.parse(client.service_engagement) : [], social_links: client.social_links ? JSON.parse(client.social_links) : {}, competitor_info: client.competitor_info ? JSON.parse(client.competitor_info) : [], customer_avatar: client.customer_avatar ? JSON.parse(client.customer_avatar) : {}, operating_locations: client.operating_locations_json ? JSON.parse(client.operating_locations_json) : [], brand_colors: client.brand_colors ? JSON.parse(client.brand_colors) : {}, ledger_options: {
            create: !!ledger,
            head_id: (ledger === null || ledger === void 0 ? void 0 : ledger.head_id) || ''
        } });
});
exports.getClientById = getClientById;
const updateClient = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    // If assigned_staff_ids is present, we need to manage the relation
    const { assigned_staff_ids, ad_accounts, content_strategies, ledger_options } = data, updateData = __rest(data, ["assigned_staff_ids", "ad_accounts", "content_strategies", "ledger_options"]);
    if (assigned_staff_ids) {
        updateData.assigned_staff = {
            set: assigned_staff_ids.map((uid) => ({ id: uid }))
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
        yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            if (ad_accounts && Array.isArray(ad_accounts)) {
                for (const acc of ad_accounts) {
                    if (acc.id) {
                        // Update existing
                        yield tx.adAccount.update({
                            where: { id: acc.id },
                            data: {
                                platform: acc.platform,
                                name: acc.name,
                                external_id: acc.external_id,
                                status: acc.status
                            }
                        }).catch(e => console.warn("AdAccount update failed (might be deleted):", e));
                    }
                    else {
                        // Create new
                        yield tx.adAccount.create({
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
        }));
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
    const updatedClient = yield prisma_1.default.client.update({
        where: { id },
        data: updateData,
    });
    // Handle Ledger Creation on Update
    if (ledger_options && ledger_options.create) {
        try {
            if (ledger_options.head_id) {
                const head = yield prisma_1.default.accountHead.findUnique({ where: { id: ledger_options.head_id } });
                if (head) {
                    yield (0, service_1.ensureLedger)('CLIENT', id, head.code);
                    console.log(`[ClientUpdate] Ledger created for ${updatedClient.name} under head ${head.code}`);
                }
                else {
                    console.warn(`[ClientUpdate] Head ID ${ledger_options.head_id} not found. Defaulting to 4000.`);
                    yield (0, service_1.ensureLedger)('CLIENT', id, '4000');
                }
            }
            else {
                yield (0, service_1.ensureLedger)('CLIENT', id, '4000'); // Default
            }
        }
        catch (error) {
            console.error("[ClientUpdate] Failed to create ledger:", error);
        }
    }
    return updatedClient;
});
exports.updateClient = updateClient;
const upsertContentStrategy = (clientId, strategies) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        for (const s of strategies) {
            yield tx.clientContentStrategy.upsert({
                where: { client_id_type: { client_id: clientId, type: s.type } },
                update: { quantity: s.quantity },
                create: {
                    client_id: clientId,
                    type: s.type,
                    quantity: s.quantity
                }
            });
        }
    }));
});
exports.upsertContentStrategy = upsertContentStrategy;
const deleteClient = (id) => __awaiter(void 0, void 0, void 0, function* () {
    // We need to delete related data first due to Foreign Key constraints
    // 1. Delete Tasks linked to Campaigns of this Client (if any)
    // 2. Delete SpendSnapshots linked to Campaigns
    // 3. Delete Campaigns
    // 4. Delete AdAccounts
    // 5. Delete Ledgers? (This is risky, but for now we proceed)
    // 6. Delete Client
    // Simplest approach: Transaction
    return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Find campaigns
        const campaigns = yield tx.campaign.findMany({ where: { client_id: id }, select: { id: true } });
        const campaignIds = campaigns.map(c => c.id);
        if (campaignIds.length > 0) {
            // Delete Tasks linked to these Campaigns
            yield tx.task.deleteMany({ where: { campaign_id: { in: campaignIds } } });
            // Delete SpendSnapshots linked to these Campaigns
            yield tx.spendSnapshot.deleteMany({ where: { campaign_id: { in: campaignIds } } });
            // Delete Campaigns
            yield tx.campaign.deleteMany({ where: { client_id: id } });
        }
        // 2. Delete Direct Tasks (Tasks linked to Client directly, e.g. Internal/General)
        // Note: We deliberately delete these. In some systems, we might want to unlink them (set client_id = null),
        // but for a hard delete of a client, we usually remove their data.
        yield tx.task.deleteMany({ where: { client_id: id } });
        // 3. Delete Invoices
        // (InvoiceItems cascade delete from Invoice, so just deleting Invoice is enough)
        yield tx.invoice.deleteMany({ where: { client_id: id } });
        // 4. Delete AdAccounts
        yield tx.adAccount.deleteMany({ where: { client_id: id } });
        // 5. Delete ClientContentStrategies (Handled by Cascade in Schema, but good to be explicit if needed. Schema has onDelete: Cascade)
        // await tx.clientContentStrategy.deleteMany({ where: { client_id: id } });
        return yield tx.client.delete({
            where: { id },
        });
    }));
});
exports.deleteClient = deleteClient;
const generateClientCredentials = () => __awaiter(void 0, void 0, void 0, function* () {
    const clients = yield prisma_1.default.client.findMany({
        where: { portalUser: null }, // Find clients without portal access
        select: { id: true, name: true, company_email: true }
    });
    const results = [];
    const DEFAULT_PASS = "password123";
    const salt = yield bcryptjs_1.default.genSalt(10);
    const passwordHash = yield bcryptjs_1.default.hash(DEFAULT_PASS, salt);
    for (const client of clients) {
        try {
            const user = yield (0, exports.createCredentialsForClient)(client);
            results.push({ client: client.name, email: user.email, status: 'CREATED' });
        }
        catch (e) {
            results.push({ client: client.name, status: 'ERROR', reason: e.message });
        }
    }
    return results;
});
exports.generateClientCredentials = generateClientCredentials;
const getClientCredentials = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.client.findMany({
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
});
exports.getClientCredentials = getClientCredentials;
const updateClientCredentials = (clientId, data) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield prisma_1.default.client.findUnique({
        where: { id: clientId },
        include: { portalUser: true }
    });
    if (!client)
        throw new Error("Client not found");
    if (!client.portalUser) {
        // Create if doesn't exist (Manual Create via Update)
        if (!data.username || !data.password)
            throw new Error("Credentials don't exist. Provide both username and password to create.");
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(data.password, salt);
        return yield prisma_1.default.user.create({
            data: {
                full_name: client.name,
                email: data.username,
                password_hash: hashedPassword,
                role: 'CLIENT',
                department: 'CLIENT',
                linked_client_id: client.id
            }
        });
    }
    else {
        // Update existing
        const updateData = {};
        if (data.username)
            updateData.email = data.username;
        if (data.password) {
            const salt = yield bcryptjs_1.default.genSalt(10);
            updateData.password_hash = yield bcryptjs_1.default.hash(data.password, salt);
        }
        return yield prisma_1.default.user.update({
            where: { id: client.portalUser.id },
            data: updateData
        });
    }
});
exports.updateClientCredentials = updateClientCredentials;
const getNextClientCode = () => __awaiter(void 0, void 0, void 0, function* () {
    const lastClient = yield prisma_1.default.client.findFirst({
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
});
exports.getNextClientCode = getNextClientCode;
