<script setup lang="ts">
    import { computed } from "vue";
    import { ElMessage } from "element-plus";

    import type { CategoryKind } from "@/types/models";
    import BudgetRow from "@/components/budget/BudgetRow.vue";
    import { useBudgetsStore } from "@/stores/budgets";
    import { useCategoriesStore } from "@/stores/categories";
    import { usePeriodStore } from "@/stores/period";
    import { useSettingsStore } from "@/stores/settings";
    import { useTransactionsStore } from "@/stores/transactions";
    import { parseAmount, round2 } from "@/utils/money";

    /**
     * Бюджет: план на расчётный месяц по каждой группе категорий и факт по операциям.
     * План один и тот же для всех месяцев — так же ведёт себя базовый бюджет 1Money.
     */
    const budgets = useBudgetsStore();
    const categories = useCategoriesStore();
    const period = usePeriodStore();
    const settings = useSettingsStore();
    const transactions = useTransactionsStore();

    function sectionRows(kind: CategoryKind) {
        const totals = transactions.totalsByGroup(kind, period.from, period.to);
        return categories.tree(kind).map((node) => ({
            id: node.group.id,
            name: node.group.name,
            icon: node.group.icon,
            color: node.group.color,
            spent: totals[node.group.id] ?? 0,
            planned: budgets.amountFor(node.group.id),
        }));
    }

    const expenseRows = computed(() => sectionRows("expense"));
    const incomeRows = computed(() => sectionRows("income"));

    const expenseTotals = computed(() => ({
        spent: transactions.totalOf("expense", period.from, period.to),
        planned: budgets.totalFor(expenseRows.value.map((row) => row.id)),
    }));

    const incomeTotals = computed(() => ({
        spent: transactions.totalOf("income", period.from, period.to),
        planned: budgets.totalFor(incomeRows.value.map((row) => row.id)),
    }));

    const left = computed(() => round2(expenseTotals.value.planned - expenseTotals.value.spent));

    const progress = computed(() =>
        expenseTotals.value.planned > 0 ? Math.min(100, Math.round((expenseTotals.value.spent / expenseTotals.value.planned) * 100)) : 0,
    );

    const summaryTone = computed(() => {
        if (expenseTotals.value.planned <= 0) {
            return "var(--ft-border)";
        }
        if (expenseTotals.value.spent > expenseTotals.value.planned) {
            return "var(--ft-expense)";
        }
        return progress.value > 85 ? "#eda100" : "var(--ft-income)";
    });

    function savePlan(groupId: string, raw: string): void {
        budgets.set(groupId, parseAmount(raw));
        ElMessage.success("План сохранён");
    }
</script>

<template>
    <div class="budget">
        <section class="ft-card budget__summary">
            <div class="budget__totals">
                <div>
                    <span class="ft-muted">План</span>
                    <strong class="ft-amount">{{ settings.money(expenseTotals.planned) }}</strong>
                </div>
                <div>
                    <span class="ft-muted">Потрачено</span>
                    <strong class="ft-amount ft-amount--expense">{{ settings.money(expenseTotals.spent) }}</strong>
                </div>
                <div>
                    <span class="ft-muted">{{ left >= 0 ? "Осталось" : "Перерасход" }}</span>
                    <strong class="ft-amount" :class="left >= 0 ? 'ft-amount--income' : 'ft-amount--expense'">
                        {{ settings.money(Math.abs(left)) }}
                    </strong>
                </div>
            </div>

            <div class="budget__bar">
                <span :style="{ width: `${progress}%`, background: summaryTone }" />
            </div>

            <p v-if="expenseTotals.planned === 0" class="ft-muted budget__hint">
                План пока не задан — нажмите «Задать план» у любой категории ниже.
            </p>
        </section>

        <section class="ft-card ft-card--flush">
            <h3 class="ft-section-title budget__title">Расходы</h3>
            <BudgetRow
                v-for="row in expenseRows"
                :key="row.id"
                :name="row.name"
                :icon="row.icon"
                :color="row.color"
                :spent="row.spent"
                :planned="row.planned"
                @save="(value) => savePlan(row.id, value)"
            />
            <p v-if="!expenseRows.length" class="ft-empty">Нет расходных категорий</p>
        </section>

        <section class="ft-card ft-card--flush">
            <h3 class="ft-section-title budget__title">
                <span>Доходы</span>
                <span class="ft-amount ft-amount--income">{{ settings.money(incomeTotals.spent) }}</span>
            </h3>
            <BudgetRow
                v-for="row in incomeRows"
                :key="row.id"
                income
                :name="row.name"
                :icon="row.icon"
                :color="row.color"
                :spent="row.spent"
                :planned="row.planned"
                @save="(value) => savePlan(row.id, value)"
            />
            <p v-if="!incomeRows.length" class="ft-empty">Нет доходных категорий</p>
        </section>
    </div>
</template>

<style scoped>
    .budget {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .budget__summary {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .budget__totals {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
    }

    .budget__totals div {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 12px;
        min-width: 0;
    }

    .budget__totals strong {
        font-size: 17px;
    }

    .budget__bar {
        height: 8px;
        border-radius: 4px;
        background: var(--ft-surface-muted);
        overflow: hidden;
    }

    .budget__bar span {
        display: block;
        height: 100%;
        border-radius: 4px;
    }

    .budget__hint {
        margin: 0;
        font-size: 12px;
        line-height: 1.4;
    }

    .budget__title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 14px 14px 2px;
        margin-bottom: 4px;
    }
</style>
