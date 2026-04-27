import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MARKETING_EXPERTISE } from './expertise';

const prisma = new PrismaClient();

export class IntelCoreService {
    /**
     * Get initialized Gemini model with persona instructions
     */
    private static getModel(personaName: keyof typeof MARKETING_EXPERTISE.PERSONAS = 'DIRECTOR_OF_PERFORMANCE') {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
            throw new Error('GEMINI_API_KEY is not configured.');
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        return genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            // We inject the persona context as system instructions
            systemInstruction: MARKETING_EXPERTISE.PERSONAS[personaName]
        });
    }

    /**
     * Autonomous Reasoning Engine
     * Analyzes context, generates a "Thought" and proposes "Actions"
     */
    static async formulateThought(params: { 
        clientId?: string, 
        type: 'TASK_OPTIMIZATION' | 'BUDGET_ALERT' | 'STRATEGY_DRIFT' | 'DAILY_ANALYSIS',
        context: string,
        persona: keyof typeof MARKETING_EXPERTISE.PERSONAS 
    }) {
        const model = this.getModel(params.persona);
        
        const prompt = `
            CURRENT SITUATION / CONTEXT:
            ${params.context}

            GLOBAL EXPERTISE & BENCHMARKS:
            ${JSON.stringify(MARKETING_EXPERTISE.UNIT_ECONOMICS)}
            ${JSON.stringify(MARKETING_EXPERTISE.MEDIA_ECOSYSTEM)}

            YOUR TASK:
            1. Analyze the context through your persona's lens.
            2. Identify any risks, opportunities, or drift from 2025 performance standards.
            3. Formulate an internal Reasoning statement.
            4. Propose exactly 1-3 actionable steps (Actions) that can be handled by the system.

            AVAILABLE ACTION COMMANDS (The system can execute these):
            - "CREATE_TASK": { "title": string, "description": string, "priority": "HIGH"|"MEDIUM"|"LOW" }
            - "FLAG_CLIENT_REVIEW": { "reason": string }
            - "UPDATE_KPI_TARGET": { "metric": string, "new_target": string }

            RESPONSE FORMAT: 
            Return ONLY a valid JSON object. No markdown.
            {
                "reasoning": "Detailed explanation of your logic...",
                "actions": [
                    { "command": "CREATE_TASK", "params": { ... }, "description": "Human readable summary for the admin" }
                ]
            }
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json|```/g, '').trim();
            const output = JSON.parse(text);

            // Store in Database for oversight
            return await prisma.aiThought.create({
                data: {
                    clientId: params.clientId,
                    type: params.type,
                    reasoning: output.reasoning,
                    actions: {
                        create: output.actions.map((a: any) => ({
                            command: a.command,
                            params_json: JSON.stringify(a.params),
                            status: 'PROPOSED'
                        }))
                    }
                },
                include: { actions: true }
            });
        } catch (error: any) {
            console.error('[INTEL_CORE_THOUGHT_ERROR]', error);
            throw error;
        }
    }

    /**
     * Specific Skill: Paid Ads Tactical Plan Generator
     */
    static async generatePaidAdsStrategy(clientId: string, strategyData: any) {
         const model = this.getModel('DIRECTOR_OF_PERFORMANCE');

         const prompt = `
            GENERATE PAID ADS TACTICAL PLAN
            
            STRATEGY CONTEXT:
            ${JSON.stringify(strategyData)}

            CORE MARKETING KNOWLEDGE:
            ${JSON.stringify(MARKETING_EXPERTISE.MEDIA_ECOSYSTEM)}

            TASK:
            Provide a detailed tactical breakdown for Meta and Google Ads.
            Include:
            - Meta: Campaign structure, creative concepts, Advantage+ setup, hook ideas.
            - Google: PMax signal strategy, key search intent clusters, smart bidding recommendation.
            
            FORMAT: JSON Object
            {
                "meta_tactics": { "structure": "", "creatives": [], "targeting": "" },
                "google_tactics": { "pmax_signals": [], "keywords": [], "bidding": "" }
            }
         `;

         try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json|```/g, '').trim();
            return JSON.parse(text);
         } catch (error: any) {
            console.warn('[INTEL_CORE_ADS_FAILURE] Using fallback paid ads tactics:', error.message);
            return {
                meta_tactics: {
                    structure: "Advantage+ Shopping / Lead Generation Campaigns (1 Campaign, 3-5 Ad Sets)",
                    creatives: ["UGC Style Problem/Solution Video", "Comparison Static Grid", "Customer Transformation Reel"],
                    targeting: "Broad Targeting with Advantage+ Audience signals (India-specific context)"
                },
                google_tactics: {
                    pmax_signals: ["Search Themes (Competitor/Category)", "Customer List Upload", "Interest Segment: Business Services"],
                    keywords: ["marketing solutions india", "performance media agency", "strategic business scaling"],
                    bidding: "Maximize Conversions / tCPA based on industry average"
                }
            };
         }
    }

    /**
     * Proactive Daily Audit Logic
     * Fetches all active clients, compares Strategy vs Execution, and flags issues.
     */
    static async performDailyAudit(clientId?: string) {
        const where: any = { status: 'ACTIVE' };
        if (clientId) where.id = clientId;

        const clients = await prisma.client.findMany({
            where,
            include: {
                strategy_outputs: true,
                marketingCampaigns: {
                    where: { status: { in: ['ACTIVE', 'ENABLED'] } },
                    include: {
                        marketingMetrics: {
                            where: { date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Last 7 days
                        }
                    }
                }
            }
        });

        const results = [];

        for (const client of clients) {
            if (!client.strategy_outputs || client.marketingCampaigns.length === 0) continue;

            const context = `
                CLIENT: ${client.name}
                STRATEGY GOALS (KPI Targets): ${client.strategy_outputs.kpi_targets}
                
                RECENT CAMPAIGNS & METRICS (Last 7 Days):
                ${client.marketingCampaigns.map(c => `
                    - Campaign: ${c.name} (${c.platform})
                    - Metrics: ${JSON.stringify(c.marketingMetrics)}
                `).join('\n')}
            `;

            const thought = await this.formulateThought({
                clientId: client.id,
                type: 'DAILY_ANALYSIS',
                context,
                persona: 'DIRECTOR_OF_PERFORMANCE'
            });

            results.push({ clientId: client.id, thoughtId: thought.id });
        }

        return results;
    }

    /**
     * Get all pending thoughts and actions for the UI Command Center
     */
    static async getPendingIntelligence(clientId?: string) {
        return await prisma.aiThought.findMany({
            where: clientId ? { clientId } : {},
            include: { actions: true, client: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
    }

    /**
     * Approve and Execute an AI Action
     */
    static async approveAction(actionId: string) {
        const action = await prisma.aiAction.findUnique({
            where: { id: actionId },
            include: { thought: true }
        });

        if (!action || action.status !== 'PROPOSED') {
            throw new Error('Action not found or already processed.');
        }

        const params = JSON.parse(action.params_json);

        // EXECUTION LOGIC (The "Hands")
        if (action.command === 'CREATE_TASK') {
            // Find a Developer Admin to act as reporter
            const admin = await prisma.user.findFirst({
                where: { role: 'DEVELOPER_ADMIN' }
            });

            if (!admin) throw new Error('No DEVELOPER_ADMIN found to report the task.');

            await (prisma as any).task.create({
                data: {
                    title: `[AI PROPOSED] ${params.title}`,
                    description: `${params.description}\n\nGenerated by AI Core: ${action.thought.reasoning}`,
                    priority: params.priority || 'MEDIUM',
                    status: 'TODO',
                    client_id: action.thought.clientId,
                    reporter_id: admin.id
                }
            });
        }

        // Mark as Executed
        return await prisma.aiAction.update({
            where: { id: actionId },
            data: { 
                status: 'EXECUTED',
                executedAt: new Date()
            }
        });
    }

    static async ignoreAction(actionId: string) {
        return await prisma.aiAction.update({
            where: { id: actionId },
            data: { status: 'IGNORED' }
        });
    }
}
