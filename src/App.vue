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

    /** Manage and Settings are sub-pages: no shared header and no "+" button. */
    const isSubPage = computed(() => ["manage", "settings"].includes(String(route.name)));
    const showHeader = computed(() => !isSubPage.value);

    function openQuickAdd(): void {
        sheetRef.value?.openNew();
    }

    /** Open the add form straight into the chosen category - same as tapping the category ring. */
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

        <button v-if="isMobile && !isSubPage" class="app__fab ft-icon-btn" type="button" aria-label="Add transaction" @click="openQuickAdd">
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

    /* Leave room at the bottom for the bottom nav and the floating button so they do not cover the content. */
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
