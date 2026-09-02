/**
 * The app domain model.
 *
 * Every amount is stored as a positive number in currency units (not cents);
 * the sign of a transaction comes from its `kind` field. For arithmetic use
 * `round2()` from `@/utils/money` so float error does not accumulate.
 */

/** Transaction kind: an expense, an income, or a transfer between your own accounts. */
export type TxKind = "expense" | "income" | "transfer";

/** Category direction - the expense or the income branch of the tree. */
export type CategoryKind = "expense" | "income";

/**
 * How often a recurring transaction repeats.
 * `weekdays` and `weekends` are special cases: the step is always one day,
 * but only working days, or only Saturday and Sunday, are picked.
 */
export type RecurrencePeriod = "daily" | "weekdays" | "weekends" | "weekly" | "monthly" | "yearly";

/** An account (cash, card, savings). */
export interface Account {
    id: string;
    name: string;
    /** Emoji icon, shown in lists. */
    icon: string;
    /** HEX color for the account marker. */
    color: string;
    /** The balance the account started with when it was created. */
    initialBalance: number;
    /** Archived accounts are hidden from the dropdowns, but their history is kept. */
    archived: boolean;
    order: number;
}

/** A category group - the top level of the tree (for example, "Groceries"). */
export interface CategoryGroup {
    id: string;
    name: string;
    kind: CategoryKind;
    icon: string;
    color: string;
    archived: boolean;
    order: number;
}

/** A subcategory - the second level of the tree (for example, "Coffee" inside "Cafes"). */
export interface Subcategory {
    id: string;
    groupId: string;
    name: string;
    archived: boolean;
    order: number;
}

/** A single transaction. */
export interface Transaction {
    id: string;
    kind: TxKind;
    /** Always a positive number. */
    amount: number;
    /** The date as YYYY-MM-DD (no time - the tracker works in whole days). */
    date: string;
    /** The source account: where the money left from (expense, transfer) or arrived at (income). */
    accountId: string;
    /** The destination account, only for kind === "transfer". */
    toAccountId?: string;
    /** The top-level category, for expenses and income. */
    groupId?: string;
    /** The subcategory, optional even when a group is picked. */
    subcategoryId?: string;
    note: string;
    /** Unix creation time, for a stable sort order within a single day. */
    createdAt: number;
    /** Set when the transaction was created from a recurring rule. */
    recurringId?: string;
}

/** A recurring transaction template (subscriptions, rent, salary). */
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
    /** Every N periods: interval=2 with period="weekly" means once every two weeks. */
    interval: number;
    startDate: string;
    /** The next due date, recalculated after every transaction the rule creates. */
    nextDate: string;
    /** An optional end date for the rule. */
    endDate?: string;
    active: boolean;
}

/** User settings. */
export interface Settings {
    /** The ISO 4217 currency code, for example EUR. */
    currency: string;
    /** The locale used to format numbers and dates. */
    locale: string;
    theme: "light" | "dark" | "auto";
    /** The day the billing month starts on (1 means a calendar month). */
    monthStartDay: number;
}

/** An expense or income plan for a category group within the billing month. */
export interface Budget {
    groupId: string;
    amount: number;
}

/** The backup file format (export/import). */
export interface BackupFile {
    app: "finance-tracker";
    version: number;
    exportedAt: string;
    accounts: Account[];
    groups: CategoryGroup[];
    subcategories: Subcategory[];
    transactions: Transaction[];
    recurring: RecurringRule[];
    /** Added in format version 2, older copies do not have this field. */
    budgets?: Budget[];
    settings: Settings;
}
