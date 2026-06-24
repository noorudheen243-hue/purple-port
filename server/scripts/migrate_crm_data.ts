import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
    console.log("Starting CRM Data Migration...");

    // Migrate MarketingGroups to CrmGroups
    const marketingGroups = await prisma.marketingGroup.findMany({
        include: {
            campaigns: true,
            leads: true
        }
    });

    console.log(`Found ${marketingGroups.length} Marketing Groups to migrate...`);

    for (const group of marketingGroups) {
        // Create CrmGroup
        let crmGroup = await prisma.crmGroup.findFirst({
            where: { name: group.name, client_id: group.client_id }
        });

        if (!crmGroup) {
            crmGroup = await prisma.crmGroup.create({
                data: {
                    name: group.name,
                    client_id: group.client_id,
                    createdAt: group.createdAt,
                    updatedAt: group.updatedAt
                }
            });
            console.log(`Created CrmGroup: ${crmGroup.name}`);
        }

        // Migrate Campaigns in this group
        for (const campaign of group.campaigns) {
            const existingMapping = await prisma.crmGroupCampaign.findUnique({
                where: {
                    crm_group_id_campaign_id: {
                        crm_group_id: crmGroup.id,
                        campaign_id: campaign.id
                    }
                }
            });

            if (!existingMapping) {
                await prisma.crmGroupCampaign.create({
                    data: {
                        crm_group_id: crmGroup.id,
                        campaign_id: campaign.id
                    }
                });
            }
        }
    }

    // Migrate Leads
    const oldLeads = await prisma.lead.findMany({
        where: {
            group_id: { not: null }
        },
        include: {
            group: true,
            marketingCampaign: true
        }
    });

    console.log(`Found ${oldLeads.length} leads tied to Marketing Groups to migrate...`);

    for (const lead of oldLeads) {
        let crmGroupId = null;
        if (lead.group) {
            const crmGroup = await prisma.crmGroup.findFirst({
                where: { name: lead.group.name, client_id: lead.client_id }
            });
            if (crmGroup) crmGroupId = crmGroup.id;
        }

        const newLead = await prisma.crmLead.create({
            data: {
                client_id: lead.client_id,
                crm_group_id: crmGroupId,
                campaign_id: lead.campaignId,
                source: lead.source || "Manual", 
                date: lead.date || lead.createdAt,
                name: lead.name || "Unknown",
                contact_number: lead.phone,
                whatsapp_number: lead.phone,
                email: lead.email,
                location: lead.location,
                quality: lead.quality === "CONVERTED" ? "Hot" : "Cold", 
                stage: lead.stage || lead.status || "New Lead",
                notes: lead.feedback || "",
                createdAt: lead.createdAt,
                updatedAt: lead.updatedAt
            }
        });
        
        // Follow-up migration could go here
    }

    console.log("Migration Complete!");
}

migrate()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
