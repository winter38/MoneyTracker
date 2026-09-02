import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { endOfPeriod, fromISODate, startOfPeriod, toISODate, today } from "@/utils/date";
import { useSettingsStore } from "@/stores/settings";

/**
 * The current billing month - shared by every tab.
 *
 * A store rather than a composable: the period is picked once in the header and must persist
 * while moving between Categories, Budget and Overview, the way any finance tracker does it.
 */
export const usePeriodStore = defineStore("period", () => {
    const settings = useSettingsStore();
    const anchor = ref(today());

    const from = computed(() => startOfPeriod(anchor.value, settings.monthStartDay));
    const to = computed(() => endOfPeriod(anchor.value, settings.monthStartDay));

    /** "August 2026", capitalised. */
    const label = computed(() => {
        const text = fromISODate(from.value).toLocaleDateString(settings.locale, { month: "long", year: "numeric" });
        return text.charAt(0).toUpperCase() + text.slice(1);
    });

    /** The number of days in the period - shown in the circle left of the month name. */
    const days = computed(() => {
        const start = fromISODate(from.value).getTime();
        const end = fromISODate(to.value).getTime();
        return Math.round((end - start) / 86_400_000) + 1;
    });

    const isCurrent = computed(() => from.value === startOfPeriod(today(), settings.monthStartDay));

    function shift(months: number): void {
        const date = fromISODate(from.value);
        date.setMonth(date.getMonth() + months);
        anchor.value = toISODate(date);
    }

    function reset(): void {
        anchor.value = today();
    }

    return { anchor, from, to, label, days, isCurrent, shift, reset };
});
