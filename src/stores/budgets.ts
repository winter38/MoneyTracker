import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import type { Budget } from "@/types/models";
import { STORAGE_KEYS, loadState, saveState } from "@/utils/storage";
import { round2 } from "@/utils/money";

const STORAGE_KEY = STORAGE_KEYS.budgets;

export const useBudgetsStore = defineStore("budgets", () => {
    const items = ref<Budget[]>(loadState<Budget[]>(STORAGE_KEY, []));

    watch(items, (value) => saveState(STORAGE_KEY, value), { deep: true });

    /** The planned amount for a group; 0 means no plan is set. */
    function amountFor(groupId: string): number {
        return items.value.find((item) => item.groupId === groupId)?.amount ?? 0;
    }

    /** Sets a plan; zero or a negative value removes the entry. */
    function set(groupId: string, amount: number): void {
        const value = round2(Math.max(0, amount));
        const index = items.value.findIndex((item) => item.groupId === groupId);
        if (value <= 0) {
            if (index !== -1) {
                items.value.splice(index, 1);
            }
            return;
        }
        if (index === -1) {
            items.value.push({ groupId, amount: value });
        } else {
            items.value[index] = { groupId, amount: value };
        }
    }

    /** The total plan across a list of groups - used in the Budget tab totals. */
    function totalFor(groupIds: string[]): number {
        return round2(groupIds.reduce((acc, groupId) => acc + amountFor(groupId), 0));
    }

    const hasAny = computed(() => items.value.length > 0);

    function replaceAll(value: Budget[]): void {
        items.value = value;
    }

    return { items, amountFor, set, totalFor, hasAny, replaceAll };
});
