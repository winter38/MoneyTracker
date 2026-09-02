/** Округление до копеек — применяется ко всем результатам сложения сумм. */
export function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Сумма списка с округлением на каждом шаге. */
export function sum(values: number[]): number {
    return round2(values.reduce((acc, value) => acc + value, 0));
}

/**
 * Форматирует сумму как валюту.
 * Валюта и локаль берутся из настроек, поэтому передаются параметрами.
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

/** Компактная запись для крупных чисел на графиках: 12 345 → 12,3 тыс. */
export function formatCompact(value: number, locale: string): string {
    try {
        return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
    } catch {
        return String(Math.round(value));
    }
}

/** Разбирает пользовательский ввод суммы: принимает и запятую, и точку. */
export function parseAmount(input: string | number): number {
    if (typeof input === "number") {
        return round2(input);
    }
    const normalized = input.replace(/\s/g, "").replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? round2(Math.abs(parsed)) : 0;
}
