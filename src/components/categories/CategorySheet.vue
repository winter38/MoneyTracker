<script setup lang="ts">
    import { computed } from "vue";

    import AppIcon from "@/components/common/AppIcon.vue";
    import { useSettingsStore } from "@/stores/settings";

    /**
     * What one category adds up to in the selected period - opened by holding its tile.
     *
     * The point of it is the "Transactions" action: it drops straight into the list already
     * narrowed to this category and this month, which otherwise takes a trip through the
     * filter panel.
     */
    const props = defineProps<{
        open: boolean;
        name: string;
        icon: string;
        color: string;
        spent: number;
        planned: number;
        count: number;
        periodLabel: string;
        periodTotal: number;
    }>();

    const emit = defineEmits<{ close: []; edit: []; budget: []; transactions: [] }>();

    const settings = useSettingsStore();

    /** Capped at 100 so the bar cannot overflow; the figure beside it still shows the excess. */
    const progress = computed(() => (props.planned > 0 ? Math.min(100, Math.round((props.spent / props.planned) * 100)) : 0));

    const overPlan = computed(() => props.planned > 0 && props.spent > props.planned);
</script>

<template>
    <Teleport to="body">
        <div v-if="props.open" class="cat-overlay" @click.self="emit('close')">
            <section class="cat" role="dialog" aria-modal="true" :aria-label="name">
                <header class="cat__head" :style="{ background: color }">
                    <span class="cat__icon" :style="{ color }"><AppIcon :icon="icon" /></span>

                    <h3 class="cat__name">{{ name }}</h3>

                    <div class="cat__row">
                        <span>{{ count }} {{ count === 1 ? "transaction" : "transactions" }}</span>
                        <strong>{{ settings.compactMoney(spent) }}</strong>
                    </div>

                    <div v-if="planned > 0" class="cat__plan">
                        <span class="cat__percent">{{ progress }}%</span>
                        <span class="cat__bar"><span :style="{ width: `${progress}%` }" /></span>
                        <span class="cat__limit">{{ settings.compactMoney(planned) }}</span>
                    </div>
                    <p v-if="overPlan" class="cat__over">Over the plan</p>

                    <div class="cat__row cat__row--period">
                        <span>{{ periodLabel }}</span>
                        <strong>{{ settings.compactMoney(periodTotal) }}</strong>
                    </div>
                </header>

                <div class="cat__actions">
                    <button type="button" class="cat__action" @click="emit('edit')">
                        <el-icon :size="20"><Edit /></el-icon>
                        <span>Edit</span>
                    </button>
                    <button type="button" class="cat__action" @click="emit('budget')">
                        <el-icon :size="20"><PieChart /></el-icon>
                        <span>Budget</span>
                    </button>
                    <button type="button" class="cat__action cat__action--primary" @click="emit('transactions')">
                        <el-icon :size="20"><Tickets /></el-icon>
                        <span>Transactions</span>
                    </button>
                </div>
            </section>
        </div>
    </Teleport>
</template>

<style scoped>
    .cat-overlay {
        position: fixed;
        inset: 0;
        background: rgba(8, 10, 14, 0.45);
        /* Same step as the add sheet: the two never stand open together. */
        z-index: 2600;
        display: flex;
        align-items: flex-end;
        justify-content: center;
    }

    .cat {
        width: 100%;
        max-width: 460px;
        display: flex;
        flex-direction: column;
        background: var(--ft-surface);
        border-radius: var(--ft-radius) var(--ft-radius) 0 0;
        overflow: hidden;
    }

    @media (min-width: 900px) {
        .cat-overlay {
            align-items: center;
        }

        .cat {
            border-radius: var(--ft-radius);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
        }
    }

    .cat__head {
        position: relative;
        padding: 18px 16px 14px;
        color: #fff;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    /* The tile icon carries over onto the sheet, so it is clear which one was held. */
    .cat__icon {
        position: absolute;
        top: -22px;
        right: 16px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--ft-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        /* AppIcon sizes itself in em, so the glyph follows this. */
        font-size: 22px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    }

    .cat__name {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
        /* Leaves the icon its corner. */
        padding-right: 56px;
        overflow-wrap: anywhere;
    }

    .cat__row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        font-size: 15px;
    }

    .cat__row strong {
        font-size: 17px;
    }

    .cat__row--period {
        opacity: 0.9;
    }

    .cat__plan {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
    }

    .cat__bar {
        flex: 1;
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.35);
        overflow: hidden;
    }

    .cat__bar span {
        display: block;
        height: 100%;
        border-radius: 3px;
        background: #fff;
    }

    .cat__over {
        margin: 0;
        font-size: 12px;
        opacity: 0.9;
    }

    .cat__actions {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        background: var(--ft-surface);
    }

    .cat__action {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 14px 6px;
        border: none;
        background: none;
        color: var(--ft-text-muted);
        font: inherit;
        font-size: 12px;
        cursor: pointer;
    }

    .cat__action--primary {
        color: var(--ft-accent);
        font-weight: 600;
    }

    .cat__action:active {
        background: var(--ft-surface-muted);
    }
</style>
