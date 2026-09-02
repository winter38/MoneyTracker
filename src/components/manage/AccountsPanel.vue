<script setup lang="ts">
    import { reactive, ref } from "vue";
    import { ElMessage, ElMessageBox } from "element-plus";

    import type { Account } from "@/types/models";
    import { PALETTE } from "@/data/seed";
    import { useAccountsStore } from "@/stores/accounts";
    import { useSettingsStore } from "@/stores/settings";
    import { parseAmount } from "@/utils/money";
    import { iconTint } from "@/utils/color";

    const accounts = useAccountsStore();
    const settings = useSettingsStore();

    const ICONS = ["💵", "💳", "🏦", "🐷", "📱", "💼", "🪙", "🎯"];

    const dialogVisible = ref(false);
    const editingId = ref<string | null>(null);
    const form = reactive({ name: "", icon: "💵", color: PALETTE[0] as string, initialBalance: "0" });

    function openNew(): void {
        editingId.value = null;
        Object.assign(form, { name: "", icon: "💵", color: PALETTE[0], initialBalance: "0" });
        dialogVisible.value = true;
    }

    function openEdit(account: Account): void {
        editingId.value = account.id;
        Object.assign(form, {
            name: account.name,
            icon: account.icon,
            color: account.color,
            initialBalance: String(account.initialBalance),
        });
        dialogVisible.value = true;
    }

    function submit(): void {
        if (!form.name.trim()) {
            ElMessage.warning("Введите название счёта");
            return;
        }
        const payload = {
            name: form.name.trim(),
            icon: form.icon,
            color: form.color,
            // Стартовый остаток может быть отрицательным (кредитка), поэтому знак сохраняем.
            initialBalance: parseAmount(form.initialBalance) * (String(form.initialBalance).trim().startsWith("-") ? -1 : 1),
        };
        if (editingId.value) {
            accounts.update(editingId.value, payload);
        } else {
            accounts.add(payload);
        }
        dialogVisible.value = false;
    }

    async function confirmRemove(account: Account): Promise<void> {
        try {
            await ElMessageBox.confirm(
                `Удалить счёт «${account.name}» вместе со всеми его операциями? Действие необратимо — если нужна только очистка из списков, используйте архив.`,
                "Удаление счёта",
                { type: "warning", confirmButtonText: "Удалить", cancelButtonText: "Отмена" },
            );
            accounts.remove(account.id);
            ElMessage.success("Счёт удалён");
        } catch {
            // Пользователь отменил — ничего не делаем.
        }
    }
</script>

<template>
    <div class="panel">
        <div class="panel__head">
            <el-button type="primary" @click="openNew">Добавить счёт</el-button>
        </div>

        <div class="ft-card ft-card--flush">
            <p v-if="!accounts.all.length" class="ft-empty">Счетов пока нет</p>
            <div v-for="account in accounts.all" :key="account.id" class="row" :class="{ 'row--archived': account.archived }">
                <span class="row__icon" :style="iconTint(account.color)">{{ account.icon }}</span>
                <div class="row__text">
                    <span class="row__name">{{ account.name }}</span>
                    <span v-if="account.initialBalance !== 0 || account.archived" class="ft-muted row__hint">
                        <template v-if="account.initialBalance !== 0">старт {{ settings.money(account.initialBalance) }}</template>
                        <template v-if="account.archived"> · в архиве</template>
                    </span>
                </div>
                <span class="ft-amount">{{ settings.money(accounts.balanceOf(account.id)) }}</span>
                <el-dropdown trigger="click">
                    <el-button link><el-icon :size="20"><MoreFilled /></el-icon></el-button>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item @click="openEdit(account)">Изменить</el-dropdown-item>
                            <el-dropdown-item @click="accounts.update(account.id, { archived: !account.archived })">
                                {{ account.archived ? "Вернуть из архива" : "В архив" }}
                            </el-dropdown-item>
                            <el-dropdown-item divided @click="confirmRemove(account)">Удалить</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>
        </div>

        <el-dialog v-model="dialogVisible" :title="editingId ? 'Счёт' : 'Новый счёт'" width="420px" append-to-body>
            <!-- Превью: цвет и иконка сразу показаны так, как счёт выглядит в списке. -->
            <div class="preview">
                <span class="preview__icon" :style="iconTint(form.color)">{{ form.icon }}</span>
                <div class="preview__text">
                    <strong>{{ form.name.trim() || "Новый счёт" }}</strong>
                    <span class="ft-muted">старт {{ settings.money(parseAmount(form.initialBalance)) }}</span>
                </div>
            </div>

            <el-form label-position="top">
                <el-form-item label="Название">
                    <el-input v-model="form.name" placeholder="Например, Карта Revolut" maxlength="40" />
                </el-form-item>
                <el-form-item label="Иконка">
                    <div class="picker">
                        <button
                            v-for="icon in ICONS"
                            :key="icon"
                            type="button"
                            class="picker__item"
                            :class="{ 'picker__item--active': form.icon === icon }"
                            :style="form.icon === icon ? { borderColor: form.color, background: `${form.color}22` } : undefined"
                            @click="form.icon = icon"
                        >
                            {{ icon }}
                        </button>
                    </div>
                </el-form-item>
                <el-form-item label="Цвет">
                    <div class="picker">
                        <button
                            v-for="color in PALETTE"
                            :key="color"
                            type="button"
                            class="picker__dot"
                            :class="{ 'picker__dot--active': form.color === color }"
                            :style="{ background: color }"
                            :aria-label="color"
                            @click="form.color = color"
                        />
                    </div>
                </el-form-item>
                <el-form-item label="Стартовый остаток">
                    <el-input v-model="form.initialBalance" inputmode="decimal" placeholder="0.00" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">Отмена</el-button>
                <el-button type="primary" @click="submit">Сохранить</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
    .panel {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .panel__head {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
    }

    .row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-top: 1px solid var(--ft-border);
    }

    /* Плотный цветной квадрат — так счета отличаются от круглых иконок категорий. */
    .row__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        border-radius: 12px;
        font-size: 21px;
    }

    .row__name {
        font-size: 15px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .row:first-child {
        border-top: none;
    }

    .row--archived {
        opacity: 0.55;
    }

    .row__text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .row__hint {
        font-size: 12px;
    }

    .preview {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 14px;
        margin-bottom: 16px;
        border-radius: var(--ft-radius);
        background: var(--ft-surface-muted);
    }

    .preview__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        flex: 0 0 56px;
        border-radius: 14px;
        font-size: 26px;
    }

    .preview__text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .preview__text strong {
        font-size: 16px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .preview__text span {
        font-size: 12px;
    }

    .picker {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .picker__item {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        border: 1px solid var(--ft-border);
        background: var(--ft-surface);
        font-size: 18px;
        cursor: pointer;
    }

    .picker__item--active {
        border-color: var(--ft-accent);
        box-shadow: 0 0 0 2px rgba(42, 120, 214, 0.2);
    }

    .picker__dot {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
    }

    .picker__dot--active {
        border-color: var(--ft-text);
    }
</style>
