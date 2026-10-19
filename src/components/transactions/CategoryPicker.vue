<script setup lang="ts">
    import { computed } from "vue";

    import type { CategoryKind } from "@/types/models";
    import AppIcon from "@/components/common/AppIcon.vue";
    import { useCategoriesStore } from "@/stores/categories";

    /**
     * A compact list-style category picker - for forms where the tile grid is overkill
     * (recurring transaction rules, for example).
     */
    const props = defineProps<{
        /** The path [groupId] or [groupId, subcategoryId]. */
        modelValue: string[];
        kind: CategoryKind;
        placeholder?: string;
    }>();

    const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();

    const categories = useCategoriesStore();

    const options = computed(() =>
        categories.tree(props.kind).map((node) => ({
            value: node.group.id,
            label: node.group.name,
            icon: node.group.icon,
            color: node.group.color,
            children: node.children.map((child) => ({ value: child.id, label: child.name })),
        })),
    );

    const value = computed({
        get: () => props.modelValue,
        set: (next: string[] | null) => emit("update:modelValue", next ?? []),
    });
</script>

<template>
    <el-cascader
        v-model="value"
        class="category-picker"
        :options="options"
        :props="{ checkStrictly: true, expandTrigger: 'hover' }"
        :placeholder="placeholder ?? 'Category'"
        clearable
        filterable
    >
        <template #default="{ data }">
            <span class="category-picker__option">
                <AppIcon v-if="data.icon" :icon="data.icon" :style="{ color: data.color }" />
                {{ data.label }}
            </span>
        </template>
    </el-cascader>
</template>

<style scoped>
    .category-picker {
        width: 100%;
    }

    .category-picker__option {
        display: inline-flex;
        align-items: center;
        gap: 8px;
    }
</style>
