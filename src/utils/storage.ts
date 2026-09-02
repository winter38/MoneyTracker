/**
 * Тонкая обёртка над localStorage.
 *
 * Всё приложение хранит данные только здесь — ни один запрос не уходит на сервер.
 * Если в будущем захочется переехать на IndexedDB или на Supabase, менять нужно
 * только этот модуль и место, где сторы вызывают `persist()`.
 */

const PREFIX = "finance-tracker";

export const STORAGE_KEYS = {
    accounts: `${PREFIX}:accounts`,
    groups: `${PREFIX}:groups`,
    subcategories: `${PREFIX}:subcategories`,
    transactions: `${PREFIX}:transactions`,
    recurring: `${PREFIX}:recurring`,
    budgets: `${PREFIX}:budgets`,
    settings: `${PREFIX}:settings`,
    seeded: `${PREFIX}:seeded`,
} as const;

/** Читает значение из localStorage, возвращая fallback при любой проблеме. */
export function loadState<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) {
            return fallback;
        }
        return JSON.parse(raw) as T;
    } catch (error) {
        console.warn(`[storage] не удалось прочитать ${key}`, error);
        return fallback;
    }
}

/**
 * Пишет значение в localStorage.
 * @returns false, если браузер отказал в записи (например, кончилась квота ~5 МБ).
 */
export function saveState(key: string, value: unknown): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`[storage] не удалось сохранить ${key}`, error);
        return false;
    }
}

/** Полностью очищает данные приложения (используется при импорте бэкапа). */
export function clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

/** Оценка занятого места в байтах — показывается в настройках. */
export function usedBytes(): number {
    return Object.values(STORAGE_KEYS).reduce((sum, key) => sum + (localStorage.getItem(key)?.length ?? 0), 0);
}
