import type { RecurrencePeriod } from "@/types/models";

/** Готовый вариант повторения — то, что видит пользователь в списке. */
export interface RecurrencePreset {
    /** Стабильный ключ для сравнения и хранения выбора в форме. */
    key: string;
    label: string;
    period: RecurrencePeriod;
    interval: number;
}

/** Набор повторений в том же порядке, что в 1Money. */
export const RECURRENCE_PRESETS: RecurrencePreset[] = [
    { key: "daily-1", label: "Каждый день", period: "daily", interval: 1 },
    { key: "daily-2", label: "Каждые 2 дня", period: "daily", interval: 2 },
    { key: "weekdays", label: "По будням", period: "weekdays", interval: 1 },
    { key: "weekends", label: "По выходным", period: "weekends", interval: 1 },
    { key: "weekly-1", label: "Каждую неделю", period: "weekly", interval: 1 },
    { key: "weekly-2", label: "Каждые 2 недели", period: "weekly", interval: 2 },
    { key: "weekly-4", label: "Каждые 4 недели", period: "weekly", interval: 4 },
    { key: "monthly-1", label: "Каждый месяц", period: "monthly", interval: 1 },
    { key: "monthly-2", label: "Каждые 2 месяца", period: "monthly", interval: 2 },
    { key: "monthly-3", label: "Каждые 3 месяца", period: "monthly", interval: 3 },
    { key: "monthly-6", label: "Каждые 6 месяцев", period: "monthly", interval: 6 },
    { key: "yearly-1", label: "Каждый год", period: "yearly", interval: 1 },
];

export function presetByKey(key: string | null): RecurrencePreset | undefined {
    return key ? RECURRENCE_PRESETS.find((preset) => preset.key === key) : undefined;
}

/** Подпись для уже сохранённого правила: «Каждые 2 недели» или «Каждые 5 · месяц». */
export function describeRecurrence(period: RecurrencePeriod, interval: number): string {
    const preset = RECURRENCE_PRESETS.find((item) => item.period === period && item.interval === interval);
    if (preset) {
        return preset.label;
    }
    const unit = { daily: "дн.", weekly: "нед.", monthly: "мес.", yearly: "г.", weekdays: "будни", weekends: "выходные" }[period];
    return `Каждые ${interval} ${unit}`;
}
