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
const prisma_1 = __importDefault(require("../utils/prisma"));
function fixLeadDates() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Fetching leads with metaCreatedAt...');
        const leads = yield prisma_1.default.lead.findMany({
            where: {
                metaCreatedAt: { not: null },
                source: 'AUTO'
            }
        });
        console.log(`Found ${leads.length} leads to fix.`);
        for (const lead of leads) {
            if (lead.metaCreatedAt && lead.date.getTime() !== lead.metaCreatedAt.getTime()) {
                yield prisma_1.default.lead.update({
                    where: { id: lead.id },
                    data: { date: lead.metaCreatedAt }
                });
            }
        }
        console.log('Lead dates fix completed.');
    });
}
fixLeadDates()
    .catch(err => console.error(err))
    .finally(() => prisma_1.default.$disconnect());
