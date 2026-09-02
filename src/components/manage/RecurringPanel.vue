<script setup lang="ts">
    import { reactive, ref } from "vue";
    import { ElMessage } from "element-plus";

    import type { RecurringRule, TxKind } from "@/types/models";
    import CategoryPicker from "@/components/transactions/CategoryPicker.vue";
    import { RECURRENCE_PRESETS, describeRecurrence, presetByKey } from "@/data/recurrence";
    import { useAccountsStore } from "@/stores/accounts";
    import { useCategoriesStore } from "@/stores/categories";
    import { useRecurringStore } from "@/stores/recurring";
    import { useSettingsStore } from "@/stores/settings";
    import { formatDate, today } from "@/utils/date";
    import { parseAmount } from "@/utils/money";

    const accounts = useAccountsStore();
    const categories = useCategoriesStore();
    const recurring = useRecurringStore();
    const settings = useSettingsStore();

    /** The preset key for an already saved rule; null means a non-standard frequency. */
    function presetKeyOf(period: RecurringRule["period"], interval: number): string | null {
        return RECURRENCE_PRESETS.find((item) => item.period === period && item.interval === interval)?.key ?? null;
    }

    const dialogVisible = ref(false);
    const editingId = ref<string | null>(null);

    const form = reactive({
        title: "",
        kind: "expense" as TxKind,
        amount: "",
        accountId: "",
        toAccountId: "",
        categoryPath: [] as string[],
        note: "",
        /** The repeat preset key from RECURRENCE_PRESETS. */
        recurrence: "monthly-1",
        startDate: today(),
        endDate: "" as string | "",
    });

    function openNew(): void {
        editingId.value = null;
        Object.assign(form, {
            title: "",
            kind: "expense",
            amount: "",
            accountId: accounts.active[0]?.id ?? "",
            toAccountId: "",
            categoryPath: [],
            note: "",
            recurrence: "monthly-1",
            startDate: today(),
            endDate: "",
        });
        dialogVisible.value = true;
    }

    function openEdit(rule: RecurringRule): void {
        editingId.value = rule.id;
        Object.assign(form, {
            title: rule.title,
            kind: rule.kind,
            amount: String(rule.amount),
            accountId: rule.accountId,
            toAccountId: rule.toAccountId ?? "",
            categoryPath: rule.groupId ? (rule.subcategoryId ? [rule.groupId, rule.subcategoryId] : [rule.groupId]) : [],
            note: rule.note,
            recurrence: presetKeyOf(rule.period, rule.interval) ?? "monthly-1",
            startDate: rule.startDate,
            endDate: rule.endDate ?? "",
        });
        dialogVisible.value = true;
    }

    function submit(): void {
        const amount = parseAmount(form.amount);
        if (!form.title.trim()) {
            ElMessage.warning("Enter a rule name");
            return;
        }
        if (amount <= 0) {
            ElMessage.warning("Enter an amount greater than zero");
            return;
        }
        if (!form.accountId) {
            ElMessage.warning("Pick an account");
            return;
        }
        const preset = presetByKey(form.recurrence);
        if (!preset) {
            ElMessage.warning("Pick a frequency");
            return;
        }

        const payload = {
            title: form.title.trim(),
            kind: form.kind,
            amount,
            accountId: form.accountId,
            toAccountId: form.kind === "transfer" ? form.toAccountId : undefined,
            groupId: form.kind === "transfer" ? undefined : form.categoryPath[0],
            subcategoryId: form.kind === "transfer" ? undefined : form.categoryPath[1],
            note: form.note.trim(),
            period: preset.period,
            interval: preset.interval,
            startDate: form.startDate,
            endDate: form.endDate || undefined,
            active: true,
        };

        if (editingId.value) {
            recurring.update(editingId.value, payload);
        } else {
            recurring.add(payload);
        }
        dialogVisible.value = false;

        // If the rule is already overdue, the transactions are created right away.
        const created = recurring.materializeDue();
        ElMessage.success(created > 0 ? `Rule saved, transactions created: ${created}` : "Rule saved");
    }

    function periodLabel(rule: RecurringRule): string {
        return describeRecurrence(rule.period, rule.interval).toLowerCase();
    }
</script>

<template>
    <div class="panel">
        <div class="panel__head">
            <span class="ft-muted">The transactions are created automatically when the app is opened</span>
            <el-button type="primary" @click="openNew">Add rule</el-button>
        </div>

        <div class="ft-card ft-card--flush">
            <p v-if="!recurring.items.length" class="ft-empty">No rules yet - subscriptions or rent, for example</p>

            <div v-for="rule in recurring.items" :key="rule.id" class="row" :class="{ 'row--off': !rule.active }">
                <span class="ft-avatar" :style="{ background: 'var(--ft-surface-muted)' }">
                    {{ rule.kind === "transfer" ? "⇄" : (categories.groupById(rule.groupId)?.icon ?? "🔁") }}
                </span>
                <div class="row__text">
                    <span>{{ rule.title }}</span>
                    <span class="ft-muted row__hint">
                        {{ periodLabel(rule) }} · next {{ formatDate(rule.nextDate, settings.locale) }} ·
                        {{ accounts.byId(rule.accountId)?.name ?? "—" }}
                    </span>
                </div>
                <span class="ft-amount" :class="`ft-amount--${rule.kind}`">{{ settings.money(rule.amount) }}</span>
                <el-switch
                    :model-value="rule.active"
                    @update:model-value="(value: string | number | boolean) => recurring.update(rule.id, { active: Boolean(value) })"
                />
                <el-dropdown trigger="click">
                    <el-button link
                        ><el-icon :size="20"><MoreFilled /></el-icon
                    ></el-button>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item @click="openEdit(rule)">Edit</el-dropdown-item>
                            <el-dropdown-item divided @click="recurring.remove(rule.id)">Delete</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>
        </div>

        <el-dialog v-model="dialogVisible" :title="editingId ? 'Rule' : 'New rule'" width="460px" append-to-body>
            <el-form label-position="top">
                <el-form-item label="Name">
                    <el-input v-model="form.title" placeholder="For example, Netflix" maxlength="40" />
                </el-form-item>

                <el-form-item label="Type">
                    <el-segmented
                        v-model="form.kind"
                        :options="[
                            { label: 'Expense', value: 'expense' },
                            { label: 'Income', value: 'income' },
                            { label: 'Transfer', value: 'transfer' },
                        ]"
                    />
                </el-form-item>

                <el-form-item label="Amount">
                    <el-input v-model="form.amount" inputmode="decimal" placeholder="0.00" />
                </el-form-item>

                <el-form-item :label="form.kind === 'transfer' ? 'From account' : 'Account'">
                    <el-select v-model="form.accountId" class="control" placeholder="Pick an account">
                        <el-option v-for="account in accounts.active" :key="account.id" :label="account.name" :value="account.id" />
                    </el-select>
                </el-form-item>

                <el-form-item v-if="form.kind === 'transfer'" label="To account">
                    <el-select v-model="form.toAccountId" class="control" placeholder="Pick an account">
                        <el-option
                            v-for="account in accounts.active"
                            :key="account.id"
                            :label="account.name"
                            :value="account.id"
                            :disabled="account.id === form.accountId"
                        />
                    </el-select>
                </el-form-item>

                <el-form-item v-else label="Category">
                    <CategoryPicker v-model="form.categoryPath" :kind="form.kind === 'income' ? 'income' : 'expense'" />
                </el-form-item>

                <el-form-item label="Repeat">
                    <el-select v-model="form.recurrence" class="control">
                        <el-option v-for="preset in RECURRENCE_PRESETS" :key="preset.key" :label="preset.label" :value="preset.key" />
                    </el-select>
                </el-form-item>

                <div class="row-2">
                    <el-form-item label="Start">
                        <el-date-picker
                            v-model="form.startDate"
                            type="date"
                            value-format="YYYY-MM-DD"
                            format="DD.MM.YYYY"
                            class="control"
                        />
                    </el-form-item>
                    <el-form-item label="End (optional)">
                        <el-date-picker
                            v-model="form.endDate"
                            type="date"
                            value-format="YYYY-MM-DD"
                            format="DD.MM.YYYY"
                            class="control"
                            clearable
                        />
                    </el-form-item>
                </div>

                <el-form-item label="Note">
                    <el-input v-model="form.note" placeholder="Optional" maxlength="120" />
                </el-form-item>
            </el-form>

            <template #footer>
                <el-button @click="dialogVisible = false">Cancel</el-button>
                <el-button type="primary" @click="submit">Save</el-button>
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
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 13px;
    }

    .row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        border-top: 1px solid var(--ft-border);
    }

    .row:first-child {
        border-top: none;
    }

    .row--off {
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
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .control {
        width: 100%;
    }

    .row-2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
    }
</style>
