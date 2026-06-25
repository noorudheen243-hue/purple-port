import { Request, Response } from 'express';
import prisma from '../../utils/prisma';
import axios from 'axios';
import { AiSalesEngineService } from '../ai_sales_engine/services/aiSalesEngine.service';
import { MetaLeadsService } from './services/metaLeadsService';

const metaLeadsService = new MetaLeadsService();

// Helper to validate and get client context
const getValidatedClientId = (req: Request): string | null => {
    // If it's a CRM user, they are strictly locked to their assigned client
    if (req.crmUser) {
        if (req.crmUser.campaign_group_id) {
            req.query.groupId = req.crmUser.campaign_group_id;
            req.body.groupId = req.crmUser.campaign_group_id;
            req.body.group_id = req.crmUser.campaign_group_id;
        }
        return req.crmUser.client_id;
    }
    const user = req.user as any;
    if (!user) return null;
    const requestedClientId = req.query.clientId as string || req.body.clientId as string || req.body.client_id as string;

    if (!requestedClientId) return null;

    if (user.role === 'CLIENT') {
        if (requestedClientId !== user.linked_client_id) {
            return null; // Security violation
        }
    }
    return requestedClientId;
};

// CRM Helper to link campaigns and campaign groups to lead records
export const syncCrmCampaignData = async (clientId: string) => {
    try {
        console.log(`[syncCrmCampaignData] Starting sync for client ${clientId}`);
        
        // 1. Sync group_id from campaign to leads (for campaigns that have a group)
        const campaignsWithGroups = await prisma.marketingCampaign.findMany({
            where: { 
                clientId,
                group_id: { not: null }
            },
            select: { id: true, group_id: true }
        });

        for (const camp of campaignsWithGroups) {
            if (camp.group_id) {
                await prisma.lead.updateMany({
                    where: {
                        client_id: clientId,
                        campaignId: camp.id,
                        OR: [
                            { group_id: null },
                            { group_id: { not: camp.group_id } }
                        ]
                    },
                    data: { group_id: camp.group_id }
                });
            }
        }

        // 2. Link leads with matching campaign names to campaigns
        const unlinkedLeads = await prisma.lead.findMany({
            where: {
                client_id: clientId,
                campaignId: null,
                campaign_name: { not: null }
            },
            select: { id: true, campaign_name: true }
        });

        if (unlinkedLeads.length > 0) {
            const campaigns = await prisma.marketingCampaign.findMany({
                where: { clientId },
                select: { id: true, name: true, group_id: true }
            });

            for (const lead of unlinkedLeads) {
                if (!lead.campaign_name) continue;
                const campaignName = lead.campaign_name;
                const matchingCampaign = campaigns.find(c => 
                    c.name.toLowerCase().trim() === campaignName.toLowerCase().trim() ||
                    c.name.toLowerCase().includes(campaignName.toLowerCase().trim()) ||
                    campaignName.toLowerCase().includes(c.name.toLowerCase().trim())
                );
                if (matchingCampaign) {
                    await prisma.lead.update({
                        where: { id: lead.id },
                        data: {
                            campaignId: matchingCampaign.id,
                            group_id: matchingCampaign.group_id || undefined
                        }
                    });
                }
            }
        }
        console.log(`[syncCrmCampaignData] Completed sync for client ${clientId}`);
    } catch (err) {
        console.error('[syncCrmCampaignData] Error during database sync:', err);
    }
};

// 1. Dashboard Stats
export const getCrmDashboardStats = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        // Auto-sync campaigns and lead mappings first
        await syncCrmCampaignData(clientId);

        const { startDate, endDate, groupId } = req.query;
        const dateFilter: any = {};
        if (startDate || endDate) {
            dateFilter.date = {};
            if (startDate) dateFilter.date.gte = new Date(startDate as string);
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                dateFilter.date.lte = end;
            }
        }

        // Fetch all leads for client/group
        const whereClause: any = { client_id: clientId, ...dateFilter };
        if (groupId) {
            whereClause.group_id = groupId as string;
        }

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { follow_ups: true }
        });

        // Stage counts
        const stages = {
            total: leads.length,
            new: leads.filter(l => l.stage === 'New Lead' || l.status === 'NEW').length,
            contacted: leads.filter(l => l.stage === 'Contacted' || l.status === 'CONTACTED').length,
            qualified: leads.filter(l => l.stage === 'Qualified' || l.status === 'QUALIFIED').length,
            followUp: leads.filter(l => l.stage === 'Follow-up Required').length,
            meeting: leads.filter(l => l.stage === 'Meeting Scheduled' || l.stage === 'Demo Scheduled').length,
            proposal: leads.filter(l => l.stage === 'Proposal Sent' || l.stage === 'Negotiation').length,
            converted: leads.filter(l => l.stage === 'Converted' || l.status === 'CONVERTED' || l.status === 'CLOSED').length,
            lost: leads.filter(l => l.stage === 'Lost' || l.status === 'LOST').length,
            notQualified: leads.filter(l => l.stage === 'Not Qualified').length
        };

        // Quality counts
        const quality = {
            hot: leads.filter(l => l.quality === 'HIGH' || l.quality === 'Hot').length,
            warm: leads.filter(l => l.quality === 'MEDIUM' || l.quality === 'Warm').length,
            cold: leads.filter(l => l.quality === 'LOW' || l.quality === 'Cold').length,
            junk: leads.filter(l => l.quality === 'Junk' || l.quality === 'Invalid').length
        };

        // Platform breakdown
        const platforms: Record<string, number> = { meta: 0, google: 0, seo: 0, website: 0, whatsapp: 0, manual: 0 };
        leads.forEach(l => {
            const src = (l.source || 'manual').toLowerCase();
            if (src.includes('meta') || src.includes('facebook') || src.includes('instagram') || l.campaignId) {
                platforms.meta++;
            } else if (src.includes('google') || src.includes('adwords')) {
                platforms.google++;
            } else if (src.includes('seo') || src.includes('organic')) {
                platforms.seo++;
            } else if (src.includes('web') || src.includes('landing')) {
                platforms.website++;
            } else if (src.includes('whatsapp') || src.includes('wa')) {
                platforms.whatsapp++;
            } else {
                platforms.manual++;
            }
        });

        // Spends and Conversions
        // Fetch all marketing metrics for the client's campaigns
        const campaignMetrics = await prisma.marketingMetric.findMany({
            where: {
                campaign: { 
                    clientId,
                    ...(groupId ? { group_id: groupId as string } : {})
                },
                ...(startDate || endDate ? {
                    date: {
                        ...(startDate ? { gte: new Date(startDate as string) } : {}),
                        ...(endDate ? { lte: new Date(endDate as string) } : {})
                    }
                } : {})
            }
        });

        const totalSpend = campaignMetrics.reduce((acc, curr) => acc + (curr.spend || 0), 0);
        const totalConversions = campaignMetrics.reduce((acc, curr) => acc + (curr.conversions || curr.results || 0), 0);
        const conversionValueSum = leads
            .filter(l => l.stage === 'Converted' || l.status === 'CONVERTED' || l.status === 'CLOSED')
            .reduce((acc, curr) => acc + (curr.conversion_val || 0), 0);

        const costPerLead = leads.length > 0 ? totalSpend / leads.length : 0;
        const costPerConversion = totalConversions > 0 ? totalSpend / totalConversions : 0;
        const conversionRate = leads.length > 0 ? (stages.converted / leads.length) * 100 : 0;
        const roas = totalSpend > 0 ? conversionValueSum / totalSpend : 0;

        // Follow-up status summary
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
        const allFollowUps = await prisma.leadFollowUp.findMany({
            where: { 
                lead: { 
                    client_id: clientId,
                    ...(groupId ? { group_id: groupId as string } : {})
                } 
            }
        });

        const followUpStats = {
            today: allFollowUps.filter(f => f.date >= todayStart && f.date <= todayEnd && f.status === 'PENDING').length,
            overdue: allFollowUps.filter(f => f.date < todayStart && f.status === 'PENDING').length,
            upcoming: allFollowUps.filter(f => f.date > todayEnd && f.status === 'PENDING').length,
            completed: allFollowUps.filter(f => f.status === 'COMPLETED').length
        };

        // Executive performance overview
        const users = await prisma.user.findMany({
            where: { role: { not: 'CLIENT' } },
            select: { id: true, full_name: true }
        });

        const execPerformance = users.map(u => {
            const userLeads = leads.filter(l => l.assigned_to === u.id);
            const userConverted = userLeads.filter(l => l.stage === 'Converted' || l.status === 'CONVERTED' || l.status === 'CLOSED').length;
            return {
                userId: u.id,
                name: u.full_name,
                leadsCount: userLeads.length,
                convertedCount: userConverted,
                conversionRate: userLeads.length > 0 ? (userConverted / userLeads.length) * 100 : 0
            };
        }).filter(u => u.leadsCount > 0);

        // Recent activity feed
        const recentActivities = await prisma.leadActivity.findMany({
            where: { 
                lead: { 
                    client_id: clientId,
                    ...(groupId ? { group_id: groupId as string } : {})
                } 
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { lead: { select: { name: true } } }
        });

        res.json({
            stages,
            quality,
            platforms,
            financials: {
                totalSpend,
                totalConversions,
                conversionValueSum,
                costPerLead,
                costPerConversion,
                conversionRate,
                roas
            },
            followUps: followUpStats,
            execPerformance,
            recentActivities
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Fetch Leads List (With Filters)
export const getLeads = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        // Auto-sync campaigns and lead mappings first
        await syncCrmCampaignData(clientId);

        const { search, stage, quality, source, assignee, startDate, endDate, groupId } = req.query;

        const where: any = { client_id: clientId };

        if (groupId) where.group_id = groupId as string;
        if (stage) where.stage = stage as string;
        if (quality) where.quality = quality as string;
        if (source) {
            if (source === 'GENERATED') {
                where.source = { notIn: ['MANUAL', 'Manual', 'manual'] };
            } else {
                where.source = source as string;
            }
        }
        if (assignee) {
            if (assignee === 'unassigned') {
                where.assigned_to = null;
            } else {
                where.assigned_to = assignee as string;
            }
        }

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate as string);
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                where.date.lte = end;
            }
        }

        if (search) {
            where.OR = [
                { name: { contains: search as string } },
                { phone: { contains: search as string } },
                { email: { contains: search as string } },
                { campaign_name: { contains: search as string } }
            ];
        }

        const leads = await prisma.lead.findMany({
            where,
            include: {
                follow_ups: { orderBy: { date: 'asc' } },
                leadNotes: { orderBy: { createdAt: 'desc' } },
                activities: { orderBy: { createdAt: 'desc' } }
            },
            orderBy: { date: 'desc' }
        });

        res.json(leads);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Create Manual Lead
export const createManualLead = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const { name, phone, email, location, campaign_name, quality, stage, notes, tags, conversion_val, assigned_to, group_id } = req.body;

        let finalAssignee = assigned_to || null;

        // Auto-assignment round-robin pick if unassigned
        if (!finalAssignee) {
            const staffUsers = await prisma.user.findMany({
                where: { role: { not: 'CLIENT' } },
                select: { id: true }
            });
            if (staffUsers.length > 0) {
                // Find user with least leads assigned for fair distribution
                const leadsCounts = await Promise.all(staffUsers.map(async u => {
                    const count = await prisma.lead.count({ where: { assigned_to: u.id, client_id: clientId } });
                    return { id: u.id, count };
                }));
                leadsCounts.sort((a, b) => a.count - b.count);
                finalAssignee = leadsCounts[0].id;
            }
        }

        // Determine correct group ID
        const finalGroupId = group_id || (req.crmUser ? req.crmUser.campaign_group_id : null);

        const lead = await prisma.lead.create({
            data: {
                client_id: clientId,
                source: 'MANUAL',
                name,
                phone,
                email,
                location,
                campaign_name,
                group_id: finalGroupId,
                quality: quality || 'MEDIUM',
                stage: stage || 'New Lead',
                status: 'NEW',
                conversion_val: conversion_val ? parseFloat(conversion_val) : 0,
                assigned_to: finalAssignee,
                tags
            }
        });

        // Write first note if present
        const actorId = (req as any).user?.id || req.crmUser?.id || 'SYSTEM';
        const actorName = (req as any).user?.full_name || req.crmUser?.full_name || 'CRM Sales User';
        if (notes) {
            await prisma.leadNote.create({
                data: {
                    lead_id: lead.id,
                    content: notes,
                    user_id: actorId
                }
            });
        }

        // Write Activity Log
        await prisma.leadActivity.create({
            data: {
                lead_id: lead.id,
                action: 'LEAD_CREATED',
                details: `Lead created manually by ${actorName}. Assigned to ${finalAssignee ? 'User ID ' + finalAssignee : 'Unassigned'}.`,
                user_id: actorId !== 'SYSTEM' ? actorId : null
            }
        });

        // Trigger AI scoring asynchronously
        AiSalesEngineService.calculateLeadScore(lead.id).catch(err => console.error('AI Lead Scoring Error:', err));

        res.status(201).json(lead);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Update Lead Details
export const updateLeadDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const { name, phone, email, location, quality, stage, conversion_val, assigned_to, lost_reason, tags } = req.body;

        const existingLead = await prisma.lead.findFirst({ where: { id, client_id: clientId } });
        if (!existingLead) return res.status(404).json({ message: 'Lead not found' });

        const updatedLead = await prisma.lead.update({
            where: { id },
            data: {
                name,
                phone,
                email,
                location,
                quality,
                stage,
                status: stage === 'Converted' ? 'CLOSED' : stage === 'Lost' ? 'LOST' : existingLead.status,
                conversion_val: conversion_val !== undefined ? parseFloat(conversion_val) : undefined,
                assigned_to,
                lost_reason,
                tags,
                updatedAt: new Date()
            }
        });

        // Track what changed for Activity Logs
        const updaterName = (req as any).user?.full_name || req.crmUser?.full_name || 'CRM Sales User';
        const updaterId = (req as any).user?.id || req.crmUser?.id || null;
        const changes: string[] = [];
        if (stage && stage !== existingLead.stage) changes.push(`stage to "${stage}"`);
        if (quality && quality !== existingLead.quality) changes.push(`quality to "${quality}"`);
        if (assigned_to && assigned_to !== existingLead.assigned_to) changes.push(`assignee`);
        if (conversion_val && parseFloat(conversion_val) !== existingLead.conversion_val) changes.push(`conversion value`);
        if (lost_reason && lost_reason !== existingLead.lost_reason) changes.push(`lost reason to "${lost_reason}"`);

        if (changes.length > 0) {
            await prisma.leadActivity.create({
                data: {
                    lead_id: id,
                    action: 'LEAD_UPDATED',
                    details: `Updated ${changes.join(', ')} by ${updaterName}.`,
                    user_id: updaterId
                }
            });
        }

        // Trigger AI scoring asynchronously
        AiSalesEngineService.calculateLeadScore(id).catch(err => console.error('AI Lead Scoring Error:', err));

        res.json(updatedLead);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 5. Bulk Assign Leads
export const bulkAssignLeads = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const { leadIds, userId } = req.body;
        if (!leadIds || !Array.isArray(leadIds) || !userId) {
            return res.status(400).json({ message: 'leadIds array and userId are required' });
        }

        const userRecord = await prisma.user.findUnique({ where: { id: userId } });
        if (!userRecord) return res.status(404).json({ message: 'Target user not found' });

        await prisma.lead.updateMany({
            where: { id: { in: leadIds }, client_id: clientId },
            data: { assigned_to: userId }
        });

        // Log activity for each
        const activities = leadIds.map(leadId => ({
            lead_id: leadId,
            action: 'LEAD_UPDATED',
            details: `Lead bulk-assigned to ${userRecord.full_name} by ${(req as any).user?.full_name || 'SYSTEM'}.`,
            user_id: (req as any).user?.id
        }));

        await prisma.leadActivity.createMany({ data: activities });

        res.json({ message: `Successfully assigned ${leadIds.length} leads to ${userRecord.full_name}.` });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 6. Bulk Update Leads (Stage/Quality)
export const bulkUpdateStatus = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const { leadIds, stage, quality } = req.body;
        if (!leadIds || !Array.isArray(leadIds)) {
            return res.status(400).json({ message: 'leadIds array is required' });
        }

        const data: any = {};
        if (stage) data.stage = stage;
        if (quality) data.quality = quality;

        await prisma.lead.updateMany({
            where: { id: { in: leadIds }, client_id: clientId },
            data
        });

        // Log activities
        const activities = leadIds.map(leadId => ({
            lead_id: leadId,
            action: 'LEAD_UPDATED',
            details: `Lead bulk-updated ${stage ? 'stage to ' + stage : ''} ${quality ? 'quality to ' + quality : ''} by ${(req as any).user?.full_name || 'SYSTEM'}.`,
            user_id: (req as any).user?.id
        }));

        await prisma.leadActivity.createMany({ data: activities });

        res.json({ message: `Successfully updated ${leadIds.length} leads.` });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 6.5. Bulk Delete Leads (Developer Admin Only)
export const bulkDeleteLeads = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const user = (req as any).user;
        if (!user || user.role !== 'DEVELOPER_ADMIN') {
            return res.status(403).json({ message: 'Access Denied: Only Developer Admins can delete leads' });
        }

        const { leadIds } = req.body;
        if (!leadIds || !Array.isArray(leadIds)) {
            return res.status(400).json({ message: 'leadIds array is required' });
        }

        await prisma.lead.deleteMany({
            where: { id: { in: leadIds }, client_id: clientId }
        });

        res.json({ message: `Successfully deleted ${leadIds.length} leads.` });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


// 7. Merge Duplicate Leads
export const mergeLeads = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const { primaryLeadId, duplicateLeadId } = req.body;
        if (!primaryLeadId || !duplicateLeadId) {
            return res.status(400).json({ message: 'primaryLeadId and duplicateLeadId are required' });
        }

        const primary = await prisma.lead.findFirst({ where: { id: primaryLeadId, client_id: clientId } });
        const duplicate = await prisma.lead.findFirst({ where: { id: duplicateLeadId, client_id: clientId } });

        if (!primary || !duplicate) {
            return res.status(404).json({ message: 'One or both leads could not be found' });
        }

        // Migrate notes from duplicate to primary
        await prisma.leadNote.updateMany({
            where: { lead_id: duplicateLeadId },
            data: { lead_id: primaryLeadId }
        });

        // Migrate activities
        await prisma.leadActivity.updateMany({
            where: { lead_id: duplicateLeadId },
            data: { lead_id: primaryLeadId }
        });

        // Migrate follow-ups
        await prisma.leadFollowUp.updateMany({
            where: { lead_id: duplicateLeadId },
            data: { lead_id: primaryLeadId }
        });

        // Append duplicate details to primary notes
        await prisma.leadNote.create({
            data: {
                lead_id: primaryLeadId,
                content: `Merged duplicate lead: Name: ${duplicate.name || 'N/A'}, Phone: ${duplicate.phone || 'N/A'}, Email: ${duplicate.email || 'N/A'}. Date Captured: ${duplicate.date.toISOString()}.`,
                user_id: (req as any).user?.id || 'SYSTEM'
            }
        });

        // Log merge event
        await prisma.leadActivity.create({
            data: {
                lead_id: primaryLeadId,
                action: 'LEAD_UPDATED',
                details: `Lead merged with duplicate (Lead ID: ${duplicateLeadId}) by ${(req as any).user?.full_name || 'SYSTEM'}.`,
                user_id: (req as any).user?.id
            }
        });

        // Delete duplicate lead record
        await prisma.lead.delete({ where: { id: duplicateLeadId } });

        res.json({ message: 'Leads merged successfully.', primaryLeadId });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 8. Import Leads from CSV/Excel
export const importCsvLeads = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const { rows } = req.body; // Expect parsed rows from client
        if (!rows || !Array.isArray(rows)) {
            return res.status(400).json({ message: 'Invalid payload: rows array is required' });
        }

        let imported = 0;
        let skipped = 0;

        for (const row of rows) {
            const { name, phone, email, location, campaign_name, quality, stage, notes, tags } = row;
            if (!name || !phone) {
                skipped++;
                continue;
            }

            // Create lead
            const lead = await prisma.lead.create({
                data: {
                    client_id: clientId,
                    source: 'MANUAL_IMPORT',
                    name,
                    phone: String(phone),
                    email,
                    location,
                    campaign_name,
                    quality: quality || 'MEDIUM',
                    stage: stage || 'New Lead',
                    status: 'NEW',
                    tags
                }
            });

            if (notes) {
                await prisma.leadNote.create({
                    data: {
                        lead_id: lead.id,
                        content: notes,
                        user_id: (req as any).user?.id || 'SYSTEM'
                    }
                });
            }

            await prisma.leadActivity.create({
                data: {
                    lead_id: lead.id,
                    action: 'LEAD_CREATED',
                    details: `Lead imported from file by ${(req as any).user?.full_name || 'SYSTEM'}.`,
                    user_id: (req as any).user?.id
                }
            });

            imported++;
        }

        res.json({ message: `Successfully imported ${imported} leads. Skipped ${skipped} empty rows.`, imported, skipped });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 9. Add Lead Note
export const addLeadNote = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { content, notes } = req.body;
        const noteContent = content || notes;
        if (!noteContent) return res.status(400).json({ message: 'content is required' });

        const noteAuthorId = (req as any).user?.id || req.crmUser?.id || 'SYSTEM';
        const noteAuthorName = (req as any).user?.full_name || req.crmUser?.full_name || 'CRM Sales User';

        const leadNote = await prisma.leadNote.create({
            data: {
                lead_id: id,
                content: noteContent,
                user_id: noteAuthorId
            }
        });

        // Write activity log
        await prisma.leadActivity.create({
            data: {
                lead_id: id,
                action: 'LEAD_UPDATED',
                details: `Added note: "${noteContent.length > 30 ? noteContent.substring(0, 30) + '...' : noteContent}" by ${noteAuthorName}.`,
                user_id: noteAuthorId !== 'SYSTEM' ? noteAuthorId : null
            }
        });

        res.status(201).json(leadNote);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 10. Get Lead Activity Log
export const getLeadActivities = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const activities = await prisma.leadActivity.findMany({
            where: { lead_id: id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(activities);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 11. Follow-ups
export const getFollowUps = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        // Auto-sync campaigns and lead mappings first
        await syncCrmCampaignData(clientId);

        const { assignee, groupId } = req.query;

        const where: any = {
            lead: { 
                client_id: clientId,
                ...(groupId ? { group_id: groupId as string } : {})
            }
        };

        if (assignee) {
            where.lead.assigned_to = assignee as string;
        }

        const followUps = await prisma.leadFollowUp.findMany({
            where,
            include: {
                lead: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                        assigned_to: true,
                        stage: true
                    }
                }
            },
            orderBy: { date: 'asc' }
        });

        const now = new Date();
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

        // Group into Overdue, Today, Upcoming
        const overdue = followUps.filter(f => f.status === 'PENDING' && f.date < todayStart);
        const today = followUps.filter(f => f.status === 'PENDING' && f.date >= todayStart && f.date <= todayEnd);
        const upcoming = followUps.filter(f => f.status === 'PENDING' && f.date > todayEnd);
        const completed = followUps.filter(f => f.status === 'COMPLETED' || f.status === 'DONE');

        res.json({
            overdue,
            today,
            upcoming,
            completed
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 12. Update Follow-up Status
export const updateFollowUpStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body; // status: 'COMPLETED', 'MISSED', 'PENDING'

        const followUp = await prisma.leadFollowUp.update({
            where: { id },
            data: {
                status,
                notes,
                updatedAt: new Date()
            },
            include: { lead: { select: { name: true, assigned_to: true } } }
        });

        // Audit action
        await prisma.leadActivity.create({
            data: {
                lead_id: followUp.lead_id,
                action: 'LEAD_UPDATED',
                details: `Follow-up #${followUp.follow_up_number} status updated to "${status}" by ${(req as any).user?.full_name || 'SYSTEM'}.`,
                user_id: (req as any).user?.id
            }
        });

        res.json(followUp);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 13. Campaign Performance (Connect Campaign Spent with CRM Lead Outcomes)
export const getCampaignCRMPerformance = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        // Auto-sync campaigns and lead mappings first
        await syncCrmCampaignData(clientId);

        const { groupId } = req.query;

        const campaigns = await prisma.marketingCampaign.findMany({
            where: { 
                clientId, 
                platform: 'meta',
                ...(groupId ? { group_id: groupId as string } : {})
            },
            include: {
                marketingMetrics: true,
                leads: true,
                group: true
            }
        });

        const report = campaigns.map(c => {
            const totalSpend = c.marketingMetrics.reduce((acc, curr) => acc + (curr.spend || 0), 0);
            const totalImpressions = c.marketingMetrics.reduce((acc, curr) => acc + (curr.impressions || 0), 0);
            const totalClicks = c.marketingMetrics.reduce((acc, curr) => acc + (curr.clicks || 0), 0);
            
            // CRM Outcomes
            const totalLeads = c.leads.length;
            const convertedLeads = c.leads.filter(l => l.stage === 'Converted' || l.status === 'CONVERTED' || l.status === 'CLOSED').length;
            const lostLeads = c.leads.filter(l => l.stage === 'Lost' || l.status === 'LOST').length;
            const conversionValue = c.leads
                .filter(l => l.stage === 'Converted' || l.status === 'CONVERTED' || l.status === 'CLOSED')
                .reduce((acc, curr) => acc + (curr.conversion_val || 0), 0);

            const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
            const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
            const roas = totalSpend > 0 ? conversionValue / totalSpend : 0;

            return {
                campaignId: c.id,
                name: c.name,
                platform: 'Meta Ads',
                spend: totalSpend,
                impressions: totalImpressions,
                clicks: totalClicks,
                leads: totalLeads,
                convertedLeads,
                lostLeads,
                conversionValue,
                cpl,
                conversionRate,
                roas,
                status: c.status || 'ACTIVE',
                startDate: c.startDate,
                endDate: c.ends,
                groupId: c.group_id,
                groupName: c.group?.name || 'Unassigned'
            };
        });

        res.json(report);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 14. Sync Meta Leads into CRM (Manual + Auto trigger)
export const syncMetaLeadsToCrm = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        // Strategy 1: Find a per-client Meta marketing account (most specific)
        let account = await (prisma as any).marketingAccount.findFirst({
            where: {
                clientId,
                platform: 'meta',
                OR: [
                    { accessToken: { not: null } },
                    { metaTokenId: { not: null } }
                ]
            },
            include: { metaToken: true }
        });

        // Strategy 2: Fall back to ANY active global Meta account (shared token scenario)
        if (!account) {
            account = await (prisma as any).marketingAccount.findFirst({
                where: {
                    platform: 'meta',
                    OR: [
                        { metaTokenId: { not: null } },
                        { accessToken: { not: null } }
                    ]
                },
                include: { metaToken: true }
            });
        }

        // Strategy 3: Try to find any MarketingCampaign for this client on Meta,
        // and use the syncWorker pattern (iterate accounts with no strict clientId requirement)
        if (!account) {
            const anyCampaign = await (prisma as any).marketingCampaign.findFirst({
                where: { clientId, platform: 'meta' }
            });
            if (!anyCampaign) {
                return res.status(404).json({
                    message: 'No Meta Ads integration found for this client. Please connect a Meta account under Marketing → Integrations.'
                });
            }
            // Campaigns exist but no account token found yet
            return res.status(404).json({
                message: 'Meta campaigns exist but no access token is configured. Please reconnect Meta under Marketing → Integrations.'
            });
        }

        // Pull all available lead contact data from Meta (phone, whatsapp, email, name, location)
        const result = await metaLeadsService.syncLeads(clientId, account.externalAccountId);

        // Link synced leads to their campaigns and groups in the CRM
        await syncCrmCampaignData(clientId);

        console.log(`[CRM SyncMeta] Client ${clientId}: synced=${result.synced}, skipped=${result.skipped}`);

        res.json({
            message: result.synced > 0
                ? `Successfully synced ${result.synced} leads from Meta Ads`
                : 'Meta sync complete — no new leads found',
            synced: result.synced,
            skipped: result.skipped
        });
    } catch (error: any) {
        // Extract meaningful error from Meta Graph API axios errors
        const metaError = error.response?.data?.error;
        const detailedMessage = metaError
            ? `Meta API Error: ${metaError.message || metaError.error_user_msg || error.message}`
            : (error.message || 'Failed to sync Meta leads');
        console.error('[CRM SyncMeta] Error:', detailedMessage);
        res.status(500).json({ message: detailedMessage });
    }
};

// 15. Incoming Leads Webhook API (For Landing Pages)
export const handleIncomingWebhookLead = async (req: Request, res: Response) => {
    try {
        const clientId = req.query.clientId as string;
        if (!clientId) {
            return res.status(400).json({ message: 'Missing clientId query parameter' });
        }

        // Verify client exists
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        const { name, phone, email, location, campaign_name, quality, notes, tags, groupId, group_id } = req.body;

        if (!name && !phone && !email) {
            return res.status(400).json({ message: 'Lead must contain at least a name, phone, or email' });
        }

        let finalAssignee = null;

        // Auto-assignment round-robin pick
        const staffUsers = await prisma.user.findMany({
            where: { role: { not: 'CLIENT' } },
            select: { id: true }
        });
        if (staffUsers.length > 0) {
            const leadsCounts = await Promise.all(staffUsers.map(async u => {
                const count = await prisma.lead.count({ where: { assigned_to: u.id, client_id: clientId } });
                return { id: u.id, count };
            }));
            leadsCounts.sort((a, b) => a.count - b.count);
            finalAssignee = leadsCounts[0].id;
        }

        // Validate and resolve group ID if passed
        let finalGroupId: string | null = group_id || groupId || req.query.group_id as string || req.query.groupId as string || null;
        if (finalGroupId) {
            const groupExists = await prisma.marketingGroup.findFirst({
                where: { id: finalGroupId, client_id: clientId }
            });
            if (!groupExists) {
                finalGroupId = null;
            }
        }

        const lead = await prisma.lead.create({
            data: {
                client_id: clientId,
                source: 'WEBHOOK',
                name: name || 'Anonymous Webhook Lead',
                phone: phone ? String(phone) : null,
                email: email ? String(email) : null,
                location: location ? String(location) : null,
                campaign_name: campaign_name ? String(campaign_name) : 'Webhook Landing Page',
                group_id: finalGroupId,
                quality: quality || 'MEDIUM',
                stage: 'New Lead',
                status: 'NEW',
                assigned_to: finalAssignee,
                tags: tags || null
            }
        });

        // Write first note if present
        if (notes) {
            await prisma.leadNote.create({
                data: {
                    lead_id: lead.id,
                    content: notes,
                    user_id: 'SYSTEM'
                }
            });
        }

        // Write Activity Log
        await prisma.leadActivity.create({
            data: {
                lead_id: lead.id,
                action: 'LEAD_CREATED',
                details: `Lead captured via incoming webhook. Assigned to ${finalAssignee ? 'User ID ' + finalAssignee : 'Unassigned'}.`,
                user_id: null
            }
        });

        // Trigger AI scoring asynchronously
        AiSalesEngineService.calculateLeadScore(lead.id).catch(err => console.error('AI Lead Scoring Error:', err));

        res.status(201).json({
            message: 'Lead captured successfully',
            leadId: lead.id
        });
    } catch (error: any) {
        console.error('[Webhook Lead] Error:', error.message);
        res.status(500).json({ message: error.message || 'Failed to capture webhook lead' });
    }
};

// 16. Meta Lead Ads Webhook — Verification (GET)
// Meta calls this endpoint with hub.challenge when you subscribe the app
export const verifyMetaLeadsWebhook = async (req: Request, res: Response) => {
    const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'qixport_meta_leads_verify_2024';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('[MetaWebhook] Verification successful');
        return res.status(200).send(challenge);
    }
    console.warn('[MetaWebhook] Verification failed — token mismatch');
    return res.status(403).json({ message: 'Forbidden: invalid verify token' });
};

// 17. Meta Lead Ads Webhook — Lead Push Handler (POST)
// Meta sends this when a user submits a Lead Ad form
export const handleMetaLeadsWebhook = async (req: Request, res: Response) => {
    // Always return 200 immediately so Meta doesn't retry endlessly
    res.status(200).json({ received: true });

    try {
        const body = req.body;
        if (body.object !== 'page') return;

        for (const entry of (body.entry || [])) {
            const pageId: string = entry.id;

            for (const change of (entry.changes || [])) {
                if (change.field !== 'leadgen') continue;

                const { leadgen_id, form_id, ad_id, campaign_id } = change.value || {};
                if (!leadgen_id) continue;

                console.log(`[MetaWebhook] New lead received: leadgen_id=${leadgen_id}, page=${pageId}`);

                // Get the Page Access Token for this page
                const pageToken = await metaLeadsService.getPageTokenForPage(pageId);
                if (!pageToken) {
                    console.warn(`[MetaWebhook] No page token for page ${pageId}. Lead ${leadgen_id} cannot be fetched.`);
                    continue;
                }

                // Fetch the full lead data
                const leadData = await metaLeadsService.fetchLeadById(leadgen_id, pageToken);
                if (!leadData) {
                    console.warn(`[MetaWebhook] Could not fetch lead ${leadgen_id}`);
                    continue;
                }

                // Find which client this page/campaign belongs to
                let clientId: string | null = null;
                let campaignMap: Record<string, any> = {};

                if (campaign_id) {
                    const campaign = await (prisma as any).marketingCampaign.findFirst({
                        where: { externalCampaignId: campaign_id.toString(), platform: 'meta' }
                    });
                    if (campaign) {
                        clientId = campaign.clientId;
                        // Load all campaigns for this client for mapping
                        const allCamps = await (prisma as any).marketingCampaign.findMany({
                            where: { clientId, platform: 'meta' }
                        });
                        for (const c of allCamps) {
                            if (c.externalCampaignId) campaignMap[c.externalCampaignId] = c;
                        }
                    }
                }

                if (!clientId) {
                    // Fallback: try matching by page → account → client
                    const account = await (prisma as any).marketingAccount.findFirst({
                        where: { platform: 'meta' }
                    });
                    if (account) clientId = account.clientId;
                }

                if (!clientId) {
                    console.warn(`[MetaWebhook] Could not determine clientId for lead ${leadgen_id}`);
                    continue;
                }

                // Enrich lead with known IDs and save
                if (!leadData.campaign_id && campaign_id) leadData.campaign_id = campaign_id;
                if (!leadData.ad_id && ad_id) leadData.ad_id = ad_id;
                if (!leadData.form_id && form_id) leadData.form_id = form_id;

                const saved = await metaLeadsService.saveLead(leadData, clientId, campaignMap);
                if (saved) {
                    console.log(`[MetaWebhook] Lead ${leadgen_id} saved to CRM for client ${clientId}`);
                    // Trigger AI scoring
                    const savedLead = await (prisma as any).lead.findFirst({
                        where: { externalLeadId: leadgen_id.toString() }
                    });
                    if (savedLead?.id) {
                        AiSalesEngineService.calculateLeadScore(savedLead.id).catch(err =>
                            console.error('[MetaWebhook] AI Scoring Error:', err)
                        );
                    }
                }
            }
        }
    } catch (error: any) {
        console.error('[MetaWebhook] Processing error:', error.message);
    }
};

// 18. Subscribe all connected Meta pages to webhook (Admin endpoint)
export const subscribeAllPagesToWebhook = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        if (user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Access Denied: Admin role required' });
        }

        const accounts = await prisma.marketingAccount.findMany({
            where: {
                platform: 'meta',
                OR: [
                    { accessToken: { not: null } },
                    { metaTokenId: { not: null } }
                ]
            },
            include: { metaToken: true }
        });

        const results: Array<{ accountId: string; pageName: string; pageId: string; status: string; error?: string }> = [];

        for (const account of accounts) {
            const userToken = account.metaToken?.access_token || account.accessToken;
            if (!userToken) continue;

            try {
                const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts`, {
                    params: { access_token: userToken, fields: 'id,name,access_token', limit: 100 }
                });
                const pages: any[] = pagesRes.data?.data || [];

                for (const page of pages) {
                    try {
                        await axios.post(
                            `https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`,
                            null,
                            {
                                params: {
                                    access_token: page.access_token,
                                    subscribed_fields: 'leadgen'
                                }
                            }
                        );
                        results.push({
                            accountId: account.id,
                            pageName: page.name,
                            pageId: page.id,
                            status: 'SUBSCRIBED'
                        });
                    } catch (subErr: any) {
                        results.push({
                            accountId: account.id,
                            pageName: page.name,
                            pageId: page.id,
                            status: 'FAILED',
                            error: subErr.response?.data?.error?.message || subErr.message
                        });
                    }
                }
            } catch (pageErr: any) {
                results.push({
                    accountId: account.id,
                    pageName: 'Unknown (Page retrieval failed)',
                    pageId: 'N/A',
                    status: 'FAILED',
                    error: pageErr.response?.data?.error?.message || pageErr.message
                });
            }
        }

        res.json({
            message: `Processed page subscriptions for ${accounts.length} connected accounts`,
            results
        });
    } catch (error: any) {
        console.error('[SubscribeAllPages] Error:', error.message);
        res.status(500).json({ message: error.message || 'Failed to subscribe pages to webhook' });
    }
};

// 19. Sync Meta leads for ALL clients/accounts at once (Admin endpoint)
export const syncAllMetaLeadsToCrm = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        if (user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Access Denied: Admin role required' });
        }

        const clients = await prisma.client.findMany({
            select: { id: true, name: true }
        });

        const syncResults: Array<{ clientName: string; clientId: string; synced: number; skipped: number; error?: string }> = [];

        for (const client of clients) {
            const clientId = client.id;
            
            // Try to find a Meta account for this client
            let account = await (prisma as any).marketingAccount.findFirst({
                where: {
                    clientId,
                    platform: 'meta',
                    OR: [
                        { accessToken: { not: null } },
                        { metaTokenId: { not: null } }
                    ]
                }
            });

            // Fall back to any active Meta account if not found
            if (!account) {
                account = await (prisma as any).marketingAccount.findFirst({
                    where: {
                        platform: 'meta',
                        OR: [
                            { metaTokenId: { not: null } },
                            { accessToken: { not: null } }
                        ]
                    }
                });
            }

            if (!account) {
                syncResults.push({
                    clientName: client.name,
                    clientId,
                    synced: 0,
                    skipped: 0,
                    error: 'No Meta account connected'
                });
                continue;
            }

            try {
                const result = await metaLeadsService.syncLeads(clientId, account.externalAccountId);
                await syncCrmCampaignData(clientId);
                syncResults.push({
                    clientName: client.name,
                    clientId,
                    synced: result.synced,
                    skipped: result.skipped
                });
            } catch (err: any) {
                syncResults.push({
                    clientName: client.name,
                    clientId,
                    synced: 0,
                    skipped: 0,
                    error: err.message
                });
            }
        }

        res.json({
            message: `Manually triggered Meta Leads sync for all clients`,
            results: syncResults
        });
    } catch (error: any) {
        console.error('[SyncAllMetaLeads] Error:', error.message);
        res.status(500).json({ message: error.message || 'Failed to trigger sync' });
    }
};

// 20. Get Meta connection status for the resolved client
export const getMetaConnectionStatus = async (req: Request, res: Response) => {
    try {
        const clientId = getValidatedClientId(req);
        if (!clientId) return res.status(403).json({ message: 'Access Denied: Invalid Client Context' });

        const account = await prisma.marketingAccount.findFirst({
            where: { clientId, platform: 'meta' },
            include: { metaToken: true }
        });

        if (!account) {
            return res.json({ connected: false, status: 'NOT_CONNECTED' });
        }

        const now = new Date();
        const isExpired = account.tokenExpiry && new Date(account.tokenExpiry) < now;
        const profileExpired = account.metaToken?.expires_at && new Date(account.metaToken.expires_at) < now;

        if (isExpired || profileExpired) {
            return res.json({ connected: true, status: 'EXPIRED' });
        }

        res.json({ connected: true, status: 'ACTIVE', accountName: account.metaToken?.account_name });
    } catch (error: any) {
        res.status(500).json({ connected: false, status: 'ERROR', error: error.message });
    }
};

