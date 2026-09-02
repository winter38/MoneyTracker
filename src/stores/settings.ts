import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import type { Settings } from "@/types/models";
import { STORAGE_KEYS, loadState, saveState } from "@/utils/storage";
import { formatMoney } from "@/utils/money";

const DEFAULTS: Settings = {
    currency: "EUR",
    locale: "en-GB",
    theme: "auto",
    monthStartDay: 1,
};

export const useSettingsStore = defineStore("settings", () => {
    const state = ref<Settings>({ ...DEFAULTS, ...loadState<Partial<Settings>>(STORAGE_KEYS.settings, {}) });

    watch(state, (value) => saveState(STORAGE_KEYS.settings, value), { deep: true });

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
        update,
        applyTheme,
        replaceAll: (value: Settings) => (state.value = value),
    };
});
