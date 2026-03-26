export interface ExternalMarketingMetric {
    date: string; // ISO format or YYYY-MM-DD
    impressions?: number | string;
    clicks?: number | string;
    spend?: number | string;
    conversions?: number | string;
    reach?: number | string;      // New
    results?: number | string;    // New
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
