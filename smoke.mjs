/**
 * Дымовой тест: поднимает preview-сервер, кликает по приложению как пользователь
 * и падает, если в консоли есть ошибки или данные не сохранились.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const errors = [];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function run(label, viewport) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("console", (msg) => {
        if (msg.type() === "error") {
            errors.push(`[${label}] console: ${msg.text()}`);
        }
    });
    page.on("pageerror", (error) => errors.push(`[${label}] pageerror: ${error.message}`));

    await page.goto(BASE, { waitUntil: "networkidle" });

    // Добавляем расход через быстрый экран: 12,50 на своей клавиатуре + категория из шапки.
    const addButton = viewport.width < 900 ? page.locator(".app__fab") : page.getByRole("button", { name: "Добавить операцию" });
    await addButton.click();
    await page.waitForTimeout(300);
    await page.locator(".head__half--right").click();
    await page.waitForTimeout(300);
    await page.locator(".picker .tile").first().click();
    await page.waitForTimeout(400);
    // У группы с подкатегориями окно остаётся открытым — подтверждаем выбор «Всей группы».
    const wholeGroup = page.locator(".picker .tile", { hasText: "Вся группа" });
    if (await wholeGroup.count()) {
        await wholeGroup.click();
    }
    await page.locator(".picker").waitFor({ state: "detached", timeout: 5000 });
    for (const key of ["1", "2", ",", "5", "0"]) {
        await page.getByRole("button", { name: key, exact: true }).click();
    }
    await page.getByRole("button", { name: "Сохранить" }).click();
    await page.waitForTimeout(400);

    const listed = await page.locator(".tx-row").count();
    if (listed < 1) {
        errors.push(`[${label}] операция не появилась в списке`);
    }

    // Проверяем, что запись реально ушла в localStorage.
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("finance-tracker:transactions") ?? "[]"));
    if (!stored.length || stored[0].amount !== 12.5) {
        errors.push(`[${label}] localStorage: ожидали сумму 12.5, получили ${JSON.stringify(stored)}`);
    }

    // Проходим по всем разделам и смотрим, не падает ли что-нибудь.
    for (const path of ["#/accounts", "#/categories", "#/transactions", "#/budget", "#/overview", "#/manage", "#/settings"]) {
        await page.goto(`${BASE}/${path}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);
    }

    // Кольцо категорий и график динамики должны отрисоваться после появления данных.
    for (const [path, expected] of [
        ["#/categories", 1],
        ["#/overview", 1],
    ]) {
        await page.goto(`${BASE}/${path}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(900);
        const charts = await page.locator(".apexcharts-canvas").count();
        if (charts < expected) {
            errors.push(`[${label}] ${path}: отрисовано графиков ${charts}, ожидали ${expected}`);
        }
    }

    // Перезагрузка — данные должны пережить закрытие вкладки.
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    if ((await page.locator(".tx-row").count()) < 1) {
        errors.push(`[${label}] после перезагрузки операции пропали`);
    }

    await page.screenshot({ path: `shot-${label}.png`, fullPage: true });
    await context.close();
}

await run("desktop", { width: 1280, height: 900 });
await run("mobile", { width: 390, height: 844 });

await browser.close();

if (errors.length) {
    console.error("ПРОВАЛ:\n" + errors.join("\n"));
    process.exit(1);
}
console.log("Дымовой тест пройден: десктоп и мобильный макет, данные сохраняются.");
