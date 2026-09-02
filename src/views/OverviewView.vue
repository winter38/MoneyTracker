<script setup lang="ts">
    import { computed } from "vue";
    import { useRouter } from "vue-router";

    import TransactionList from "@/components/transactions/TransactionList.vue";
    import { useAccountsStore } from "@/stores/accounts";
    import { useCategoriesStore } from "@/stores/categories";
    import { usePeriodStore } from "@/stores/period";
    import { useSettingsStore } from "@/stores/settings";
    import { useTransactionsStore } from "@/stores/transactions";
    import { useBreakpoint } from "@/composables/useBreakpoint";
    import { fromISODate, formatMonthLabel, monthKey, monthRange, today, toISODate } from "@/utils/date";
    import { formatCompact, round2 } from "@/utils/money";
    import { iconTint } from "@/utils/color";

    /**
     * The summary screen: the period totals, the month-by-month trend, the expense breakdown
     * and the latest transactions - what any finance tracker keeps on its Overview tab.
     */
    const emit = defineEmits<{ editTransaction: [id: string] }>();

    const router = useRouter();
    const accounts = useAccountsStore();
    const categories = useCategoriesStore();
    const period = usePeriodStore();
    const settings = useSettingsStore();
    const transactions = useTransactionsStore();
    const { isMobile } = useBreakpoint();

    const isDark = computed(() => document.documentElement.classList.contains("dark"));

    const expense = computed(() => transactions.totalOf("expense", period.from, period.to));
    const income = computed(() => transactions.totalOf("income", period.from, period.to));
    const netto = computed(() => round2(income.value - expense.value));

    /* ---------- Averages ---------- */

    const daysPassed = computed(() => {
        const start = fromISODate(period.from).getTime();
        const end = Math.min(fromISODate(period.to).getTime(), fromISODate(today()).getTime());
        return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
    });

    const perDay = computed(() => round2(expense.value / daysPassed.value));
    const todaySpent = computed(() => transactions.totalOf("expense", today(), today()));

    const weekSpent = computed(() => {
        const start = new Date();
        start.setDate(start.getDate() - 6);
        return transactions.totalOf("expense", toISODate(start), today());
    });

    /* ---------- Month-by-month trend ---------- */

    const monthly = computed(() => {
        const totals = transactions.monthlyTotals();
        const keys = Object.keys(totals).sort();
        if (!keys.length) {
            return { labels: [] as string[], expense: [] as number[], income: [] as number[] };
        }
        const window = monthRange(keys[0], monthKey(today())).slice(-12);
        return {
            labels: window.map((key) => formatMonthLabel(key, settings.locale)),
            expense: window.map((key) => totals[key]?.expense ?? 0),
            income: window.map((key) => totals[key]?.income ?? 0),
        };
    });

    const hasMonthly = computed(() => monthly.value.labels.length > 0);

    const monthlySeries = computed(() => [
        { name: "Expenses", data: monthly.value.expense },
        { name: "Income", data: monthly.value.income },
    ]);

    const monthlyOptions = computed(() => ({
        chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit", background: "transparent", animations: { enabled: false } },
        theme: { mode: isDark.value ? "dark" : "light" },
        colors: ["#e34948", "#1baf7a"],
        plotOptions: { bar: { columnWidth: "58%", borderRadius: 4, borderRadiusApplication: "end" } },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ["transparent"] },
        grid: { borderColor: isDark.value ? "#2c2c2a" : "#e1e0d9", strokeDashArray: 3 },
        xaxis: { categories: monthly.value.labels, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { formatter: (value: number) => formatCompact(value, settings.locale) } },
        legend: { position: "top", horizontalAlign: "left", markers: { radius: 3 } },
        tooltip: { y: { formatter: (value: number) => settings.money(value) } },
    }));

    /* ---------- Expense breakdown ---------- */

    const topGroups = computed(() => {
        const totals = transactions.totalsByGroup("expense", period.from, period.to);
        return Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .map(([groupId, amount]) => {
                const group = categories.groupById(groupId);
                return {
                    id: groupId,
                    name: group?.name ?? "No category",
                    icon: group?.icon ?? "•",
                    color: group?.color ?? "#8a909e",
                    amount,
                    percent: expense.value > 0 ? Math.round((amount / expense.value) * 100) : 0,
                };
            });
    });

    const recent = computed(() => transactions.sorted.slice(0, 10));
</script>

<template>
    <div class="overview">
        <section class="overview__totals">
            <div class="ft-card total-tile">
                <span>Expenses</span>
                <strong class="ft-amount ft-amount--expense">{{ settings.money(expense) }}</strong>
            </div>
            <div class="ft-card total-tile">
                <span>Income</span>
                <strong class="ft-amount ft-amount--income">{{ settings.money(income) }}</strong>
            </div>
        </section>

        <section class="ft-card">
            <div class="overview__balance">
                <span class="ft-muted">Net for the period</span>
                <strong class="ft-amount" :class="netto < 0 ? 'ft-amount--expense' : 'ft-amount--income'">{{
                    settings.money(netto)
                }}</strong>
            </div>
            <apexchart v-if="hasMonthly" type="bar" :height="isMobile ? 210 : 280" :options="monthlyOptions" :series="monthlySeries" />
            <p v-else class="ft-empty">No data yet - add a few transactions</p>
        </section>

        <section class="overview__stats">
            <div class="ft-card stat">
                <span class="ft-muted">Per day (avg.)</span>
                <strong class="ft-amount">{{ settings.money(perDay) }}</strong>
            </div>
            <div class="ft-card stat">
                <span class="ft-muted">Today</span>
                <strong class="ft-amount">{{ settings.money(todaySpent) }}</strong>
            </div>
            <div class="ft-card stat">
                <span class="ft-muted">Last 7 days</span>
                <strong class="ft-amount">{{ settings.money(weekSpent) }}</strong>
            </div>
        </section>

        <section class="ft-card">
            <h3 class="ft-section-title">Where the money goes</h3>
            <p v-if="!topGroups.length" class="ft-empty">No expenses in this period</p>
            <div v-for="row in topGroups" :key="row.id" class="group-row">
                <span class="group-row__icon" :style="iconTint(row.color)">{{ row.icon }}</span>
                <div class="group-row__body">
                    <div class="group-row__line">
                        <span>{{ row.name }}</span>
                        <span class="ft-amount">{{ settings.money(row.amount) }}</span>
                    </div>
                    <div class="group-row__meter">
                        <div class="group-row__bar"><span :style="{ width: `${row.percent}%`, background: row.color }" /></div>
                        <em class="group-row__percent" :style="{ color: row.color }">{{ row.percent }}%</em>
                    </div>
                </div>
            </div>
        </section>

        <section class="ft-card ft-card--flush">
            <h3 class="ft-section-title overview__list-title">
                Latest transactions
                <el-button link type="primary" @click="router.push('/transactions')">All</el-button>
            </h3>
            <TransactionList
                :items="recent"
                empty-text="Add your first transaction with the '+' button"
                @select="(id) => emit('editTransaction', id)"
            />
        </section>
    </div>
</template>

<style scoped>
    .overview {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .overview__totals {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    }

    .total-tile {
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: 12px;
        color: var(--ft-text-secondary);
    }

    .total-tile strong {
        font-size: 20px;
    }

    .overview__balance {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 6px;
        font-size: 13px;
    }

    .overview__balance strong {
        font-size: 20px;
    }

    .overview__stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
    }

    .stat {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 11px;
        padding: 12px;
    }

    .stat strong {
        font-size: 16px;
    }

    .overview__list-title {
        padding: 14px 16px 0;
        margin-bottom: 4px;
    }

    .group-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 7px 0;
    }

    .group-row__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        border-radius: 50%;
        font-size: 18px;
    }

    .group-row__body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .group-row__line {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        font-size: 14px;
    }

    /* The percentage sits to the right of the bar - on the bar itself it covered the fill. */
    .group-row__meter {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .group-row__bar {
        flex: 1;
        min-width: 0;
        height: 8px;
        border-radius: 4px;
        background: var(--ft-surface-muted);
        overflow: hidden;
    }

    .group-row__bar span {
        display: block;
        height: 100%;
        border-radius: 4px;
        min-width: 2px;
    }

    .group-row__percent {
        flex: 0 0 38px;
        text-align: right;
        font-size: 11px;
        font-style: normal;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }
</style>
