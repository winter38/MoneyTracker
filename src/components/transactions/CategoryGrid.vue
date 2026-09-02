<script setup lang="ts">
    import { computed, ref, watch } from "vue";

    import type { CategoryKind } from "@/types/models";
    import { useCategoriesStore } from "@/stores/categories";
    import { usePeriodStore } from "@/stores/period";
    import { useSettingsStore } from "@/stores/settings";
    import { useTransactionsStore } from "@/stores/transactions";
    import { iconTint } from "@/utils/color";
    import { formatCompact } from "@/utils/money";

    const props = defineProps<{
        kind: CategoryKind;
        /** The selected pair [groupId, subcategoryId?]. */
        groupId?: string;
        subcategoryId?: string;
        /** Show under the icon how much has already been spent in the category this period. */
        showAmounts?: boolean;
    }>();

    /**
     * `final` tells a final choice apart from "drill into the group": tapping a group
     * that has subcategories expands it, but already marks the group itself as selected.
     */
    const emit = defineEmits<{ select: [groupId: string, subcategoryId: string | undefined, final: boolean] }>();

    const categories = useCategoriesStore();
    const period = usePeriodStore();
    const settings = useSettingsStore();
    const transactions = useTransactionsStore();

    /** The group we drilled into. null means the top level is shown. */
    const openGroupId = ref<string | null>(null);

    /** Spending per group for the selected month - the labels under the icons. */
    const groupTotals = computed(() => (props.showAmounts ? transactions.totalsByGroup(props.kind, period.from, period.to) : {}));

    /** Spending per subcategory of the expanded group. */
    const subTotals = computed(() =>
        props.showAmounts && openGroupId.value ? transactions.totalsBySubcategory(openGroupId.value, period.from, period.to) : {},
    );

    /** Large amounts get abbreviated - a tile only fits a couple of centimetres of text. */
    function amountLabel(value: number | undefined): string {
        const amount = value ?? 0;
        return Math.abs(amount) >= 100000 ? `${formatCompact(amount, settings.locale)} ${settings.currencySymbol}` : settings.money(amount);
    }

    // Switching between expense and income returns us to the top level.
    watch(
        () => props.kind,
        () => (openGroupId.value = null),
    );

    const groups = computed(() => categories.tree(props.kind).map((node) => node.group));
    const openGroup = computed(() => (openGroupId.value ? categories.groupById(openGroupId.value) : undefined));
    const children = computed(() => (openGroupId.value ? categories.childrenOf(openGroupId.value) : []));

    function onGroupTap(id: string): void {
        const hasChildren = categories.childrenOf(id).length > 0;
        if (hasChildren) {
            // As in 1Money: tapping a group expands its subcategories,
            // but the group itself already counts as selected.
            openGroupId.value = id;
            emit("select", id, undefined, false);
        } else {
            emit("select", id, undefined, true);
        }
    }
</script>

<template>
    <div class="grid-wrap">
        <header v-if="openGroup" class="grid-head">
            <button type="button" class="grid-head__back" @click="openGroupId = null">‹ All categories</button>
            <span class="grid-head__title">{{ openGroup.icon }} {{ openGroup.name }}</span>
        </header>

        <!-- Top level: the groups -->
        <div v-if="!openGroup" class="grid">
            <button
                v-for="group in groups"
                :key="group.id"
                type="button"
                class="tile"
                :class="{ 'tile--active': groupId === group.id }"
                @click="onGroupTap(group.id)"
            >
                <span class="tile__icon" :style="iconTint(group.color)">{{ group.icon }}</span>
                <span class="tile__name">{{ group.name }}</span>
                <span v-if="showAmounts" class="tile__amount" :style="{ color: group.color }">{{
                    amountLabel(groupTotals[group.id])
                }}</span>
            </button>
            <p v-if="!groups.length" class="ft-empty">No categories yet - add them in Manage</p>
        </div>

        <!-- Inside a group: the group itself plus its subcategories -->
        <div v-else class="grid">
            <button
                type="button"
                class="tile"
                :class="{ 'tile--active': groupId === openGroup.id && !subcategoryId }"
                @click="emit('select', openGroup.id, undefined, true)"
            >
                <span class="tile__icon" :style="iconTint(openGroup.color)">{{ openGroup.icon }}</span>
                <span class="tile__name">Whole group</span>
                <span v-if="showAmounts" class="tile__amount" :style="{ color: openGroup.color }">{{
                    amountLabel(groupTotals[openGroup.id])
                }}</span>
            </button>

            <button
                v-for="child in children"
                :key="child.id"
                type="button"
                class="tile"
                :class="{ 'tile--active': subcategoryId === child.id }"
                @click="emit('select', openGroup.id, child.id, true)"
            >
                <span class="tile__icon tile__icon--sub" :style="iconTint(openGroup.color)">{{ openGroup.icon }}</span>
                <span class="tile__name">{{ child.name }}</span>
                <span v-if="showAmounts" class="tile__amount" :style="{ color: openGroup.color }">{{
                    amountLabel(subTotals[child.id])
                }}</span>
            </button>
        </div>
    </div>
</template>

<style scoped>
    .grid-wrap {
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    .grid-head {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 12px;
        font-size: 13px;
    }

    .grid-head__back {
        border: none;
        background: transparent;
        color: var(--ft-accent);
        font: inherit;
        cursor: pointer;
        padding: 2px 0;
    }

    .grid-head__title {
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 2px 0;
        padding: 4px 6px 10px;
        overflow-y: auto;
        min-height: 0;
    }

    .tile {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        min-width: 0;
        padding: 8px 2px;
        border: none;
        border-radius: 12px;
        background: transparent;
        font: inherit;
        color: inherit;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
    }

    .tile:active {
        background: var(--ft-surface-muted);
    }

    .tile__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 46px;
        height: 46px;
        border-radius: 50%;
        font-size: 21px;
        line-height: 1;
        border: 2px solid transparent;
        transition: border-color 0.12s ease;
    }

    .tile__icon--sub {
        font-size: 17px;
        opacity: 0.85;
    }

    .tile--active .tile__icon {
        border-color: currentColor;
    }

    .tile__name {
        font-size: 11px;
        line-height: 1.25;
        text-align: center;
        color: var(--ft-text-secondary);
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        word-break: break-word;
    }

    .tile--active .tile__name {
        color: var(--ft-text);
        font-weight: 600;
    }

    .tile__amount {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 11px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }
</style>
