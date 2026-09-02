<script setup lang="ts">
    import { computed, reactive, ref } from "vue";

    import TransactionList from "@/components/transactions/TransactionList.vue";
    import type { TxKind } from "@/types/models";
    import { useAccountsStore } from "@/stores/accounts";
    import { useCategoriesStore } from "@/stores/categories";
    import { useSettingsStore } from "@/stores/settings";
    import { useTransactionsStore } from "@/stores/transactions";
    import { useBreakpoint } from "@/composables/useBreakpoint";
    import { round2 } from "@/utils/money";

    const emit = defineEmits<{ editTransaction: [id: string] }>();

    const accounts = useAccountsStore();
    const categories = useCategoriesStore();
    const settings = useSettingsStore();
    const transactions = useTransactionsStore();

    const filters = reactive({
        kinds: [] as TxKind[],
        accountIds: [] as string[],
        groupIds: [] as string[],
        range: null as [string, string] | null,
        search: "",
    });

    const filtered = computed(() =>
        transactions.filter({
            kinds: filters.kinds,
            accountIds: filters.accountIds,
            groupIds: filters.groupIds,
            dateFrom: filters.range?.[0],
            dateTo: filters.range?.[1],
            search: filters.search,
        }),
    );

    const totals = computed(() => {
        const expense = round2(filtered.value.filter((tx) => tx.kind === "expense").reduce((acc, tx) => acc + tx.amount, 0));
        const income = round2(filtered.value.filter((tx) => tx.kind === "income").reduce((acc, tx) => acc + tx.amount, 0));
        return { expense, income, count: filtered.value.length };
    });

    /** Сколько фильтров задано — цифра на кнопке «Фильтры». */
    const activeCount = computed(
        () =>
            filters.kinds.length +
            filters.accountIds.length +
            filters.groupIds.length +
            (filters.range ? 1 : 0),
    );

    /** На узком экране фильтры свёрнуты: иначе они занимают пол-экрана. */
    const { isMobile } = useBreakpoint();
    const filtersOpen = ref(false);

    const hasFilters = computed(
        () => filters.kinds.length > 0 || filters.accountIds.length > 0 || filters.groupIds.length > 0 || !!filters.range || !!filters.search,
    );

    function resetFilters(): void {
        filters.kinds = [];
        filters.accountIds = [];
        filters.groupIds = [];
        filters.range = null;
        filters.search = "";
    }
</script>

<template>
    <div class="transactions">
        <h2 class="transactions__title">Операции</h2>

        <div class="ft-card transactions__filters">
            <div class="transactions__search-row">
                <el-input v-model="filters.search" placeholder="Поиск по заметке или сумме" clearable class="transactions__search" />
                <el-button v-if="isMobile" class="transactions__toggle" @click="filtersOpen = !filtersOpen">
                    Фильтры<span v-if="activeCount" class="transactions__badge">{{ activeCount }}</span>
                </el-button>
            </div>

            <template v-if="!isMobile || filtersOpen">
            <el-select v-model="filters.kinds" multiple collapse-tags placeholder="Тип" class="transactions__filter">
                <el-option label="Расход" value="expense" />
                <el-option label="Доход" value="income" />
                <el-option label="Перевод" value="transfer" />
            </el-select>

            <el-select v-model="filters.accountIds" multiple collapse-tags placeholder="Счёт" class="transactions__filter">
                <el-option v-for="account in accounts.all" :key="account.id" :label="account.name" :value="account.id" />
            </el-select>

            <el-select v-model="filters.groupIds" multiple collapse-tags placeholder="Категория" class="transactions__filter" filterable>
                <el-option v-for="group in categories.groups" :key="group.id" :label="`${group.icon} ${group.name}`" :value="group.id" />
            </el-select>

            <el-date-picker
                v-model="filters.range"
                type="daterange"
                value-format="YYYY-MM-DD"
                format="DD.MM.YYYY"
                start-placeholder="С"
                end-placeholder="По"
                class="transactions__filter"
                unlink-panels
            />

            <el-button v-if="hasFilters" link type="primary" @click="resetFilters">Сбросить</el-button>
            </template>
        </div>

        <!-- Итоги по текущей выборке: три колонки, чтобы строка не переносилась на узком экране. -->
        <div class="transactions__summary">
            <div><span class="ft-muted">Найдено</span><strong class="ft-amount">{{ totals.count }}</strong></div>
            <div><span class="ft-muted">Расходы</span><strong class="ft-amount ft-amount--expense">{{ settings.money(totals.expense) }}</strong></div>
            <div><span class="ft-muted">Доходы</span><strong class="ft-amount ft-amount--income">{{ settings.money(totals.income) }}</strong></div>
        </div>

        <div class="ft-card ft-card--flush">
            <TransactionList
                :items="filtered"
                show-day-totals
                empty-text="Ничего не найдено — попробуйте изменить фильтры"
                @select="(id) => emit('editTransaction', id)"
            />
        </div>
    </div>
</template>

<style scoped>
    .transactions {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .transactions__title {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
    }

    @media (max-width: 899px) {
        .transactions__title {
            display: none;
        }
    }

    .transactions__filters {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
    }

    .transactions__search-row {
        display: flex;
        gap: 8px;
        width: 100%;
    }

    .transactions__search {
        flex: 1 1 220px;
    }

    .transactions__toggle {
        flex: 0 0 auto;
    }

    .transactions__badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        margin-left: 6px;
        padding: 0 5px;
        border-radius: 10px;
        background: var(--ft-accent);
        color: #fff;
        font-size: 12px;
    }

    .transactions__filter {
        flex: 1 1 160px;
        min-width: 140px;
    }

    .transactions__summary {
        display: grid;
        grid-template-columns: auto 1fr 1fr;
        gap: 8px 14px;
        padding: 0 4px;
        font-size: 12px;
    }

    .transactions__summary div {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
    }

    .transactions__summary strong {
        font-size: 14px;
    }
</style>
