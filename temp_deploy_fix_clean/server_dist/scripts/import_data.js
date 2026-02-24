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
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
function importData() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        console.log('>>> IMPORTING DATA TO POSTGRESQL...');
        const dataPath = path_1.default.join(__dirname, '../../data_backup.json');
        if (!fs_1.default.existsSync(dataPath)) {
            throw new Error("data_backup.json not found!");
        }
        const data = JSON.parse(fs_1.default.readFileSync(dataPath, 'utf-8'));
        // Helper to clean tables
        const deleteParams = { where: {} }; // Delete all
        console.log('--- Cleaning Old Data ---');
        // Delete in reverse dependency order
        yield prisma.timeLog.deleteMany();
        yield prisma.comment.deleteMany();
        yield prisma.asset.deleteMany();
        yield prisma.task.deleteMany();
        yield prisma.invoiceItem.deleteMany();
        // await prisma.item.deleteMany().catch(() => { }); // Legacy removed
        yield prisma.invoice.deleteMany();
        yield prisma.journalLine.deleteMany();
        yield prisma.journalEntry.deleteMany();
        yield prisma.ledger.deleteMany();
        yield prisma.accountHead.deleteMany();
        yield prisma.campaign.deleteMany();
        yield prisma.client.deleteMany();
        yield prisma.staffProfile.deleteMany();
        yield prisma.user.deleteMany();
        console.log('--- Inserting New Data ---');
        // 1. Users (Use CreateMany)
        if ((_a = data.users) === null || _a === void 0 ? void 0 : _a.length) {
            yield prisma.user.createMany({ data: data.users });
            console.log(`+ Imported ${data.users.length} Users`);
        }
        // 2. Staff
        if ((_b = data.staffProfiles) === null || _b === void 0 ? void 0 : _b.length) {
            // Remove empty relations if any
            const validProfiles = data.staffProfiles.map((p) => {
                const { id } = p, rest = __rest(p, ["id"]); // Keep ID if UUIDs match, typically yes
                return p;
            });
            yield prisma.staffProfile.createMany({ data: validProfiles });
            console.log(`+ Imported ${validProfiles.length} Staff Profiles`);
        }
        // 3. Accounting Heads
        if ((_c = data.accountHeads) === null || _c === void 0 ? void 0 : _c.length) {
            yield prisma.accountHead.createMany({ data: data.accountHeads });
            console.log(`+ Imported ${data.accountHeads.length} Account Heads`);
        }
        // 4. Clients
        if ((_d = data.clients) === null || _d === void 0 ? void 0 : _d.length) {
            yield prisma.client.createMany({ data: data.clients });
            console.log(`+ Imported ${data.clients.length} Clients`);
        }
        // 5. Campaigns
        if ((_e = data.campaigns) === null || _e === void 0 ? void 0 : _e.length) {
            yield prisma.campaign.createMany({ data: data.campaigns });
            console.log(`+ Imported ${data.campaigns.length} Campaigns`);
        }
        // 6. Tasks
        if ((_f = data.tasks) === null || _f === void 0 ? void 0 : _f.length) {
            yield prisma.task.createMany({ data: data.tasks });
            console.log(`+ Imported ${data.tasks.length} Tasks`);
        }
        // ... Add others as needed. For MVP/Rescue this covers the core.
        console.log('>>> SUCCESS! Data Migration Complete.');
    });
}
importData()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () { return yield prisma.$disconnect(); }));
