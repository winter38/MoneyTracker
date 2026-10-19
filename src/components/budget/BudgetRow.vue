<script setup lang="ts">
    import { nextTick, ref } from "vue";

    import AppIcon from "@/components/common/AppIcon.vue";
    import { useSettingsStore } from "@/stores/settings";
    import { iconTint } from "@/utils/color";

    /**
     * A budget row: the category, the actual, the plan and a progress bar.
     * The whole row is a button: a tap opens the plan input right inside it,
     * a separate small button would only get in the way on a phone.
     */
    const props = defineProps<{
        name: string;
        icon: string;
        color: string;
        spent: number;
        planned: number;
        /** For income, going "over plan" is not painted in an alarming color. */
        income?: boolean;
    }>();

    const emit = defineEmits<{ save: [amount: string] }>();

    const settings = useSettingsStore();

    const editing = ref(false);
    const draft = ref("");
    const input = ref<HTMLInputElement | null>(null);

    async function startEdit(): Promise<void> {
        draft.value = props.planned > 0 ? String(props.planned) : "";
        editing.value = true;
        await nextTick();
        input.value?.focus();
        input.value?.select();
    }

    function commit(): void {
        if (!editing.value) {
            return;
        }
        editing.value = false;
        emit("save", draft.value);
    }

    function percent(): number {
        return props.planned > 0 ? Math.min(100, Math.round((props.spent / props.planned) * 100)) : 0;
    }

    /** The bar color: over plan is red, close to the limit is amber. */
    function tone(): string {
        if (props.planned <= 0) {
            return "var(--ft-border)";
        }
        if (props.income) {
            return "var(--ft-income)";
        }
        if (props.spent > props.planned) {
            return "var(--ft-expense)";
        }
        return props.spent / props.planned > 0.85 ? "#eda100" : "var(--ft-income)";
    }
</script>

<template>
    <div class="row">
        <span class="row__icon" :style="iconTint(color)"><AppIcon :icon="icon" /></span>

        <div class="row__body">
            <div class="row__line">
                <span class="row__name">{{ name }}</span>
                <span class="ft-amount">{{ settings.money(spent) }}</span>
            </div>

            <div class="row__line row__line--sub">
                <template v-if="editing">
                    <input
                        ref="input"
                        v-model="draft"
                        class="row__input"
                        type="text"
                        inputmode="decimal"
                        placeholder="Plan for the month"
                        @keyup.enter="commit"
                        @blur="commit"
                    />
                </template>
                <template v-else>
                    <button type="button" class="row__plan" @click="startEdit">
                        {{ planned > 0 ? `Plan ${settings.money(planned)}` : "Set a plan" }}
                    </button>
                    <span v-if="planned > 0" class="ft-muted row__percent">{{ percent() }}%</span>
                </template>
            </div>

            <div class="row__bar">
                <span :style="{ width: `${percent()}%`, background: tone() }" />
            </div>
        </div>
    </div>
</template>

<style scoped>
    .row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-top: 1px solid var(--ft-border);
    }

    .row__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        border-radius: 12px;
        font-size: 20px;
    }

    .row__body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .row__line {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }

    .row__line--sub {
        font-size: 12px;
        min-height: 30px;
    }

    .row__name {
        font-size: 15px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .row__plan {
        padding: 6px 10px;
        border: 1px solid var(--ft-border);
        border-radius: 8px;
        background: transparent;
        color: var(--ft-text-secondary);
        font: inherit;
        font-size: 12px;
        cursor: pointer;
    }

    .row__plan:hover {
        border-color: var(--ft-accent);
        color: var(--ft-accent);
    }

    .row__percent {
        font-variant-numeric: tabular-nums;
    }

    .row__input {
        width: 100%;
        height: 34px;
        padding: 0 10px;
        border: 1px solid var(--ft-accent);
        border-radius: 8px;
        background: var(--ft-surface);
        color: var(--ft-text);
        font: inherit;
        font-size: 16px; /* iOS does not zoom the page on focus as long as the font is at least 16px */
        outline: none;
    }

    .row__bar {
        height: 6px;
        border-radius: 3px;
        background: var(--ft-surface-muted);
        overflow: hidden;
    }

    .row__bar span {
        display: block;
        height: 100%;
        border-radius: 3px;
        min-width: 0;
    }
</style>
