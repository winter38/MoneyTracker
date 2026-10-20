/**
 * Reading a SQLite file in the browser.
 *
 * Other trackers (1Money and friends) hand out their backup as an SQLite database rather than
 * JSON, so importing one means running an SQLite engine on the client - there is no server to
 * parse it for us. sql.js is that engine compiled to WebAssembly.
 *
 * Both the engine and its ~670 KB `.wasm` payload are imported dynamically: they end up in a
 * separate chunk that is downloaded the first time somebody actually picks a database file,
 * and never on a normal visit.
 */
import type { Database, SqlJsStatic } from "sql.js";

let enginePromise: Promise<SqlJsStatic> | null = null;

function loadEngine(): Promise<SqlJsStatic> {
    enginePromise ??= (async () => {
        const [sqlJs, wasm] = await Promise.all([import("sql.js"), import("sql.js/dist/sql-wasm.wasm?url")]);
        // The default `locateFile` looks for the file next to the script; after the build it is a
        // hashed asset, so the URL Vite gives us is passed in explicitly.
        return sqlJs.default({ locateFile: () => wasm.default });
    })();
    return enginePromise;
}

/** Opens a database held in memory. Throws if the bytes are not an SQLite file. */
export async function openSqlite(data: ArrayBuffer): Promise<Database> {
    const engine = await loadEngine();
    return new engine.Database(new Uint8Array(data));
}

/** Runs a query and returns the rows as plain objects, which is easier to map than sql.js tuples. */
export function queryRows<T>(db: Database, sql: string, params: unknown[] = []): T[] {
    const statement = db.prepare(sql);
    try {
        statement.bind(params as never);
        const rows: T[] = [];
        while (statement.step()) {
            rows.push(statement.getAsObject() as T);
        }
        return rows;
    } finally {
        statement.free();
    }
}

/** True when the database has every table the caller needs - used to recognise a file format. */
export function hasTables(db: Database, names: string[]): boolean {
    const rows = queryRows<{ name: string }>(db, "SELECT name FROM sqlite_master WHERE type = 'table'");
    const present = new Set(rows.map((row) => row.name));
    return names.every((name) => present.has(name));
}
