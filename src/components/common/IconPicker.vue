<script setup lang="ts">
    import { computed, ref } from "vue";

    import AppIcon from "@/components/common/AppIcon.vue";
    import { searchIcons } from "@/data/icons";

    /**
     * The icon grid used by the account and category dialogs.
     *
     * The whole set is around 180 icons, which is too many for a flat grid, so they are
     * grouped and searchable; the selected one is outlined in the entity color.
     */
    const props = defineProps<{
        modelValue: string;
        /** The entity color - the selected icon is highlighted with it. */
        color: string;
    }>();

    const emit = defineEmits<{ "update:modelValue": [value: string] }>();

    const query = ref("");
    const groups = computed(() => searchIcons(query.value));

    function styleFor(id: string): Record<string, string> | undefined {
        return id === props.modelValue ? { borderColor: props.color, background: `${props.color}1f`, color: props.color } : undefined;
    }
</script>

<template>
    <div class="icon-picker">
        <el-input v-model="query" placeholder="Search icons" clearable class="icon-picker__search" />

        <div class="icon-picker__scroll">
            <section v-for="group in groups" :key="group.name" class="icon-picker__group">
                <h4 class="icon-picker__group-name">{{ group.name }}</h4>
                <div class="icon-picker__grid">
                    <button
                        v-for="item in group.items"
                        :key="item.id"
                        type="button"
                        class="icon-picker__item"
                        :class="{ 'icon-picker__item--active': item.id === modelValue }"
                        :style="styleFor(item.id)"
                        :title="item.id"
                        :aria-label="item.id"
                        :aria-pressed="item.id === modelValue"
                        @click="emit('update:modelValue', item.id)"
                    >
                        <AppIcon :icon="item.id" />
                    </button>
                </div>
            </section>

            <p v-if="!groups.length" class="ft-empty">No icons match that search</p>
        </div>
    </div>
</template>

<style scoped>
    .icon-picker {
        width: 100%;
    }

    .icon-picker__search {
        margin-bottom: 8px;
    }

    .icon-picker__scroll {
        max-height: 244px;
        overflow-y: auto;
        padding-right: 4px;
    }

    .icon-picker__group + .icon-picker__group {
        margin-top: 10px;
    }

    /* The group name stays put while scrolling, so it is always clear what is on screen. */
    .icon-picker__group-name {
        position: sticky;
        top: 0;
        margin: 0 0 6px;
        padding: 2px 0;
        background: var(--ft-surface);
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--ft-text-muted);
    }

    .icon-picker__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
        gap: 6px;
    }

    .icon-picker__item {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1;
        border: 1px solid var(--ft-border);
        border-radius: 10px;
        background: var(--ft-surface);
        color: var(--ft-text-secondary);
        font-size: 20px;
        cursor: pointer;
    }

    .icon-picker__item:hover {
        border-color: var(--ft-accent);
        color: var(--ft-accent);
    }

    .icon-picker__item--active {
        box-shadow: 0 0 0 2px rgba(42, 120, 214, 0.18);
    }
</style>
