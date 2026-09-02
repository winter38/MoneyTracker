<script setup lang="ts">
    import { computed, ref } from "vue";
    import { useRoute } from "vue-router";

    import AppHeader from "@/components/layout/AppHeader.vue";
    import AppNav from "@/components/layout/AppNav.vue";
    import QuickAddSheet from "@/components/transactions/QuickAddSheet.vue";
    import { useBreakpoint } from "@/composables/useBreakpoint";

    const route = useRoute();
    const { isMobile } = useBreakpoint();

    const sheetRef = ref<InstanceType<typeof QuickAddSheet> | null>(null);

    /** «Справочники» и «Настройки» — вложенные страницы: без общей шапки и без кнопки «+». */
    const isSubPage = computed(() => ["manage", "settings"].includes(String(route.name)));
    const showHeader = computed(() => !isSubPage.value);

    function openQuickAdd(): void {
        sheetRef.value?.openNew();
    }

    /** Открыть добавление сразу в выбранной категории — как тап по кольцу категорий. */
    function openForCategory(groupId: string, kind: "expense" | "income"): void {
        sheetRef.value?.openNew(kind, groupId);
    }
</script>

<template>
    <div class="app" :class="{ 'app--mobile': isMobile }">
        <AppNav :is-mobile="isMobile" @add="openQuickAdd" />

        <main class="app__main">
            <AppHeader v-if="showHeader" />

            <div class="app__content">
                <RouterView v-slot="{ Component }">
                    <component
                        :is="Component"
                        @edit-transaction="(id: string) => sheetRef?.openEdit(id)"
                        @add-to-category="openForCategory"
                    />
                </RouterView>
            </div>
        </main>

        <button v-if="isMobile && !isSubPage" class="app__fab ft-icon-btn" type="button" aria-label="Добавить операцию" @click="openQuickAdd">
            <el-icon :size="30"><Plus /></el-icon>
        </button>

        <QuickAddSheet ref="sheetRef" />
    </div>
</template>

<style scoped>
    .app {
        display: flex;
        min-height: 100vh;
    }

    .app__main {
        flex: 1;
        min-width: 0;
        max-width: 1180px;
        margin: 0 auto;
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    .app__content {
        padding: 16px 28px 40px;
    }

    /* Снизу оставляем место под нижнюю навигацию и плавающую кнопку, чтобы они не перекрывали контент. */
    .app--mobile .app__content {
        padding: 10px 12px calc(var(--ft-nav-height) + 96px);
    }

    .app__fab {
        position: fixed;
        right: 18px;
        bottom: calc(var(--ft-nav-height) + 16px);
        width: 56px;
        height: 56px;
        border: none;
        border-radius: 50%;
        background: var(--ft-accent);
        color: #fff;
        box-shadow: 0 6px 20px rgba(42, 120, 214, 0.45);
        cursor: pointer;
        z-index: 1200;
    }

    .app__fab:active {
        transform: scale(0.94);
    }
</style>
