import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class StrategyDataService {
    /**
     * Create or update the strategy master record
     */
    static async upsertMaster(clientId: string, data: { strategy_name: string; strategy_id?: string; status?: string }) {
        const { strategy_name, strategy_id, status } = data;

        // Try to find an existing master for this client that is "Draft"
        // or create a new one if requested
        return await prisma.strategyDataMaster.create({
            data: {
                client_id: clientId,
                strategy_name,
                strategy_id,
                status: status || 'Draft'
            }
        });
    }

    /**
     * Auto-save a section of the strategy
     */
    static async saveSection(masterId: string, sectionName: string, data: any) {
        const dataJson = typeof data === 'string' ? data : JSON.stringify(data);

        const section = await prisma.strategyDataSection.upsert({
            where: {
                master_id_section_name: {
                    master_id: masterId,
                    section_name: sectionName
                }
            },
            update: {
                data_json: dataJson
            },
            create: {
                master_id: masterId,
                section_name: sectionName,
                data_json: dataJson
            }
        });

        // Log the progress
        await prisma.strategyProgressLog.create({
            data: {
                master_id: masterId,
                action: `SAVE_SECTION_${sectionName.toUpperCase()}`,
                data_snapshot: dataJson
            }
        });

        // Update the master's updatedAt timestamp
        await prisma.strategyDataMaster.update({
            where: { id: masterId },
            data: { updatedAt: new Date() }
        });

        return section;
    }

    /**
     * Get list of strategy masters (Data Centre)
     */
    static async listMasters(clientId?: string) {
        return await prisma.strategyDataMaster.findMany({
            where: clientId ? { client_id: clientId } : {},
            include: {
                client: {
                    select: { name: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    /**
     * Get full strategy data (Master + Sections)
     */
    static async getFullData(masterId: string) {
        const master = await prisma.strategyDataMaster.findUnique({
            where: { id: masterId },
            include: {
                client: true,
                sections: true,
                logs: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });

        if (!master) throw new Error('Strategy data not found');

        // Parse sections into an object
        const sectionsData: Record<string, any> = {};
        master.sections.forEach(s => {
            try {
                sectionsData[s.section_name] = JSON.parse(s.data_json);
            } catch (e) {
                sectionsData[s.section_name] = s.data_json;
            }
        });

        return {
            ...master,
            parsedSections: sectionsData
        };
    }

    /**
     * Update strategy status
     */
    static async updateStatus(masterId: string, status: string) {
        return await prisma.strategyDataMaster.update({
            where: { id: masterId },
            data: { status }
        });
    }

    /**
     * Delete strategy master and its sections
     */
    static async deleteMaster(masterId: string) {
        return await prisma.strategyDataMaster.delete({
            where: { id: masterId }
        });
    }

    /**
     * Bulk delete strategy masters
     */
    static async bulkDeleteMasters(ids: string[]) {
        return await prisma.strategyDataMaster.deleteMany({
            where: {
                id: { in: ids }
            }
        });
    }
}
