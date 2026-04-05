export interface ExternalMarketingMetric {
    date: string; // ISO format or YYYY-MM-DD
    impressions?: number | string;
    clicks?: number | string;
    spend?: number | string;
    conversions?: number | string;
    reach?: number | string;      // New
    results?: number | string;    // New
    results_cost?: number | string; // New: Cost per result
    conversations?: number | string; // New
    messaging_conversations?: number | string; // New
    new_messaging_contacts?: number | string; // New
    purchases?: number | string; // New
    cost_per_purchase?: number | string; // New
    ctr?: number | string;
    cpc?: number | string;
    cpm?: number | string;
}

export interface NormalizedMarketingMetric {
    date: Date;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    reach: number;
    results: number;
    results_cost: number;
    conversations: number;
    messaging_conversations: number;
    new_messaging_contacts: number;
    purchases: number;
    cost_per_purchase: number;
    ctr: number;
    cpc: number;
    cpm: number;
}

export class MarketingDataNormalizer {

    /**
     * Normalizes an external metric payload into a common format for our database.
     */
    public static normalizeMetric(data: ExternalMarketingMetric): NormalizedMarketingMetric {
        // Meta returns date_start, Google returns segments.date
        const rawDate = data.date || (data as any).date_start || (data as any).segments?.date;

        // Defensive date parsing
        let parsedDate = new Date(rawDate);
        if (!rawDate || isNaN(parsedDate.getTime())) {
            // Fallback to today but it should ideally be skipped by the worker
            parsedDate = new Date();
        }

        return {
            date: parsedDate,
            impressions: this.parseNumber(data.impressions),
            clicks: this.parseNumber(data.clicks),
            spend: this.parseFloatNumber(data.spend),
            conversions: this.parseNumber(data.conversions),
            reach: this.parseNumber(data.reach),
            results: this.parseNumber(data.results),
            results_cost: this.parseFloatNumber(data.results_cost || (data as any).cost_per_result),
            conversations: this.parseNumber(data.conversations),
            messaging_conversations: this.parseNumber(data.messaging_conversations || (data as any).conversations),
            new_messaging_contacts: this.parseNumber(data.new_messaging_contacts),
            purchases: this.parseNumber(data.purchases),
            cost_per_purchase: this.parseFloatNumber(data.cost_per_purchase),
            ctr: this.parseFloatNumber(data.ctr),
            cpc: this.parseFloatNumber(data.cpc),
            cpm: this.parseFloatNumber(data.cpm),
        };
    }

    private static parseNumber(val: any): number {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'number') return Math.floor(val);
        const parsed = parseInt(val.toString(), 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    private static parseFloatNumber(val: any): number {
        if (val === undefined || val === null) return 0.0;
        if (typeof val === 'number') return val;
        const parsed = parseFloat(val.toString());
        return isNaN(parsed) ? 0.0 : parsed;
    }
}
