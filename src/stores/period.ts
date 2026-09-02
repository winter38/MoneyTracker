import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { endOfPeriod, fromISODate, startOfPeriod, toISODate, today } from "@/utils/date";
import { useSettingsStore } from "@/stores/settings";

/**
 * Текущий расчётный месяц — общий для всех вкладок.
 *
 * Стор, а не композабл: период выбирается один раз в шапке и должен сохраняться
 * при переходе между «Категориями», «Бюджетом» и «Обзором», как в 1Money.
 */
export const usePeriodStore = defineStore("period", () => {
    const settings = useSettingsStore();
    const anchor = ref(today());

    const from = computed(() => startOfPeriod(anchor.value, settings.monthStartDay));
    const to = computed(() => endOfPeriod(anchor.value, settings.monthStartDay));

    /** «Август 2026» с заглавной буквы. */
    const label = computed(() => {
        const text = fromISODate(from.value).toLocaleDateString(settings.locale, { month: "long", year: "numeric" });
        return text.charAt(0).toUpperCase() + text.slice(1);
    });

    /** Число дней в периоде — показывается кружком слева от названия месяца. */
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
