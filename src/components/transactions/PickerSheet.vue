<script setup lang="ts">
    import type { CategoryKind } from "@/types/models";
    import AppIcon from "@/components/common/AppIcon.vue";
    import CategoryGrid from "@/components/transactions/CategoryGrid.vue";
    import { useAccountsStore } from "@/stores/accounts";
    import { useSettingsStore } from "@/stores/settings";
    import { iconTint } from "@/utils/color";

    /**
     * A popup account or category picker - opened by tapping the colored header
     * of the add screen, as in any finance tracker.
     */
    const props = defineProps<{
        open: boolean;
        mode: "account" | "category";
        kind: CategoryKind;
        title: string;
        selectedAccountId?: string;
        excludeAccountId?: string;
        selectedGroupId?: string;
        selectedSubcategoryId?: string;
    }>();

    const emit = defineEmits<{
        close: [];
        pickAccount: [id: string];
        pickCategory: [groupId: string, subcategoryId: string | undefined, final: boolean];
    }>();

    const accounts = useAccountsStore();
    const settings = useSettingsStore();
</script>

<template>
    <Teleport to="body">
        <div v-if="props.open" class="picker-overlay" @click.self="emit('close')">
            <section class="picker" role="dialog" aria-modal="true">
                <header class="picker__head">
                    <span class="picker__title">{{ title }}</span>
                    <button type="button" class="picker__close ft-icon-btn" aria-label="Close" @click="emit('close')">
                        <el-icon :size="18"><Close /></el-icon>
                    </button>
                </header>

                <div v-if="mode === 'account'" class="picker__accounts">
                    <button
                        v-for="account in accounts.active"
                        :key="account.id"
                        type="button"
                        class="account"
                        :class="{ 'account--active': account.id === selectedAccountId, 'account--off': account.id === excludeAccountId }"
                        :disabled="account.id === excludeAccountId"
                        @click="emit('pickAccount', account.id)"
                    >
                        <span class="account__icon" :style="iconTint(account.color)"><AppIcon :icon="account.icon" /></span>
                        <span class="account__name">{{ account.name }}</span>
                        <span class="ft-amount">{{ settings.money(accounts.balanceOf(account.id)) }}</span>
                    </button>
                </div>

                <CategoryGrid
                    v-else
                    class="picker__categories"
                    :kind="kind"
                    show-amounts
                    :group-id="selectedGroupId"
                    :subcategory-id="selectedSubcategoryId"
                    @select="(groupId, subcategoryId, final) => emit('pickCategory', groupId, subcategoryId, final)"
                />
            </section>
        </div>
    </Teleport>
</template>

<style scoped>
    .picker-overlay {
        position: fixed;
        inset: 0;
        background: rgba(8, 10, 14, 0.45);
        z-index: 2700;
        display: flex;
        align-items: flex-end;
        justify-content: center;
    }

    .picker {
        width: 100%;
        max-width: 460px;
        max-height: 82vh;
        display: flex;
        flex-direction: column;
        background: var(--ft-surface);
        border-radius: var(--ft-radius) var(--ft-radius) 0 0;
        overflow: hidden;
    }

    @media (min-width: 900px) {
        .picker-overlay {
            align-items: center;
        }

        .picker {
            border-radius: var(--ft-radius);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
        }
    }

    .picker__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 8px 8px 16px;
        border-bottom: 1px solid var(--ft-border);
    }

    .picker__title {
        font-weight: 600;
    }

    .picker__close {
        width: 34px;
        height: 34px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--ft-text-secondary);
        font-size: 16px;
        cursor: pointer;
    }

    .picker__accounts {
        overflow-y: auto;
        padding: 6px 0 12px;
    }

    .picker__categories {
        overflow: hidden;
    }

    .account {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 10px 16px;
        border: none;
        background: transparent;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
    }

    .account:active {
        background: var(--ft-surface-muted);
    }

    .account--active {
        background: var(--ft-surface-muted);
    }

    .account--off {
        opacity: 0.4;
        cursor: default;
    }

    .account__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        border-radius: 11px;
        font-size: 19px;
    }

    .account__name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
