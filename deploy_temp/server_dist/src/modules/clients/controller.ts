import { Request, Response } from 'express';
import { z } from 'zod';
import * as clientService from './service';

const createClientSchema = z.object({
    name: z.string().min(2),
    industry: z.string().optional().or(z.literal('')),
    status: z.enum(['LEAD', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'INACTIVE']).default('LEAD'),
    brand_colors: z.any().optional(),
    logo_url: z.string().optional().or(z.literal('')),

    // Core Contacts
    contact_person: z.string().optional().or(z.literal('')),
    contact_number: z.string().optional().or(z.literal('')),
    company_email: z.string().email().optional().or(z.literal('')).or(z.undefined()),
    address: z.string().optional().or(z.literal('')).or(z.undefined()), // Added Address

    // Operating Location
    operating_locations: z.array(z.object({
        country: z.string(),
        state: z.string().optional()
    })).optional(),

    // Extended JSON Fields
    service_engagement: z.array(z.string()).optional(),
    social_links: z.record(z.string()).optional(),
    competitor_info: z.array(z.object({
        name: z.string(),
        website: z.string().optional(),
        socials: z.record(z.string()).optional()
    })).optional(),
    customer_avatar: z.object({
        description: z.string().optional(),
        demographics: z.string().optional(),
        pain_points: z.string().optional(),
        buying_intent: z.string().optional()
    }).optional(),

    account_manager_id: z.string().optional().or(z.literal('')),
    assigned_staff_ids: z.array(z.string()).optional(),

    // Ad Accounts
    ad_accounts: z.array(z.object({
        platform: z.enum(['GOOGLE', 'META', 'LINKEDIN', 'TIKTOK', 'OTHER']).default('META'),
        name: z.string(),
        external_id: z.string(),
        status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
    })).optional(),

    content_strategies: z.array(z.object({
        type: z.string(),
        quantity: z.number().min(0)
    })).optional(),

    // Ledger Options
    ledger_options: z.object({
        create: z.boolean(),
        head_id: z.string().optional()
    }).optional()
});

export const createClient = async (req: Request, res: Response) => {
    try {
        const validatedData = createClientSchema.parse(req.body);

        // Transform JSON objects to Strings for SQLite
        // AND Clean empty strings to undefined
        const dbData: any = {
            ...validatedData,
            account_manager_id: validatedData.account_manager_id || undefined, // Fix empty string UUID error
            logo_url: validatedData.logo_url || undefined,
            industry: validatedData.industry || undefined,
            contact_person: validatedData.contact_person || undefined,
            contact_number: validatedData.contact_number || undefined,
            company_email: validatedData.company_email || undefined,
            address: validatedData.address || undefined, // Added Address

            operating_locations_json: validatedData.operating_locations ? JSON.stringify(validatedData.operating_locations) : undefined,
            service_engagement: validatedData.service_engagement ? JSON.stringify(validatedData.service_engagement) : undefined,
            social_links: validatedData.social_links ? JSON.stringify(validatedData.social_links) : undefined,
            competitor_info: validatedData.competitor_info ? JSON.stringify(validatedData.competitor_info) : undefined,
            customer_avatar: validatedData.customer_avatar ? JSON.stringify(validatedData.customer_avatar) : undefined,
        };

        // Remove the virtual field 'assigned_staff_ids' and 'ad_accounts' from direct mapping, handle in service
        // Remove relations from direct mapping
        delete dbData.assigned_staff_ids;
        delete dbData.ad_accounts;
        delete dbData.content_strategies; // Prevent Prisma Unknown Argument Error
        delete dbData.operating_locations; // Remove array field
        delete dbData.ledger_options; // Remove from Client Data

        const client = await clientService.createClient(dbData, validatedData.assigned_staff_ids, validatedData.ad_accounts, validatedData.ledger_options);

        // Handle Content Strategy Creation
        if (validatedData.content_strategies && validatedData.content_strategies.length > 0) {
            await clientService.upsertContentStrategy(client.id, validatedData.content_strategies);
        }

        res.status(201).json(client);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: error.errors });
        } else {
            console.error(error);
            res.status(500).json({ message: error.message });
        }
    }
};

export const getClients = async (req: Request, res: Response) => {
    try {
        const clients = await clientService.getClients();
        res.json(clients);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getClientById = async (req: Request, res: Response) => {
    try {
        const client = await clientService.getClientById(req.params.id);
        if (!client) {
            res.status(404).json({ message: 'Client not found' });
            return;
        }
        res.json(client);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateClient = async (req: Request, res: Response) => {
    try {
        const validatedData = req.body; // Partial validation possible

        // Transform JSON objects to Strings for SQLite
        const dbData: any = {
            ...validatedData,
        };

        if (validatedData.service_engagement) dbData.service_engagement = validatedData.service_engagement;
        if (validatedData.social_links) dbData.social_links = validatedData.social_links;
        if (validatedData.competitor_info) dbData.competitor_info = validatedData.competitor_info;
        if (validatedData.customer_avatar) dbData.customer_avatar = validatedData.customer_avatar;
        if (validatedData.operating_locations) {
            dbData.operating_locations = validatedData.operating_locations;
        }

        // Ensure ad_accounts is passed through if present
        if (validatedData.ad_accounts) dbData.ad_accounts = validatedData.ad_accounts;

        const client = await clientService.updateClient(req.params.id, dbData);

        // Handle Content Strategy Upsert
        if (validatedData.content_strategies) {
            await clientService.upsertContentStrategy(req.params.id, validatedData.content_strategies);
        }

        res.json(client);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteClient = async (req: Request, res: Response) => {
    try {
        await clientService.deleteClient(req.params.id);
        res.json({ message: 'Client deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const generateCredentials = async (req: Request, res: Response) => {
    try {
        const results = await clientService.generateClientCredentials();
        res.json(results);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const listCredentials = async (req: Request, res: Response) => {
    try {
        const credentials = await clientService.getClientCredentials();
        res.json(credentials);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateCredentials = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        const result = await clientService.updateClientCredentials(req.params.id, { username, password });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getNextCode = async (req: Request, res: Response) => {
    try {
        const code = await clientService.getNextClientCode();
        res.json({ code });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
