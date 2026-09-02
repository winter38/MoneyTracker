<script setup lang="ts">
    import { ref } from "vue";

    import CategoriesPanel from "@/components/manage/CategoriesPanel.vue";
    import PageHeader from "@/components/layout/PageHeader.vue";
    import RecurringPanel from "@/components/manage/RecurringPanel.vue";

    /** Managing the reference data. Accounts have their own tab; categories and rules live here. */
    const tab = ref("categories");
</script>

<template>
    <div class="manage">
        <PageHeader title="Manage" />

        <el-tabs v-model="tab">
            <el-tab-pane label="Categories" name="categories">
                <CategoriesPanel />
            </el-tab-pane>
            <el-tab-pane label="Recurring transactions" name="recurring">
                <RecurringPanel />
            </el-tab-pane>
        </el-tabs>
    </div>
</template>
