import type { BackupFile } from "@/types/models";
import { useAccountsStore } from "@/stores/accounts";
import { useBudgetsStore } from "@/stores/budgets";
import { useCategoriesStore } from "@/stores/categories";
import { useRecurringStore } from "@/stores/recurring";
import { useSettingsStore } from "@/stores/settings";
import { useTransactionsStore } from "@/stores/transactions";
import { STORAGE_KEYS, saveState } from "@/utils/storage";

export const BACKUP_VERSION = 2;

/** Собирает полный снимок данных приложения. */
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

/** Скачивает бэкап файлом — единственный способ вынести данные с устройства. */
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

/** Проверяет, что в файле действительно наш бэкап, прежде чем что-то перезаписывать. */
export function parseBackup(raw: string): BackupFile {
    const parsed = JSON.parse(raw) as Partial<BackupFile>;
    if (parsed.app !== "finance-tracker" || !Array.isArray(parsed.transactions)) {
        throw new Error("Файл не похож на резервную копию Finance Tracker");
    }
    if ((parsed.version ?? 0) > BACKUP_VERSION) {
        throw new Error("Файл создан более новой версией приложения");
    }
    return parsed as BackupFile;
}

/** Полностью заменяет данные приложения содержимым бэкапа. */
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
    // Бюджеты появились во второй версии формата — в старых файлах их просто нет.
    budgets.replaceAll(backup.budgets ?? []);
    if (backup.settings) {
        settings.replaceAll(backup.settings);
        settings.applyTheme();
    }
    saveState(STORAGE_KEYS.seeded, true);
}

/** Экспорт операций в CSV — для Excel и для переноса в другие трекеры. */
export function downloadCsv(): void {
    const transactions = useTransactionsStore();
    const accounts = useAccountsStore();
    const categories = useCategoriesStore();

    const escape = (value: string): string => `"${value.replace(/"/g, '""')}"`;
    const rows = [["Дата", "Тип", "Сумма", "Счёт", "Счёт-получатель", "Группа", "Подкатегория", "Заметка"].join(",")];

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

    // BOM, иначе Excel открывает кириллицу кракозябрами.
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
