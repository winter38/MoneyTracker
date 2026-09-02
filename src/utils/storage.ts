/**
 * A thin wrapper around localStorage.
 *
 * The whole app keeps its data here only - not a single request goes to a server.
 * If we ever want to move to IndexedDB or Supabase, the only things to change are
 * this module and the places where the stores call `persist()`.
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

/** Reads a value from localStorage, returning the fallback on any problem. */
export function loadState<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) {
            return fallback;
        }
        return JSON.parse(raw) as T;
    } catch (error) {
        console.warn(`[storage] failed to read ${key}`, error);
        return fallback;
    }
}

/**
 * Writes a value to localStorage.
 * @returns false if the browser refused the write (for example, the ~5 MB quota ran out).
 */
export function saveState(key: string, value: unknown): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`[storage] failed to save ${key}`, error);
        return false;
    }
}

/** Wipes the app data completely (used when importing a backup). */
export function clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

/** Estimated used space in bytes - shown in the settings. */
export function usedBytes(): number {
    return Object.values(STORAGE_KEYS).reduce((sum, key) => sum + (localStorage.getItem(key)?.length ?? 0), 0);
}
