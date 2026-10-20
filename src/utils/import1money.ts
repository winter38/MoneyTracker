/**
 * Importing a 1Money backup (Android) into the tracker.
 *
 * The file is an SQLite database with short, obfuscated column names. What matters:
 *
 *   ba  - the list of snapshots inside the file. One export holds every daily backup the app
 *         ever made, so a single file can carry 20+ copies of the data; `_b_i` on the other
 *         tables points at the snapshot a row belongs to. Only the newest one is imported.
 *   de  - accounts and categories in one table. A row is an account when `_c_i_u` is empty,
 *         otherwise it is a category: `_ty` 1 = expense, 0 = income, and `_pi` points at the
 *         parent category, which is how 1Money stores subcategories.
 *   tr  - transactions. `_a_i` is the account side, `_d_i` the other end (a category, or a
 *         second account for a transfer), `_a_m` the amount as text, `_co` the note,
 *         `_da` the date in epoch milliseconds and `_sch` marks a scheduled future entry.
 *
 * Nothing is written until the caller applies the plan, so the UI can show what is about to
 * happen and let the user step back.
 */
import type { Account, CategoryGroup, Subcategory, Transaction, TxKind } from "@/types/models";
import { DEFAULT_ACCOUNT_ICON, DEFAULT_EXPENSE_ICON, DEFAULT_INCOME_ICON, ICON_GROUPS } from "@/data/icons";
import { PALETTE } from "@/data/seed";
import { useAccountsStore } from "@/stores/accounts";
import { useCategoriesStore } from "@/stores/categories";
import { useTransactionsStore } from "@/stores/transactions";
import { toISODate } from "@/utils/date";
import { createId } from "@/utils/id";
import { round2 } from "@/utils/money";
import { hasTables, openSqlite, queryRows } from "@/utils/sqlite";

/** A row of `de`: an account or a category. */
interface RawEntity {
    _id: number;
    _ty: number;
    _co: number | null;
    _na: string | null;
    _ar: number | null;
    _a_o: number | null;
    _c_i_u: number | null;
    _pi: number | null;
}

/** A row of `tr`. */
interface RawTransaction {
    _id: number;
    _ty: number;
    _da: number;
    _sch: number | null;
    _a_i: number;
    _d_i: number;
    _a_m: string | null;
    _co: string | null;
}

/** The newest snapshot found in the file. */
export interface OneMoneySnapshot {
    /** When the snapshot was taken, as an ISO date. */
    takenAt: string;
    entities: RawEntity[];
    transactions: RawTransaction[];
}

/** What an import would add, prepared but not yet stored. */
export interface ImportPlan {
    accounts: Account[];
    groups: CategoryGroup[];
    subcategories: Subcategory[];
    transactions: Transaction[];
    /** Records matched to something that already exists instead of being created again. */
    matched: { accounts: number; groups: number; subcategories: number };
    /** Rows deliberately left out, by reason. */
    skipped: { scheduled: number; alreadyImported: number; unresolved: number };
    /** The span of the imported transactions; empty strings when there are none. */
    dateFrom: string;
    dateTo: string;
    totals: { expense: number; income: number; transfer: number };
    takenAt: string;
}

/** Every record already in the tracker, needed to match names and to skip repeated rows. */
interface ExistingData {
    accounts: Account[];
    groups: CategoryGroup[];
    subcategories: Subcategory[];
    transactions: Transaction[];
}

/** Imported transactions remember where they came from, so a second import changes nothing. */
const SOURCE_PREFIX = "1money:";

const normalize = (name: string | null): string => (name ?? "").trim().toLowerCase();

/** ARGB kept as a signed integer, the way Android stores colors; the alpha byte is dropped. */
function toHexColor(value: number | null, fallback: string): string {
    if (value === null || value === 0) {
        return fallback;
    }
    return `#${(value & 0xffffff).toString(16).padStart(6, "0")}`;
}

/**
 * Picks an icon by searching our own icon set for the words of the name - the icon ids in the
 * file are 1Money internal numbers and mean nothing here. A miss costs little: the icon is the
 * one thing that is trivial to change afterwards in the Categories screen.
 */
function guessIcon(name: string | null, fallback: string): string {
    const text = normalize(name);
    const words = text.split(/[^a-z0-9]+/).filter((word) => word.length > 2);
    // The plural is dropped as well, so "Subscriptions" still finds the "subscription" keyword.
    const candidates = [text, ...words, ...words.map((word) => word.replace(/s$/, ""))].filter(Boolean);
    const icons = ICON_GROUPS.flatMap((group) => group.items);

    for (const candidate of candidates) {
        // The id is the stronger signal: a keyword match on "healthy" should not beat "health".
        const byId = icons.find((icon) => icon.id === candidate) ?? icons.find((icon) => icon.id.includes(candidate));
        if (byId) {
            return byId.id;
        }
    }
    for (const candidate of candidates) {
        const byKeyword = icons.find((icon) => (icon.keywords ?? "").split(" ").includes(candidate));
        if (byKeyword) {
            return byKeyword.id;
        }
    }
    return fallback;
}

/** Reads the newest snapshot out of a 1Money database file. */
export async function readOneMoneyFile(data: ArrayBuffer): Promise<OneMoneySnapshot> {
    const db = await openSqlite(data);
    try {
        if (!hasTables(db, ["ba", "de", "tr"])) {
            throw new Error("This database does not look like a 1Money backup");
        }
        const latest = queryRows<{ _id: number; _da: number }>(db, "SELECT _id, _da FROM ba ORDER BY _da DESC LIMIT 1")[0];
        if (!latest) {
            throw new Error("The 1Money backup is empty");
        }
        return {
            takenAt: toISODate(new Date(latest._da)),
            entities: queryRows<RawEntity>(db, "SELECT _id, _ty, _co, _na, _ar, _a_o, _c_i_u, _pi FROM de WHERE _b_i = ?", [latest._id]),
            transactions: queryRows<RawTransaction>(
                db,
                "SELECT _id, _ty, _da, _sch, _a_i, _d_i, _a_m, _co FROM tr WHERE _b_i = ? ORDER BY _da",
                [latest._id],
            ),
        };
    } finally {
        db.close();
    }
}

/**
 * Turns a snapshot into records of our own model.
 *
 * Accounts and categories are matched to the existing ones by name, so importing into a tracker
 * that already has a "Card" account keeps using that account instead of creating a second one.
 */
export function buildImportPlan(snapshot: OneMoneySnapshot, existing: ExistingData): ImportPlan {
    const plan: ImportPlan = {
        accounts: [],
        groups: [],
        subcategories: [],
        transactions: [],
        matched: { accounts: 0, groups: 0, subcategories: 0 },
        skipped: { scheduled: 0, alreadyImported: 0, unresolved: 0 },
        dateFrom: "",
        dateTo: "",
        totals: { expense: 0, income: 0, transfer: 0 },
        takenAt: snapshot.takenAt,
    };

    const usedEntities = new Set<number>();
    snapshot.transactions.forEach((tx) => {
        usedEntities.add(tx._a_i);
        usedEntities.add(tx._d_i);
    });

    const isAccount = (entity: RawEntity): boolean => entity._c_i_u === null;
    // 1Money keeps a pseudo account ("All accounts", type 4) that exists only to show a total.
    // If a type 4 row is used by a transaction it is a real account after all, so it is kept.
    const isAggregate = (entity: RawEntity): boolean => entity._ty === 4 && !usedEntities.has(entity._id);

    /* ---------- Accounts ---------- */

    const accountIdByRaw = new Map<number, string>();
    const accountByName = new Map(existing.accounts.map((account) => [normalize(account.name), account.id]));
    let accountOrder = existing.accounts.length;

    snapshot.entities
        .filter((entity) => isAccount(entity) && !isAggregate(entity))
        .sort((a, b) => (a._a_o ?? 0) - (b._a_o ?? 0))
        .forEach((entity) => {
            const name = entity._na?.trim() || "Account";
            const known = accountByName.get(normalize(name));
            if (known) {
                accountIdByRaw.set(entity._id, known);
                plan.matched.accounts += 1;
                return;
            }
            const account: Account = {
                id: createId(),
                name,
                icon: guessIcon(name, DEFAULT_ACCOUNT_ICON),
                color: toHexColor(entity._co, PALETTE[plan.accounts.length % PALETTE.length]),
                // The backup has no starting balance, so the balance here is the sum of the
                // imported transactions.
                initialBalance: 0,
                archived: entity._ar === 1,
                order: accountOrder++,
            };
            plan.accounts.push(account);
            accountIdByRaw.set(entity._id, account.id);
            accountByName.set(normalize(name), account.id);
        });

    /* ---------- Category groups ---------- */

    const categories = snapshot.entities.filter((entity) => !isAccount(entity));
    const groupIdByRaw = new Map<number, string>();
    const kindByRaw = new Map<number, "expense" | "income">();
    const groupByName = new Map(existing.groups.map((group) => [`${group.kind}|${normalize(group.name)}`, group.id]));
    const orderByKind = {
        expense: existing.groups.filter((group) => group.kind === "expense").length,
        income: existing.groups.filter((group) => group.kind === "income").length,
    };

    // A child whose parent is missing from the file is imported as a group of its own.
    const categoryIds = new Set(categories.map((entity) => entity._id));
    const topLevel = categories.filter((entity) => entity._pi === null || !categoryIds.has(entity._pi));

    topLevel.forEach((entity) => {
        const kind = entity._ty === 0 ? "income" : "expense";
        const name = entity._na?.trim() || "Category";
        kindByRaw.set(entity._id, kind);
        const known = groupByName.get(`${kind}|${normalize(name)}`);
        if (known) {
            groupIdByRaw.set(entity._id, known);
            plan.matched.groups += 1;
            return;
        }
        const group: CategoryGroup = {
            id: createId(),
            name,
            kind,
            icon: guessIcon(name, kind === "income" ? DEFAULT_INCOME_ICON : DEFAULT_EXPENSE_ICON),
            color: toHexColor(entity._co, PALETTE[plan.groups.length % PALETTE.length]),
            archived: entity._ar === 1,
            order: orderByKind[kind]++,
        };
        plan.groups.push(group);
        groupIdByRaw.set(entity._id, group.id);
        groupByName.set(`${kind}|${normalize(name)}`, group.id);
    });

    /* ---------- Subcategories ---------- */

    const subcategoryIdByRaw = new Map<number, string>();
    const subcategoryByKey = new Map(existing.subcategories.map((item) => [`${item.groupId}|${normalize(item.name)}`, item.id]));
    const childCount = new Map<string, number>();
    existing.subcategories.forEach((item) => childCount.set(item.groupId, (childCount.get(item.groupId) ?? 0) + 1));

    categories
        .filter((entity) => entity._pi !== null && categoryIds.has(entity._pi))
        .forEach((entity) => {
            const parentId = entity._pi as number;
            const groupId = groupIdByRaw.get(parentId);
            if (!groupId) {
                return;
            }
            const name = entity._na?.trim() || "Subcategory";
            // A transaction can point straight at the subcategory, so both halves are remembered.
            groupIdByRaw.set(entity._id, groupId);
            kindByRaw.set(entity._id, kindByRaw.get(parentId) ?? "expense");

            const key = `${groupId}|${normalize(name)}`;
            const known = subcategoryByKey.get(key);
            if (known) {
                subcategoryIdByRaw.set(entity._id, known);
                plan.matched.subcategories += 1;
                return;
            }
            const subcategory: Subcategory = {
                id: createId(),
                groupId,
                name,
                archived: entity._ar === 1,
                order: childCount.get(groupId) ?? 0,
            };
            childCount.set(groupId, (childCount.get(groupId) ?? 0) + 1);
            plan.subcategories.push(subcategory);
            subcategoryIdByRaw.set(entity._id, subcategory.id);
            subcategoryByKey.set(key, subcategory.id);
        });

    /* ---------- Transactions ---------- */

    const imported = new Set(existing.transactions.map((tx) => tx.sourceId).filter(Boolean));

    snapshot.transactions.forEach((raw) => {
        if (raw._sch === 1) {
            // A future entry waiting for its scheduled day - nothing has happened yet.
            plan.skipped.scheduled += 1;
            return;
        }
        const sourceId = `${SOURCE_PREFIX}${raw._id}`;
        if (imported.has(sourceId)) {
            plan.skipped.alreadyImported += 1;
            return;
        }

        const amount = round2(Number.parseFloat(raw._a_m ?? ""));
        const fromAccount = accountIdByRaw.get(raw._a_i);
        const toAccount = accountIdByRaw.get(raw._d_i);
        const groupId = groupIdByRaw.get(raw._d_i);
        if (!Number.isFinite(amount) || amount <= 0 || !fromAccount || (!toAccount && !groupId)) {
            plan.skipped.unresolved += 1;
            return;
        }

        const date = toISODate(new Date(raw._da));
        const kind: TxKind = toAccount ? "transfer" : (kindByRaw.get(raw._d_i) ?? (raw._ty === 1 ? "income" : "expense"));

        const transaction: Transaction = {
            id: createId(),
            kind,
            amount,
            date,
            accountId: fromAccount,
            note: raw._co?.trim() ?? "",
            // The original timestamp keeps the transactions of one day in the order they were made.
            createdAt: raw._da,
            sourceId,
        };
        if (toAccount) {
            transaction.toAccountId = toAccount;
        } else {
            transaction.groupId = groupId;
            const subcategoryId = subcategoryIdByRaw.get(raw._d_i);
            if (subcategoryId) {
                transaction.subcategoryId = subcategoryId;
            }
        }

        plan.transactions.push(transaction);
        plan.totals[kind] = round2(plan.totals[kind] + amount);
        plan.dateFrom = plan.dateFrom && plan.dateFrom < date ? plan.dateFrom : date;
        plan.dateTo = plan.dateTo > date ? plan.dateTo : date;
        imported.add(sourceId);
    });

    return plan;
}

/** Reads a file and prepares the plan against whatever is in the tracker right now. */
export async function prepareOneMoneyImport(file: File): Promise<ImportPlan> {
    const snapshot = await readOneMoneyFile(await file.arrayBuffer());
    const accounts = useAccountsStore();
    const categories = useCategoriesStore();
    const transactions = useTransactionsStore();

    return buildImportPlan(snapshot, {
        accounts: accounts.items,
        groups: categories.groups,
        subcategories: categories.subcategories,
        transactions: transactions.items,
    });
}

/** Writes the prepared records. What is already in the tracker stays - an import only adds. */
export function applyImportPlan(plan: ImportPlan): void {
    const accounts = useAccountsStore();
    const categories = useCategoriesStore();
    const transactions = useTransactionsStore();

    accounts.replaceAll([...accounts.items, ...plan.accounts]);
    categories.replaceAll([...categories.groups, ...plan.groups], [...categories.subcategories, ...plan.subcategories]);
    transactions.replaceAll([...transactions.items, ...plan.transactions]);
}
