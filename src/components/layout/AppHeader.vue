<script setup lang="ts">
    import { useRouter } from "vue-router";

    import { useAccountsStore } from "@/stores/accounts";
    import { usePeriodStore } from "@/stores/period";
    import { useSettingsStore } from "@/stores/settings";

    /**
     * The shared header: the total balance and the billing-month switcher.
     * The period lives in a store, so it is the same on every tab.
     */
    const router = useRouter();
    const accounts = useAccountsStore();
    const period = usePeriodStore();
    const settings = useSettingsStore();
</script>

<template>
    <header class="app-header">
        <div class="app-header__row">
            <button type="button" class="app-header__icon ft-icon-btn" aria-label="Manage" @click="router.push('/manage')">
                <el-icon :size="20"><Menu /></el-icon>
            </button>

            <div class="app-header__total">
                <span class="app-header__caption">All accounts</span>
                <strong class="ft-amount" :class="{ 'ft-amount--expense': accounts.totalBalance < 0 }">
                    {{ settings.money(accounts.totalBalance) }}
                </strong>
            </div>

            <button type="button" class="app-header__icon ft-icon-btn" aria-label="Settings" @click="router.push('/settings')">
                <el-icon :size="20"><Setting /></el-icon>
            </button>
        </div>

        <div class="app-header__row app-header__row--period">
            <button type="button" class="app-header__arrow ft-icon-btn" aria-label="Previous month" @click="period.shift(-1)">
                <el-icon :size="20"><DArrowLeft /></el-icon>
            </button>

            <button
                type="button"
                class="period-pill"
                :class="{ 'period-pill--other': !period.isCurrent }"
                :title="period.isCurrent ? 'Current month' : 'Back to the current month'"
                @click="period.reset"
            >
                <span class="period-pill__days">{{ period.days }}</span>
                <span class="period-pill__label">{{ period.label }}</span>
                <el-icon v-if="!period.isCurrent" class="period-pill__reset" :size="14"><RefreshLeft /></el-icon>
            </button>

            <!-- Paging forward is unrestricted: plans and future recurring transactions need looking at too. -->
            <button type="button" class="app-header__arrow ft-icon-btn" aria-label="Next month" @click="period.shift(1)">
                <el-icon :size="20"><DArrowRight /></el-icon>
            </button>
        </div>
    </header>
</template>

<style scoped>
    .app-header {
        background: var(--ft-surface);
        border-bottom: 1px solid var(--ft-border);
        padding: 8px 10px 10px;
        position: sticky;
        top: 0;
        z-index: 900;
    }

    .app-header__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    .app-header__row--period {
        margin-top: 6px;
    }

    .app-header__icon,
    .app-header__arrow {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--ft-tap);
        height: var(--ft-tap);
        flex: 0 0 var(--ft-tap);
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--ft-text-secondary);
        font-size: 20px;
        cursor: pointer;
    }

    .app-header__icon:hover,
    .app-header__arrow:hover {
        background: var(--ft-surface-muted);
        color: var(--ft-text);
    }

    .app-header__total {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
        min-width: 0;
    }

    /* On a wide screen, Manage and Settings are already in the sidebar. */
    @media (min-width: 900px) {
        .app-header__icon {
            visibility: hidden;
        }
    }

    .app-header__caption {
        font-size: 12px;
        color: var(--ft-text-muted);
    }

    .app-header__total strong {
        font-size: 22px;
    }

    .period-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 40px;
        padding: 0 18px;
        border: none;
        border-radius: 20px;
        background: var(--ft-surface-muted);
        color: var(--ft-text);
        font: inherit;
        font-weight: 600;
        font-size: 15px;
        cursor: pointer;
    }

    /* A non-current month is highlighted so it is obvious you are not looking at "now". */
    .period-pill--other {
        background: color-mix(in srgb, var(--ft-accent) 16%, var(--ft-surface));
        color: var(--ft-accent);
    }

    .period-pill--other .period-pill__days {
        border-color: currentColor;
        color: currentColor;
    }

    .period-pill__reset {
        font-size: 14px;
        opacity: 0.9;
    }

    .period-pill__days {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1.5px solid var(--ft-text-muted);
        font-size: 11px;
        font-weight: 600;
        color: var(--ft-text-secondary);
    }
</style>
