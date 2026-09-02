<script setup lang="ts">
    import { ref } from "vue";

    import CategoriesPanel from "@/components/manage/CategoriesPanel.vue";
    import PageHeader from "@/components/layout/PageHeader.vue";
    import RecurringPanel from "@/components/manage/RecurringPanel.vue";

    /** Управление справочниками. Счета живут на своей вкладке, здесь — категории и правила. */
    const tab = ref("categories");
</script>

<template>
    <div class="manage">
        <PageHeader title="Справочники" />

        <el-tabs v-model="tab">
            <el-tab-pane label="Категории" name="categories">
                <CategoriesPanel />
            </el-tab-pane>
            <el-tab-pane label="Регулярные операции" name="recurring">
                <RecurringPanel />
            </el-tab-pane>
        </el-tabs>
    </div>
</template>
