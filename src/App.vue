<script setup lang="ts">
    import { computed, ref, watch } from "vue";
    import { useRoute } from "vue-router";
    import { ElMessage } from "element-plus";
    import en from "element-plus/es/locale/lang/en";

    import AppHeader from "@/components/layout/AppHeader.vue";
    import AppNav from "@/components/layout/AppNav.vue";
    import QuickAddSheet from "@/components/transactions/QuickAddSheet.vue";
    import { useBreakpoint } from "@/composables/useBreakpoint";
    import { useScrollHide } from "@/composables/useScrollHide";
    import { storageFailed } from "@/utils/persist";

    const route = useRoute();
    const { isMobile } = useBreakpoint();
    const { hidden: fabHidden, reveal: revealFab } = useScrollHide();

    const sheetRef = ref<InstanceType<typeof QuickAddSheet> | null>(null);

    /** Manage and Settings are sub-pages: no shared header and no "+" button. */
    const isSubPage = computed(() => ["manage", "settings"].includes(String(route.name)));
    const showHeader = computed(() => !isSubPage.value);

    /** A new page starts at its own scroll position, so the button must not stay hidden. */
    watch(() => route.name, revealFab);

    /**
     * The data lives in localStorage only, so a failed write means the entries are lost on reload.
     * The message has no timeout on purpose - this is not a notification to be missed.
     * `immediate` because the startup work in main.ts (seeding, catching up on recurring rules)
     * writes before this component exists - without it such a failure would go unreported.
     */
    watch(
        storageFailed,
        (failed) => {
            if (failed) {
                ElMessage.error({
                    message:
                        "Could not save your data - the browser storage is full or blocked. Export a backup from Settings before closing the tab.",
                    duration: 0,
                    showClose: true,
                    grouping: true,
                });
            }
        },
        { immediate: true },
    );

    function openQuickAdd(): void {
        sheetRef.value?.openNew();
    }

    /** Open the add form straight into the chosen category - same as tapping the category ring. */
    function openForCategory(groupId: string, kind: "expense" | "income"): void {
        sheetRef.value?.openNew(kind, groupId);
    }
</script>

<template>
    <!--
        Element Plus is no longer installed as a global plugin (it is auto-imported per component),
        so its locale and default size are configured here instead. On a narrow screen the controls
        are larger: 32px tall fields are hard to hit with a finger.

        z-index starts above the sheets (2600 QuickAdd, 2700 Picker, 2800 Date): Element Plus
        counts up from 2000 by default, so a confirmation opened from inside a sheet landed
        behind it and the tap looked like it had done nothing.
    -->
    <el-config-provider :locale="en" :size="isMobile ? 'large' : 'default'" :z-index="3000">
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

            <button
                v-if="isMobile && !isSubPage"
                class="app__fab ft-icon-btn"
                :class="{ 'app__fab--hidden': fabHidden }"
                type="button"
                aria-label="Add transaction"
                @click="openQuickAdd"
            >
                <el-icon :size="30"><Plus /></el-icon>
            </button>

            <QuickAddSheet ref="sheetRef" />
        </div>
    </el-config-provider>
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
        transition:
            transform 180ms ease,
            opacity 180ms ease;
    }

    /* Scrolling down hands the bottom right corner back to the list, where the amounts are. */
    .app__fab--hidden {
        transform: translateY(96px) scale(0.85);
        opacity: 0;
        pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
        .app__fab {
            transition: none;
        }
    }

    .app__fab:active {
        transform: scale(0.94);
    }
</style>
