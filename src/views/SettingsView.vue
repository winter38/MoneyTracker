<script setup lang="ts">
    import { computed, ref } from "vue";
    import { ElMessage, ElMessageBox } from "element-plus";

    import PageHeader from "@/components/layout/PageHeader.vue";
    import { useAccountsStore } from "@/stores/accounts";
    import { useCategoriesStore } from "@/stores/categories";
    import { useRecurringStore } from "@/stores/recurring";
    import { useSettingsStore } from "@/stores/settings";
    import { useTransactionsStore } from "@/stores/transactions";
    import { downloadBackup, downloadCsv, parseBackup, restoreBackup } from "@/utils/backup";
    import { clearAll, usedBytes } from "@/utils/storage";

    const accounts = useAccountsStore();
    const categories = useCategoriesStore();
    const recurring = useRecurringStore();
    const settings = useSettingsStore();
    const transactions = useTransactionsStore();

    const fileInput = ref<HTMLInputElement | null>(null);

    const CURRENCIES = ["EUR", "USD", "GBP", "PLN", "CZK", "SEK", "NOK", "CHF"];

    const storageInfo = computed(() => {
        const kb = usedBytes() / 1024;
        // The practical localStorage limit is around 5 MB per site.
        const percent = Math.min(100, Math.round((kb / 5120) * 100));
        return { kb: kb.toFixed(1), percent };
    });

    const stats = computed(() => ({
        transactions: transactions.items.length,
        accounts: accounts.items.length,
        groups: categories.groups.length,
        subcategories: categories.subcategories.length,
        recurring: recurring.items.length,
    }));

    function pickFile(): void {
        fileInput.value?.click();
    }

    async function onFileChosen(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }
        try {
            const text = await file.text();
            const backup = parseBackup(text);
            await ElMessageBox.confirm(
                `In the file: ${backup.transactions.length} transactions, ${backup.accounts?.length ?? 0} accounts. ` +
                    "The current data in this browser will be replaced completely.",
                "Restore from a backup",
                { type: "warning", confirmButtonText: "Replace", cancelButtonText: "Cancel" },
            );
            restoreBackup(backup);
            ElMessage.success("Data restored");
        } catch (error) {
            if (error instanceof Error && error.message) {
                ElMessage.error(error.message);
            }
        } finally {
            input.value = "";
        }
    }

    async function wipe(): Promise<void> {
        try {
            await ElMessageBox.confirm(
                "Delete every transaction, account and category from this browser? They can only be restored from a backup file.",
                "Wipe data",
                { type: "warning", confirmButtonText: "Delete everything", cancelButtonText: "Cancel" },
            );
            clearAll();
            window.location.reload();
        } catch {
            // Cancelled by the user.
        }
    }
</script>

<template>
    <div class="settings">
        <PageHeader title="Settings" />

        <section class="ft-card">
            <h3 class="ft-section-title">General</h3>
            <el-form label-position="top" class="settings__form">
                <el-form-item label="Currency">
                    <el-select
                        :model-value="settings.state.currency"
                        filterable
                        allow-create
                        class="settings__control"
                        @update:model-value="(value: string) => settings.update({ currency: value })"
                    >
                        <el-option v-for="code in CURRENCIES" :key="code" :label="code" :value="code" />
                    </el-select>
                </el-form-item>

                <el-form-item label="Theme">
                    <el-segmented
                        :model-value="settings.state.theme"
                        :options="[
                            { label: 'Light', value: 'light' },
                            { label: 'Dark', value: 'dark' },
                            { label: 'System', value: 'auto' },
                        ]"
                        @update:model-value="(value: string) => settings.update({ theme: value as 'light' | 'dark' | 'auto' })"
                    />
                </el-form-item>

                <el-form-item label="Day the billing month starts on">
                    <el-input-number
                        :model-value="settings.state.monthStartDay"
                        :min="1"
                        :max="28"
                        controls-position="right"
                        @update:model-value="(value: number | undefined) => settings.update({ monthStartDay: value ?? 1 })"
                    />
                    <span class="ft-muted settings__hint"
                        >If your salary arrives on the 25th, set 25 - the reports will then be counted from it.</span
                    >
                </el-form-item>
            </el-form>
        </section>

        <section class="ft-card">
            <h3 class="ft-section-title">Data</h3>

            <p class="settings__note ft-muted">
                Everything is kept in this browser only, nothing goes to a server. Clearing the site data in your browser will erase the
                records - so make backups.
            </p>

            <div class="settings__actions">
                <el-button type="primary" @click="downloadBackup">Download a backup (JSON)</el-button>
                <el-button @click="pickFile">Restore from a file</el-button>
                <el-button @click="downloadCsv">Export transactions to CSV</el-button>
                <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onFileChosen" />
            </div>

            <dl class="settings__stats">
                <div>
                    <dt class="ft-muted">Transactions</dt>
                    <dd class="ft-amount">{{ stats.transactions }}</dd>
                </div>
                <div>
                    <dt class="ft-muted">Accounts</dt>
                    <dd class="ft-amount">{{ stats.accounts }}</dd>
                </div>
                <div>
                    <dt class="ft-muted">Groups</dt>
                    <dd class="ft-amount">{{ stats.groups }}</dd>
                </div>
                <div>
                    <dt class="ft-muted">Subcategories</dt>
                    <dd class="ft-amount">{{ stats.subcategories }}</dd>
                </div>
                <div>
                    <dt class="ft-muted">Rules</dt>
                    <dd class="ft-amount">{{ stats.recurring }}</dd>
                </div>
            </dl>

            <div class="settings__storage">
                <div class="settings__storage-line">
                    <span class="ft-muted">Used in browser storage</span>
                    <span class="ft-amount">{{ storageInfo.kb }} KB</span>
                </div>
                <el-progress :percentage="storageInfo.percent" :show-text="false" :stroke-width="6" />
                <span class="ft-muted settings__hint">The limit is about 5 MB - enough for tens of thousands of transactions.</span>
            </div>
        </section>

        <section class="ft-card">
            <h3 class="ft-section-title">Danger zone</h3>
            <el-button type="danger" plain @click="wipe">Delete all data</el-button>
        </section>
    </div>
</template>

<style scoped>
    .settings {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-width: 760px;
    }

    .settings__control {
        width: 100%;
        max-width: 240px;
    }

    .settings__hint {
        display: block;
        font-size: 12px;
        margin-top: 4px;
        line-height: 1.4;
    }

    .settings__note {
        font-size: 13px;
        line-height: 1.5;
        margin: 0 0 12px;
    }

    .settings__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }

    /* On a phone the buttons are full width - easier to hit. */
    @media (max-width: 899px) {
        .settings__actions {
            flex-direction: column;
            align-items: stretch;
        }

        .settings__actions :deep(.el-button + .el-button) {
            margin-left: 0;
        }
    }

    .settings__stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
        gap: 10px;
        margin: 18px 0 14px;
    }

    .settings__stats div {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 10px 12px;
        border-radius: var(--ft-radius-sm);
        background: var(--ft-surface-muted);
    }

    .settings__stats dt {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .settings__stats dd {
        margin: 0;
        font-size: 18px;
    }

    .settings__storage-line {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        margin-bottom: 6px;
    }
</style>
