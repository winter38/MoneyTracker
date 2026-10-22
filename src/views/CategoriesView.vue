<script setup lang="ts">
    import { computed, ref } from "vue";
    import { useRouter } from "vue-router";

    import type { CategoryKind } from "@/types/models";
    import AppIcon from "@/components/common/AppIcon.vue";
    import CategorySheet from "@/components/categories/CategorySheet.vue";
    import { useBudgetsStore } from "@/stores/budgets";
    import { useCategoriesStore } from "@/stores/categories";
    import { usePeriodStore } from "@/stores/period";
    import { useSettingsStore } from "@/stores/settings";
    import { useTransactionsStore } from "@/stores/transactions";
    import { useBreakpoint } from "@/composables/useBreakpoint";
    import { useLongPress } from "@/composables/useLongPress";
    import { round2 } from "@/utils/money";
    import { iconTint } from "@/utils/color";

    /**
     * The Categories screen in the spirit of any finance tracker: the expense ring in the middle, the category
     * icons around it, and a tap on a category opens the add form for it right away.
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

    /** How many transactions each group holds in this period - shown on the details sheet. */
    const counts = computed(() => {
        const map: Record<string, number> = {};
        transactions.filter({ kinds: [kind.value], dateFrom: period.from, dateTo: period.to }).forEach((tx) => {
            if (tx.groupId !== undefined) {
                map[tx.groupId] = (map[tx.groupId] ?? 0) + 1;
            }
        });
        return map;
    });

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
                count: counts.value[node.group.id] ?? 0,
            }))
            .sort((a, b) => b.spent - a.spent);
    });

    const expenseTotal = computed(() => transactions.totalOf("expense", period.from, period.to));
    const incomeTotal = computed(() => transactions.totalOf("income", period.from, period.to));

    /** Only non-zero categories go into the donut: zeros would just clutter the legend. */
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
     * Holding a tile opens its details instead of adding a transaction: the quickest way
     * to the entries already booked to that category this month.
     */
    const heldId = ref<string | null>(null);
    const held = computed(() => rows.value.find((row) => row.id === heldId.value) ?? null);
    const press = useLongPress<string>((id) => (heldId.value = id));

    function onTileClick(groupId: string): void {
        // A hold is followed by a click on most browsers - without this the tile would also
        // open the add screen behind the sheet.
        if (press.consumed()) {
            return;
        }
        emit("addToCategory", groupId, kind.value);
    }

    function openHeld(path: string, query?: Record<string, string>): void {
        heldId.value = null;
        router.push({ path, query });
    }

    /**
     * The list lands filtered to this category and this period. The dates travel in the query
     * rather than relying on the period store, so the link survives a reload.
     */
    function showHeldTransactions(): void {
        const groupId = heldId.value;
        if (groupId === null) {
            return;
        }
        openHeld("/transactions", { group: groupId, from: period.from, to: period.to });
    }

    /**
     * The ring layout: four tiles on top, one on each side of the donut,
     * and the rest in a plain grid below.
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
     * The donut size is given as a number, and the container height is pinned to that same number:
     * if the chart box and the label box have different heights, the text in the centre drifts.
     */
    const donutSize = computed(() => (isMobile.value ? 146 : 240));
</script>

<template>
    <div class="categories" :style="{ '--donut-size': `${donutSize}px` }">
        <div class="categories__switch">
            <el-segmented
                v-model="kind"
                :options="[
                    { label: 'Expenses', value: 'expense' },
                    { label: 'Income', value: 'income' },
                ]"
            />
            <el-button link type="primary" @click="router.push('/manage')">Configure</el-button>
        </div>

        <div class="ring">
            <button
                v-for="(row, index) in rows"
                :key="row.id"
                type="button"
                class="tile"
                :style="tileStyle(index)"
                @pointerdown="press.start($event, row.id)"
                @pointermove="press.move"
                @pointerup="press.cancel"
                @pointerleave="press.cancel"
                @pointercancel="press.cancel"
                @contextmenu.prevent
                @click="onTileClick(row.id)"
            >
                <span class="tile__name">{{ row.name }}</span>
                <span class="tile__icon" :style="iconTint(row.color)"><AppIcon :icon="row.icon" /></span>
                <span class="tile__spent" :style="{ color: row.spent > 0 ? row.color : 'var(--ft-text-muted)' }">
                    {{ settings.compactMoney(row.spent) }}
                </span>
                <span v-if="row.planned > 0" class="tile__planned ft-muted">of {{ settings.compactMoney(row.planned) }}</span>
            </button>

            <div class="ring__center">
                <!--
                    The width is set as well as the height: left to itself ApexCharts falls back to a
                    300px canvas, and that invisible SVG then lies on top of the tiles beside the ring
                    and swallows the taps meant for them.
                -->
                <apexchart
                    v-if="charted.length"
                    type="donut"
                    :width="donutSize"
                    :height="donutSize"
                    :options="donutOptions"
                    :series="donutSeries"
                />
                <div v-else class="ring__empty" />

                <div class="ring__labels">
                    <span class="ft-muted">{{ kind === "expense" ? "Expenses" : "Income" }}</span>
                    <strong class="ft-amount" :class="kind === 'expense' ? 'ft-amount--expense' : 'ft-amount--income'">
                        {{ settings.compactMoney(kind === "expense" ? expenseTotal : incomeTotal) }}
                    </strong>
                    <span class="ft-amount ring__secondary" :class="netto < 0 ? 'ft-amount--expense' : 'ft-amount--income'">
                        {{ settings.compactMoney(kind === "expense" ? incomeTotal : expenseTotal) }}
                    </span>
                </div>
            </div>
        </div>

        <p v-if="!rows.length" class="ft-empty">No categories yet - add them in Manage</p>
        <p v-else class="categories__hint ft-muted">Tap a category to record a transaction, hold it to see what is already there</p>

        <CategorySheet
            v-if="held"
            :open="held !== null"
            :name="held.name"
            :icon="held.icon"
            :color="held.color"
            :spent="held.spent"
            :planned="held.planned"
            :count="held.count"
            :period-label="period.label"
            :period-total="kind === 'expense' ? expenseTotal : incomeTotal"
            @close="heldId = null"
            @edit="openHeld('/manage')"
            @budget="openHeld('/budget')"
            @transactions="showHeldTransactions"
        />
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

    /* The donut takes the middle of the grid, with tiles flowing around it on the left and right. */
    .ring__center {
        grid-column: 2 / 4;
        grid-row: 2 / 4;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        /* Exactly the chart height: the labels sit on top of this same box. */
        height: var(--donut-size);
        /* The chart is as wide as its box, so the padding is what keeps the circle from
           touching the tiles on either side of it. */
        padding: 0 14px;
        /* Nothing the chart draws may reach over the neighbouring tiles and steal their taps. */
        overflow: hidden;
        /* The two rows next to the circle are taller than it is - sit in the middle of them. */
        align-self: center;
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
     * The lines are no wider than the chord of the donut hole (76% of the chart diameter), otherwise
     * a long amount spills outside the ring. The font size is tied to that diameter too.
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
        /*
            Holding a tile is our own gesture: without these the browser answers it first -
            Android starts selecting the label, iOS throws up its callout menu.
        */
        user-select: none;
        -webkit-touch-callout: none;
        touch-action: manipulation;
    }

    .tile:active {
        opacity: 0.6;
    }

    .tile__name {
        font-size: 12px;
        line-height: 1.25;
        color: var(--ft-text);
        max-width: 100%;
        /* Two lines instead of clipping: "Cafes and restaurants" should be readable in full. */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        /* Centred inside a box that is always two lines tall: a short name and a wrapped one
           then leave the icon below them in exactly the same place, whatever the month shows. */
        -webkit-box-pack: center;
        overflow: hidden;
        height: 2.5em;
        text-align: center;
        /* A single long word ("Entertainment") breaks instead of running out of the tile. */
        overflow-wrap: anywhere;
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

    /* Amounts stay inside the cell width - otherwise neighbouring tiles overlap. */
    .tile__spent,
    .tile__planned {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .tile__spent {
        font-size: 13px;
        line-height: 1.3;
        min-height: 1.3em;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }

    .tile__planned {
        font-size: 11px;
    }

    /* On a wide screen the ring is unnecessary - a plain card grid reads better. */
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
