/**
 * Smoke test: starts the preview server, clicks through the app like a user
 * and fails if the console has errors or the data was not persisted.
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

    // Add an expense through the quick screen: 12.50 on the custom keypad + a category from the header.
    const addButton = viewport.width < 900 ? page.locator(".app__fab") : page.getByRole("button", { name: "Add transaction" });
    await addButton.click();
    await page.waitForTimeout(300);
    await page.locator(".head__half--right").click();
    await page.waitForTimeout(300);
    await page.locator(".picker .tile").first().click();
    await page.waitForTimeout(400);
    // For a group with subcategories the sheet stays open - confirm by picking "Whole group".
    const wholeGroup = page.locator(".picker .tile", { hasText: "Whole group" });
    if (await wholeGroup.count()) {
        await wholeGroup.click();
    }
    await page.locator(".picker").waitFor({ state: "detached", timeout: 5000 });
    for (const key of ["1", "2", ",", "5", "0"]) {
        await page.getByRole("button", { name: key, exact: true }).click();
    }
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForTimeout(400);

    const listed = await page.locator(".tx-row").count();
    if (listed < 1) {
        errors.push(`[${label}] the transaction did not appear in the list`);
    }

    // Check that the record really made it into localStorage.
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("finance-tracker:transactions") ?? "[]"));
    if (!stored.length || stored[0].amount !== 12.5) {
        errors.push(`[${label}] localStorage: expected the amount 12.5, got ${JSON.stringify(stored)}`);
    }

    // Walk through every section and see whether anything breaks.
    for (const path of ["#/accounts", "#/categories", "#/transactions", "#/budget", "#/overview", "#/manage", "#/settings"]) {
        await page.goto(`${BASE}/${path}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);
    }

    // The category ring and the trend chart must render once there is data.
    for (const [path, expected] of [
        ["#/categories", 1],
        ["#/overview", 1],
    ]) {
        await page.goto(`${BASE}/${path}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(900);
        const charts = await page.locator(".apexcharts-canvas").count();
        if (charts < expected) {
            errors.push(`[${label}] ${path}: ${charts} charts rendered, expected ${expected}`);
        }
    }

    // A reload - the data must survive closing the tab.
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    if ((await page.locator(".tx-row").count()) < 1) {
        errors.push(`[${label}] the transactions disappeared after a reload`);
    }

    await page.screenshot({ path: `shot-${label}.png`, fullPage: true });
    await context.close();
}

await run("desktop", { width: 1280, height: 900 });
await run("mobile", { width: 390, height: 844 });

await browser.close();

if (errors.length) {
    console.error("FAILED:\n" + errors.join("\n"));
    process.exit(1);
}
console.log("Smoke test passed: desktop and mobile layout, data is persisted.");
