import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import type { Account } from "@/types/models";
import { STORAGE_KEYS, loadState, saveState } from "@/utils/storage";
import { createId } from "@/utils/id";
import { round2 } from "@/utils/money";
import { useTransactionsStore } from "@/stores/transactions";

export const useAccountsStore = defineStore("accounts", () => {
    const items = ref<Account[]>(loadState<Account[]>(STORAGE_KEYS.accounts, []));

    watch(items, (value) => saveState(STORAGE_KEYS.accounts, value), { deep: true });

    const active = computed(() => items.value.filter((account) => !account.archived).sort((a, b) => a.order - b.order));
    const all = computed(() => [...items.value].sort((a, b) => a.order - b.order));

    function byId(id: string | undefined): Account | undefined {
        return id ? items.value.find((account) => account.id === id) : undefined;
    }

    /** Current balance: the initial balance plus the movement across all of the account transactions. */
    function balanceOf(accountId: string): number {
        const account = byId(accountId);
        if (!account) {
            return 0;
        }
        const transactions = useTransactionsStore();
        return round2(account.initialBalance + transactions.deltaForAccount(accountId));
    }

    const totalBalance = computed(() => round2(active.value.reduce((acc, account) => acc + balanceOf(account.id), 0)));

    function add(payload: Omit<Account, "id" | "order" | "archived">): Account {
        const account: Account = {
            ...payload,
            id: createId(),
            archived: false,
            order: items.value.length,
        };
        items.value.push(account);
        return account;
    }

    function update(id: string, patch: Partial<Account>): void {
        const index = items.value.findIndex((account) => account.id === id);
        if (index !== -1) {
            items.value[index] = { ...items.value[index], ...patch };
        }
    }

    /**
     * Deletes an account together with its transactions.
     * To keep the history, archiving is better - see `update(id, { archived: true })`.
     */
    function remove(id: string): void {
        const transactions = useTransactionsStore();
        transactions.removeByAccount(id);
        items.value = items.value.filter((account) => account.id !== id);
    }

    function reorder(ordered: Account[]): void {
        ordered.forEach((account, index) => update(account.id, { order: index }));
    }

    function replaceAll(value: Account[]): void {
        items.value = value;
    }

    return { items, active, all, byId, balanceOf, totalBalance, add, update, remove, reorder, replaceAll };
});
