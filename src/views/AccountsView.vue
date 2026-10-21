<script setup lang="ts">
    import { computed } from "vue";

    import AccountsPanel from "@/components/manage/AccountsPanel.vue";
    import { useAccountsStore } from "@/stores/accounts";
    import { usePeriodStore } from "@/stores/period";
    import { useSettingsStore } from "@/stores/settings";
    import { useTransactionsStore } from "@/stores/transactions";
    import { round2 } from "@/utils/money";

    const accounts = useAccountsStore();
    const period = usePeriodStore();
    const settings = useSettingsStore();
    const transactions = useTransactionsStore();

    const periodIncome = computed(() => transactions.totalOf("income", period.from, period.to));
    const periodExpense = computed(() => transactions.totalOf("expense", period.from, period.to));

    /** The movement across all accounts for the selected period - income minus expenses. */
    const periodFlow = computed(() => round2(periodIncome.value - periodExpense.value));
</script>

<template>
    <div class="accounts-view">
        <!-- The overall balance already sits in the header, so this shows the movement for the selected month. -->
        <section class="ft-card accounts-view__summary">
            <div>
                <span class="ft-muted">Income for the period</span>
                <strong class="ft-amount ft-amount--income">{{ settings.compactMoney(periodIncome) }}</strong>
            </div>
            <div>
                <span class="ft-muted">Expenses for the period</span>
                <strong class="ft-amount ft-amount--expense">{{ settings.compactMoney(periodExpense) }}</strong>
            </div>
            <div>
                <span class="ft-muted">Net</span>
                <strong class="ft-amount" :class="periodFlow < 0 ? 'ft-amount--expense' : 'ft-amount--income'">
                    {{ periodFlow >= 0 ? "+" : "−" }}{{ settings.compactMoney(Math.abs(periodFlow)) }}
                </strong>
            </div>
        </section>

        <AccountsPanel />
    </div>
</template>

<style scoped>
    .accounts-view {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .accounts-view__summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        grid-template-rows: auto auto;
        column-gap: 10px;
        row-gap: 2px;
    }

    /*
        The three labels do not wrap alike - "Net" takes one line where the other two take two -
        so a column of its own would lift its amount above the neighbours. Subgrid puts every
        label in the first shared row and every amount in the second, which lines them up.
        Browsers without subgrid simply fall back to the stacked layout this replaced.
    */
    .accounts-view__summary div {
        display: grid;
        grid-row: span 2;
        grid-template-rows: subgrid;
        row-gap: 2px;
        font-size: 12px;
        min-width: 0;
    }

    .accounts-view__summary strong {
        font-size: 17px;
    }
</style>
