<script setup lang="ts">
    import { computed } from "vue";

    import type { CategoryKind } from "@/types/models";
    import { useCategoriesStore } from "@/stores/categories";

    /**
     * Компактный выбор категории списком — для форм, где плитка избыточна
     * (например, правила повторяющихся операций).
     */
    const props = defineProps<{
        /** Путь [groupId] или [groupId, subcategoryId]. */
        modelValue: string[];
        kind: CategoryKind;
        placeholder?: string;
    }>();

    const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();

    const categories = useCategoriesStore();

    const options = computed(() =>
        categories.tree(props.kind).map((node) => ({
            value: node.group.id,
            label: `${node.group.icon} ${node.group.name}`,
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
        :placeholder="placeholder ?? 'Категория'"
        clearable
        filterable
    />
</template>

<style scoped>
    .category-picker {
        width: 100%;
    }
</style>
