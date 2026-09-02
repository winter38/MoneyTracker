import { chromium } from "playwright";

/**
 * Снимает все экраны в трёх ширинах и ищет типовые UI-проблемы:
 * горизонтальное переполнение, слишком мелкие кликабельные элементы,
 * перекрытие контента плавающей кнопкой.
 */
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const MIN_TAP = 40;

const seed = () => {
    const groups = JSON.parse(localStorage.getItem("finance-tracker:groups") || "[]");
    const accs = JSON.parse(localStorage.getItem("finance-tracker:accounts") || "[]");
    const exp = groups.filter((g) => g.kind === "expense");
    const inc = groups.filter((g) => g.kind === "income");
    const iso = (d) => d.toISOString().slice(0, 10);
    const txs = [];
    let n = 0;
    for (let m = 0; m < 3; m++) {
        for (let i = 0; i < 8; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - m);
            d.setDate(1 + i * 3);
            txs.push({
                id: "x" + n++,
                kind: "expense",
                amount: 10 + ((i * 17 + m * 5) % 120),
                date: iso(d),
                accountId: accs[i % 2].id,
                groupId: exp[i % exp.length].id,
                note: "",
                createdAt: n,
            });
        }
        const d2 = new Date();
        d2.setMonth(d2.getMonth() - m);
        d2.setDate(5);
        txs.push({ id: "y" + n++, kind: "income", amount: 2100, date: iso(d2), accountId: accs[1].id, groupId: inc[0].id, note: "Зарплата", createdAt: n });
    }
    localStorage.setItem("finance-tracker:transactions", JSON.stringify(txs));
    localStorage.setItem("finance-tracker:budgets", JSON.stringify(exp.slice(0, 3).map((g, i) => ({ groupId: g.id, amount: 120 + i * 60 }))));
};

const problems = [];

for (const vp of [
    { width: 410, height: 830, name: "410", scheme: "dark" },
    { width: 390, height: 844, name: "390", scheme: "light" },
    { width: 1280, height: 900, name: "desktop", scheme: "light" },
]) {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: vp.scheme });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => problems.push(`${vp.name} PAGEERROR: ${e.message.slice(0, 120)}`));
    p.on("console", (m) => {
        if (m.type() === "error") problems.push(`${vp.name} ERR: ${m.text().slice(0, 120)}`);
    });

    await p.goto("http://localhost:4173/", { waitUntil: "networkidle" });
    await p.evaluate(seed);

    for (const [hash, name] of [
        ["#/accounts", "accounts"],
        ["#/categories", "categories"],
        ["#/transactions", "transactions"],
        ["#/budget", "budget"],
        ["#/overview", "overview"],
        ["#/manage", "manage"],
        ["#/settings", "settings"],
    ]) {
        await p.goto("http://localhost:4173/" + hash);
        await p.reload({ waitUntil: "networkidle" });
        await p.waitForTimeout(1100);

        // Горизонтальное переполнение страницы
        const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (overflow > 1) problems.push(`${vp.name}/${name}: горизонтальная прокрутка на ${overflow}px`);

        // Слишком мелкие кликабельные элементы
        const small = await p.evaluate((min) => {
            const out = [];
            document.querySelectorAll("button, a, [role=button], input, .el-select").forEach((el) => {
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) return;
                if (r.height < min) {
                    const label = (el.textContent || el.getAttribute("aria-label") || el.className || "?").trim().slice(0, 22);
                    out.push(`${label} ${Math.round(r.width)}x${Math.round(r.height)}`);
                }
            });
            return [...new Set(out)].slice(0, 6);
        }, MIN_TAP);
        small.forEach((s) => problems.push(`${vp.name}/${name}: мелкий элемент — ${s}`));

        await p.screenshot({ path: `a-${vp.name}-${name}.png`, fullPage: vp.width < 900 });
    }
    await ctx.close();
}

await b.close();
console.log(problems.length ? [...new Set(problems)].join("\n") : "проблем не найдено");
