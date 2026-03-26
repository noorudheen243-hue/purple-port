"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingDataNormalizer = void 0;
class MarketingDataNormalizer {
    /**
     * Normalizes an external metric payload into a common format for our database.
     */
    static normalizeMetric(data) {
        var _a;
        // Meta returns date_start, Google returns segments.date
        const rawDate = data.date || data.date_start || ((_a = data.segments) === null || _a === void 0 ? void 0 : _a.date);
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
    static parseNumber(val) {
        if (val === undefined || val === null)
            return 0;
        if (typeof val === 'number')
            return Math.floor(val);
        const parsed = parseInt(val.toString(), 10);
        return isNaN(parsed) ? 0 : parsed;
    }
    static parseFloatNumber(val) {
        if (val === undefined || val === null)
            return 0.0;
        if (typeof val === 'number')
            return val;
        const parsed = parseFloat(val.toString());
        return isNaN(parsed) ? 0.0 : parsed;
    }
}
exports.MarketingDataNormalizer = MarketingDataNormalizer;
