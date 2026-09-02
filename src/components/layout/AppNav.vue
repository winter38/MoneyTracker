<script setup lang="ts">
    import { computed } from "vue";

    import { mdiChartDonut, mdiChartLine, mdiCog, mdiFormatListBulleted, mdiTargetVariant, mdiTune, mdiWallet } from "@mdi/js";

    import AppIcon from "@/components/common/AppIcon.vue";
    import { useAccountsStore } from "@/stores/accounts";
    import { useSettingsStore } from "@/stores/settings";

    defineProps<{ isMobile: boolean }>();
    defineEmits<{ add: [] }>();

    const accounts = useAccountsStore();
    const settings = useSettingsStore();

    /** The sections, in the same order as in any finance tracker. */
    const links = [
        { to: "/accounts", label: "Accounts", icon: mdiWallet },
        { to: "/categories", label: "Categories", icon: mdiChartDonut },
        { to: "/transactions", label: "Transactions", icon: mdiFormatListBulleted },
        { to: "/budget", label: "Budget", icon: mdiTargetVariant },
        { to: "/overview", label: "Overview", icon: mdiChartLine },
    ];

    const extra = [
        { to: "/manage", label: "Manage", icon: mdiTune },
        { to: "/settings", label: "Settings", icon: mdiCog },
    ];

    const totalLabel = computed(() => settings.money(accounts.totalBalance));
</script>

<template>
    <nav v-if="isMobile" class="mobile-nav">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="mobile-nav__item">
            <AppIcon class="mobile-nav__icon" :icon="link.icon" />
            <span class="mobile-nav__label">{{ link.label }}</span>
        </RouterLink>
    </nav>

    <aside v-else class="sidebar">
        <div class="sidebar__brand">
            <span class="sidebar__logo">◈</span>
            <span>Finance</span>
        </div>

        <div class="sidebar__total">
            <span class="ft-muted">Total across accounts</span>
            <strong class="ft-amount">{{ totalLabel }}</strong>
        </div>

        <el-button class="sidebar__add" type="primary" size="large" @click="$emit('add')">Add transaction</el-button>

        <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="sidebar__link">
            <AppIcon class="sidebar__icon" :icon="link.icon" />
            {{ link.label }}
        </RouterLink>

        <div class="sidebar__divider" />

        <RouterLink v-for="link in extra" :key="link.to" :to="link.to" class="sidebar__link sidebar__link--muted">
            <AppIcon class="sidebar__icon" :icon="link.icon" />
            {{ link.label }}
        </RouterLink>

        <div class="sidebar__foot ft-muted">Your data is kept in this browser only</div>
    </aside>
</template>

<style scoped>
    .sidebar {
        width: 236px;
        flex: 0 0 236px;
        padding: 20px 14px;
        background: var(--ft-surface);
        border-right: 1px solid var(--ft-border);
        display: flex;
        flex-direction: column;
        gap: 4px;
        position: sticky;
        top: 0;
        height: 100vh;
        overflow-y: auto;
    }

    .sidebar__brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 700;
        font-size: 17px;
        padding: 4px 8px 12px;
    }

    .sidebar__logo {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: 9px;
        background: var(--ft-accent);
        color: #fff;
        font-size: 16px;
    }

    .sidebar__total {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 12px;
        margin-bottom: 6px;
        border-radius: var(--ft-radius-sm);
        background: var(--ft-surface-muted);
        font-size: 13px;
    }

    .sidebar__total strong {
        font-size: 20px;
    }

    .sidebar__add {
        width: 100%;
        margin: 0 0 10px;
    }

    .sidebar__link {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: var(--ft-radius-sm);
        color: var(--ft-text-secondary);
        text-decoration: none;
        font-weight: 500;
        transition: background 0.15s ease;
    }

    .sidebar__link:hover {
        background: var(--ft-surface-muted);
    }

    .sidebar__link.router-link-active {
        background: var(--ft-surface-muted);
        color: var(--ft-accent);
    }

    .sidebar__link--muted {
        font-size: 13px;
        font-weight: 400;
    }

    .sidebar__divider {
        height: 1px;
        background: var(--ft-border);
        margin: 8px 12px;
    }

    .sidebar__icon {
        font-size: 18px;
    }

    .sidebar__foot {
        margin-top: auto;
        padding: 10px 12px 0;
        font-size: 11px;
        line-height: 1.4;
    }

    .mobile-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: calc(var(--ft-nav-height) + env(safe-area-inset-bottom));
        padding-bottom: env(safe-area-inset-bottom);
        display: flex;
        background: var(--ft-surface);
        border-top: 1px solid var(--ft-border);
        z-index: 1300;
    }

    .mobile-nav__item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        text-decoration: none;
        color: var(--ft-text-muted);
        font-size: 10px;
        min-width: 0;
    }

    .mobile-nav__item.router-link-active {
        color: var(--ft-accent);
    }

    .mobile-nav__icon {
        font-size: 21px;
    }

    .mobile-nav__label {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
