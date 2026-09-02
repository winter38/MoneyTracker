<script setup lang="ts">
    import { computed, reactive, ref, watch } from "vue";
    import { ElMessage, ElMessageBox } from "element-plus";

    import type { TxKind } from "@/types/models";
    import AppIcon from "@/components/common/AppIcon.vue";
    import DateSheet from "@/components/transactions/DateSheet.vue";
    import NumPad from "@/components/transactions/NumPad.vue";
    import PickerSheet from "@/components/transactions/PickerSheet.vue";
    import { PLACEHOLDER_ICON } from "@/data/icons";
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

    /** Which half of the header is currently open for picking. */
    const picker = ref<"none" | "from" | "to">("none");

    const form = reactive({
        kind: "expense" as TxKind,
        date: today(),
        accountId: "",
        toAccountId: "",
        groupId: undefined as string | undefined,
        subcategoryId: undefined as string | undefined,
        note: "",
        /** The repeat key from RECURRENCE_PRESETS; null means a one-off transaction. */
        recurrence: null as string | null,
    });

    /* ---------- Calculator ---------- */

    const entry = ref("");
    const pendingValue = ref<number | null>(null);
    const pendingOp = ref<"+" | "-" | "*" | "/" | null>(null);

    const OP_LABEL: Record<"+" | "-" | "*" | "/", string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

    const entryNumber = computed(() => Number.parseFloat(entry.value.replace(",", ".")) || 0);

    /** The result including the unfinished operation. An empty second operand is neutral. */
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

    /** The calendar key on the keypad opens the date and repeat sheet. */
    function openDatePicker(): void {
        dateSheetOpen.value = true;
    }

    /* ---------- Opening and closing ---------- */

    /** A new transaction; a category can be pre-filled (a tap on the category ring). */
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
        // The repeat rule is edited separately in Manage; only the transaction itself is edited here.
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

    /* ---------- Data for the header ---------- */

    const isTransfer = computed(() => form.kind === "transfer");
    const isIncome = computed(() => form.kind === "income");

    /** The left side is always the source of the money: for income that is the category, otherwise the account. */
    const leftSide = computed(() => {
        if (isIncome.value) {
            const group = categories.groupById(form.groupId);
            return {
                caption: "From category",
                title: group?.name ?? "Pick one",
                icon: group?.icon ?? PLACEHOLDER_ICON,
                color: group?.color ?? "#8a909e",
            };
        }
        const account = accounts.byId(form.accountId);
        return {
            caption: "From account",
            title: account?.name ?? "Pick one",
            icon: account?.icon ?? PLACEHOLDER_ICON,
            color: account?.color ?? "#8a909e",
        };
    });

    /** The right side is always the destination: the expense category, the income account, or the transfer target account. */
    const rightSide = computed(() => {
        if (isIncome.value || isTransfer.value) {
            const account = accounts.byId(isIncome.value ? form.accountId : form.toAccountId);
            return {
                caption: isTransfer.value ? "To account" : "To account",
                title: account?.name ?? "Pick one",
                icon: account?.icon ?? PLACEHOLDER_ICON,
                color: account?.color ?? "#8a909e",
            };
        }
        const group = categories.groupById(form.groupId);
        return {
            caption: "To category",
            title: group?.name ?? "Pick one",
            icon: group?.icon ?? PLACEHOLDER_ICON,
            color: group?.color ?? "#8a909e",
        };
    });

    const subcategoryName = computed(() => categories.subcategoryById(form.subcategoryId)?.name);

    const kindLabel = computed(() => (form.kind === "expense" ? "Expense" : form.kind === "income" ? "Income" : "Transfer"));

    /** The label of the selected repeat option for the row at the bottom of the screen. */
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

    /* ---------- Picking in the header ---------- */

    /** What a tap opens: on the left an account (or a category for income), on the right the other way round. */
    const pickerMode = computed<"account" | "category">(() => {
        if (picker.value === "from") {
            return isIncome.value ? "category" : "account";
        }
        return isIncome.value || isTransfer.value ? "account" : "category";
    });

    const pickerTitle = computed(() => (picker.value === "from" ? leftSide.value.caption : rightSide.value.caption));

    function onPickAccount(id: string): void {
        // For a transfer the left half is the source account and the right one is the destination.
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
        // While the user has only expanded a group, the sheet stays open so a subcategory can be picked.
        if (final) {
            picker.value = "none";
        }
    }

    /* ---------- Saving ---------- */

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
     * Creates the repeat rule: the transaction itself is already created and counts as the first
     * occurrence, so the next one is scheduled a period ahead.
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
            ElMessage.success("Saved");
        } else {
            transactions.add(payload());
            if (form.recurrence) {
                createRecurringRule();
                ElMessage.success(`Added · ${presetByKey(form.recurrence)?.label.toLowerCase()}`);
            } else {
                ElMessage.success("Added");
            }
        }
        close();
    }

    /** Duplicates the transaction: the same data, but as a new record dated today. */
    function duplicate(): void {
        transactions.add({ ...payload(), date: today() });
        ElMessage.success("Transaction duplicated");
        close();
    }

    async function removeCurrent(): Promise<void> {
        if (!editingId.value) {
            return;
        }
        try {
            await ElMessageBox.confirm("Delete this transaction?", "Delete", {
                type: "warning",
                confirmButtonText: "Delete",
                cancelButtonText: "Cancel",
            });
            transactions.remove(editingId.value);
            ElMessage.success("Deleted");
            close();
        } catch {
            // Cancelled by the user.
        }
    }
</script>

<template>
    <Teleport to="body">
        <div v-if="visible" class="sheet-overlay" @click.self="close">
            <section class="sheet" role="dialog" aria-modal="true">
                <div class="sheet__kind">
                    <button type="button" class="sheet__close ft-icon-btn" aria-label="Close" @click="close">
                        <el-icon :size="18"><Close /></el-icon>
                    </button>
                    <el-segmented
                        v-model="form.kind"
                        size="small"
                        :options="[
                            { label: 'Expense', value: 'expense' },
                            { label: 'Income', value: 'income' },
                            { label: 'Transfer', value: 'transfer' },
                        ]"
                    />
                    <span class="sheet__close sheet__close--ghost" />
                </div>

                <!-- The two-color header: tapping a half picks the account or the category -->
                <div class="head" :style="{ '--head-right': rightSide.color }">
                    <button type="button" class="head__half" :style="{ background: leftSide.color }" @click="picker = 'from'">
                        <span class="head__caption">{{ leftSide.caption }}</span>
                        <span class="head__title">{{ leftSide.title }}</span>
                    </button>

                    <button
                        type="button"
                        class="head__half head__half--right"
                        :style="{ background: rightSide.color }"
                        @click="picker = 'to'"
                    >
                        <span class="head__caption">{{ rightSide.caption }}</span>
                        <span class="head__title">{{ rightSide.title }}</span>
                    </button>

                    <span class="head__badge head__badge--left"><AppIcon :icon="leftSide.icon" /></span>
                    <span class="head__badge head__badge--right"><AppIcon :icon="rightSide.icon" /></span>
                </div>

                <div class="sheet__body">
                    <button
                        v-if="!isTransfer && form.groupId"
                        type="button"
                        class="subcategory"
                        :style="{ borderColor: rightSide.color, color: rightSide.color }"
                        @click="picker = isIncome ? 'from' : 'to'"
                    >
                        {{ subcategoryName ?? "No subcategory" }}
                    </button>

                    <p class="sheet__kind-label" :class="`sheet__kind-label--${form.kind}`">{{ kindLabel }}</p>

                    <p class="sheet__amount" :class="`sheet__amount--${form.kind}`">
                        <span class="sheet__currency">{{ settings.currencySymbol }}</span>
                        <span class="sheet__value">{{ display }}</span>
                    </p>

                    <input v-model="form.note" class="sheet__note" type="text" maxlength="120" placeholder="Note…" />
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
                            <span class="action__icon ft-icon-btn"
                                ><el-icon :size="18"><Delete /></el-icon></span
                            >Delete
                        </button>
                        <button type="button" class="action" @click="openDatePicker">
                            <span class="action__icon ft-icon-btn"
                                ><el-icon :size="18"><Calendar /></el-icon></span
                            >Date
                        </button>
                        <button type="button" class="action" @click="duplicate">
                            <span class="action__icon ft-icon-btn"
                                ><el-icon :size="18"><CopyDocument /></el-icon></span
                            >Duplicate
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

    /* Two colored halves with icons that stick out - the recognisable header of any finance tracker. */
    .head {
        position: relative;
        display: flex;
    }

    /*
     * The halves are exactly 50% each: the account icon sits on the seam in the centre of the header,
     * and if the widths drift apart it would overlap the text of the right half.
     */
    .head__half {
        flex: 1 1 50%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-end;
        gap: 2px;
        /* The top padding is larger than the bottom: the protruding category icon passes underneath it. */
        padding: 40px 14px 14px;
        border: none;
        color: #fff;
        text-align: left;
        cursor: pointer;
        font: inherit;
    }

    /* To the left of the text is the account icon on the seam, at the top right the category icon. */
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
     * The icons stick out beyond the colored header onto the sheet background. In the dark theme
     * the fill matched the background and the circle disappeared - hence the outlined ring.
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
        font-size: 16px; /* iOS does not zoom the page on focus as long as the font is at least 16px */
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
