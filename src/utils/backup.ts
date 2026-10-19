import type { BackupFile } from "@/types/models";
import { useAccountsStore } from "@/stores/accounts";
import { useBudgetsStore } from "@/stores/budgets";
import { useCategoriesStore } from "@/stores/categories";
import { useRecurringStore } from "@/stores/recurring";
import { useSettingsStore } from "@/stores/settings";
import { useTransactionsStore } from "@/stores/transactions";
import { STORAGE_KEYS, saveState } from "@/utils/storage";

export const BACKUP_VERSION = 2;

/** Builds a full snapshot of the app data. */
export function buildBackup(): BackupFile {
    const accounts = useAccountsStore();
    const budgets = useBudgetsStore();
    const categories = useCategoriesStore();
    const transactions = useTransactionsStore();
    const recurring = useRecurringStore();
    const settings = useSettingsStore();

    return {
        app: "finance-tracker",
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        accounts: accounts.items,
        groups: categories.groups,
        subcategories: categories.subcategories,
        transactions: transactions.items,
        recurring: recurring.items,
        budgets: budgets.items,
        settings: settings.state,
    };
}

/** Downloads the backup as a file - the only way to get the data off the device. */
export function downloadBackup(): void {
    const backup = buildBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/** Checks that the file really is one of our backups before overwriting anything. */
export function parseBackup(raw: string): BackupFile {
    const parsed = JSON.parse(raw) as Partial<BackupFile>;
    if (parsed.app !== "finance-tracker" || !Array.isArray(parsed.transactions)) {
        throw new Error("This file does not look like a Finance Tracker backup");
    }
    if ((parsed.version ?? 0) > BACKUP_VERSION) {
        throw new Error("This file was created by a newer version of the app");
    }
    return parsed as BackupFile;
}

/** Replaces the app data entirely with the backup contents. */
export function restoreBackup(backup: BackupFile): void {
    const accounts = useAccountsStore();
    const budgets = useBudgetsStore();
    const categories = useCategoriesStore();
    const transactions = useTransactionsStore();
    const recurring = useRecurringStore();
    const settings = useSettingsStore();

    accounts.replaceAll(backup.accounts ?? []);
    categories.replaceAll(backup.groups ?? [], backup.subcategories ?? []);
    transactions.replaceAll(backup.transactions ?? []);
    recurring.replaceAll(backup.recurring ?? []);
    // Budgets appeared in format version 2 - older files simply do not have them.
    budgets.replaceAll(backup.budgets ?? []);
    if (backup.settings) {
        settings.replaceAll(backup.settings);
        settings.applyTheme();
    }
    saveState(STORAGE_KEYS.seeded, true);
}

/** Exports transactions to CSV - for Excel and for moving to another tracker. */
export function downloadCsv(): void {
    const transactions = useTransactionsStore();
    const accounts = useAccountsStore();
    const categories = useCategoriesStore();

    /**
     * Wraps a value for CSV and defuses formula injection: Excel and Google Sheets treat a cell
     * starting with = + - @ (possibly after whitespace) as a formula, so a note like `=1+1` would be
     * executed on open. A leading apostrophe forces the cell to stay text.
     */
    const escape = (value: string): string => {
        const safe = /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
        return `"${safe.replace(/"/g, '""')}"`;
    };

    const rows = [["Date", "Type", "Amount", "Account", "Destination account", "Group", "Subcategory", "Note"].join(",")];

    transactions.sorted.forEach((tx) => {
        rows.push(
            [
                tx.date,
                tx.kind,
                String(tx.amount),
                escape(accounts.byId(tx.accountId)?.name ?? ""),
                escape(accounts.byId(tx.toAccountId)?.name ?? ""),
                escape(categories.groupById(tx.groupId)?.name ?? ""),
                escape(categories.subcategoryById(tx.subcategoryId)?.name ?? ""),
                escape(tx.note ?? ""),
            ].join(","),
        );
    });

    // BOM, otherwise Excel shows non-ASCII text as garbage.
    const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
