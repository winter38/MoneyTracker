<script setup lang="ts">
    import { computed, ref } from "vue";
    import { useRouter } from "vue-router";

    import type { CategoryKind } from "@/types/models";
    import { useBudgetsStore } from "@/stores/budgets";
    import { useCategoriesStore } from "@/stores/categories";
    import { usePeriodStore } from "@/stores/period";
    import { useSettingsStore } from "@/stores/settings";
    import { useTransactionsStore } from "@/stores/transactions";
    import { useBreakpoint } from "@/composables/useBreakpoint";
    import { formatCompact, round2 } from "@/utils/money";
    import { iconTint } from "@/utils/color";

    /**
     * Экран «Категории» в духе 1Money: кольцо расходов в центре, иконки категорий
     * вокруг него, тап по категории сразу открывает добавление операции в неё.
     */
    const emit = defineEmits<{ addToCategory: [groupId: string, kind: CategoryKind] }>();

    const router = useRouter();
    const budgets = useBudgetsStore();
    const categories = useCategoriesStore();
    const period = usePeriodStore();
    const settings = useSettingsStore();
    const transactions = useTransactionsStore();
    const { isMobile } = useBreakpoint();

    const kind = ref<CategoryKind>("expense");

    const isDark = computed(() => document.documentElement.classList.contains("dark"));

    const rows = computed(() => {
        const totals = transactions.totalsByGroup(kind.value, period.from, period.to);
        return categories
            .tree(kind.value)
            .map((node) => ({
                id: node.group.id,
                name: node.group.name,
                icon: node.group.icon,
                color: node.group.color,
                spent: totals[node.group.id] ?? 0,
                planned: budgets.amountFor(node.group.id),
            }))
            .sort((a, b) => b.spent - a.spent);
    });

    const expenseTotal = computed(() => transactions.totalOf("expense", period.from, period.to));
    const incomeTotal = computed(() => transactions.totalOf("income", period.from, period.to));

    /** Ненулевые категории для бублика: нули только замусорили бы легенду. */
    const charted = computed(() => rows.value.filter((row) => row.spent > 0));

    const donutOptions = computed(() => ({
        chart: { type: "donut", fontFamily: "inherit", background: "transparent", animations: { enabled: false } },
        theme: { mode: isDark.value ? "dark" : "light" },
        labels: charted.value.map((row) => row.name),
        colors: charted.value.map((row) => row.color),
        legend: { show: false },
        dataLabels: { enabled: false },
        stroke: { width: 3, colors: [isDark.value ? "#181b21" : "#ffffff"] },
        plotOptions: { pie: { donut: { size: "76%", labels: { show: false } } } },
        tooltip: { y: { formatter: (value: number) => settings.money(value) } },
    }));

    const donutSeries = computed(() => charted.value.map((row) => row.spent));

    /**
     * Раскладка кольца: четыре плитки сверху, по одной слева и справа от бублика,
     * остальные — обычной сеткой ниже.
     */
    function tileStyle(index: number): Record<string, string> | undefined {
        if (isMobile.value === false) {
            return undefined;
        }
        switch (index) {
            case 4:
                return { gridColumn: "1", gridRow: "2" };
            case 5:
                return { gridColumn: "4", gridRow: "2" };
            case 6:
                return { gridColumn: "1", gridRow: "3" };
            case 7:
                return { gridColumn: "4", gridRow: "3" };
            default:
                return undefined;
        }
    }

    const netto = computed(() => round2(incomeTotal.value - expenseTotal.value));

    /**
     * Размер бублика задаётся числом и тем же числом фиксируется высота контейнера:
     * если коробка графика и коробка подписей разной высоты, текст в центре «уезжает».
     */
    const donutSize = computed(() => (isMobile.value ? 210 : 240));

    /**
     * В плитках и в центре кольца мало места: крупные суммы показываем сокращённо
     * («2,2 млн €»), иначе строки налезают друг на друга.
     */
    function compactMoney(value: number): string {
        return Math.abs(value) >= 100000 ? `${formatCompact(value, settings.locale)} ${settings.currencySymbol}` : settings.money(value);
    }
</script>

<template>
    <div class="categories" :style="{ '--donut-size': `${donutSize}px` }">
        <div class="categories__switch">
            <el-segmented
                v-model="kind"
                :options="[
                    { label: 'Расходы', value: 'expense' },
                    { label: 'Доходы', value: 'income' },
                ]"
            />
            <el-button link type="primary" @click="router.push('/manage')">Настроить</el-button>
        </div>

        <div class="ring">
            <button
                v-for="(row, index) in rows"
                :key="row.id"
                type="button"
                class="tile"
                :style="tileStyle(index)"
                @click="emit('addToCategory', row.id, kind)"
            >
                <span class="tile__name">{{ row.name }}</span>
                <span class="tile__icon" :style="iconTint(row.color)">{{ row.icon }}</span>
                <span class="tile__spent" :style="{ color: row.spent > 0 ? row.color : 'var(--ft-text-muted)' }">
                    {{ compactMoney(row.spent) }}
                </span>
                <span v-if="row.planned > 0" class="tile__planned ft-muted">из {{ compactMoney(row.planned) }}</span>
            </button>

            <div class="ring__center">
                <apexchart v-if="charted.length" type="donut" :height="donutSize" :options="donutOptions" :series="donutSeries" />
                <div v-else class="ring__empty" />

                <div class="ring__labels">
                    <span class="ft-muted">{{ kind === "expense" ? "Расходы" : "Доходы" }}</span>
                    <strong class="ft-amount" :class="kind === 'expense' ? 'ft-amount--expense' : 'ft-amount--income'">
                        {{ compactMoney(kind === "expense" ? expenseTotal : incomeTotal) }}
                    </strong>
                    <span class="ft-amount ring__secondary" :class="netto < 0 ? 'ft-amount--expense' : 'ft-amount--income'">
                        {{ compactMoney(kind === "expense" ? incomeTotal : expenseTotal) }}
                    </span>
                </div>
            </div>
        </div>

        <p v-if="!rows.length" class="ft-empty">Категорий нет — добавьте их в «Справочниках»</p>
        <p v-else class="categories__hint ft-muted">Нажмите на категорию, чтобы записать в неё операцию</p>
    </div>
</template>

<style scoped>
    .categories {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .categories__switch {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
    }

    .categories__hint {
        margin: 2px 0 0;
        font-size: 12px;
        text-align: center;
    }

    .ring {
        position: relative;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px 4px;
        align-items: start;
    }

    /* Бублик занимает середину сетки, плитки обтекают его слева и справа. */
    .ring__center {
        grid-column: 2 / 4;
        grid-row: 2 / 4;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        /* Ровно высота графика: подписи лежат поверх этой же коробки. */
        height: var(--donut-size);
    }

    .ring__empty {
        height: 100%;
        aspect-ratio: 1;
        border-radius: 50%;
        border: 16px solid var(--ft-surface-muted);
    }

    .ring__labels {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        pointer-events: none;
        font-size: 12px;
        line-height: 1;
        text-align: center;
    }

    /*
     * Строки не шире хорды «дырки» бублика (диаметр 76% от графика), иначе
     * длинная сумма вылезает за кольцо. Размер шрифта тоже привязан к диаметру.
     */
    .ring__labels > * {
        max-width: calc(var(--donut-size) * 0.62);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .ring__labels strong {
        font-size: clamp(14px, calc(var(--donut-size) * 0.09), 22px);
        line-height: 1;
    }

    .ring__secondary {
        font-size: 13px;
        line-height: 1;
        opacity: 0.75;
    }

    .tile {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        min-width: 0;
        padding: 4px 2px;
        border: none;
        background: transparent;
        font: inherit;
        color: inherit;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
    }

    .tile:active {
        opacity: 0.6;
    }

    .tile__name {
        font-size: 12px;
        line-height: 1.25;
        color: var(--ft-text);
        max-width: 100%;
        /* Две строки вместо обрезки: «Кафе и рестораны» должно читаться целиком. */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 2.5em;
        text-align: center;
        word-break: break-word;
    }

    .tile__planned {
        font-size: 11px;
    }

    .tile__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        font-size: 26px;
        line-height: 1;
    }

    /* Суммы не выходят за ширину ячейки — иначе соседние плитки перекрывают друг друга. */
    .tile__spent,
    .tile__planned {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .tile__spent {
        font-size: 13px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }

    .tile__planned {
        font-size: 11px;
    }

    /* На широком экране кольцо не нужно — обычная сетка карточек читается лучше. */
    @media (min-width: 900px) {
        .ring {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 14px;
        }

        .ring__center {
            grid-column: span 2;
            grid-row: auto;
            order: -1;
        }
    }
</style>
