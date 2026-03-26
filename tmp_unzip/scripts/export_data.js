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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
function exportData() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('>>> EXPORTING DATA FROM LOCAL DATABASE...');
        const data = {};
        // 1. Users & Staff
        data.users = yield prisma.user.findMany();
        data.staffProfiles = yield prisma.staffProfile.findMany();
        // 2. Clients & Campaigns
        data.clients = yield prisma.client.findMany();
        data.campaigns = yield prisma.campaign.findMany();
        // 3. Tasks & Assets
        data.tasks = yield prisma.task.findMany();
        data.assets = yield prisma.asset.findMany();
        data.comments = yield prisma.comment.findMany();
        data.timeLogs = yield prisma.timeLog.findMany();
        // 4. Accounting
        data.accountHeads = yield prisma.accountHead.findMany();
        data.ledgers = yield prisma.ledger.findMany();
        data.journalEntries = yield prisma.journalEntry.findMany();
        data.journalLines = yield prisma.journalLine.findMany();
        data.invoices = yield prisma.invoice.findMany();
        data.invoiceItems = yield prisma.invoiceItem.findMany();
        // 5. Save to File
        const outputPath = path_1.default.join(__dirname, '../../data_backup.json');
        fs_1.default.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`>>> SUCCESS! Exported ${Object.keys(data).length} tables to data_backup.json`);
        console.log(`    Users: ${data.users.length}`);
        console.log(`    Tasks: ${data.tasks.length}`);
    });
}
exportData()
    .catch(e => console.error(e))
    .finally(() => __awaiter(void 0, void 0, void 0, function* () { return yield prisma.$disconnect(); }));
