import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import type { RecurringRule } from "@/types/models";
import { STORAGE_KEYS, loadState, saveState } from "@/utils/storage";
import { createId } from "@/utils/id";
import { addPeriod, today } from "@/utils/date";
import { useTransactionsStore } from "@/stores/transactions";

export const useRecurringStore = defineStore("recurring", () => {
    const items = ref<RecurringRule[]>(loadState<RecurringRule[]>(STORAGE_KEYS.recurring, []));

    watch(items, (value) => saveState(STORAGE_KEYS.recurring, value), { deep: true });

    const active = computed(() => items.value.filter((rule) => rule.active).sort((a, b) => (a.nextDate < b.nextDate ? -1 : 1)));

    function byId(id: string): RecurringRule | undefined {
        return items.value.find((rule) => rule.id === id);
    }

    function add(payload: Omit<RecurringRule, "id" | "nextDate"> & { nextDate?: string }): RecurringRule {
        const rule: RecurringRule = { ...payload, id: createId(), nextDate: payload.nextDate ?? payload.startDate };
        items.value.push(rule);
        return rule;
    }

    function update(id: string, patch: Partial<RecurringRule>): void {
        const index = items.value.findIndex((rule) => rule.id === id);
        if (index !== -1) {
            items.value[index] = { ...items.value[index], ...patch };
        }
    }

    function remove(id: string): void {
        items.value = items.value.filter((rule) => rule.id !== id);
    }

    /**
     * Досоздаёт операции по всем правилам, у которых срок наступил.
     * Вызывается один раз при запуске приложения: если ты не заходил неделю,
     * за эту неделю операции создадутся разом.
     *
     * @returns сколько операций было создано.
     */
    function materializeDue(): number {
        const transactions = useTransactionsStore();
        const now = today();
        let created = 0;
        // Ограничитель на случай кривых данных (interval = 0 и т.п.) — не даём зациклиться.
        const MAX_STEPS_PER_RULE = 500;

        items.value.forEach((rule) => {
            if (!rule.active || rule.interval < 1) {
                return;
            }
            let cursor = rule.nextDate;
            let steps = 0;
            while (cursor <= now && (!rule.endDate || cursor <= rule.endDate) && steps < MAX_STEPS_PER_RULE) {
                transactions.add({
                    kind: rule.kind,
                    amount: rule.amount,
                    date: cursor,
                    accountId: rule.accountId,
                    toAccountId: rule.toAccountId,
                    groupId: rule.groupId,
                    subcategoryId: rule.subcategoryId,
                    note: rule.note || rule.title,
                    recurringId: rule.id,
                });
                created += 1;
                steps += 1;
                cursor = addPeriod(cursor, rule.period, rule.interval);
            }
            if (cursor !== rule.nextDate) {
                update(rule.id, { nextDate: cursor });
            }
            if (rule.endDate && cursor > rule.endDate) {
                update(rule.id, { active: false });
            }
        });

        return created;
    }

    function replaceAll(value: RecurringRule[]): void {
        items.value = value;
    }

    return { items, active, byId, add, update, remove, materializeDue, replaceAll };
});
