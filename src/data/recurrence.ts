import type { RecurrencePeriod } from "@/types/models";

/** A ready-made repeat option - what the user sees in the list. */
export interface RecurrencePreset {
    /** A stable key for comparing and for storing the choice in the form. */
    key: string;
    label: string;
    period: RecurrencePeriod;
    interval: number;
}

/** The repeat options, in the same order as in 1Money. */
export const RECURRENCE_PRESETS: RecurrencePreset[] = [
    { key: "daily-1", label: "Every day", period: "daily", interval: 1 },
    { key: "daily-2", label: "Every 2 days", period: "daily", interval: 2 },
    { key: "weekdays", label: "On weekdays", period: "weekdays", interval: 1 },
    { key: "weekends", label: "On weekends", period: "weekends", interval: 1 },
    { key: "weekly-1", label: "Every week", period: "weekly", interval: 1 },
    { key: "weekly-2", label: "Every 2 weeks", period: "weekly", interval: 2 },
    { key: "weekly-4", label: "Every 4 weeks", period: "weekly", interval: 4 },
    { key: "monthly-1", label: "Every month", period: "monthly", interval: 1 },
    { key: "monthly-2", label: "Every 2 months", period: "monthly", interval: 2 },
    { key: "monthly-3", label: "Every 3 months", period: "monthly", interval: 3 },
    { key: "monthly-6", label: "Every 6 months", period: "monthly", interval: 6 },
    { key: "yearly-1", label: "Every year", period: "yearly", interval: 1 },
];

export function presetByKey(key: string | null): RecurrencePreset | undefined {
    return key ? RECURRENCE_PRESETS.find((preset) => preset.key === key) : undefined;
}

/** A label for an already saved rule: "Every 2 weeks" or "Every 5 months". */
export function describeRecurrence(period: RecurrencePeriod, interval: number): string {
    const preset = RECURRENCE_PRESETS.find((item) => item.period === period && item.interval === interval);
    if (preset) {
        return preset.label;
    }
    const unit = { daily: "days", weekly: "weeks", monthly: "months", yearly: "years", weekdays: "weekdays", weekends: "weekends" }[period];
    return `Every ${interval} ${unit}`;
}
