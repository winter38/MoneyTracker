/**
 * Доменная модель приложения.
 *
 * Все суммы хранятся положительными числами в единицах валюты (не в центах);
 * знак операции определяется полем `kind`. Для арифметики используйте
 * `round2()` из `@/utils/money`, чтобы не накапливать ошибку float.
 */

/** Тип операции: расход, доход или перевод между своими счетами. */
export type TxKind = "expense" | "income" | "transfer";

/** Направление категории — расходная или доходная ветка дерева. */
export type CategoryKind = "expense" | "income";

/**
 * Периодичность повторяющейся операции.
 * `weekdays` и `weekends` — особые случаи: шаг всегда один день,
 * но выбираются только рабочие дни или только суббота с воскресеньем.
 */
export type RecurrencePeriod = "daily" | "weekdays" | "weekends" | "weekly" | "monthly" | "yearly";

/** Счёт (кошелёк, карта, накопления). */
export interface Account {
    id: string;
    name: string;
    /** Эмодзи-иконка, показывается в списках. */
    icon: string;
    /** HEX-цвет для маркера счёта. */
    color: string;
    /** Стартовый остаток на момент заведения счёта. */
    initialBalance: number;
    /** Архивные счета скрыты из выпадающих списков, но их история сохраняется. */
    archived: boolean;
    order: number;
}

/** Группа категорий — верхний уровень дерева (например, «Продукты»). */
export interface CategoryGroup {
    id: string;
    name: string;
    kind: CategoryKind;
    icon: string;
    color: string;
    archived: boolean;
    order: number;
}

/** Подкатегория — второй уровень дерева (например, «Кофе» внутри «Кафе»). */
export interface Subcategory {
    id: string;
    groupId: string;
    name: string;
    archived: boolean;
    order: number;
}

/** Единичная операция. */
export interface Transaction {
    id: string;
    kind: TxKind;
    /** Всегда положительное число. */
    amount: number;
    /** Дата в формате YYYY-MM-DD (без времени — трекер оперирует днями). */
    date: string;
    /** Счёт-источник: откуда ушли деньги (расход, перевод) или куда пришли (доход). */
    accountId: string;
    /** Счёт-получатель, только для kind === "transfer". */
    toAccountId?: string;
    /** Категория верхнего уровня, для расхода и дохода. */
    groupId?: string;
    /** Подкатегория, необязательна даже если группа выбрана. */
    subcategoryId?: string;
    note: string;
    /** Unix-время создания записи, для стабильной сортировки внутри одного дня. */
    createdAt: number;
    /** Проставляется, если операция создана из повторяющегося правила. */
    recurringId?: string;
}

/** Шаблон повторяющейся операции (подписки, аренда, зарплата). */
export interface RecurringRule {
    id: string;
    title: string;
    kind: TxKind;
    amount: number;
    accountId: string;
    toAccountId?: string;
    groupId?: string;
    subcategoryId?: string;
    note: string;
    period: RecurrencePeriod;
    /** Каждые N периодов: interval=2 + period="weekly" — раз в две недели. */
    interval: number;
    startDate: string;
    /** Дата следующего срабатывания, пересчитывается после каждого создания операции. */
    nextDate: string;
    /** Необязательная дата окончания правила. */
    endDate?: string;
    active: boolean;
}

/** Пользовательские настройки. */
export interface Settings {
    /** Код валюты по ISO 4217, например EUR. */
    currency: string;
    /** Локаль форматирования чисел и дат. */
    locale: string;
    theme: "light" | "dark" | "auto";
    /** День начала расчётного месяца (1 — календарный месяц). */
    monthStartDay: number;
}

/** План расходов или доходов по группе категорий на расчётный месяц. */
export interface Budget {
    groupId: string;
    amount: number;
}

/** Формат файла резервной копии (экспорт/импорт). */
export interface BackupFile {
    app: "finance-tracker";
    version: number;
    exportedAt: string;
    accounts: Account[];
    groups: CategoryGroup[];
    subcategories: Subcategory[];
    transactions: Transaction[];
    recurring: RecurringRule[];
    /** Появились во второй версии формата, в старых копиях поля нет. */
    budgets?: Budget[];
    settings: Settings;
}
