import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import type { Settings } from "@/types/models";
import { STORAGE_KEYS, loadState } from "@/utils/storage";
import { persist } from "@/utils/persist";
import { formatCompact, formatMoney } from "@/utils/money";

/** Amounts at or above this are abbreviated where space is tight. */
const COMPACT_FROM = 100_000;

const DEFAULTS: Settings = {
    currency: "EUR",
    locale: "en-GB",
    theme: "auto",
    monthStartDay: 1,
};

export const useSettingsStore = defineStore("settings", () => {
    const state = ref<Settings>({ ...DEFAULTS, ...loadState<Partial<Settings>>(STORAGE_KEYS.settings, {}) });

    persist(STORAGE_KEYS.settings, state);

    const currency = computed(() => state.value.currency);
    const locale = computed(() => state.value.locale);
    const monthStartDay = computed(() => state.value.monthStartDay);

    /** The currency symbol ("EUR", "USD") - for large amounts shown next to the number. */
    const currencySymbol = computed(() => {
        try {
            const parts = new Intl.NumberFormat(state.value.locale, { style: "currency", currency: state.value.currency }).formatToParts(0);
            return parts.find((part) => part.type === "currency")?.value ?? state.value.currency;
        } catch {
            return state.value.currency;
        }
    });

    /** Formats an amount in the current currency - the most used helper in the views. */
    const money = computed(
        () => (value: number, options?: Intl.NumberFormatOptions) => formatMoney(value, state.value.currency, state.value.locale, options),
    );

    /**
     * Money for the tight spots - the summary tiles and the category ring, where three amounts
     * share the width of a phone. Past six figures the full number either collides with its
     * neighbour or wraps mid-digits, so it is abbreviated ("1.2M EUR"); the exact figure is
     * always a scroll away in the list below.
     */
    const compactMoney = computed(
        () => (value: number) =>
            Math.abs(value) >= COMPACT_FROM ? `${formatCompact(value, state.value.locale)} ${currencySymbol.value}` : money.value(value),
    );

    function update(patch: Partial<Settings>): void {
        state.value = { ...state.value, ...patch };
    }

    /** Applies the theme to <html>: Element Plus switches via the `dark` class. */
    function applyTheme(): void {
        const wantsDark =
            state.value.theme === "dark" || (state.value.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.classList.toggle("dark", wantsDark);
    }

    watch(() => state.value.theme, applyTheme, { immediate: false });

    return {
        state,
        currency,
        currencySymbol,
        locale,
        monthStartDay,
        money,
        compactMoney,
        update,
        applyTheme,
        replaceAll: (value: Settings) => (state.value = value),
    };
});
