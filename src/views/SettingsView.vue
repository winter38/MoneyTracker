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
        // Практический лимит localStorage — около 5 МБ на сайт.
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
                `В файле: операций ${backup.transactions.length}, счетов ${backup.accounts?.length ?? 0}. ` +
                    "Текущие данные в этом браузере будут полностью заменены.",
                "Восстановление из резервной копии",
                { type: "warning", confirmButtonText: "Заменить", cancelButtonText: "Отмена" },
            );
            restoreBackup(backup);
            ElMessage.success("Данные восстановлены");
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
                "Удалить все операции, счета и категории из этого браузера? Восстановить можно будет только из файла резервной копии.",
                "Очистка данных",
                { type: "warning", confirmButtonText: "Удалить всё", cancelButtonText: "Отмена" },
            );
            clearAll();
            window.location.reload();
        } catch {
            // Отмена пользователем.
        }
    }
</script>

<template>
    <div class="settings">
        <PageHeader title="Настройки" />

        <section class="ft-card">
            <h3 class="ft-section-title">Основное</h3>
            <el-form label-position="top" class="settings__form">
                <el-form-item label="Валюта">
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

                <el-form-item label="Тема">
                    <el-segmented
                        :model-value="settings.state.theme"
                        :options="[
                            { label: 'Светлая', value: 'light' },
                            { label: 'Тёмная', value: 'dark' },
                            { label: 'Как в системе', value: 'auto' },
                        ]"
                        @update:model-value="(value: string) => settings.update({ theme: value as 'light' | 'dark' | 'auto' })"
                    />
                </el-form-item>

                <el-form-item label="День начала расчётного месяца">
                    <el-input-number
                        :model-value="settings.state.monthStartDay"
                        :min="1"
                        :max="28"
                        controls-position="right"
                        @update:model-value="(value: number | undefined) => settings.update({ monthStartDay: value ?? 1 })"
                    />
                    <span class="ft-muted settings__hint">Если зарплата приходит 25-го, поставьте 25 — отчёты будут считаться от неё.</span>
                </el-form-item>
            </el-form>
        </section>

        <section class="ft-card">
            <h3 class="ft-section-title">Данные</h3>

            <p class="settings__note ft-muted">
                Всё хранится только в этом браузере, на сервер ничего не уходит. Очистка данных сайта в браузере сотрёт записи — делайте
                резервные копии.
            </p>

            <div class="settings__actions">
                <el-button type="primary" @click="downloadBackup">Скачать резервную копию (JSON)</el-button>
                <el-button @click="pickFile">Восстановить из файла</el-button>
                <el-button @click="downloadCsv">Экспорт операций в CSV</el-button>
                <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onFileChosen" />
            </div>

            <dl class="settings__stats">
                <div><dt class="ft-muted">Операций</dt><dd class="ft-amount">{{ stats.transactions }}</dd></div>
                <div><dt class="ft-muted">Счетов</dt><dd class="ft-amount">{{ stats.accounts }}</dd></div>
                <div><dt class="ft-muted">Групп</dt><dd class="ft-amount">{{ stats.groups }}</dd></div>
                <div><dt class="ft-muted">Подкатегорий</dt><dd class="ft-amount">{{ stats.subcategories }}</dd></div>
                <div><dt class="ft-muted">Правил</dt><dd class="ft-amount">{{ stats.recurring }}</dd></div>
            </dl>

            <div class="settings__storage">
                <div class="settings__storage-line">
                    <span class="ft-muted">Занято в хранилище браузера</span>
                    <span class="ft-amount">{{ storageInfo.kb }} КБ</span>
                </div>
                <el-progress :percentage="storageInfo.percent" :show-text="false" :stroke-width="6" />
                <span class="ft-muted settings__hint">Лимит около 5 МБ — этого хватает на десятки тысяч операций.</span>
            </div>
        </section>

        <section class="ft-card">
            <h3 class="ft-section-title">Опасная зона</h3>
            <el-button type="danger" plain @click="wipe">Удалить все данные</el-button>
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

    /* На телефоне кнопки во всю ширину — так по ним проще попасть. */
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
