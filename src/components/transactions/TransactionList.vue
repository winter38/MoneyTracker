<script setup lang="ts">
    import { computed } from "vue";

    import type { Transaction } from "@/types/models";
    import AppIcon from "@/components/common/AppIcon.vue";
    import { TRANSFER_ICON, UNCATEGORISED_ICON } from "@/data/icons";
    import { useAccountsStore } from "@/stores/accounts";
    import { useCategoriesStore } from "@/stores/categories";
    import { useSettingsStore } from "@/stores/settings";
    import { useTransactionsStore } from "@/stores/transactions";
    import { formatDayHeading } from "@/utils/date";
    import { round2 } from "@/utils/money";
    import { iconTint } from "@/utils/color";

    const props = defineProps<{
        items: Transaction[];
        /** Show the total for each day to the right of the date. */
        showDayTotals?: boolean;
        emptyText?: string;
    }>();

    const emit = defineEmits<{ select: [id: string] }>();

    const accounts = useAccountsStore();
    const categories = useCategoriesStore();
    const settings = useSettingsStore();
    const transactions = useTransactionsStore();

    const days = computed(() => transactions.groupByDay(props.items));

    /** The row icon: the category emoji, or an arrow for a transfer. */
    function iconFor(tx: Transaction): string {
        if (tx.kind === "transfer") {
            return TRANSFER_ICON;
        }
        return categories.groupById(tx.groupId)?.icon ?? UNCATEGORISED_ICON;
    }

    function titleFor(tx: Transaction): string {
        if (tx.kind === "transfer") {
            return `${accounts.byId(tx.accountId)?.name ?? "?"} → ${accounts.byId(tx.toAccountId)?.name ?? "?"}`;
        }
        return categories.labelFor(tx.groupId, tx.subcategoryId);
    }

    function subtitleFor(tx: Transaction): string {
        const parts = [tx.note].filter(Boolean);
        if (tx.kind !== "transfer") {
            parts.push(accounts.byId(tx.accountId)?.name ?? "");
        }
        return parts.filter(Boolean).join(" · ");
    }

    function signFor(tx: Transaction): string {
        if (tx.kind === "expense") {
            return "−";
        }
        return tx.kind === "income" ? "+" : "";
    }

    function colorFor(tx: Transaction): string {
        return categories.groupById(tx.groupId)?.color ?? "var(--ft-text-muted)";
    }

    /** The day total: income minus expenses; transfers do not count. */
    function dayTotal(items: Transaction[]): number {
        return round2(
            items.reduce((acc, tx) => {
                if (tx.kind === "income") {
                    return acc + tx.amount;
                }
                if (tx.kind === "expense") {
                    return acc - tx.amount;
                }
                return acc;
            }, 0),
        );
    }
</script>

<template>
    <div class="tx-list">
        <p v-if="!days.length" class="ft-empty">{{ emptyText ?? "No transactions yet" }}</p>

        <section v-for="day in days" :key="day.date" class="tx-list__day">
            <header class="tx-list__day-head">
                <span>{{ formatDayHeading(day.date, settings.locale) }}</span>
                <span v-if="showDayTotals" class="ft-amount ft-muted">{{ settings.money(dayTotal(day.items)) }}</span>
            </header>

            <button v-for="tx in day.items" :key="tx.id" type="button" class="tx-row" @click="emit('select', tx.id)">
                <span class="ft-avatar" :style="iconTint(colorFor(tx))"><AppIcon :icon="iconFor(tx)" /></span>

                <span class="tx-row__text">
                    <span class="tx-row__title">{{ titleFor(tx) }}</span>
                    <span v-if="subtitleFor(tx)" class="tx-row__subtitle ft-muted">{{ subtitleFor(tx) }}</span>
                </span>

                <span class="ft-amount" :class="`ft-amount--${tx.kind}`">{{ signFor(tx) }}{{ settings.money(tx.amount) }}</span>
            </button>
        </section>
    </div>
</template>

<style scoped>
    .tx-list__day + .tx-list__day {
        margin-top: 6px;
    }

    .tx-list__day-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 16px 6px;
        font-size: 12px;
        font-weight: 600;
        color: var(--ft-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        position: sticky;
        top: 0;
        background: var(--ft-surface);
        z-index: 1;
    }

    .tx-row {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 10px 16px;
        border: none;
        background: transparent;
        text-align: left;
        cursor: pointer;
        font: inherit;
        color: inherit;
        border-top: 1px solid var(--ft-border);
    }

    .tx-row:hover {
        background: var(--ft-surface-muted);
    }

    .tx-row__text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
    }

    .tx-row__title {
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .tx-row__subtitle {
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
