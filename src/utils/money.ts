/** Rounds to cents - applied to every result of adding amounts up. */
export function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Sum of a list, rounded at every step. */
export function sum(values: number[]): number {
    return round2(values.reduce((acc, value) => acc + value, 0));
}

/**
 * Formats an amount as currency.
 * Currency and locale come from the settings, hence they are passed in as arguments.
 */
export function formatMoney(value: number, currency: string, locale: string, options: Intl.NumberFormatOptions = {}): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            ...options,
        }).format(value);
    } catch {
        return `${value.toFixed(2)} ${currency}`;
    }
}

/** Compact notation for large numbers on charts: 12 345 -> 12.3K. */
export function formatCompact(value: number, locale: string): string {
    try {
        return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
    } catch {
        return String(Math.round(value));
    }
}

/** Parses a user-entered amount: accepts both a comma and a dot as the decimal separator. */
export function parseAmount(input: string | number): number {
    if (typeof input === "number") {
        return round2(input);
    }
    const normalized = input.replace(/\s/g, "").replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? round2(Math.abs(parsed)) : 0;
}
