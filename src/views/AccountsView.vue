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
                <strong class="ft-amount ft-amount--income">{{ settings.money(periodIncome) }}</strong>
            </div>
            <div>
                <span class="ft-muted">Expenses for the period</span>
                <strong class="ft-amount ft-amount--expense">{{ settings.money(periodExpense) }}</strong>
            </div>
            <div>
                <span class="ft-muted">Net</span>
                <strong class="ft-amount" :class="periodFlow < 0 ? 'ft-amount--expense' : 'ft-amount--income'">
                    {{ periodFlow >= 0 ? "+" : "−" }}{{ settings.money(Math.abs(periodFlow)) }}
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
        gap: 10px;
    }

    .accounts-view__summary div {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 12px;
    }

    .accounts-view__summary strong {
        font-size: 17px;
    }
</style>
