<script setup lang="ts">
    import { computed, reactive, ref, watch } from "vue";
    import { ElMessage, ElMessageBox } from "element-plus";

    import type { TxKind } from "@/types/models";
    import DateSheet from "@/components/transactions/DateSheet.vue";
    import NumPad from "@/components/transactions/NumPad.vue";
    import PickerSheet from "@/components/transactions/PickerSheet.vue";
    import { presetByKey } from "@/data/recurrence";
    import { useAccountsStore } from "@/stores/accounts";
    import { useCategoriesStore } from "@/stores/categories";
    import { useRecurringStore } from "@/stores/recurring";
    import { useSettingsStore } from "@/stores/settings";
    import { useTransactionsStore } from "@/stores/transactions";
    import { addPeriod, formatDate, today } from "@/utils/date";
    import { round2 } from "@/utils/money";

    const accounts = useAccountsStore();
    const categories = useCategoriesStore();
    const recurring = useRecurringStore();
    const settings = useSettingsStore();
    const transactions = useTransactionsStore();

    const visible = ref(false);
    const editingId = ref<string | null>(null);
    const dateSheetOpen = ref(false);

    /** Какая половина шапки сейчас открыта для выбора. */
    const picker = ref<"none" | "from" | "to">("none");

    const form = reactive({
        kind: "expense" as TxKind,
        date: today(),
        accountId: "",
        toAccountId: "",
        groupId: undefined as string | undefined,
        subcategoryId: undefined as string | undefined,
        note: "",
        /** Ключ повторения из RECURRENCE_PRESETS; null — разовая операция. */
        recurrence: null as string | null,
    });

    /* ---------- Калькулятор ---------- */

    const entry = ref("");
    const pendingValue = ref<number | null>(null);
    const pendingOp = ref<"+" | "-" | "*" | "/" | null>(null);

    const OP_LABEL: Record<"+" | "-" | "*" | "/", string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

    const entryNumber = computed(() => Number.parseFloat(entry.value.replace(",", ".")) || 0);

    /** Результат с учётом незавершённой операции. Пустой второй операнд нейтрален. */
    const total = computed(() => {
        if (pendingValue.value === null || pendingOp.value === null) {
            return round2(entryNumber.value);
        }
        const left = pendingValue.value;
        const right = entry.value === "" ? (pendingOp.value === "*" || pendingOp.value === "/" ? 1 : 0) : entryNumber.value;
        switch (pendingOp.value) {
            case "+":
                return round2(left + right);
            case "-":
                return round2(left - right);
            case "*":
                return round2(left * right);
            case "/":
                return right === 0 ? round2(left) : round2(left / right);
        }
        return round2(left);
    });

    const display = computed(() => {
        const current = entry.value === "" ? "0" : entry.value;
        if (pendingValue.value !== null && pendingOp.value !== null) {
            return `${pendingValue.value} ${OP_LABEL[pendingOp.value]} ${entry.value === "" ? "" : current}`.trim();
        }
        return current;
    });

    function pressDigit(value: string): void {
        const decimals = entry.value.split(",")[1];
        if (decimals !== undefined && decimals.length + value.length > 2) {
            return;
        }
        if (entry.value.replace(",", "").length + value.length > 12) {
            return;
        }
        entry.value = entry.value === "0" ? value : entry.value + value;
    }

    function pressDot(): void {
        if (!entry.value.includes(",")) {
            entry.value = entry.value === "" ? "0," : `${entry.value},`;
        }
    }

    function pressBackspace(): void {
        if (entry.value !== "") {
            entry.value = entry.value.slice(0, -1);
        } else if (pendingOp.value !== null) {
            entry.value = String(pendingValue.value ?? "");
            pendingValue.value = null;
            pendingOp.value = null;
        }
    }

    function clearAmount(): void {
        entry.value = "";
        pendingValue.value = null;
        pendingOp.value = null;
    }

    function pressOperator(op: "+" | "-" | "*" | "/"): void {
        pendingValue.value = total.value;
        pendingOp.value = op;
        entry.value = "";
    }

    /** Кнопка календаря на клавиатуре открывает лист с датой и повторением. */
    function openDatePicker(): void {
        dateSheetOpen.value = true;
    }

    /* ---------- Открытие и закрытие ---------- */

    /** Новая операция; можно сразу подставить категорию (тап по кольцу категорий). */
    function openNew(kind: TxKind = "expense", groupId?: string): void {
        editingId.value = null;
        clearAmount();
        form.kind = kind;
        form.date = today();
        form.accountId = accounts.active[0]?.id ?? "";
        form.toAccountId = accounts.active[1]?.id ?? "";
        form.groupId = groupId;
        form.subcategoryId = undefined;
        form.note = "";
        form.recurrence = null;
        picker.value = "none";
        dateSheetOpen.value = false;
        visible.value = true;
    }

    function openEdit(id: string): void {
        const tx = transactions.byId(id);
        if (!tx) {
            return;
        }
        editingId.value = id;
        clearAmount();
        entry.value = String(tx.amount).replace(".", ",");
        form.kind = tx.kind;
        form.date = tx.date;
        form.accountId = tx.accountId;
        form.toAccountId = tx.toAccountId ?? accounts.active.find((account) => account.id !== tx.accountId)?.id ?? "";
        form.groupId = tx.groupId;
        form.subcategoryId = tx.subcategoryId;
        form.note = tx.note;
        // Правило повторения редактируется отдельно в «Справочниках», здесь только сама операция.
        form.recurrence = null;
        picker.value = "none";
        dateSheetOpen.value = false;
        visible.value = true;
    }

    defineExpose({ openNew, openEdit });

    function close(): void {
        visible.value = false;
        picker.value = "none";
    }

    watch(visible, (open) => {
        document.body.style.overflow = open ? "hidden" : "";
    });

    /* ---------- Данные для шапки ---------- */

    const isTransfer = computed(() => form.kind === "transfer");
    const isIncome = computed(() => form.kind === "income");

    /** Слева всегда источник денег: для дохода это категория, иначе счёт. */
    const leftSide = computed(() => {
        if (isIncome.value) {
            const group = categories.groupById(form.groupId);
            return { caption: "Из категории", title: group?.name ?? "Выберите", icon: group?.icon ?? "＋", color: group?.color ?? "#8a909e" };
        }
        const account = accounts.byId(form.accountId);
        return { caption: "Со счёта", title: account?.name ?? "Выберите", icon: account?.icon ?? "＋", color: account?.color ?? "#8a909e" };
    });

    /** Справа всегда получатель: категория расхода, счёт дохода или счёт-получатель перевода. */
    const rightSide = computed(() => {
        if (isIncome.value || isTransfer.value) {
            const account = accounts.byId(isIncome.value ? form.accountId : form.toAccountId);
            return {
                caption: isTransfer.value ? "На счёт" : "На счёт",
                title: account?.name ?? "Выберите",
                icon: account?.icon ?? "＋",
                color: account?.color ?? "#8a909e",
            };
        }
        const group = categories.groupById(form.groupId);
        return { caption: "В категорию", title: group?.name ?? "Выберите", icon: group?.icon ?? "＋", color: group?.color ?? "#8a909e" };
    });

    const subcategoryName = computed(() => categories.subcategoryById(form.subcategoryId)?.name);

    const kindLabel = computed(() => (form.kind === "expense" ? "Расход" : form.kind === "income" ? "Доход" : "Перевод"));

    /** Подпись выбранного повторения для строки внизу экрана. */
    const recurrenceLabel = computed(() => presetByKey(form.recurrence)?.label);

    const canSubmit = computed(() => {
        if (total.value <= 0) {
            return false;
        }
        if (isTransfer.value) {
            return Boolean(form.accountId && form.toAccountId && form.accountId !== form.toAccountId);
        }
        return Boolean(form.accountId && form.groupId);
    });

    /* ---------- Выбор в шапке ---------- */

    /** Что открыть по тапу: слева — счёт (или категория для дохода), справа — наоборот. */
    const pickerMode = computed<"account" | "category">(() => {
        if (picker.value === "from") {
            return isIncome.value ? "category" : "account";
        }
        return isIncome.value || isTransfer.value ? "account" : "category";
    });

    const pickerTitle = computed(() => (picker.value === "from" ? leftSide.value.caption : rightSide.value.caption));

    function onPickAccount(id: string): void {
        // Для перевода левая половина — счёт-источник, правая — получатель.
        if (isTransfer.value) {
            if (picker.value === "from") {
                form.accountId = id;
                if (form.toAccountId === id) {
                    form.toAccountId = accounts.active.find((account) => account.id !== id)?.id ?? "";
                }
            } else {
                form.toAccountId = id;
            }
        } else {
            form.accountId = id;
        }
        picker.value = "none";
    }

    function onPickCategory(groupId: string, subcategoryId: string | undefined, final: boolean): void {
        form.groupId = groupId;
        form.subcategoryId = subcategoryId;
        // Пока пользователь только раскрыл группу, окно остаётся открытым для выбора подкатегории.
        if (final) {
            picker.value = "none";
        }
    }

    /* ---------- Сохранение ---------- */

    function payload() {
        return {
            kind: form.kind,
            amount: total.value,
            date: form.date,
            accountId: form.accountId,
            toAccountId: isTransfer.value ? form.toAccountId : undefined,
            groupId: isTransfer.value ? undefined : form.groupId,
            subcategoryId: isTransfer.value ? undefined : form.subcategoryId,
            note: form.note.trim(),
        };
    }

    /**
     * Заводит правило повторения: сама операция уже создана и считается первым
     * срабатыванием, поэтому следующее назначаем на период вперёд.
     */
    function createRecurringRule(): void {
        const preset = presetByKey(form.recurrence);
        if (!preset) {
            return;
        }
        const data = payload();
        recurring.add({
            title: form.note.trim() || categories.labelFor(form.groupId, form.subcategoryId),
            kind: data.kind,
            amount: data.amount,
            accountId: data.accountId,
            toAccountId: data.toAccountId,
            groupId: data.groupId,
            subcategoryId: data.subcategoryId,
            note: data.note,
            period: preset.period,
            interval: preset.interval,
            startDate: data.date,
            nextDate: addPeriod(data.date, preset.period, preset.interval),
            active: true,
        });
    }

    function submit(): void {
        if (!canSubmit.value) {
            return;
        }
        if (editingId.value) {
            transactions.update(editingId.value, payload());
            ElMessage.success("Сохранено");
        } else {
            transactions.add(payload());
            if (form.recurrence) {
                createRecurringRule();
                ElMessage.success(`Добавлено · ${presetByKey(form.recurrence)?.label.toLowerCase()}`);
            } else {
                ElMessage.success("Добавлено");
            }
        }
        close();
    }

    /** Дублирует операцию: те же данные, но как новая запись за сегодня. */
    function duplicate(): void {
        transactions.add({ ...payload(), date: today() });
        ElMessage.success("Операция продублирована");
        close();
    }

    async function removeCurrent(): Promise<void> {
        if (!editingId.value) {
            return;
        }
        try {
            await ElMessageBox.confirm("Удалить эту операцию?", "Удаление", {
                type: "warning",
                confirmButtonText: "Удалить",
                cancelButtonText: "Отмена",
            });
            transactions.remove(editingId.value);
            ElMessage.success("Удалено");
            close();
        } catch {
            // Отмена пользователем.
        }
    }
</script>

<template>
    <Teleport to="body">
        <div v-if="visible" class="sheet-overlay" @click.self="close">
            <section class="sheet" role="dialog" aria-modal="true">
                <div class="sheet__kind">
                    <button type="button" class="sheet__close ft-icon-btn" aria-label="Закрыть" @click="close">
                        <el-icon :size="18"><Close /></el-icon>
                    </button>
                    <el-segmented
                        v-model="form.kind"
                        size="small"
                        :options="[
                            { label: 'Расход', value: 'expense' },
                            { label: 'Доход', value: 'income' },
                            { label: 'Перевод', value: 'transfer' },
                        ]"
                    />
                    <span class="sheet__close sheet__close--ghost" />
                </div>

                <!-- Двухцветная шапка: тап по половине выбирает счёт или категорию -->
                <div class="head" :style="{ '--head-right': rightSide.color }">
                    <button type="button" class="head__half" :style="{ background: leftSide.color }" @click="picker = 'from'">
                        <span class="head__caption">{{ leftSide.caption }}</span>
                        <span class="head__title">{{ leftSide.title }}</span>
                    </button>

                    <button type="button" class="head__half head__half--right" :style="{ background: rightSide.color }" @click="picker = 'to'">
                        <span class="head__caption">{{ rightSide.caption }}</span>
                        <span class="head__title">{{ rightSide.title }}</span>
                    </button>

                    <span class="head__badge head__badge--left">{{ leftSide.icon }}</span>
                    <span class="head__badge head__badge--right">{{ rightSide.icon }}</span>
                </div>

                <div class="sheet__body">
                    <button
                        v-if="!isTransfer && form.groupId"
                        type="button"
                        class="subcategory"
                        :style="{ borderColor: rightSide.color, color: rightSide.color }"
                        @click="picker = isIncome ? 'from' : 'to'"
                    >
                        {{ subcategoryName ?? "Без подкатегории" }}
                    </button>

                    <p class="sheet__kind-label" :class="`sheet__kind-label--${form.kind}`">{{ kindLabel }}</p>

                    <p class="sheet__amount" :class="`sheet__amount--${form.kind}`">
                        <span class="sheet__currency">{{ settings.currencySymbol }}</span>
                        <span class="sheet__value">{{ display }}</span>
                    </p>

                    <input v-model="form.note" class="sheet__note" type="text" maxlength="120" placeholder="Заметка…" />
                </div>

                <NumPad
                    :can-submit="canSubmit"
                    @digit="pressDigit"
                    @dot="pressDot"
                    @backspace="pressBackspace"
                    @clear="clearAmount"
                    @operator="pressOperator"
                    @date="openDatePicker"
                    @submit="submit"
                />

                <footer class="sheet__foot">
                    <template v-if="editingId">
                        <button type="button" class="action action--danger" @click="removeCurrent">
                            <span class="action__icon ft-icon-btn"><el-icon :size="18"><Delete /></el-icon></span>Удалить
                        </button>
                        <button type="button" class="action" @click="openDatePicker">
                            <span class="action__icon ft-icon-btn"><el-icon :size="18"><Calendar /></el-icon></span>Дата
                        </button>
                        <button type="button" class="action" @click="duplicate">
                            <span class="action__icon ft-icon-btn"><el-icon :size="18"><CopyDocument /></el-icon></span>Дублировать
                        </button>
                    </template>
                    <button v-else type="button" class="sheet__date" @click="openDatePicker">
                        <el-icon :size="14"><Calendar /></el-icon>
                        {{ formatDate(form.date, settings.locale) }}
                        <template v-if="recurrenceLabel">
                            · <el-icon :size="14"><RefreshRight /></el-icon> {{ recurrenceLabel }}
                        </template>
                    </button>
                </footer>
            </section>

            <DateSheet
                :open="dateSheetOpen"
                :date="form.date"
                :recurrence="form.recurrence"
                @close="dateSheetOpen = false"
                @update:date="(value) => (form.date = value)"
                @update:recurrence="(value) => (form.recurrence = value)"
            />

            <PickerSheet
                :open="picker !== 'none'"
                :mode="pickerMode"
                :kind="isIncome ? 'income' : 'expense'"
                :title="pickerTitle"
                :selected-account-id="picker === 'to' && isTransfer ? form.toAccountId : form.accountId"
                :exclude-account-id="isTransfer ? (picker === 'to' ? form.accountId : form.toAccountId) : undefined"
                :selected-group-id="form.groupId"
                :selected-subcategory-id="form.subcategoryId"
                @close="picker = 'none'"
                @pick-account="onPickAccount"
                @pick-category="onPickCategory"
            />
        </div>
    </Teleport>
</template>

<style scoped>
    .sheet-overlay {
        position: fixed;
        inset: 0;
        background: rgba(8, 10, 14, 0.45);
        z-index: 2600;
        display: flex;
        align-items: flex-end;
        justify-content: center;
    }

    .sheet {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 460px;
        max-height: 100%;
        background: var(--ft-surface);
        border-radius: var(--ft-radius) var(--ft-radius) 0 0;
        overflow: hidden;
    }

    @media (min-width: 900px) {
        .sheet-overlay {
            align-items: center;
        }

        .sheet {
            max-height: 94vh;
            border-radius: var(--ft-radius);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
        }
    }

    .sheet__kind {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 8px 10px;
    }

    .sheet__close {
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--ft-text-secondary);
        font-size: 16px;
        cursor: pointer;
    }

    .sheet__close--ghost {
        pointer-events: none;
    }

    /* Две цветные половины с «выпирающими» иконками — узнаваемая шапка 1Money. */
    .head {
        position: relative;
        display: flex;
    }

    /*
     * Половины ровно по 50%: иконка счёта стоит на стыке по центру шапки,
     * и если ширины разъедутся, она наползёт на текст правой половины.
     */
    .head__half {
        flex: 1 1 50%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-end;
        gap: 2px;
        /* Верхний отступ больше нижнего: под ним проходит «выпирающая» иконка категории. */
        padding: 40px 14px 14px;
        border: none;
        color: #fff;
        text-align: left;
        cursor: pointer;
        font: inherit;
    }

    /* Слева от текста — иконка счёта на стыке, сверху справа — иконка категории. */
    .head__half--right {
        padding-left: 34px;
        padding-right: 16px;
        border-left: 2px solid var(--ft-surface);
    }

    .head__caption {
        font-size: 12px;
        opacity: 0.85;
    }

    .head__title {
        font-size: 22px;
        font-weight: 600;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /*
     * Иконки «выпирают» за пределы цветной шапки на фон листа. В тёмной теме
     * заливка совпадала с фоном и кружок пропадал — поэтому контурное кольцо.
     */
    .head__badge {
        position: absolute;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--ft-surface);
        color: var(--ft-text);
        border: 1px solid var(--ft-border);
        font-size: 20px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
    }

    .head__badge--left {
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 52px;
        height: 52px;
        border-radius: 14px;
    }

    .head__badge--right {
        right: 8px;
        top: -20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
    }

    .sheet__body {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 16px 14px 12px;
        overflow-y: auto;
    }

    .subcategory {
        max-width: 100%;
        padding: 6px 16px;
        border: 1.5px solid currentColor;
        border-radius: 18px;
        background: transparent;
        font: inherit;
        font-size: 14px;
        cursor: pointer;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .sheet__kind-label {
        margin: 2px 0 0;
        font-size: 13px;
        font-weight: 500;
    }

    .sheet__kind-label--expense {
        color: var(--ft-expense);
    }

    .sheet__kind-label--income {
        color: var(--ft-income);
    }

    .sheet__kind-label--transfer {
        color: var(--ft-transfer);
    }

    .sheet__amount {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin: 0;
        font-variant-numeric: tabular-nums;
    }

    .sheet__currency {
        font-size: 20px;
        color: var(--ft-text-muted);
    }

    .sheet__value {
        font-size: 38px;
        font-weight: 700;
        line-height: 1.1;
        word-break: break-all;
    }

    .sheet__amount--expense .sheet__value {
        color: var(--ft-expense);
    }

    .sheet__amount--income .sheet__value {
        color: var(--ft-income);
    }

    .sheet__amount--transfer .sheet__value {
        color: var(--ft-transfer);
    }

    .sheet__note {
        width: 100%;
        height: 42px;
        margin-top: 6px;
        padding: 0 14px;
        border: 1px solid var(--ft-border);
        border-radius: 10px;
        background: var(--ft-surface-muted);
        color: var(--ft-text);
        font: inherit;
        font-size: 16px; /* iOS не зумит страницу при фокусе, если шрифт не меньше 16px */
        text-align: center;
        outline: none;
    }

    .sheet__foot {
        display: flex;
        align-items: center;
        justify-content: space-around;
        gap: 8px;
        padding: 8px 12px calc(10px + env(safe-area-inset-bottom));
        border-top: 1px solid var(--ft-border);
    }

    .sheet__date {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: none;
        background: transparent;
        color: var(--ft-text-secondary);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        padding: 6px 8px;
    }

    .action {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        border: none;
        background: transparent;
        color: var(--ft-text-secondary);
        font: inherit;
        font-size: 11px;
        cursor: pointer;
    }

    .action__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: var(--ft-surface-muted);
        font-size: 16px;
    }

    .action--danger {
        color: var(--ft-expense);
    }

</style>
