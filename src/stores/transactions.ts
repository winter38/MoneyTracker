import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import type { Transaction, TxKind } from "@/types/models";
import { STORAGE_KEYS, loadState, saveState } from "@/utils/storage";
import { createId } from "@/utils/id";
import { round2 } from "@/utils/money";
import { monthKey } from "@/utils/date";

/** Фильтр списка операций. Пустые поля означают «не фильтровать». */
export interface TxFilter {
    kinds?: TxKind[];
    accountIds?: string[];
    groupIds?: string[];
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

export const useTransactionsStore = defineStore("transactions", () => {
    const items = ref<Transaction[]>(loadState<Transaction[]>(STORAGE_KEYS.transactions, []));

    watch(items, (value) => saveState(STORAGE_KEYS.transactions, value), { deep: true });

    /** Все операции от новых к старым. */
    const sorted = computed(() =>
        [...items.value].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)),
    );

    function byId(id: string): Transaction | undefined {
        return items.value.find((tx) => tx.id === id);
    }

    /** Изменение баланса счёта за всю историю: расход и исходящий перевод минусуют, доход и входящий плюсуют. */
    function deltaForAccount(accountId: string): number {
        return round2(
            items.value.reduce((acc, tx) => {
                if (tx.kind === "income" && tx.accountId === accountId) {
                    return acc + tx.amount;
                }
                if (tx.kind === "expense" && tx.accountId === accountId) {
                    return acc - tx.amount;
                }
                if (tx.kind === "transfer") {
                    if (tx.accountId === accountId) {
                        return acc - tx.amount;
                    }
                    if (tx.toAccountId === accountId) {
                        return acc + tx.amount;
                    }
                }
                return acc;
            }, 0),
        );
    }

    function inRange(dateFrom: string, dateTo: string): Transaction[] {
        return sorted.value.filter((tx) => tx.date >= dateFrom && tx.date <= dateTo);
    }

    /** Сумма расходов/доходов за период. Переводы намеренно не считаются — это не траты. */
    function totalOf(kind: Exclude<TxKind, "transfer">, dateFrom: string, dateTo: string): number {
        return round2(
            inRange(dateFrom, dateTo)
                .filter((tx) => tx.kind === kind)
                .reduce((acc, tx) => acc + tx.amount, 0),
        );
    }

    function filter(options: TxFilter): Transaction[] {
        const search = options.search?.trim().toLowerCase();
        return sorted.value.filter((tx) => {
            if (options.kinds?.length && !options.kinds.includes(tx.kind)) {
                return false;
            }
            if (options.accountIds?.length && !options.accountIds.includes(tx.accountId) && !options.accountIds.includes(tx.toAccountId ?? "")) {
                return false;
            }
            if (options.groupIds?.length && !options.groupIds.includes(tx.groupId ?? "")) {
                return false;
            }
            if (options.dateFrom && tx.date < options.dateFrom) {
                return false;
            }
            if (options.dateTo && tx.date > options.dateTo) {
                return false;
            }
            if (search && !tx.note.toLowerCase().includes(search) && !String(tx.amount).includes(search)) {
                return false;
            }
            return true;
        });
    }

    /** Группировка по дню для списка операций. */
    function groupByDay(list: Transaction[]): { date: string; items: Transaction[] }[] {
        const map = new Map<string, Transaction[]>();
        list.forEach((tx) => {
            const bucket = map.get(tx.date) ?? [];
            bucket.push(tx);
            map.set(tx.date, bucket);
        });
        return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([date, dayItems]) => ({ date, items: dayItems }));
    }

    /** Суммы по месяцам для отчётов: { "2026-08": { expense, income } }. */
    function monthlyTotals(): Record<string, { expense: number; income: number }> {
        const result: Record<string, { expense: number; income: number }> = {};
        items.value.forEach((tx) => {
            if (tx.kind === "transfer") {
                return;
            }
            const key = monthKey(tx.date);
            result[key] ??= { expense: 0, income: 0 };
            result[key][tx.kind] = round2(result[key][tx.kind] + tx.amount);
        });
        return result;
    }

    /** Суммы по группам категорий за период — источник для круговой диаграммы. */
    function totalsByGroup(kind: Exclude<TxKind, "transfer">, dateFrom: string, dateTo: string): Record<string, number> {
        const result: Record<string, number> = {};
        inRange(dateFrom, dateTo)
            .filter((tx) => tx.kind === kind)
            .forEach((tx) => {
                const key = tx.groupId ?? "none";
                result[key] = round2((result[key] ?? 0) + tx.amount);
            });
        return result;
    }

    /** Суммы по подкатегориям внутри одной группы за период. */
    function totalsBySubcategory(groupId: string, dateFrom: string, dateTo: string): Record<string, number> {
        const result: Record<string, number> = {};
        inRange(dateFrom, dateTo)
            .filter((tx) => tx.groupId === groupId)
            .forEach((tx) => {
                const key = tx.subcategoryId ?? "none";
                result[key] = round2((result[key] ?? 0) + tx.amount);
            });
        return result;
    }

    function add(payload: Omit<Transaction, "id" | "createdAt">): Transaction {
        const tx: Transaction = { ...payload, id: createId(), createdAt: Date.now() };
        items.value.push(tx);
        return tx;
    }

    function update(id: string, patch: Partial<Transaction>): void {
        const index = items.value.findIndex((tx) => tx.id === id);
        if (index !== -1) {
            items.value[index] = { ...items.value[index], ...patch };
        }
    }

    function remove(id: string): void {
        items.value = items.value.filter((tx) => tx.id !== id);
    }

    function removeByAccount(accountId: string): void {
        items.value = items.value.filter((tx) => tx.accountId !== accountId && tx.toAccountId !== accountId);
    }

    function replaceAll(value: Transaction[]): void {
        items.value = value;
    }

    return {
        items,
        sorted,
        byId,
        deltaForAccount,
        inRange,
        totalOf,
        filter,
        groupByDay,
        monthlyTotals,
        totalsByGroup,
        totalsBySubcategory,
        add,
        update,
        remove,
        removeByAccount,
        replaceAll,
    };
});
